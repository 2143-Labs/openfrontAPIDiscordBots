export default function getstats(msg, args, client) {
  function checkArgs(argIndexes, startsWith) {
    for (const i of argIndexes) {
      const arg = args[i] ?? null;
      if (arg && arg.startsWith(startsWith)) {
        return arg.slice(startsWith.length).trim();
      }
    }
    return null;
  }
  const display = checkArgs([2,3], "display:");
  const mapName = args[0];
  const statType = args[1];
  const gameModes = checkArgs([3,2], "gameModes:");
  let resultMsg = await msg.reply(`📡 Collecting ${statType} from map: \`${mapName}\`...`);
  const ws = new WebSocket("wss://tktk123456-openfrontio-51.deno.dev/ws");
}
