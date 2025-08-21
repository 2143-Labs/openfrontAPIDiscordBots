import saveGame from './saveGame.js'
import fetchGameIds from '../gameIdGetter/fetchFrontPlusDump.js'
const date = new Date().setDate(new Date().getDate() - 1)
fetchGameIds(1, { date: new Date(date) }).then((game_ids) => {
  console.log(game_ids.length)
  let queueInterval = null
  queueInterval = setInterval(() => {
    if (!game_ids.length) {clearInterval(queueInterval); return}
    const game_id = game_ids.shift()
    saveGame(game_id)
    console.log(game_id)
  }, 100)
})