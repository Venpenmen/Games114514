import {test} from 'node:test'
import assert from 'node:assert/strict'
import {cards,deck,phases,skills} from './cards.ts'
import {nightOfTheNinja as game,defaults,identities,privateView,publicView,type NinjaState} from './engine.ts'
const ids=['a','b','c','d']
const start=()=>game.start(ids,defaults,{now:0,random:()=>0})
function expire(s:NinjaState,random=(_limit:number)=>0) { game.advance(s,{now:s.deadline!,random}) }
const pairBuffer=new WeakMap<NinjaState,string>()
function click(s:NinjaState,id:string,value:string) {
  if(s.mode==='target' && s.current?.card==='trickster-1' && !value.startsWith('pair:')) {
    const previous=pairBuffer.get(s)
    if(!previous) {pairBuffer.set(s,value);return}
    pairBuffer.delete(s)
    const pair=privateView(s,id)?.options.find(option=>option.value.startsWith('pair:') &&
      [previous,value].every(target=>option.value.split(':').includes(target)))
    if(!pair)throw new Error('Illegal pair in test')
    value=pair.value
  }
  game.command(s,id,{value},{now:s.deadline!-1,random:()=>0})
}
function stage(skillCard:string,state:NinjaState,mode:NinjaState['mode']='play',actor='a') {
  state.current={player:actor,card:skillCard}
  state.mode=mode
  state.deadline=10000
  state.submissions={}
  state.queue=[]
  state.night=phases.indexOf(cards[skillCard].phase as typeof phases[number])
}
for(const card of deck) test('card metadata '+card.id,()=>{
  assert.equal(deck.filter(other=>other.id===card.id).length,1)
  assert(skills[card.skill][0])
  if(card.phase!=='special') assert.equal(deck.filter(other=>other.phase===card.phase&&other.number===card.number).length,1)
})
test('deck, all player counts and finite pool',()=>{
  assert.equal(deck.length,33)
  for(let count=4;count<=11;count++) {
    const roles=identities(count)
    assert.equal(roles.length,count)
    assert.equal(roles.filter(i=>i.house==='ronin').length,count%2)
    for(const house of ['crane','lotus']) assert.deepEqual(roles.filter(i=>i.house===house).map(i=>i.rank),Array.from({length:Math.floor(count/2)},(_,i)=>i+1))
  }
  const s=start()
  assert.deepEqual([2,3,4].map(value=>s.pool.filter(h=>h.value===value).length),[14,14,7])
})
test('draft passes left, rejects retaining the same card twice, and makes one discard per player',()=>{
  const s=start()
  const dealt=s.seats.map(p=>[...p.hand])
  for(const [i,id] of ids.entries()) click(s,id,dealt[i][0])
  assert.deepEqual(s.seats[1].hand,[dealt[1][0],...dealt[0].slice(1)])
  assert.throws(()=>click(s,'a',dealt[0][0]))
  expire(s)
  assert.equal(s.discard.length,4)
  assert(s.seats.every(p=>p.hand.length===2))
})
test('commit stays secret until barrier then resolves by ascending printed rank',()=>{
  const s=start()
  expire(s); expire(s)
  for(const [i,p] of s.seats.entries()) p.hand=['spy-'+(4-i)]
  click(s,'a','spy-4')
  assert.equal(publicView(s).events.some(e=>e.card==='spy-4'),false)
  for(const [i,id] of ids.slice(1).entries()) click(s,id,'spy-'+(3-i))
  assert.deepEqual(s.events.filter(e=>e.kind==='reveal-card').map(e=>e.card),['spy-1','spy-2','spy-3','spy-4'])
  assert.equal(s.current?.card,'spy-1')
})
for(const phase of ['spy','mystic']) test(phase+' only projects authorization snapshots',()=>{
  const s=start()
  s.seats[1].hand=['mirror']
  stage(phase+'-1',s)
  expire(s)
  click(s,'a','b')
  assert.equal(s.seats[0].intel[0].card,phase==='mystic'?'mirror':undefined)
  const notice=privateView(s,'b')?.intel[0]
  assert.equal(notice?.card,phase==='mystic'?'mirror':undefined)
  assert.equal(notice?.viewedBy,phase==='mystic'?'a':undefined)
  assert.equal(notice?.identity,undefined)
  assert.equal(notice?.actor,'a')
  assert.equal(notice?.actingCard,phase+'-1')
  assert.equal(privateView(s,'b')?.intel.length,1)
  assert.deepEqual(privateView(s,'c')?.intel,[])
  for(const player of ids) {
    const targets=privateView(s,player)!.tableTargets
    assert.deepEqual(targets.map(({player,card,target,ordinal})=>({player,card,target,ordinal})),
      [{player:'a',card:phase+'-1',target:'b',ordinal:1}])
    assert(!JSON.stringify(targets).includes('mirror'))
  }
  assert(!Object.hasOwn(publicView(s),'tableTargets'))
  assert.equal(JSON.stringify(publicView(s)).includes('mirror'),false)
})
test('timeout records the legal target exactly once and ties it to execution',()=>{
  const s=start()
  expire(s);expire(s)
  s.seats[0].hand=['spy-1']
  for(const player of ids) click(s,player,player==='a'?'spy-1':'pass')
  const executionId=publicView(s).presentation!.id
  expire(s)
  const targetPhase=s.phase
  expire(s)
  assert.notEqual(s.phase,targetPhase)
  assert.equal(privateView(s,'d')!.tableTargets[0].executionId,executionId)
  assert.equal(privateView(s,'d')!.tableTargets[0].target,'b')
  assert.throws(()=>click(s,'a','b'))
  assert.equal(privateView(s,'d')!.tableTargets.length,1)
})
test('mystic draws either card privately and records the phase',()=>{
  for(const [index,expected] of ['mirror','martyr'].entries()) {
    const s=start()
    s.seats[1].hand=['mirror','martyr']
    stage('mystic-1',s)
    expire(s)
    game.command(s,'a',{value:'b'},{now:s.deadline!-1,random:limit=>{
      assert.equal(limit,2)
      return index
    }})
    const info=privateView(s,'a')?.intel[0]
    assert.equal(info?.card,expected)
    assert.equal(info?.phase,'mystic')
    assert.equal(publicView(s).events.some(item=>item.card===expected),false)
    const restored=JSON.parse(JSON.stringify(s)) as NinjaState
    assert.equal(privateView(restored,'b')?.intel[0]?.card,expected)
    assert.equal(privateView(restored,'b')?.intel[0]?.viewedBy,'a')
    assert.throws(()=>click(restored,'a','b'))
    assert.equal(privateView(restored,'b')?.intel.length,1)
    assert.equal(privateView(restored,'c')?.tableTargets.length,1)
    restored.mode='ready'
    restored.seats[1].honor.push({id:100,value:3})
    expire(restored)
    assert.deepEqual(privateView(restored,'b')?.intel,[])
    assert.deepEqual(privateView(restored,'b')?.tableTargets,[])
    assert.equal(privateView(restored,'b')?.score,3)
    restored.seats[1].intel=s.seats[1].intel
    assert.deepEqual(privateView(restored,'b')?.intel,[])
    assert.deepEqual(privateView(start(),'b')?.intel,[])
  }
})
test('shapeshifter truth, memory and public swap only on confirmation',()=>{
  for(const answer of ['pass','yes']) {
    const s=start()
    stage('trickster-1',s); expire(s)
    const before=structuredClone(s.seats[1].identity)
    const other=structuredClone(s.seats[2].identity)
    assert.deepEqual(privateView(s,'a')?.action,{step:'target',targets:[]})
    click(s,'a','b')
    assert.deepEqual(privateView(s,'a')?.action,{step:'target',targets:[]})
    assert.equal(privateView(s,'b')?.action,undefined)
    assert.equal(Object.hasOwn(publicView(s),'action'),false)
    click(s,'a','c')
    assert.deepEqual(privateView(s,'d')?.tableTargets.map(entry=>[entry.ordinal,entry.target]),[[1,'b'],[2,'c']])
    assert.deepEqual(privateView(s,'a')?.action,{step:'choice',targets:['b','c']})
    assert.equal(privateView(s,'a')?.intel[0].source,'shift')
    click(s,'a',answer)
    click(s,'a','reveal')
    assert.deepEqual(s.seats[1].identity,answer==='yes'?other:before)
    assert.equal(s.events.some(e=>e.kind==='swap'),answer==='yes')
    assert.deepEqual(s.seats[0].intel[0].identity,before)
    assert.deepEqual(s.seats[1].known,answer==='yes'?null:before)
    assert(!s.events.find(e=>e.kind==='swap')?.identities)
  }
})
test('grave digger timeout takes a legal discard, keeps specials, and can immediately use a normal card',()=>{
  for(const card of ['mirror','shinobi-1']) {
    const s=start();s.discard=[card,'spy-1'];s.seats[0].hand=[]
    stage('trickster-2',s);expire(s)
    click(s,'a',card)
    if(card==='mirror') {assert.throws(()=>click(s,'a','yes'));expire(s);assert(s.seats[0].hand.includes(card))}
    else {click(s,'a','yes');assert.equal(s.current?.card,card);assert(!s.seats[0].hand.includes(card))}
    assert(!s.discard.includes(card))
  }
})
test('troublemaker publishes no identity until confirmation',()=>{
  const s=start();stage('trickster-3',s);expire(s);click(s,'a','b')
  assert(!s.events.some(e=>e.kind==='identity'))
  click(s,'a','yes')
  assert.deepEqual(s.events.find(e=>e.kind==='identity')?.identities,{b:s.seats[1].identity})
})
test('merchant may exchange an unseen token and thief compares counts',()=>{
  const s=start()
  s.seats[0].honor=[{id:101,value:4}]
  s.seats[1].honor=[{id:102,value:2},{id:103,value:3}]
  stage('trickster-4',s);expire(s);click(s,'a','b');click(s,'a','view:102')
  assert.deepEqual(privateView(s,'a')?.merchant?.theirs.map(t=>t.value),[2,undefined])
  assert.equal(privateView(s,'c')?.merchant,undefined)
  assert.throws(()=>click(s,'a','swap:101:999'))
  click(s,'a','swap:101:103')
  assert.equal(s.seats[0].honor[0].id,103)
  assert.equal(s.seats[0].intel[0].honor,2)
  stage('trickster-5',s);expire(s);expire(s);click(s,'a','b')
  assert.deepEqual(s.seats[0].honor.map(x=>x.id),[103,102])
  const changes=s.replay!.filter(entry=>entry.step==='honor').map(entry=>entry.honorChanges)
  assert.deepEqual(changes[0]?.map(change=>[change.id,change.before,change.after]),[['a',4,3],['b',5,6]])
  assert.deepEqual(changes[1]?.map(change=>[change.id,change.before,change.after]),[['a',3,5],['b',6,4]])
})
for(const card of ['blind-1','shinobi-1','trickster-6']) for(const response of ['mirror','martyr','pass']) {
  test('attack '+card+' / '+response,()=>{
    const s=start();s.seats[1].hand=['mirror','martyr'];stage(card,s);expire(s);if(card==='trickster-6') expire(s);click(s,'a','b')
    if(card==='shinobi-1') click(s,'a','yes')
    if(card==='trickster-6') {
      assert.equal(s.seats[1].alive,false);assert(!s.events.some(e=>e.kind==='mirror'||e.kind==='martyr'))
      return
    }
    assert.equal(s.seats[1].alive,true)
    assert(!s.events.some(e=>e.kind==='death'))
    if(response==='pass') expire(s)
    else click(s,'b',response)
    assert.equal(s.seats[1].alive,response==='mirror')
    assert.equal(s.seats[0].alive,response!=='mirror')
    assert.equal(s.seats[1].honor.length,response==='martyr'?1:0)
    if(response==='mirror') {
      assert(publicView(s).seats.find(p=>p.id==='a')?.alive)
      expire(s)
      assert.equal(privateView(s,'a')?.intel.at(-1)?.actingCard,'mirror')
      assert.equal(privateView(s,'a')?.intel.at(-1)?.actor,'b')
    }
  })
}
test('mastermind, dead teammates and finishing only after the award batch',()=>{
  const s=start()
  s.seats[0].identity={house:'crane',rank:2}
  s.seats[1].identity={house:'crane',rank:1}
  s.seats[1].alive=false
  s.seats[2].identity={house:'lotus',rank:1}
  s.seats[3].identity={house:'lotus',rank:2}
  s.seats[0].hand=['master']
  s.seats[0].honor=[{id:100,value:4},{id:101,value:4}]
  s.seats[1].honor=[{id:102,value:4},{id:103,value:4}]
  s.pool=[]
  s.night=4;s.mode='commit'
  expire(s)
  assert.deepEqual(s.awardees,['a','b'])
  assert(!publicView(s).finalScores)
  assert.equal(publicView(s).cardArea.played.some(play=>play.card==='master'),false)
  expire(s)
  assert.equal(publicView(s).presentation?.events[0].kind,'master')
  assert.equal(publicView(s).cardArea.played.find(play=>play.card==='master')?.player,'a')
  expire(s);expire(s);expire(s)
  assert.deepEqual(s.champions,['a','b'])
  assert.equal(s.pool.length,33)
  assert.equal(s.events.filter(e=>e.kind==='pool').length,1)
})

