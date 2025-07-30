export default async function (msg, args, client) {
  await msg.reply('Pong! ' + client.proccess.ms);
}
