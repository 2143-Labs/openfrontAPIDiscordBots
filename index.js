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

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (msg) => {
  if (msg.content === '!ping') {
    msg.reply('Pong: ' + client.ws.ping)
  }
});

client.login(process.env.DISCORD_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// Keepalive endpoint for Deno Deploy ping
app.get('/ping', (req, res) => {
  res.send('Pong: ' + client.ws.ping);
});

// Start web server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

let lastLobbies = null;
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID; // Set this in Render's env vars

async function fetchLobbies() {
  try {
    const res = await fetch('https://openfront.pro/api/v1/lobbies');
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();

    const serialized = JSON.stringify(data);
    if (lastLobbies !== null && serialized === lastLobbies) {
      // Unchanged, send alert
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (channel && channel.isTextBased()) {
        channel.send('⚠️ Lobby data hasn’t changed in the last 5 minutes.');
      }
    }

    lastLobbies = serialized;
  } catch (err) {
    console.error('Error fetching lobbies:', err);
  }
}

// Wait for bot to be ready before starting polling
client.once('ready', () => {
  console.log('⏱️ Starting lobby monitor...');
  fetchLobbies(); // initial
  setInterval(fetchLobbies, CHECK_INTERVAL);
});
