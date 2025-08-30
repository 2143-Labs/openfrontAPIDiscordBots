function baseUrl(gameId) {
  return `https://openfront.pro/api/v1/analysis/${gameId}`
}
export async function getPlayers(gameId) {
  const res = await fetch(baseUrl(gameId)+"/players")
  const players = await res.json()
  return players.players
}
console.log(await getPlayers("tj2eiZQE"))