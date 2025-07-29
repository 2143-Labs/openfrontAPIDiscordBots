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

const app = express();
const PORT = process.env.PORT || 3000;

// Keepalive endpoint for Deno Deploy ping
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Start web server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

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
