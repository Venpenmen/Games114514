import {withPresentation} from '../../packages/game-sdk/presentation.ts'
import {ghostCandle} from '../../games/ghost-candle/engine.ts'
import {diceWerewolf} from '../../games/dice-werewolf/engine.ts'
import {nightOfTheNinja} from '../../games/night-of-the-ninja/engine.ts'

export const presentedGhost=withPresentation(ghostCandle,{
  players:s=>s.players,
  duration:(before,after)=>before.stage==='NIGHT'?3500:after.stage==='FINISHED'?5000:0,
  displayStage:s=>s.stage==='RESULT',
  display:(_before,_after,view)=>({...view,stage:'PRESENTATION',winner:undefined,roles:undefined,submitted:[]}),
  frames:(before,after,view)=>before.stage==='NIGHT'?[
    {kind:'candle',duration:1600,visible:{...view,stage:'PRESENTATION',last:undefined,winner:undefined,roles:undefined,submitted:[]}},
    {kind:'candle-result',duration:1900,visible:{...view,stage:'PRESENTATION',winner:undefined,roles:undefined,submitted:[]}},
  ]:after.stage==='FINISHED'?[{kind:'verdict',duration:5000,visible:{...view,stage:'PRESENTATION',winner:undefined,roles:undefined,submitted:[]}}]:[],
})
export const presentedDice=withPresentation(diceWerewolf,{
  players:s=>s.players,
  duration:(before,after)=>after.stage==='CHAMPION'||after.stage==='SUMMARY'?3500:before.stage==='ACTION'?2000:0,
  displayStage:s=>s.stage==='BALLOT'||s.stage==='SUMMARY',
  display:(before,_after,view)=>({...view,stage:'PRESENTATION',face:before.face,submitted:[],scores:before.scores,summary:null}),
  frames:(before,after,view)=>{
    const common={...view,stage:'PRESENTATION',face:before.face,submitted:[],scores:before.scores,summary:null,overtime:before.overtime,dryRounds:before.dryRounds}
    const frames=[]
    if(before.stage==='ACTION') frames.push({kind:'health',duration:2000,visible:{...common,
      points:after.points.map((p,i)=>({...p,removed:before.points[i].removed})),executions:before.executions,ballots:before.ballots}})
    if(after.ballots.length>before.ballots.length) frames.push({kind:'ballot',duration:1500,visible:{...common,
      points:after.points.map((p,i)=>({...p,removed:before.points[i].removed})),executions:before.executions}})
    if(after.executions.length>before.executions.length) frames.push({kind:'execution',duration:2000,visible:common})
    return frames
  },
})
export const plugins=[presentedGhost,presentedDice,nightOfTheNinja]
