import express from 'express';
import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  Activity,
  SlashCommandBuilder,
  Partials,
  PermissionsBitField,
  RoleFlagsBitField,
  RoleManager,
  ChannelType,
  REST,
  Routes
} from "discord.js";

// Discord bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildWebhooks,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});
const app = express();
const PORT = process.env.PORT || 3000;
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID;
let lastLobbies = null;
const CHECK_INTERVAL = 1;

// Keepalive endpoint for Deno Deploy ping
app.get('/ping', (req, res) => {
  res.send('Pong: ' + client.ws.ping);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

let lastAutoMessage = null; // Stores last "unchanged" message from auto-checks
let lastSuccessFullCheck = new Date().toISOString().split('T')[1].split('.')[0];
async function fetchAndCompareLobbies(pingUserId = null, {manual = false, msg = null} = {}) {
  try {
    const res = await fetch('https://openfront.pro/api/v1/lobbies');
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();

    const filtered = data.map(lobby => ({
      game_id: lobby.game_id,
      last_seen_unix_sec: lobby.last_seen_unix_sec
    }));

    const serialized = JSON.stringify(filtered);
    const isSame = lastLobbies && serialized === lastLobbies;
    lastLobbies = serialized;

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) return;

    
    // === 🔁 If unchanged, update or send auto-warning ===
    if (isSame || manual) {
      let message = manual
        ? `📡 Manual lobby check triggered. Lobby data is ${isSame ? '**unchanged**' : '**different**'}.`
        : `⚠️ Lobby data hasn’t changed in the last ${CHECK_INTERVAL} minutes.\n_(last updated at ${lastSuccessFullCheck} UTC)_`;

      if (pingUserId) {
        message += ` <@${pingUserId}>`;
      }

      if (manual) {
        if (msg) {
          msg.reply(message);
        } else  {
          await channel.send(message); // Manual messages are always sent
        }
      } else {
        // Auto message: edit existing or send new
        if (lastAutoMessage) {
          try {
            await lastAutoMessage.edit(message);
          } catch (err) {
            console.warn("⚠️ Couldn't edit last auto message. Sending new one.");
            lastAutoMessage = await channel.send(message);
          }
        } else {
          lastAutoMessage = await channel.send(message);
        }
      }
    } else {
      // ✅ Data changed — delete old unchanged message if it exists
      lastSuccessFullCheck = new Date().toISOString().split('T')[1].split('.')[0];
      if (lastAutoMessage) {
        try {
          await lastAutoMessage.delete();
        } catch (err) {
          console.warn("⚠️ Failed to delete last auto message:", err.message);
        }
        lastAutoMessage = null;
      }
    }

  } catch (err) {
    console.error('❌ Error during lobby fetch:', err);
  }
}

// Start periodic check after bot is ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log('⏱️ Starting periodic lobby monitor...');
  fetchAndCompareLobbies("1072828308376539168");
  setInterval(fetchAndCompareLobbies, CHECK_INTERVAL * 60 * 1000, "1072828308376539168");
  await registerSlashCommands();
});

// === 💬 Message handler (optional) ===
client.on('messageCreate', async (msg) => {
  if (msg.content === '!ping') {
    msg.reply('Pong: ' + client.ws.ping);
  }

  if (msg.content.startsWith('!lobbycheck')) {
    const args = msg.content.trim().split(/\s+/);
    const userMention = args[1]; // e.g., <@1234567890>

    // Extract user ID from mention, if provided
    const match = userMention?.match(/^<@!?(\d+)>$/);
    // Use mentioned user ID or fallback to message author ID
    const userId = match?.[1] || msg.author.id;

    msg.reply('🔍 Manually checking lobbies...');
    await fetchAndCompareLobbies(userId, {manual: true, msg});
  }
});

// === 🧾 Slash command registration ===
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('lobbycheck')
      .setDescription('Manually check lobby status and compare to last fetch')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to ping if unchanged')
          .setRequired(false)
      )
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('📡 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
}

// === ⚙️ Slash command interaction handler ===
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'lobbycheck') {
    // Get user option or fallback to command user ID
    const user = interaction.options.getUser('user') || interaction.user;

    await interaction.reply({ content: 'Checking lobby status...', flags: 64 });
    await fetchAndCompareLobbies(user.id, {manual: true, msg: interaction});
  }
});

client.login(process.env.DISCORD_TOKEN);