test('ronin mastermind receives only the survival award; no survivors receive none',()=>{
  const s=game.start([...ids,'e'],{...defaults,playerCount:5},{now:0,random:()=>0})
  const ronin=s.seats.find(p=>p.identity.house==='ronin')!
  s.seats.forEach(p=>{p.hand=[]})
  ronin.hand=['master']
  s.night=4;s.mode='commit'
  expire(s)
  assert.deepEqual(s.awardees,[ronin.id])
  expire(s);expire(s);expire(s);expire(s)
  assert.equal(ronin.honor.length,1)
  assert.equal(s.seats.filter(p=>p.honor.length).length,1)
  s.seats.forEach(p=>{p.alive=false})
  s.night=4;s.mode='commit'
  expire(s);expire(s);expire(s)
  assert.deepEqual(s.awardees,[])
  assert.equal(ronin.honor.length,1)
})

test('authoritative presentation preserves reaction and the next full operation deadline',()=>{
  const s=start();s.seats[1].hand=['mirror']
  stage('blind-1',s);expire(s);click(s,'a','b')
  const reactionDeadline=s.deadline!
  assert.equal(s.mode,'reaction')
  assert(!s.events.some(e=>e.kind==='death'))
  click(s,'b','mirror')
  assert.equal(s.mode,'presentation')
  const projected=publicView(s).presentation!
  assert.equal(projected.duration,3500)
  assert.equal(projected.startedAt,reactionDeadline-1)
  assert.deepEqual(projected.events.map(e=>e.kind),['mirror'])
  assert(!publicView(s).events.some(event=>event.kind==='death'))
  assert(publicView(s).seats[0].alive)
  assert(!privateView(s,'a')?.intel.some(entry=>entry.actingCard==='mirror'))
  assert.deepEqual(privateView(s,'b')?.options,[])
  assert.throws(()=>click(s,'b','pass'))
  assert(!Object.hasOwn(publicView(s),'replay'))
  assert(!Object.hasOwn(privateView(s,'b')!,'replay'))
  const restored=JSON.parse(JSON.stringify(s)) as NinjaState
  assert.deepEqual(publicView(restored).presentation,projected)
  const end=restored.deadline!
  game.advance(restored,{now:end-1,random:()=>0})
  assert.equal(restored.mode,'presentation')
  expire(restored)
  assert.equal(publicView(restored).presentation?.events[0].kind,'death')
  assert(!publicView(restored).seats[0].alive)
  expire(restored)
  assert.equal(restored.mode,'commit')
  assert.equal(restored.deadline,end+4000+defaults.play*1000)
  assert.equal(restored.events.filter(e=>e.kind==='death').length,1)
})

