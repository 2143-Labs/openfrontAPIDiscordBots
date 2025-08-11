import InfoBoard from './infoBoard.js';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

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

client.login(process.env.DISCORD_TOKEN);

const readyPromise = new Promise(resolve => {
  if (client.isReady()) resolve();
  else client.once('ready', resolve);
});

// Actual Promise of initialized InfoBoard
const boardPromise = (async () => {
  await readyPromise;
  return await new InfoBoard(process.env.CHANNEL_ID_INFOBOARD, client);
})();

// Proxy that forwards method calls or property access once resolved
const globalBoard = new Proxy({}, {
  get(_, prop) {
    return async (...args) => {
      const board = await boardPromise;
      const value = board[prop];
      if (typeof value === 'function') {
        return value.apply(board, args);
      }
      // If property accessed with no args, just return the property value
      if (args.length === 0) {
        return value;
      }
      // If args passed but property is not function, throw error or ignore
      throw new TypeError(`${String(prop)} is not a function`);
    };
  }
});

export default globalBoard;
