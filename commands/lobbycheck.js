import { fetchAndCompareLobbies } from '../util.js';

export default async function lobbycheck(msg, args, client) {
  let pingUserId = null;
  if (args.length > 0) {
    const mentionMatch = args[0].match(/^<@!?(\d+)>$/);
    if (mentionMatch) pingUserId = mentionMatch[1];
  }

  await msg.reply('🔍 Checking lobby status...');

  await fetchAndCompareLobbies(pingUserId, { manual: true, msg, client });
}