test('complete replay is captured by round and exposed only after the final barrier',()=>{
  const s=start()
  const deals=s.seats.map(p=>[...p.hand])
  expire(s);expire(s)
  const first=s.replay!.find(entry=>entry.step==='draft1')!
  assert.deepEqual(first.draft![1].received,first.draft![0].passed)
  for(let i=0;i<7;i++) expire(s)
  while(s.mode==='presentation'||s.mode==='awards') expire(s)
  assert.equal(s.mode,'ready')
  expire(s)
  assert.equal(s.round,2)
  s.seats.forEach(p=>p.honor=[{id:300,value:12}])
  for(let i=0;i<15 && publicView(s).mode!=='champion';i++) {
    assert(!Object.hasOwn(publicView(s),'replay'))
    expire(s)
  }
  assert.equal(s.mode,'champion')
  const replay=publicView(JSON.parse(JSON.stringify(s)) as NinjaState)
  assert(replay.replayComplete)
  assert.deepEqual(replay.replay!.find(entry=>entry.step==='deal')!.seats!.map(p=>p.hand),deals)
  assert(replay.replay!.some(entry=>entry.round===2 && entry.step==='round-score' && entry.seats?.some(p=>p.honor?.some(h=>h.value===12))))
  delete s.replay
  delete s.replayFrom
  assert.deepEqual(publicView(s).replay,[])
  assert.equal(publicView(s).replayComplete,false)
})

