import express from 'express';
import { loadCommandsFrom, getCommand } from './commandLoader.js';
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

// === 🧾 Command registration ===
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;

  const args = msg.content.slice(1).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = getCommand(commandName);
  if (!command) {
    msg.reply(`❌ Unknown command: \`${commandName}\``);
    return;
  }

  try {
    await command(msg, args, client);
  } catch (err) {
    console.error(`❌ Error running command ${commandName}:`, err);
    msg.reply('⚠️ Error running command.');
  }
});
client.login(process.env.DISCORD_TOKEN);
