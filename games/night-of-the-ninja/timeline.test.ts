import {test} from 'node:test'
import assert from 'node:assert/strict'
import {revealedPlayers,timelineRows} from './timeline.ts'
import type {PublicEvent} from './engine.ts'

test('reveal batches preserve multipicks and execution scopes without disclosing targets to spectators',()=>{
  const item=(seq:number,kind:string,actors:string[],extra:Partial<PublicEvent>={}):PublicEvent=>
    ({seq,round:1,at:0,kind,actors,text:'',...extra})
  const events=[
    item(1,'reveal-card',['a'],{group:'r1:blind',card:'blind-1'}),
    item(2,'reveal-card',['b'],{group:'r1:blind',card:'blind-2'}),
    item(3,'reveal-card',['a'],{group:'r1:blind',card:'blind-3'}),
    item(4,'play',['a'],{card:'blind-1'}),
    item(5,'attack',['a','c'],{executionId:4}),
    item(6,'mirror',['c'],{executionId:4,card:'mirror'}),
    item(7,'death',['a'],{executionId:4}),
    item(8,'play',['b'],{card:'blind-2'}),
    item(9,'play',['a'],{card:'blind-3'}),
    item(10,'reveal-card',['d'],{card:'mystic-1'}),
    item(11,'round',[],{round:2}),
  ]
  const targets=[
    {round:1,after:4,executionId:4,player:'a',target:'c',card:'blind-1',ordinal:1 as const},
    {round:1,after:9,executionId:9,player:'a',target:'d',card:'blind-3',ordinal:1 as const},
  ]
  const rows=timelineRows(events,targets,1)
  assert.deepEqual(rows.map(row=>row.kind),['batch','execution','execution','execution','event'])
  const [batch,first,,last,standalone]=rows
  assert(batch.kind==='batch'&&first.kind==='execution'&&last.kind==='execution'&&standalone.kind==='event')
  assert.deepEqual(revealedPlayers(batch.events),[['a',['blind-1','blind-3']],['b',['blind-2']]])
  assert.deepEqual(first.details.map(event=>event.kind),['target','attack','mirror','death'])
  assert.deepEqual(last.details[0].actors,['a','d'])
  assert.equal(standalone.event.card,'mystic-1')
  assert(!JSON.stringify(timelineRows(events,[],1)).includes('target-'))
  assert.equal(timelineRows(events,targets,2).length,1)
})
