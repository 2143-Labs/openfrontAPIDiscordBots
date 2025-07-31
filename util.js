const CHANNEL_ID = process.env.ALERT_CHANNEL_ID;
let lastLobbies = null;
let lastAutoMessage = null; // Stores last "unchanged" message from auto-checks
let lastSuccessFullCheck = new Date()
export async function fetchAndCompareLobbies(pingUserId = null, {manual = false, msg = null, client = null, sendMsg = true} = {}) {
  try {
    const res = await fetch('https://openfront.pro/api/v1/lobbies');
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();

    const filtered = data.map(lobby => ({
      game_id: lobby.game_id,
      last_seen_unix_sec: lobby.last_seen_unix_sec
    }));

    const serialized = JSON.stringify(filtered);
    const isSame = lastLobbies && serialized === lastLobbies;
    lastLobbies = serialized;

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) return;
    const now = new Date()
    if (!sendMsg) return
    // === 🔁 If unchanged, update or send auto-warning ===
    if (isSame || manua)) {
      const notChangeSinceTimeMsg = `${Math.floor((now - lastSuccessFullCheck) / 60000)} minutes, ${Math.floor(((now - lastSuccessFullCheck) % 60000) / 1000)} seconds and ${(now - lastSuccessFullCheck) % 1000} ms`;
      let message = manual
        ? `📡 Manual lobby check triggered. Lobby data is ${isSame ? '**unchanged**' : '**different**'}.`
        : `⚠️ Lobby data hasn’t changed in the last ${notChangeSinceTimeMsg}.\n_(last updated at ${lastSuccessFullCheck.toISOString().split('T')[1].split('.')[0]} UTC)_`;

      if (pingUserId) {
        message += ` <@${pingUserId}>`;
      }

      if (manual) {
        if (msg) {
          msg.reply(message);
        } else {
          await channel.send(message); // Manual messages are always sent
        }
      } else {
        // Auto message: edit existing or send new
        if (lastAutoMessage) {
          try {
            await lastAutoMessage.edit(message);
          } catch (err) {
            console.error("⚠️ Couldn't edit last auto message. Sending new one:", err.message);
            lastAutoMessage = await channel.send(message);
          }
        } else {
          lastAutoMessage = await channel.send(message);
        }
      }
    } else {
      // ✅ Data changed — delete old unchanged message if it exists
      lastSuccessFullCheck = new Date()
      if (lastAutoMessage) {
        try {
          await lastAutoMessage.delete();
        } catch (err) {
          console.warn("⚠️ Failed to delete last auto message:", err.message);
        }
        lastAutoMessage = null;
      }
    }

  } catch (err) {
    console.error('❌ Error during lobby fetch:', err);
  }
}
