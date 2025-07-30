import { Buffer } from "node:buffer";
import { AttachmentBuilder } from "discord.js";
import { createPNG } from "../tiny-png.js";

export default async function getstat(msg, args, client) {
  if (args.length < 2) {
    await msg.reply('❌ Usage: `!getstat <map name> <stat type> [display] [gameModes=mode1,mode2,...]`');
    return;
  }

  const mapName = args[0];
  const statType = args[1];
  const display = args[2] ?? null;

  const gameModesArg = args.find(a => a.startsWith("gameModes="));
  const gameModes = gameModesArg ? gameModesArg.split("=")[1] : null;

  let resultMsg = await msg.reply(`📊 Collecting stats for map: \`${mapName}\`, stat type: \`${statType}\`...`);

  const ws = new WebSocket("wss://tktk123456-openfrontio-51.deno.dev/ws");

  let lastEditTime = 0;
  let pendingContent = null;
  let editTimeout = null;

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "getStats", mapName, statType, display, gameModes }));
  };

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    const now = Date.now();

    if (data.type === "progress") {
      let content = "";

      if (data.task === "filterGames") {
        content = `🔄 Map Progress: ${data.progress}% (${data.currentCount}/${data.total} checked, ${data.matchesCount} matches)`;
      } else if (data.task === "getStats") {
        content = `📊 ${data.statType} Progress: Game ${data.currentGame}/${data.totalGames}, Intents: ${data.currentIntents}, Tracked: ${data.tracked}`;
      } else {
        content = `📈 Progress (${data.task}): ${data.progress}% (${data.currentCount} checked)`;
      }

      if (now - lastEditTime >= 5000) {
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
                await resultMsg.edit(pendingContent);
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
      if (editTimeout) clearTimeout(editTimeout);

      if (data.stats) {
        const gameCount = data.stats?.matchingGameModes ?? "Unknown";
        const baseText = `✅ Finished stat collection for \`${mapName}\`.\nMatches: ${gameCount}.`;

        if (data.display === "heatmap" && data.heatmap) {
          try {
            const heatmap = data.heatmap;
            let name = "heatmap"
            if (heatmap.raw && heatmap.width && heatmap.height) {
              const buffer = createPNG(Uint8ClampedArray.from(heatmap.raw), heatmap.width, heatmap.height);
              const attachment = new AttachmentBuilder(buffer, { name: `${name}-heatmap.png` });
              await msg.channel.send({ content: `🗺️ Heatmap for \`${name}\`:`, files: [attachment] });
  };
          } catch (err) {
            await resultMsg.edit(baseText + `\n⚠️ Failed to render heatmap image: ${err.message}`);
          }
        } else {
          await resultMsg.edit(
            baseText + `\n\`\`\`json\n${JSON.stringify(data.stats, null, 2)}\n\`\`\``
          );
        }
      } else {
        await resultMsg.edit("✅ Done, but no stats were returned.");
      }

      ws.close();
    }

    if (data.error) {
      await resultMsg.edit("❌ Error: " + data.error);
      ws.close();
    }
  };

  ws.onerror = async () => {
    await resultMsg.edit("❌ WebSocket error while contacting the backend.");
  };
}
