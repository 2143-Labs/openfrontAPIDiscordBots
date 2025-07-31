import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

function rgbaToPngBuffer(rgba, width, height) {
  const png = new PNG({ width, height });

  // Copy RGBA data
  for (let i = 0; i < rgba.length; i++) {
    png.data[i] = rgba[i];
  }

  return PNG.sync.write(png);
}
export default async function getstats(msg, args, client) {
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
      if (now - lastEditTime >= 1500) {
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
          }, 1500 - (now - lastEditTime));
        }
      }
    }
    if (data.done) {
      let content;
      let send = null;
      if (data.display === "heatmap" && data.heatmap) {
  const { width, height, raw } = data.heatmap;
  let rgbaBuffer;

  if (ArrayBuffer.isView(raw) && raw.buffer) {
    rgbaBuffer = Buffer.from(raw.buffer);
  } else if (Array.isArray(raw)) {
    rgbaBuffer = Buffer.from(raw);
  } else {
    console.warn("⚠️ Invalid or missing heatmap.raw:", raw);
    content = "⚠️ Heatmap data was invalid or incomplete.";
  }

  if (rgbaBuffer) {
  const pngBuffer = rgbaToPngBuffer(rgbaBuffer, width, height);
  await msg.reply({
    content: `🧊 Heatmap for map \`${mapName}\``,
    files: [{
      attachment: pngBuffer,
      name: 'heatmap.png'
    }]
    });
    resultMsg.delete()
    ws.close()
    return
  }
}
 else if (data.matches) {
    content = JSON.stringify(data.matches, null, 2);
  } else if (data.stats) {
    content = JSON.stringify(data.stats, null, 2);
  } else {
    content = "Done, but no results returned.";
  }
  
  if (now - lastEditTime >= 1500) {
    lastEditTime = now;
    await msg.channel.sendTyping();
    await resultMsg.edit(content);
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
      }, 1500 - (now - lastEditTime));
    }
  }
  ws.close()
}
  }
}