test('legacy single-batch award resumes from its existing deadline without awarding twice',()=>{
  const s=start()
  s.seats[0].honor=[{id:100,value:3}]
  s.mode='presentation'
  s.deadline=5000
  s.presentation={events:[],duration:5000,next:{mode:'ready',seconds:30}}
  delete s.replay
  delete s.tableTargets
  game.advance(s,{now:4999,random:()=>0})
  assert.equal(publicView(s).mode,'presentation')
  expire(s)
  assert.equal(publicView(s).mode,'ready')
  assert.equal(s.deadline,35000)
  assert.equal(privateView(s,'a')!.score,3)
})

test('martyr award and death are published on distinct steps',()=>{
  const s=start()
  s.seats[1].hand=['martyr']
  stage('blind-1',s); expire(s); click(s,'a','b'); click(s,'b','martyr')
  assert.equal(publicView(s).presentation?.events[0].kind,'martyr')
  assert.equal(privateView(s,'b')?.score,0)
  assert(publicView(s).seats[1].alive)
  expire(s)
  assert.equal(publicView(s).presentation?.events[0].kind,'honor')
  assert(privateView(s,'b')!.score>=2)
  assert(publicView(s).seats[1].alive)
  expire(s)
  assert.equal(publicView(s).presentation?.events[0].kind,'death')
  assert(!publicView(s).seats[1].alive)
})

