import express from 'express';
import { loadCommandsFrom, getCommand } from './commandLoader.js';
import { fetchAndCompareLobbies, parseArgs } from './util.js';
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
const PORT = process.env.PORT || 3000;
const CHANNEL_ID = process.env.ALERT_CHANNEL_ID
let lastLobbies = null;
const CHECK_INTERVAL = 1;
// Start periodic check after bot is ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  fetchAndCompareLobbies(null, { client, sendMsg: false })
  await loadCommandsFrom();
});

// === 🧾 Command registration ===
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!')) return;

  const args = parseArgs(msg.content.slice(1).trim())
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
