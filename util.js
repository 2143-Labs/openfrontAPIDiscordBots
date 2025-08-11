const CHANNEL_ID = process.env.ALERT_CHANNEL_ID;
let lastLobbies = null;
let lastAutoMessage = null; // persistent auto status message
let lastSuccessFullCheck = new Date();

/**
 * Initialize the persistent status message on bot startup
 * @param {import('discord.js').Client} client
 */
export async function initAutoStatusMessage(client) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) {
      console.error("❌ Provided channel is not text-based.");
      return;
    }

    // Search last 20 messages in the channel
    const fetched = await channel.messages.fetch({ limit: 20 });
    const botMessage = fetched.find(m =>
      m.author.id === client.user.id &&
      (
        m.content.startsWith("⚠️ Lobby data hasn’t changed") ||
        m.content.startsWith("✅ Lobby data changed") ||
        m.content.startsWith("⌛ Initializing lobby status")
      )
    );

    if (botMessage) {
      lastAutoMessage = botMessage;
      console.log(`✅ Found existing auto status message (ID: ${botMessage.id})`);
      // Pin if not already pinned
      if (!botMessage.pinned) {
        await botMessage.pin().catch(err => console.warn("⚠️ Failed to pin existing status message:", err));
      }
    } else {
      lastAutoMessage = await channel.send("⌛ Initializing lobby status...");
      console.log(`✅ Created new auto status message (ID: ${lastAutoMessage.id})`);
      await lastAutoMessage.pin().catch(err => console.warn("⚠️ Failed to pin new status message:", err));
    }
  } catch (err) {
    console.error("❌ Failed to initialize auto status message:", err);
  }
}


export async function fetchAndCompareLobbies(
  pingUserId = null,
  { manual = false, msg = null, client = null, sendMsg = true } = {}
) {
  try {
    const res = await fetch("https://openfront.pro/api/v1/lobbies");
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
    if (!sendMsg) return;

    const now = new Date();
    const notChangeSinceTimeMsg = `${Math.floor((now - lastSuccessFullCheck) / 60000)} minutes, ${Math.floor(((now - lastSuccessFullCheck) % 60000) / 1000)} seconds`;

    let messageContent;
    if (manual) {
      messageContent = `📡 Manual lobby check triggered. Lobby data is ${isSame ? "**unchanged**" : "**different**"}.`;
      if (pingUserId) messageContent += ` <@${pingUserId}>`;
      if (msg) return msg.reply(messageContent);
      return channel.send(messageContent);
    } else {
      if (isSame) {
        messageContent = `⚠️ Lobby data hasn’t changed for **${notChangeSinceTimeMsg}**.\n_(last change at ${lastSuccessFullCheck.toISOString().split('T')[1].split('.')[0]} UTC)_`;
      } else {
        lastSuccessFullCheck = now;
        messageContent = `✅ Lobby data changed at ${lastSuccessFullCheck.toISOString().split('T')[1].split('.')[0]} UTC`;
      }
      if (pingUserId) messageContent += ` <@${pingUserId}>`;

      if (!lastAutoMessage) {
        lastAutoMessage = await channel.send(messageContent);
      } else {
        try {
          await lastAutoMessage.edit(messageContent);
        } catch (err) {
          console.error("⚠️ Couldn't edit persistent auto message, sending new:", err.message);
          lastAutoMessage = await channel.send(messageContent);
        }
      }
    }
  } catch (err) {
    console.error("❌ Error during lobby fetch:", err);
  functiontion
