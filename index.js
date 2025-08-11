import express from 'express';
import InfoBoard from './infoBoard.js'
import { fetchAndCompareLobbies, initAutoStatusMessage } from './util.js'
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

// To redeploy
app.get('/exit', (req, res) => {
  res.send('Exiting server for redeployment...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

if(process.env.DISCORD_TOKEN) {
    // Start periodic check after bot is ready
    client.once('ready', async () => {
      const infoBoard = await new InfoBoard('1404272671088316558', client);
      await infoBoard.setLine("Bot started at", `${new Date().toISOString()}`);
      console.log(`✅ Logged in as ${client.user.tag}`);
      console.log('⏱️ Starting periodic lobby monitor...');
      await initAutoStatusMessage(client)
      fetchAndCompareLobbies("1072828308376539168", { client });
      setInterval(fetchAndCompareLobbies, CHECK_INTERVAL * 60 * 1000, "1072828308376539168", { client });
    });
    client.login(process.env.DISCORD_TOKEN);
} else {
    console.warn("⚠️ DISCORD_TOKEN not set, bot will not log in. Please set the environment variable.");
}
