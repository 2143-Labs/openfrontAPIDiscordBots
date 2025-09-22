export const info = { requiredIntent: "spawn", dataTypes: ["heatmap", "avrg"] }

export async function heatmap(intents, stats, info, heatmap = []) {
  intents = filterSpawns(intents[0])
  for (const intent of intents) {
    heatmap.push(intent.tile)
  }
  return heatmap
}
export async function avrg(intents, stats, info, avrg = []) {
  intents = filterSpawns(intents[0])
  for (const intent of intents) {
    avrg.push(intent.tile)
  }
  return avrg
}
export async function basic(intents, stats, info) {
  intents = intents[0]
  const results = new Map()
  for (const intent of intents) {
    results.set(intent.clientID, intent)
  }
  return results
}
function filterSpawns(spawns) {
  const results = new Map()
  for (const intent of spawns) {
    results.set(intent.clientID, intent)
  }
  return results.values().toArray()
}