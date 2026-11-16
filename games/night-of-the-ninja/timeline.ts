import type {PublicEvent,privateView} from './engine.ts'
import {cards} from './cards.ts'

type Targets=NonNullable<ReturnType<typeof privateView>>['tableTargets']
type TimelineEvent=PublicEvent & {key:string;order:number}
export type TimelineRow=
  | {kind:'batch';key:string;events:TimelineEvent[]}
  | {kind:'execution';key:string;play:TimelineEvent;details:TimelineEvent[]}
  | {kind:'event';key:string;event:TimelineEvent}

export function timelineRows(events:PublicEvent[],targets:Targets,round:number):TimelineRow[] {
  const entries:TimelineEvent[]=events.filter(event=>event.round===round)
    .map(event=>({...event,key:'event-'+event.seq,order:event.seq}))
  for(const [index,target] of targets.entries()) {
    if(target.round!==round) continue
    entries.push({key:'target-'+index,order:target.after+.5,seq:target.after,at:0,round,
      kind:'target',actors:[target.player,target.target],executionId:target.executionId,card:target.card,
      text:cards[target.card].skill==='shift'?'已确认目标 '+target.ordinal+'。':'已确认技能目标。'})
  }
  entries.sort((a,b)=>a.order-b.order)
  const rows:TimelineRow[]=[]
  const batches=new Map<string,TimelineEvent[]>()
  const executions=new Map<number,TimelineEvent[]>()
  for(const event of entries) {
    if(event.kind==='reveal-card' && event.group) {
      const existing=batches.get(event.group)
      if(existing) existing.push(event)
      else {
        const events=[event]
        batches.set(event.group,events)
        rows.push({kind:'batch',key:event.key,events})
      }
    } else if(event.kind==='play') {
      const details:TimelineEvent[]=[]
      executions.set(event.seq,details)
      rows.push({kind:'execution',key:event.key,play:event,details})
    } else {
      const details=event.executionId===undefined?undefined:executions.get(event.executionId)
      if(details) details.push(event)
      else rows.push({kind:'event',key:event.key,event})
    }
  }
  return rows
}

export function revealedPlayers(events:PublicEvent[]) {
  const cards=new Map<string,string[]>()
  for(const event of events) {
    if(!event.actors[0] || !event.card) continue
    const player=event.actors[0]
    const held=cards.get(player)
    if(held) held.push(event.card)
    else cards.set(player,[event.card])
  }
  return [...cards]
}
