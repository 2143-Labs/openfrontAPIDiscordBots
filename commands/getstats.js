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
  let resultMsg = await msg.reply(`📡 Collecting \`${statType}\` from map: \`${mapName}\``);
  const ws = new WebSocket("wss://tktk123456-openfrontio-51.deno.dev/ws");
  let payload = { type: "getStats", mapName, statType, display, gameModes }
  ws.onopen = () => {
    ws.send(JSON.stringify(payload))
  }
  let lastEditTime = 0;
  let pendingContent = null;
  let editTimeout = null;

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    const now = Date.now();

    if (data.type === "progress") {
      let content;
      if (data.task === "filterGames") {
        content = `🔄 Searching for map \`${mapName}\`: ${data.progress}% (${data.currentCount}/${data.total} checked, ${data.matchesCount} matches)`;
      } else if (data.task === "getStats") {
        content = `${data.statType.charAt(0).toUpperCase() + data.statType.slice(1).toLowerCase()} Stat Progress: Game ${data.currentGame}/${data.totalGames}, Intents processed: ${data.currentIntents}, Tracked entries: ${data.tracked}`;
      }
      if (now - lastEditTime >= 5000) {
        lastEditTime = now;
        await msg.channel.sendTyping();
        const sentMsg = await resultMsg.edit(content);
        pendingContent = null;
        if (editTimeout) clearTimeout(editTimeout);
      } else {
        pendingContent = content;
        if (!editTimeout) {
          editTimeout = setTimeout(async () => {
            try {
              if (pendingContent) {
                await msg.channel.sendTyping();
                await resultMsg.edit(pendingContent)
                lastEditTime = Date.now();
                pendingContent = null;
              }
            } catch (err) {
              console.warn("⚠️ Delayed message send failed:", err.message);
            }
            editTimeout = null;
          }, 5000 - (now - lastEditTime));
        }
      }
    }
    if (data.done) {
      let content
      if (data.display === "heatmap" && data.heatmap) {
        content = JSON.stringify(data.heatmap, null, 2);
      } else if (data.matches) {
        content = JSON.stringify(data.matches, null, 2);
      } else if (data.stats) {
        content = JSON.stringify(data.stats, null, 2);
      } else {
        content = "Done, but no results returned.";
      }
      if (now - lastEditTime >= 5000) {
        lastEditTime = now;
        await msg.channel.sendTyping();
        const sentMsg = await resultMsg.edit(content);
        pendingContent = null;
        if (editTimeout) clearTimeout(editTimeout);
      } else {
        pendingContent = content;
        if (!editTimeout) {
          editTimeout = setTimeout(async () => {
            try {
              if (pendingContent) {
                await msg.channel.sendTyping();
                await resultMsg.edit(pendingContent)
                lastEditTime = Date.now();
                pendingContent = null;
              }
            } catch (err) {
              console.warn("⚠️ Delayed message send failed:", err.message);
            }
            editTimeout = null;
          }, 5000 - (now - lastEditTime));
        }
      }
    }
  }
}
