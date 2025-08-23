export const info =  = { requiredIntents: [], dataTypes: ["avrg", "startDistance"], requiredStats: ["attacks", "spawns"], requiredInfo: ["players"] }

export async function basic(intents, stats, info) {
  const attacks = stats[0]
  const spawns = stats[1]
  const players = info[0]
}
