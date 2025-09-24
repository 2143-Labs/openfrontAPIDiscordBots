import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'node:url';

async function importIntentHandlers(dir = "./processers/intents") {
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

  return handlers;
}
export const intentHandlers = await importIntentHandlers()

async function importStatProcessors(dir = "./processers/stats") {
  const stats = {};
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const statsDir = path.resolve(__dirname, dir);
  const files = fs.readdirSync(statsDir).filter(f => f.endsWith('.js'));
  for await (const file of files) {
    const modulePath = path.join(statsDir, file);
    const mod = await import(`file://${modulePath}`);
    const key = path.basename(file, ".js");
    stats[key] = mod;
  }
  return stats;
}

export const statProcessors = await importStatProcessors()
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

  // Gather all intents by type
  const allIntents = Array.isArray(game.intents) ? game.intents : [];
  const intentsByType = {};
  for (const intent of allIntents) {
    if (!intentsByType[intent.type]) intentsByType[intent.type] = [];
    intentsByType[intent.type].push(intent);
  }

  // Prepare info object
  const info = game.info || {};

  // Prepare stat results
  const statResults = {};

  // First, process all stats that only require intents (no dependencies)
  for (const [statName, processor] of Object.entries(statProcessors)) {
    const requirements = processor.info || {};
    // Gather required intents
    let requiredIntents = [];
    if (requirements.requiredIntent) requiredIntents.push(requirements.requiredIntent);
    if (Array.isArray(requirements.requiredIntents)) requiredIntents.push(...requirements.requiredIntents);
    // Remove duplicates
    requiredIntents = [...new Set(requiredIntents)];
    // Gather intents for this stat
    const statIntents = requiredIntents.map(type => intentsByType[type] || []);
    // Gather required info
    let requiredInfo = requirements.requiredInfo || [];
    const statInfo = requiredInfo.map(key => info[key]);
    // Only process stats that don't require other stats yet
    if (!requirements.requiredStats || requirements.requiredStats.length === 0) {
      // For each exported function (except 'info'), run it
      for (const [fnName, fn] of Object.entries(processor)) {
        if (fnName === 'info' || typeof fn !== 'function') continue;
        // Call with (intents, [], info)
        statResults[`${statName}.${fnName}`] = await fn(statIntents, [], statInfo);
      }
    }
  }

  // Now process stats that require other stats (resolve dependencies naively)
  for (const [statName, processor] of Object.entries(statProcessors)) {
    const requirements = processor.info || {};
    if (!requirements.requiredStats || requirements.requiredStats.length === 0) continue;
    // Gather required intents
    let requiredIntents = [];
    if (requirements.requiredIntent) requiredIntents.push(requirements.requiredIntent);
    if (Array.isArray(requirements.requiredIntents)) requiredIntents.push(...requirements.requiredIntents);
    requiredIntents = [...new Set(requiredIntents)];
    const statIntents = requiredIntents.map(type => intentsByType[type] || []);
    // Gather required stats
    const requiredStats = requirements.requiredStats;
    const statStats = requiredStats.map(dep => {
      // Try to get all results for that stat
      return Object.entries(statResults)
        .filter(([k, v]) => k.startsWith(dep + '.'))
        .map(([k, v]) => v)[0]; // Take the first result for now
    });
    // Gather required info
    let requiredInfo = requirements.requiredInfo || [];
    const statInfo = requiredInfo.map(key => info[key]);
    for (const [fnName, fn] of Object.entries(processor)) {
      if (fnName === 'info' || typeof fn !== 'function') continue;
      statResults[`${statName}.${fnName}`] = await fn(statIntents, statStats, statInfo);
    }
  }

  return statResults;
}