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
  assert.deepEqual(first.details.map(event=>event.kind),['attack','mirror','death'])
  assert.deepEqual(last.details[0].actors,['a','d'])
  assert.equal(standalone.event.card,'mystic-1')
  assert(!JSON.stringify(timelineRows(events,[],1)).includes('target-'))
  assert.equal(timelineRows(events,targets,2).length,1)
})

test('UX3.2 merges target confirmation with actual effect, excludes presentation pause',()=>{
  const event=(seq:number,kind:string,actors:string[],executionId?:number):PublicEvent=>({
    seq,at:seq,round:1,kind,actors,text:kind,
    ...(executionId===undefined?{}:{executionId}),
    ...(kind==='play'?{card:seq===1?'spy-1':seq===5?'mystic-1':'trickster-1'}:{}),
  })
  const events=[
    event(1,'play',['a']),
    event(2,'identity-view',['a','b'],1),
    event(3,'target-focus',['a','b'],1),
    event(4,'round',[]),
    event(5,'play',['c']),
    event(6,'identity-view',['c','d'],5),
    event(7,'target-focus',['c','d'],5),
    event(8,'play',['b']),
    event(9,'identity-view',['b','a'],8),
    event(10,'identity-view',['b','d'],8),
    event(11,'shift-result',['a','d'],8),
  ]
  const targets=[
    {round:1,after:1,executionId:1,player:'a',target:'b',card:'spy-1',ordinal:1 as const},
    {round:1,after:5,executionId:5,player:'c',target:'d',card:'mystic-1',ordinal:1 as const},
    {round:1,after:8,executionId:8,player:'b',target:'a',card:'trickster-1',ordinal:1 as const},
    {round:1,after:9,executionId:8,player:'b',target:'d',card:'trickster-1',ordinal:2 as const},
  ]
  const rows=timelineRows(events,targets,1)
  assert.deepEqual(rows.map(row=>row.kind),['execution','event','execution','execution'])
  const groups=rows.filter(row=>row.kind==='execution')
  assert(groups.every(row=>row.kind==='execution'))
  assert.deepEqual(groups.map(row=>row.details.map(e=>e.kind)),[
    ['identity-view'],['identity-view'],['identity-view','identity-view','shift-result']
  ])
  assert(!JSON.stringify(rows).includes('target-focus'))
  assert.deepEqual(events.map(e=>e.kind).filter(kind=>kind==='target-focus').length,2)
})
test('UX3.2 fallback targets remain when no public effect is available, attack and honor collapse repeats',()=>{
  const event=(seq:number,kind:string,actors:string[],executionId?:number,card?:string):PublicEvent=>({
    seq,at:seq,round:1,kind,actors,text:kind,...(card?{card}:{}),
    ...(executionId===undefined?{}:{executionId}),
  })
  const cases=[
    {card:'trickster-4',effect:undefined,expected:['target']}, // private merchant honor inspection
    {card:'trickster-4',effect:'honor',expected:['honor']},
    {card:'blind-1',effect:'attack',expected:['attack']},
    {card:'trickster-5',effect:'honor',expected:['honor']},
  ]
  for(const [i,item] of cases.entries()){
    const events=[event(1,'play',['a'],undefined,item.card),
      ...(item.effect?[event(2,item.effect,['a','b'],1)]:[])]
    const targets=[{round:1,after:1,executionId:1,player:'a',target:'b',card:item.card,ordinal:1 as const}]
    const rows=timelineRows(events,targets,1)
    assert.equal(rows.length,1,i+' should have one execution')
    assert(rows[0].kind==='execution')
    assert.deepEqual(rows[0].details.map(e=>e.kind),item.expected,item.card)
  }
})
