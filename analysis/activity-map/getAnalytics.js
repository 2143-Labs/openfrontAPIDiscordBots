function fetchEndpoint(gameId, endpoint) {
  return fetch(`https://openfront.pro/api/v1/analysis/${gameId}/${endpoint}`)
}
export async function getPlayers(gameId) {
  const res = await fetchEndpoint(gameId, "players")
  const players = await res.json()
  return players.players
}
export async function getPlayerStats(gameId) {
  const res = await fetchEndpoint(gameId, "get_player_stats")
  const stats = await res.json()
  return stats.player_stats_ticks
}
export async function getConstructionEvents(gameId) {
  const res = await fetchEndpoint(gameId, "get_construction_events")
  const events = await res.json()
  return events.events
}
export async function getDisplayEvents(gameId) {
  const res = await fetchEndpoint(gameId, "get_display_events")
  const events = await res.json()
  return events.events
}
export async function getGeneralEvents(gameId) {
  const res = await fetchEndpoint(gameId, "get_general_events")
  const events = await res.json()
  return events.events
}
//console.log(await getPlayers("tj2eiZQE"))
//console.log(await getPlayerStats("tj2eiZQE"))
//console.log(await getConstructionEvents("tj2eiZQE"))
//console.log(await getDisplayEvents("tj2eiZQE"))
//console.log(await getGeneralEvents("tj2eiZQE"))