for(const card of ['spy-1','mystic-1','trickster-1','trickster-3','trickster-4','trickster-5','trickster-6','blind-1','shinobi-1']) {
  test('target visibility '+card,()=>{
    const s=start()
    s.seats[1].hand=['mirror']
    s.seats[1].honor=[{id:100,value:3}]
    stage(card,s)
    expire(s)
    if(publicView(s).mode==='presentation') expire(s)
    click(s,'a','b')
    if(card==='trickster-1') click(s,'a','c')
    assert(!Object.hasOwn(publicView(s),'tableTargets'))
    for(const id of ids) assert.equal(privateView(s,id)?.tableTargets[0]?.target,'b')
    const outside=privateView(s,'c')!
    if(card==='trickster-1') assert.equal(outside.intel.at(-1)?.actingCard,card)
    else assert.deepEqual(outside.intel,[])
    const recipient=privateView(s,'b')!.intel.at(-1)!
    assert.equal(recipient.actingCard,card)
    assert.equal(recipient.identity,undefined)
    assert.equal(recipient.honor,undefined)
    assert.equal(recipient.card,card==='mystic-1'?'mirror':undefined)
  })
}

test('hidden exchange and no exchange have identical observer snapshots and survive storage',()=>{
  const initial=start()
  stage('trickster-1',initial);expire(initial)
  click(initial,'a','b');click(initial,'a','c')
  const outcomes=['pass','yes'].map(value=>{
    const state=structuredClone(initial)
    click(state,'a',value)
    assert.equal(publicView(state).seats.find(p=>p.id==='b')!.exposure,'partial')
    click(state,'a','hide')
    return JSON.parse(JSON.stringify(state)) as NinjaState
  })
  assert.deepEqual(publicView(outcomes[0]),publicView(outcomes[1]))
  for(const player of ['b','c','d']) assert.deepEqual(privateView(outcomes[0],player),privateView(outcomes[1],player))
  assert.notDeepEqual(privateView(outcomes[0],'a')!.identities,privateView(outcomes[1],'a')!.identities)
  assert.equal(publicView(outcomes[1]).roundShifts,undefined)
  assert.equal(publicView(outcomes[1]).events.filter(event=>event.kind==='identity-view').length,2)
})
test('configured or already exposed identity forces public result',()=>{
  for(const force of [true,false]) {
    const state=start()
    if(force) state.config={...state.config,forceShiftReveal:1}
    else state.seats[1].exposed='full'
    stage('trickster-1',state);expire(state)
    click(state,'a','b');click(state,'a','c');click(state,'a','yes')
    assert.equal(state.mode,'presentation')
    assert.equal(publicView(state).events.at(-1)?.kind,'swap')
    if(!force) {
      assert.equal(publicView(state).seats.find(seat=>seat.id==='b')?.identity,null)
      assert.deepEqual(publicView(state).seats.find(seat=>seat.id==='c')?.identity,state.seats[2].identity)
    }
  }
})
test('all 33 cards stay in exactly one zone for four, six, eight and eleven players',()=>{
  for(const count of [4,6,8,11]) {
    const s=game.start(Array.from({length:count},(_,i)=>String(i)),{...defaults,playerCount:count},{now:0,random:n=>n-1})
    for(let step=0;step<250;step++) {
      const cards=[...s.seats.flatMap(p=>p.hand),...s.undealt!,...s.discard,...s.tableCards!.map(card=>card.card)]
      assert.equal(cards.length,33)
      assert.equal(new Set(cards).size,33)
      const view=publicView(s)
      assert.equal(view.seats.reduce((sum,p)=>sum+p.handCount,0)+view.cardArea.discard+view.cardArea.undealt+view.cardArea.played.length,33)
      if(s.mode==='ready'||s.mode==='champion') break
      const player=s.seats.find(p=>privateView(s,p.id)?.options.some(option=>option.value!=='pass'))
      const option=player && privateView(s,player.id)?.options.find(option=>option.value!=='pass')
      if(player && option) click(s,player.id,option.value)
      else expire(s)
    }
  }
})

