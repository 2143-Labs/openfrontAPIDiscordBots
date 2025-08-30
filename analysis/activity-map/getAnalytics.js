function fetchEndpoint(gameId, endpoint) {
  return fetch(`https://openfront.pro/api/v1/analysis/${gameId}/${endpoint}`)
}
export async function getPlayers(gameId) {
  const res = await fetchEndpoint(gameId, "players")
  const players = await res.json()
  return players.players
}
export async function getPlayerStats(gameId) {
  const res = await fetchEndpoint(gameId), "get_player_stats")
}
console.log(await getPlayers("tj2eiZQE"))