import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'node:url';

async function importIntentHandlers(dir = "./stats/collectors") {
  const handlers = {};
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const commandDir = path.resolve(__dirname, dir);

  const files = fs.readdirSync(commandDir).filter(f => f.endsWith('.js'));
  // Read all files in the folder
  for await (const file of files) {
    const modulePath = path.join(commandDir, file);

      // Dynamically import
      const mod = await import(`file://${modulePath}`);

      // Remove extension from filename for the key
      const key = path.basename(file, ".js");

      // Assign default export
      handlers[key] = mod.default;
    }
  }

  return handlers;
}
export const intentHandlers = await importIntentHandlers()
export async function proccessGame(game) {
  let winnerIds = []
  if (game?.info?.winner) {
    if (game.info.winner[0] === "player") {
      winnerIds.push(...game.info.winner.slice(1));
    }
    if (game.info.winner[0] === "team") {
      winnerIds.push(...game.info.winner.slice(2));
    }
  }
}