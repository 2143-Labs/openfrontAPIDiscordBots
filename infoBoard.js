export default class InfoBoard {
  constructor(channelId, client) {
    this.channelId = channelId;
    this.client = client;
    this.message = null;
    this.lines = new Map();
    this.nextId = 1;

    // Return a promise that resolves when init is done
    return (async () => {
      await this.init();
      return this;
    })();
  }

  async init() {
    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel?.isTextBased()) {
        console.error("❌ Info Board channel is not text-based.");
        return;
      }

      const fetched = await channel.messages.fetch({ limit: 20 });
      const boardMsg = fetched.find(
        (m) =>
          m.author.id === this.client.user.id &&
          m.content.startsWith("# 📋 **Info Board**")
      );

      if (boardMsg) {
        this.message = boardMsg;
        console.log(`✅ Found existing Info Board (ID: ${boardMsg.id})`);

        const lines = boardMsg.content.split("\n").slice(1);
        this.lines.clear();
        for (const line of lines) {
          const match = line.match(/^\d+\. \[(.+?)\]: (.*)$/);
          if (match) {
            const [, title, data] = match;
            this.lines.set(title, { id: this.nextId++, title, data });
          }
        }
      } else {
        this.message = await channel.send(this.format());
        console.log(`✅ Created new Info Board (ID: ${this.message.id})`);
      }

      if (!this.message.pinned) {
        await this.message.pin().catch((err) =>
          console.warn("⚠️ Failed to pin Info Board:", err)
        );
      }
    } catch (err) {
      console.error("❌ Failed to initialize Info Board:", err);
    }
  }

  async setLine(title, data) {
    if (this.lines.has(title)) {
      const existing = this.lines.get(title);
      existing.data = data;
    } else {
      this.lines.set(title, { id: this.nextId++, title, data });
    }
    await this.update();
  }

  async removeLine(identifier) {
    if (typeof identifier === "string") {
      this.lines.delete(identifier);
    } else if (typeof identifier === "number") {
      for (const [title, line] of this.lines.entries()) {
        if (line.id === identifier) {
          this.lines.delete(title);
          break;
        }
      }
    }
    await this.update();
  }

  getLine(identifier) {
    if (typeof identifier === "string") {
      return this.lines.get(identifier);
    } else if (typeof identifier === "number") {
      for (const line of this.lines.values()) {
        if (line.id === identifier) return line;
      }
    }
    return null;
  }

  async update() {
    if (!this.message) {
      console.warn("⚠️ Info Board not initialized yet.");
      return;
    }
    await this.message.edit(this.format());
  }

  format() {
    if (this.lines.size === 0) {
      return "# 📋 **Info Board**\n>>> *(No entries yet)*";
    }
    let idx = 1;
    return (
      "# 📋 **Info Board**\n>>> " +
      Array.from(this.lines.values())
        .map((line) => `${idx++}. ${line.title}: ${line.data}`)
        .join("\n")
    );
  }
}
