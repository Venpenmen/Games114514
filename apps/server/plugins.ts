import {withPresentation} from '../../packages/game-sdk/presentation.ts'
import {ghostCandle} from '../../games/ghost-candle/engine.ts'
import {diceWerewolf} from '../../games/dice-werewolf/engine.ts'
import {nightOfTheNinja} from '../../games/night-of-the-ninja/engine.ts'

export const presentedGhost=withPresentation(ghostCandle,{
  players:s=>s.players,
  duration:(before,after)=>before.stage==='NIGHT'?3500:after.stage==='FINISHED'?5000:0,
  displayStage:s=>s.stage==='RESULT',
  display:(_before,_after,view)=>({...view,stage:'PRESENTATION',winner:undefined,roles:undefined,submitted:[]}),
})
export const presentedDice=withPresentation(diceWerewolf,{
  players:s=>s.players,
  duration:(before,after)=>after.stage==='CHAMPION'||after.stage==='SUMMARY'?3500:before.stage==='ACTION'?2000:0,
  displayStage:s=>s.stage==='BALLOT'||s.stage==='SUMMARY',
  display:(before,_after,view)=>({...view,stage:'PRESENTATION',face:before.face,submitted:[],scores:before.scores,summary:null}),
})
export const plugins=[presentedGhost,presentedDice,nightOfTheNinja]
