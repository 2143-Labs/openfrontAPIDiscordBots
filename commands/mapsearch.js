export default async function mapsearch(msg, args, client) {
  if (args.length === 0) {
    await msg.reply('❌ Please provide a map name. Usage: `!mapsearch <map name>`');
    return;
  }

  const mapName = args.join(' ');
  let resultMsg = await msg.reply(`📡 Searching OpenFront.io for map: \`${mapName}\`...`);

  const ws = new WebSocket("wss://tktk123456-openfrontio-51.deno.dev/ws");

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: "getMap", mapName }));
  };

  let lastEditTime = 0;
  let pendingContent = null;
  let editTimeout = null;

  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    const now = Date.now();

    if (data.type === "progress") {
      const content = `🔄 Searching for map \`${mapName}\`: ${data.progress}% (${data.currentCount}/${data.total} checked, ${data.matchesCount} matches)`;

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
      if (editTimeout) clearTimeout(editTimeout);

      if (data.matches?.length) {
        const trimmed = data.matches.slice(0, 20); // Limit to first 20 results
        await resultMsg.edit(
          `✅ Found ${data.matches.length} games on **${mapName}**.\nFirst few:\n\`\`\`json\n${JSON.stringify(trimmed, null, 2)}\n\`\`\``
        );
      } else {
        await resultMsg.edit(`❌ No matches found for map: ${mapName}`);
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
};
