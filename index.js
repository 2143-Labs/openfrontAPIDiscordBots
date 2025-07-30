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
let lastSuccessFullCheck = new Date()
async function fetchAndCompareLobbies(pingUserId = null, {manual = false, msg = null, interaction = null} = {}) {
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
    const now = new Date()
    
    // === 🔁 If unchanged, update or send auto-warning ===
    if (isSame || manual) {
      const notChangeSinceTimeMsg = `${Math.floor((now - lastSuccessFullCheck) / 60000)} minutes, ${Math.floor(((now - lastSuccessFullCheck) % 60000) / 1000)} seconds and ${(now - lastSuccessFullCheck) % 1000} ms`;
      let message = manual
        ? `📡 Manual lobby check triggered. Lobby data is ${isSame ? '**unchanged**' : '**different**'}.`
        : `⚠️ Lobby data hasn’t changed in the last ${notChangeSinceTimeMsg}.\n_(last updated at ${lastSuccessFullCheck.toISOString().split('T')[1].split('.')[0]} UTC)_`;

      if (pingUserId) {
        message += ` <@${pingUserId}>`;
      }

      if (manual) {
        if (msg) {
          msg.reply(message);
        } else if (interaction) {
          interaction.followUp(message)
        } else {
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
      lastSuccessFullCheck = new Date();
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

// === 🧾 Slash command registration ===
const commands = [];

async function addCommand(builder, func) {
  commands.push({
    name: builder.name,
    builder,
    json: builder.toJSON(),
    func,
  });
}

async function registerSlashCommands() {
  await addCommand(
    new SlashCommandBuilder()
      .setName('lobbycheck')
      .setDescription('Manually check lobby status and compare to last fetch')
      .addUserOption(option =>
        option.setName('user')
          .setDescription('User to ping if unchanged')
          .setRequired(false)
      ),
    async (interaction) => {
      const user = interaction.options.getUser('user') || interaction.user;
      await interaction.deferReply(); // No flags
      await interaction.editReply('🔍 Checking lobby status...');
      await fetchAndCompareLobbies(user.id, { manual: true, interaction });
    }
  );

  await addCommand(
    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Gets the ping'),
    async (interaction) => {
      await interaction.reply('Pong: ' + client.ws.ping);
    }
  );
  await addCommand(
  new SlashCommandBuilder()
    .setName('mapsearch')
    .setDescription('Search OpenFront.io for all games played on a specific map')
    .addStringOption(option =>
      option.setName('map')
        .setDescription('Map name (case-sensitive)')
        .setRequired(true)
    ),
  async (interaction) => {
    const mapName = interaction.options.getString('map');
    await interaction.deferReply();
    await interaction.editReply("📡 Connecting to server...");

    const ws = new WebSocket("wss://tktk123456-openfrontio-51.deno.dev/ws");

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "getMap", mapName }));
    };

    let lastEditTime = 0;
    let pendingContent = null;
    let editTimeout = null;

ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  const now = Date.now();

  if (data.type === "progress") {
    const content = `🔄 Searching for map \`${mapName}\`: ${data.progress}% (${data.currentCount}/${data.total} checked, ${data.matchesCount} matches)`;

    if (now - lastEditTime >= 5000) {
      // Send update immediately if cooldown passed
      lastEditTime = now;
      await interaction.editReply(content);
    } else {
      // Otherwise, store and schedule
      pendingContent = content;
      if (!editTimeout) {
        editTimeout = setTimeout(async () => {
          try {
            if (pendingContent) {
              await interaction.editReply(pendingContent);
              lastEditTime = Date.now();
              pendingContent = null;
            }
          } catch (err) {
            console.warn("⚠️ Delayed edit failed:", err.message);
          }
          editTimeout = null;
        }, 5000 - (now - lastEditTime));
      }
    }
  }

  if (data.done) {
    if (editTimeout) clearTimeout(editTimeout); // Send final reply right away

    if (data.matches?.length) {
      const trimmed = data.matches.slice(0, 20); // Discord display cap
      await interaction.editReply(
        `✅ Found ${data.matches.length} games on **${mapName}**.\nFirst few:\n\`\`\`json\n${JSON.stringify(trimmed, null, 2)}\n\`\`\``
      );
    } else {
      await interaction.editReply(`❌ No matches found for map: ${mapName}`);
    }
    ws.close();
  }

  if (data.error) {
    await interaction.editReply("❌ Error: " + data.error);
    ws.close();
  }
};

    ws.onerror = async () => {
      await interaction.editReply("❌ WebSocket error while contacting the backend.");
    };
  }
);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('📡 Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.GUILD_ID, process.env.CLIENT_ID),
      { body: commands.map(c => c.json) }
    );
    console.log('✅ Slash commands registered');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
}
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find(c => c.name === interaction.commandName);
  if (!command) {
    return interaction.reply({ content: 'Unknown command.', ephemeral: true });
  }

  try {
    await command.func(interaction);
  } catch (err) {
    console.error(`❌ Error running /${interaction.commandName}:`, err);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: '⚠️ Error executing command.', ephemeral: true });
    } else {
      await interaction.reply({ content: '⚠️ Error executing command.', ephemeral: true });
    }
  }
});
// === 💬 Message handler (optional) ===
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;

  const [rawCommand, ...args] = msg.content.slice(1).trim().split(/\s+/);
  const commandEntry = commands.find(c => c.name === rawCommand);

  if (!commandEntry) {
    msg.reply(`❌ Unknown command: \`${rawCommand}\``);
    return;
  }

  // Build a map of argument names to provided values (based on the command's expected options)
  const argMap = new Map();
  const options = commandEntry.command.options ?? [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (opt.name && args[i] !== undefined) {
      argMap.set(opt.name, args[i]);
    }
  }

  // Fake interaction object that mimics the Slash Command interaction API
  const fakeInteraction = {
    user: msg.author,
    options: {
      getString(name) {
        return argMap.get(name) ?? null;
      },
      getUser(name) {
        const mention = argMap.get(name);
        const match = mention?.match(/^<@!?(\d+)>$/);
        return match ? { id: match[1] } : null;
      },
      getBoolean(name) {
        const val = argMap.get(name)?.toLowerCase();
        if (val === "true") return true;
        if (val === "false") return false;
        return null;
      },
      getInteger(name) {
        const val = parseInt(argMap.get(name), 10);
        return isNaN(val) ? null : val;
      },
      getNumber(name) {
        const val = parseFloat(argMap.get(name));
        return isNaN(val) ? null : val;
      }
    },
    botReplyMsg: null,
    reply: async function (content) {
      this.botReplyMsg = await msg.reply(content);
    },
    deferReply: async () => {},
    editReply: async function (content) {
      if (this.botReplyMsg) {
        await this.botReplyMsg.edit(content);
      } else {
        this.botReplyMsg = await msg.reply(content);
      }
    },
    followUp: (content) => msg.reply(content)
  };

  try {
    await commandEntry.func(fakeInteraction);
  } catch (err) {
    console.error(`❌ Error running !${rawCommand}:`, err);
    msg.reply('⚠️ Error running command.');
  }
});
client.login(process.env.DISCORD_TOKEN);