test('later views refresh current identity without changing earlier observations',()=>{
  const s=start()
  stage('trickster-1',s);expire(s)
  click(s,'a','b');click(s,'a','c')
  const old=structuredClone(privateView(s,'a')!.intel[0].identity)
  click(s,'a','yes');click(s,'a','hide')
  assert.equal(privateView(s,'b')!.identities.b,null)
  expire(s)
  stage('spy-1',s,'play','b');expire(s);click(s,'b','c')
  assert.deepEqual(privateView(s,'b')!.identities.c,old)
  assert.deepEqual(privateView(s,'a')!.intel[0].identity,old)
  assert.equal(publicView(s).seats.find(p=>p.id==='c')!.identity,null)
})
test('round replay publishes the actual hidden decision only at the round boundary',()=>{
  const s=start()
  stage('trickster-1',s);expire(s)
  click(s,'a','b');click(s,'a','c');click(s,'a','pass');click(s,'a','hide')
  assert.equal(publicView(s).roundShifts,undefined)
  while(s.mode!=='ready'&&s.mode!=='champion') expire(s)
  assert.deepEqual(publicView(s).roundShifts,[{actors:['b','c'],exchanged:false,disclosed:false}])
})

test('self inspection leaves the original card unseen and only foreign inspection raises the grade',()=>{
  const s=start()
  assert(publicView(s).seats.every(p=>p.exposure==='unseen'))
  stage('trickster-1',s);expire(s)
  click(s,'a','a')
  assert.equal(publicView(s).seats[0].exposure,'unseen')
  click(s,'a','b')
  assert.equal(publicView(s).seats[1].exposure,'partial')
  assert.equal(publicView(s).events.filter(event=>event.kind==='identity-view').length,2)

  for(const reveal of ['hide','reveal']) {
    const branches=['pass','yes'].map(answer=>{
      const branch=structuredClone(s)
      click(branch,'a',answer)
      click(branch,'a',reveal)
      return JSON.parse(JSON.stringify(branch)) as NinjaState
    })
    const grades=(branch:NinjaState)=>publicView(branch).seats.slice(0,2).map(p=>p.exposure)
    if(reveal==='hide') {
      assert.deepEqual(publicView(branches[0]),publicView(branches[1]))
      for(const player of ['b','c','d']) assert.deepEqual(privateView(branches[0],player),privateView(branches[1],player))
      assert.deepEqual(grades(branches[0]),['pending','pending'])
      assert.deepEqual(grades(branches[1]),['pending','pending'])
    } else {
      assert.deepEqual(grades(branches[0]),['unseen','partial'])
      assert.deepEqual(grades(branches[1]),['partial','unseen'])
    }
    assert.equal(privateView(branches[0],'a')?.exposures.a,'unseen')
    assert.equal(privateView(branches[1],'a')?.exposures.a,'partial')
    assert.equal(privateView(branches[1],'a')?.exposures.b,'unseen')
  }
})

test('outside inspection after hidden self-shift resolves only the inspected seat exposure',()=>{
  const base=start()
  stage('trickster-1',base);expire(base)
  click(base,'a','a');click(base,'a','b')
  const results=[]
  for(const answer of ['pass','yes']) {
    const s=structuredClone(base)
    click(s,'a',answer);click(s,'a','hide')
    expire(s)
    assert.deepEqual(publicView(s).seats.slice(0,2).map(p=>p.exposure),['pending','pending'])
    stage('spy-1',s,'play','c');expire(s);click(s,'c','b')
    assert.equal(publicView(s).seats[0].exposure,'pending')
    assert.equal(publicView(s).seats[1].exposure,'partial')
    for(const id of ids) assert.equal(privateView(s,id)?.exposures.b,'partial')
    assert.deepEqual(privateView(s,'c')?.identities.b,s.seats[1].identity)
    results.push(publicView(s))
  }
  assert.deepEqual(results[0],results[1])
})

test('possible original holder inspecting after hidden shift does not disclose the branch',()=>{
  const base=start()
  stage('trickster-1',base);expire(base)
  click(base,'a','a');click(base,'a','b')
  const branches=['pass','yes'].map(answer=>{
    const s=structuredClone(base)
    click(s,'a',answer);click(s,'a','hide');expire(s)
    stage('trickster-1',s,'play','b');expire(s);click(s,'b','b')
    return s
  })
  assert.deepEqual(publicView(branches[0]),publicView(branches[1]))
  assert.equal(publicView(branches[0]).seats[1].exposure,'pending')
})


