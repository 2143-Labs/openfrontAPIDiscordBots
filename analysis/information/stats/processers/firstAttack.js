export const info = { requiredIntents: [], dataTypes: ["avrg", "startDistance"], requiredStats: ["attacks", "spawns"], requiredInfo: ["players"] }
export async function basic(intents, stats, info) {
  const attacks = stats[0]
  const players = info[0]
  const firstAttacks = new Map()
  for (const player of players) {
    const playerAttacks = attacks.filter(player.clientID)
    if (playerAttacks.length<1) firstAttacks.set(player.clientID, null); else firstAttacks.set(player.clientID, playerAttacks[0])
  }
  return firstAttacks
}
export async function startDistance(intents, stats, info) {
  const firstAttacks = await basic(intents, stats, info)
  const spawns = stats[1]
  const distances = new Map()
  for (const attack of firstAttacks) {
    const attackerSpawn = spawns.get(attack.clientID)
    const targetSpawn = spawns.get(attack.targetID)
    let distance = dist(attackerSpawn.tile, targetSpawn.tile)
    distances.set(attack.clientID, distance)
  }
  return distances
}
function dist(p1, p2) {
  const deltaX = p2.x - p1.x;
  const deltaY = p2.y - p1.y;
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}
export async function avrg(intents, stats, info, avrg = []) {
  const distances = await startDistance(intents, stats, info)
  distances.values().forEach((distance)=>{
    avrg.push(distance)
  })
  return avrg
}