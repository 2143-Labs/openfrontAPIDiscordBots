import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const commands = new Map();

export function addCommand(name, handler) {
  commands.set(name.toLowerCase(), handler);
}

export function getCommand(name) {
  return commands.get(name.toLowerCase());
}

export async function loadCommandsFrom(dir = './commands') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const commandDir = path.resolve(__dirname, dir);

  const files = fs.readdirSync(commandDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = path.join(commandDir, file);
    try {
      const mod = await import(`file://${filePath}`);
      if (typeof mod.default === 'function') {
        const commandName = path.basename(file, '.js');
        addCommand(commandName, mod.default);
        console.log(`✅ Loaded command: ${commandName}`);
      } else {
        console.warn(`⚠️ Skipped ${file}: missing default export`);
      }
    } catch (err) {
      console.error(`❌ Failed to load ${file}:`, err);
    }
  }
}