test('chained hidden shapeshifter decisions preserve nonparticipants public and private parity',()=>{
  const begin=start()
  stage('trickster-1',begin);expire(begin)
  click(begin,'a','a');click(begin,'a','b')
  const initial=['pass','yes'].map(answer=>{
    const s=structuredClone(begin)
    click(s,'a',answer);click(s,'a','hide');expire(s)
    return s
  })
  for(const actor of ['a','b','c','d']) {
    for(const [left,right] of [['a','b'],['a','c'],['b','c'],['c','d']]) {
      for(const outcome of ['pass','yes']) {
        const results=initial.map(source=>{
          const s=structuredClone(source)
          stage('trickster-1',s,'play',actor);expire(s)
          click(s,actor,left);click(s,actor,right)
          click(s,actor,outcome);click(s,actor,'hide');expire(s)
          return JSON.parse(JSON.stringify(s)) as NinjaState
        })
        assert.deepEqual(publicView(results[0]),publicView(results[1]))
        for(const id of ids.filter(id=>id!=='a' && id!==actor)) {
          assert.deepEqual(privateView(results[0],id),privateView(results[1],id))
        }
      }
    }
  }
})

test('round reveal restores actual grades without formally revealing dead players',()=>{
  const s=start()
  stage('trickster-1',s);expire(s)
  click(s,'a','a');click(s,'a','b');click(s,'a','yes');click(s,'a','hide')
  expire(s)
  s.seats[1].alive=false
  while(s.mode!=='ready' && s.mode!=='champion') expire(s)
  assert.equal(publicView(s).seats[0].exposure,'full')
  assert.equal(publicView(s).seats[1].exposure,'unseen')
  assert.equal(publicView(s).seats[1].identity,null)
  assert.equal(publicView(s).roundShifts?.[0].exchanged,true)
  expire(s)
  assert(publicView(s).seats.every(p=>p.exposure==='unseen'))
})

test('UX2 shapeshifter pair selection is atomic, ordered and privately notifies counterparts',()=>{
  const s=start()
  stage('trickster-1',s);expire(s)
  assert(privateView(s,'a')?.options.some(option=>option.value==='pair:c:b'))
  assert.throws(()=>game.command(s,'a',{value:'pair:b:b'},{now:s.deadline!-1,random:()=>0}))
  assert.equal(s.seats[1].intel.length,0)
  assert.equal(s.tableTargets?.length??0,0)
  click(s,'a','pair:c:b')
  assert.deepEqual(privateView(s,'a')?.action?.targets,['c','b'])
  assert.deepEqual(s.tableTargets?.map(item=>item.target),['c','b'])
  assert.equal(privateView(s,'d')?.intel.length,0)
  click(s,'a','yes');click(s,'a','hide')
  assert.equal(privateView(s,'c')?.intel.findLast(item=>item.counterpart)?.counterpart,'b')
  assert.equal(privateView(s,'b')?.intel.findLast(item=>item.counterpart)?.counterpart,'c')
  assert.equal(privateView(s,'d')?.intel.find(item=>item.counterpart),undefined)
  assert.equal(publicView(s).roundShifts,undefined)
})

test('UX2 shapeshifter pair timeout chooses two distinct eligible targets',()=>{
  const s=start()
  stage('trickster-1',s);expire(s)
  expire(s)
  assert.equal(s.mode,'choice')
  assert(s.target!==s.second)
  assert.deepEqual(privateView(s,'a')?.action?.targets,[s.target,s.second])
})

test('UX2 merchant known identities cannot be re-inspected',()=>{
  const s=start()
  s.seats[0].honor=[{id:201,value:4}]
  s.seats[1].honor=[{id:202,value:2},{id:203,value:3}]
  s.seats[0].knowledge={b:[structuredClone(s.seats[1].identity)]}
  stage('trickster-4',s);expire(s);click(s,'a','b')
  assert(!privateView(s,'a')?.options.some(option=>option.value==='house'))
  assert(privateView(s,'a')?.options.some(option=>option.value==='view:202'))
  assert.throws(()=>click(s,'a','house'))
  click(s,'a','view:202')
  assert.deepEqual(privateView(s,'a')?.merchant?.theirs.map(item=>item.value),[2,undefined])
  assert.equal(privateView(s,'b')?.merchant,undefined)
  assert.equal(privateView(s,'c')?.merchant,undefined)
  assert.throws(()=>click(s,'a','swap:201:999'))
  click(s,'a','swap:201:203')
  assert.equal(s.seats[0].honor[0].id,203)
  assert.equal(s.seats[1].honor.find(item=>item.id===201)?.value,4)
})

test('UX2 merchant voluntary skip does not transfer honor',()=>{
  const s=start()
  s.seats[0].honor=[{id:201,value:4}]
  s.seats[1].honor=[{id:202,value:2}]
  stage('trickster-4',s);expire(s);click(s,'a','b')
  assert(privateView(s,'a')?.options.some(option=>option.value==='house'))
  click(s,'a','view:202')
  assert.equal(privateView(s,'a')?.merchant?.theirs[0].value,2)
  click(s,'a','pass')
  assert.deepEqual(s.seats[0].honor.map(item=>item.id),[201])
  assert.deepEqual(s.seats[1].honor.map(item=>item.id),[202])
})

