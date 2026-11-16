import {test} from 'node:test'
import assert from 'node:assert/strict'
import {cards,deck,phases,skills} from './cards.ts'
import {nightOfTheNinja as game,defaults,identities,privateView,publicView,type NinjaState} from './engine.ts'
const ids=['a','b','c','d']
const start=()=>game.start(ids,defaults,{now:0,random:()=>0})
function expire(s:NinjaState,random=(_limit:number)=>0) { game.advance(s,{now:s.deadline!,random}) }
function click(s:NinjaState,id:string,value:string) {game.command(s,id,{value},{now:s.deadline!-1,random:()=>0})}
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
  assert.deepEqual(privateView(s,'c')?.intel,[])
  assert.equal(JSON.stringify(publicView(s)).includes('mirror'),false)
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
    restored.mode='ready'
    expire(restored)
    assert.equal(privateView(restored,'b')?.intel[0]?.card,expected)
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
    assert.deepEqual(privateView(s,'a')?.action,{step:'second',targets:['b']})
    assert.equal(privateView(s,'b')?.action,undefined)
    assert.equal(Object.hasOwn(publicView(s),'action'),false)
    click(s,'a','c')
    assert.deepEqual(privateView(s,'a')?.action,{step:'choice',targets:['b','c']})
    assert.equal(privateView(s,'a')?.intel[0].source,'shift')
    click(s,'a',answer)
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
  stage('trickster-4',s);expire(s);click(s,'a','b');click(s,'a','view:102');click(s,'a','give:101');click(s,'a','take:103')
  assert.equal(s.seats[0].honor[0].id,103)
  assert.equal(s.seats[0].intel[0].honor,2)
  stage('trickster-5',s);expire(s);click(s,'a','b')
  assert.deepEqual(s.seats[0].honor.map(x=>x.id),[103,102])
})
for(const card of ['blind-1','shinobi-1','trickster-6']) for(const response of ['mirror','martyr','pass']) {
  test('attack '+card+' / '+response,()=>{
    const s=start();s.seats[1].hand=['mirror','martyr'];stage(card,s);expire(s);click(s,'a','b')
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
  expire(s);expire(s)
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
  expire(s);expire(s)
  assert.equal(ronin.honor.length,1)
  assert.equal(s.seats.filter(p=>p.honor.length).length,1)
  s.seats.forEach(p=>{p.alive=false})
  s.night=4;s.mode='commit'
  expire(s);expire(s);expire(s)
  assert.deepEqual(s.awardees,[])
  assert.equal(ronin.honor.length,1)
})

test('public animation timing is ordered and cannot precede the actual reaction result',()=>{
  const s=start();s.seats[1].hand=['mirror']
  stage('blind-1',s);expire(s);click(s,'a','b')
  const attack=s.events.find(e=>e.kind==='attack')!
  assert.equal(attack.duration,1800)
  assert(!s.events.some(e=>e.kind==='death'))
  click(s,'b','mirror')
  const death=s.events.find(e=>e.kind==='death')!
  assert(death.presentationAt!>=attack.presentationAt!+attack.duration!)
  assert.deepEqual(death.actors,['a'])
})
