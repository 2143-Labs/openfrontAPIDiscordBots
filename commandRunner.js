import express from 'express';
import { loadCommandsFrom, getCommand } from './commandLoader.js';
import { fetchAndCompareLobbies } from './util.js';
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
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID
let lastLobbies = null;
const CHECK_INTERVAL = 1;

// Keepalive endpoint for Deno Deploy ping
app.get('/ping', (req, res) => {
  res.send('Pong: ' + client.ws.ping);
});
app.get('/', (req, res) => {
    res.send('Hello world')
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
// Start periodic check after bot is ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await loadCommandsFrom();
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
