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
/**
 * Efficiently process all intents across multiple turns.
 * @param {Array} turns - Array of turns, each with a `.intents` array
 * @param {Function} processIntentFn - Async function to process a single intent
 * @param {number} batchSize - Optional, number of turns to process concurrently
 * @returns {Promise<Array>} - Array of all processed intents
 */
export async function collectIntents(
  turns,
  { name, manifest, winnerIds, batchSize = 10 } = {}
) {
  // Object to store results per type
  const results = {};
  const winnerResults = {};
  for (let i = 0; i < turns.length; i += batchSize) {
    const batch = turns.slice(i, i + batchSize);

    // Process each batch of turns concurrently
    const batchResults = await Promise.all(
      batch.map(turn =>
        Promise.all(
          turn.intents.map(async intent => {
            if (!intentHandlers[intent.type]) return null; // skip unknown types
            const data = await intentHandlers[intent.type](intent, { name, manifest });
            if (!results[intent.type]) results[intent.type] = [];
            results[intent.type].push(data);
            if (winnerIds.includes(clientId)) {
              if (!winnerResults[intent.type]) winnerResults[intent.type] = [];
            winnerResults[intent.type].push(data);
            }
            return { type: intent.type, data};
          })
        )
      )
    );

    // Flatten and sort into type arrays
  }

  return { results, winnerResults };
}