test('UX3 initial identity stays first historical fact after a hidden shapeshift',()=>{
  const s=start()
  const originalB=structuredClone(s.seats[1].identity)
  const originalC=structuredClone(s.seats[2].identity)
  assert.deepEqual(privateView(s,'b')?.initialIdentity?.identity,originalB)
  assert.equal(privateView(s,'b')?.initialIdentity?.round,s.round)
  assert.deepEqual(privateView(s,'c')?.initialIdentity?.identity,originalC)
  assert(!Object.hasOwn(publicView(s),'initialIdentity'))
  assert.equal(privateView(s,'b')?.intel.length,0)
  stage('trickster-1',s);expire(s);click(s,'a','pair:b:c')
  click(s,'a','yes');click(s,'a','hide')
  assert.deepEqual(s.seats[1].identity,originalC)
  assert.deepEqual(privateView(s,'b')?.initialIdentity?.identity,originalB)
  assert.deepEqual(privateView(s,'c')?.initialIdentity?.identity,originalC)
  const copy=structuredClone(s)
  assert.deepEqual(privateView(copy,'b')?.initialIdentity,privateView(s,'b')?.initialIdentity)
  assert.deepEqual(privateView(copy,'c')?.initialIdentity,privateView(s,'c')?.initialIdentity)
  assert(!Object.hasOwn(privateView(copy,'a')!.initialIdentity!,'seats'))
})

test('UX3 private initial deal is separately scoped to every player',()=>{
  const s=start()
  for(const id of ids) {
    const view=privateView(s,id)!
    const dealt=s.replay!.find(entry=>entry.round===s.round&&entry.step==='deal')!
    assert.deepEqual(view.initialIdentity?.identity,dealt.seats!.find(seat=>seat.id===id)!.identity)
    assert.equal(Object.keys(view.initialIdentity!).sort().join(','),'at,identity,round')
    assert.equal(view.intel.length,0)
  }
  assert(!JSON.stringify(publicView(s)).includes('initialIdentity'))
})

for(const card of ['spy-1','mystic-1']) test('UX3.1 target focus pauses '+card+' without revealing private inspection',()=>{
  const state=start()
  state.seats[1].hand=['mirror']
  stage(card,state)
  state.tableCards=[{player:'a',card,source:'hand',status:'resolving'}]
  expire(state)
  assert.equal(state.mode,'target')
  const targetDeadline=state.deadline!
  click(state,'a','b')
  assert.equal(state.mode,'presentation')
  const projected=publicView(state)
  assert.deepEqual(projected.presentation?.events.map(entry=>entry.kind),['target-focus'])
  assert.equal(projected.presentation?.duration,1800)
  assert.equal(projected.presentation?.startedAt,targetDeadline-1)
  assert.equal(projected.presentation?.endsAt,targetDeadline-1+1800)
  assert.deepEqual(projected.presentation?.events[0].actors,['a','b'])
  assert.equal(projected.presentation?.events[0].card,card)
  assert.equal(projected.presentation?.events[0].executionId,state.current?.executionId)
  assert.deepEqual(projected.cardArea.played.find(play=>play.card===card)?.targets,['b'])
  assert.equal(projected.cardArea.played.find(play=>play.card===card)?.status,'resolving')
  assert.equal(projected.presentation?.events[0].identities,undefined)
  assert(!JSON.stringify(projected.presentation).includes('"mirror"'))
  assert(!Object.hasOwn(projected,'tableTargets'))
  assert.equal(privateView(state,'a')?.intel[0]?.identity?.house,state.seats[1].identity.house)
  assert.equal(privateView(state,'c')?.intel.length,0)
  const restored=structuredClone(state)
  const before=restored.deadline!
  game.advance(restored,{now:before-1,random:()=>0})
  assert.equal(restored.mode,'presentation')
  expire(restored)
  assert.notEqual(restored.mode,'presentation')
  assert.equal(restored.tableCards?.[0].status,'resolved')
  assert.equal(restored.events.filter(entry=>entry.kind==='target-focus').length,1)
  assert.equal(restored.deadline,before+defaults.play*1000)
})
test('UX3.1 target focus respects configured presentation speed and avoids multi-step skills',()=>{
  const state=start()
  state.config.presentationSpeed=2
  stage('spy-1',state);expire(state);click(state,'a','b')
  assert.equal(publicView(state).presentation?.duration,3600)
  const other=start()
  stage('trickster-3',other);expire(other);click(other,'a','b')
  assert.equal(other.mode,'choice')
  assert.equal(other.events.some(entry=>entry.kind==='target-focus'),false)
})
