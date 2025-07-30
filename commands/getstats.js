export default function getstats(msg, args, client) {
  const display = args[2] ?? null;
  const mapName = args[0];
  const statType = args[1];
  const gameModes = args[3] ?? null;
  let resultMsg = await msg.reply(`📡 Collecting ${statType} from map: \`${mapName}\`...`);
  const ws = new WebSocket("wss://tktk123456-openfrontio-51.deno.dev/ws");
}
