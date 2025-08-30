import { getPlayers, getPlayerStats, getConstructionEvents, getDisplayEvents, getGeneralEvents } from './getAnalytics.js'
const generalEvents = await getGeneralEvents("tj2eiZQE")
const displayEvents = await getDisplayEvents("tj2eiZQE")
const generalEventTypes = new Set()
generalEvents.forEach((e)=>{
  generalEventTypes.add(e.event_type)
})
const displayEventTypes = new Set()
displayEvents.forEach((e)=>{
  displayEventTypes.add(e.message_type)
})
console.log(generalEventTypes)
console.log(displayEventTypes)