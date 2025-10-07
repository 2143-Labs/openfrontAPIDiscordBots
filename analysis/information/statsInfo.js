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

function runIntentHandlersOnIntents(allIntents, intentHandlers, name) {
  // For each intent, if a handler exists, run it and replace the intent with the result
  return allIntents.map(intent => {
    if (!intent || !intent.type) return intent;
    const handler = intentHandlers[intent.type];
    if (typeof handler === 'function') {
      try {
        return handler(intent, { name });
      } catch (e) {
        // If handler fails, fallback to original intent
        return intent;
      }
    }
    return intent;
  });
}

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

// Helper to process stats with dependency resolution
async function processStatsWithDeps(statProcessors, intentsByType, infoObj) {
  const statResults = {};
  const processed = new Set();

  // Helper to process a single stat and its dependencies
  async function processStat(statName) {
    if (processed.has(statName)) return;
    const processor = statProcessors[statName];
    if (!processor) return;
    const requirements = processor.info || {};
    // Process dependencies first
    if (requirements.requiredStats && requirements.requiredStats.length > 0) {
      for (const dep of requirements.requiredStats) {
        await processStat(dep);
      }
    }
    // Gather required intents
    let requiredIntents = [];
    if (requirements.requiredIntent) requiredIntents.push(requirements.requiredIntent);
    if (Array.isArray(requirements.requiredIntents)) requiredIntents.push(...requirements.requiredIntents);
    requiredIntents = [...new Set(requiredIntents)];
    const statIntents = requiredIntents.map(type => intentsByType[type] || []);
    // Gather required stats
    let statStats = [];
    if (requirements.requiredStats && requirements.requiredStats.length > 0) {
      statStats = requirements.requiredStats.map(dep => {
        // Try to get all results for that stat
        return Object.entries(statResults)
          .filter(([k, v]) => k.startsWith(dep + '.'))
          .map(([k, v]) => v)[0]; // Take the first result for now
      });
    }
    // Gather required info
    let requiredInfo = requirements.requiredInfo || [];
    const statInfo = requiredInfo.map(key => infoObj[key]);
    // For each exported function (except 'info'), run it
    for (const [fnName, fn] of Object.entries(processor)) {
      if (fnName === 'info' || typeof fn !== 'function') continue;
      console.log(`Processing stat: ${statName}.${fnName}`);
      statResults[`${statName}.${fnName}`] = await fn(statIntents, statStats, statInfo);
      console.log(statResults)
    }
    processed.add(statName);
  }

  // Process all stats
  for (const statName of Object.keys(statProcessors)) {
    await processStat(statName);
  }
  return statResults;
}

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

  // Gather all intents by type (supporting both game.intents and intents in turns)
  let allIntents = [];
  if (Array.isArray(game.intents)) {
    allIntents = allIntents.concat(game.intents);
  }
  if (Array.isArray(game.turns)) {
    for (const turn of game.turns) {
      if (Array.isArray(turn.intents)) {
        allIntents = allIntents.concat(turn.intents);
      }
    }
  }
  // Run intent handlers on all intents
  allIntents = runIntentHandlersOnIntents(allIntents, intentHandlers, game.info.config.gameMap);

  const intentsByType = {};
  for (const intent of allIntents) {
    if (!intent || !intent.type) continue;
    if (!intentsByType[intent.type]) intentsByType[intent.type] = [];
    intentsByType[intent.type].push(intent);
  }

  // Prepare info object
  const info = game.info || {};

  // Use dependency-resolving stat processor
  return await processStatsWithDeps(statProcessors, intentsByType, info);
}