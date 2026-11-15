import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ghostCandle as game } from './engine.ts'
const players = ['a','b','c']
const ctx = {now:0,random:(_limit: number) => 0}
const start = () => game.start(players,{night:30,day:60},ctx)
function actions(s: ReturnType<typeof start>, a:number,b:number,c:number,action:string, context = ctx) {
  game.command(s,'b',{kind:'night',candle:a,action:'LIGHT'},context)
  game.command(s,'c',{kind:'night',candle:b,action:'LIGHT'},context)
  game.command(s,'a',{kind:'night',candle:c,action},context)
}
for (const [a,b,c,action,target,status] of [
  [1,1,1,'DESTROY',1,'LIT'],
  [1,1,2,'DESTROY',1,'LIT'],
  [1,1,1,'LIGHT',1,'LIT'],
  [1,1,2,'LIGHT',1,'LIT'],
  [1,2,1,'DESTROY',1,'DESTROYED'],
  [1,2,2,'DESTROY',2,'DESTROYED'],
  [1,2,1,'LIGHT',1,'LIT'],
  [1,2,2,'LIGHT',2,'LIT'],
  [1,2,3,'DESTROY',9,'DESTROYED'],
  [1,2,3,'LIGHT',9,'DESTROYED'],
] as const) {
  test(`night ${[a,b,c,action].join('/')}`, () => {
    const s = start()
    const draws: number[] = []
    actions(s,a,b,c,action,{...ctx,random:limit => { draws.push(limit); return limit-1 }})
    assert.deepEqual(draws,target === 9 ? [9] : [])
    assert.deepEqual(s.last,{candle:target,status})
    assert.equal(s.candles.filter(item=>item!=='INTACT').length,1)
    assert.equal(s.stage,'DAY_DISCUSSION')
  })
}
test('commands are immutable, private, validated and late commands are rejected', () => {
  const s = start()
  const light = {kind:'night',candle:2,action:'LIGHT'}
  assert.throws(() => game.command(s,'b',{...light,action:'DESTROY'},ctx))
  game.command(s,'b',light,ctx)
  assert.throws(() => game.command(s,'b',light,ctx))
  assert.equal((game.private(s,'a') as {confirmed?:unknown}).confirmed,undefined)
  assert.doesNotMatch(JSON.stringify(game.public(s)),/HUMAN|GHOST|LIGHT/)
  assert.throws(() => game.command(s,'c',light,{...ctx,now:30_000}))
  game.advance(s,{...ctx,now:45_000})
  assert.deepEqual(s.last,{candle:1,status:'DESTROYED'})
  assert.equal(s.deadline,90_000)
})
function progress(s: ReturnType<typeof start>) {
  game.advance(s,{...ctx,now:s.deadline!})
}
function voteStage() {
  const s = start()
  for (let night=1;night<=3;night++) { progress(s); progress(s) }
  assert.equal(s.stage,'DAY_DECISION')
  for (const id of players) game.command(s,id,{kind:'decision',yes:id!=='a'},ctx)
  assert.equal(s.stage,'ACCUSATION')
  return s
}
test('first ballot abstention, public record, and one revote', () => {
  const s = voteStage()
  assert.throws(() => game.command(s,'a',{kind:'vote',target:'a'},ctx))
  game.command(s,'a',{kind:'vote',target:'b'},ctx)
  assert.equal(s.ballots.length,0)
  progress(s)
  assert.deepEqual(s.ballots[0].votes,[['a','b'],['b',null],['c',null]])
  progress(s)
  assert.equal(s.stage,'REVOTE')
  progress(s)
  progress(s)
  assert.equal(s.stage,'NIGHT')
  assert.equal(s.night,4)
})
for (const [target, winner] of [['a','HUMAN'],['b','GHOST']]) {
  test(`effective accusation ${target} yields ${winner}`, () => {
    const s = voteStage()
    for (const id of players.filter(id=>id!==target)) game.command(s,id,{kind:'vote',target},ctx)
    progress(s)
    progress(s)
    assert.equal(s.winner,winner)
    assert.deepEqual((game.public(s) as {roles:unknown}).roles,s.roles)
  })
}
test('a 4–4 match necessarily ends on night nine', () => {
  const s = start()
  for (let i=1;i<=9;i++) {
    if (i%2) actions(s,i,i,i,'LIGHT')
    else actions(s,i,i+1,i,'DESTROY')
    if (s.deadline !== null) progress(s)
    if (s.stage === 'DAY_DECISION') progress(s)
  }
  assert.equal(s.winner,'HUMAN')
  assert.equal(s.night,9)
  assert.equal(s.deadline,null)
})
test('each player can be randomly assigned GHOST', () => {
  players.forEach((id,index) => {
    const s = game.start(players,game.defaults,{...ctx,random:()=>index})
    assert.equal(s.roles[id],'GHOST')
    assert.equal(Object.values(s.roles).filter(role=>role==='HUMAN').length,2)
  })
})

test('random destruction can choose any intact candle, including the ghost target', () => {
  const candidates = [2,4,5,6,7,8,9]
  for (const [index,target] of candidates.entries()) {
    const s = start()
    actions(s,1,1,1,'DESTROY')
    progress(s)
    actions(s,3,2,3,'DESTROY')
    progress(s)
    for (const candle of [1,3]) {
      assert.throws(() => game.command(s,'b',{kind:'night',candle,action:'LIGHT'},ctx))
    }
    actions(s,2,4,5,'DESTROY',{...ctx,random:limit => {
      assert.equal(limit,candidates.length)
      return index
    }})
    assert.deepEqual(s.last,{candle:target,status:'DESTROYED'})
    assert.equal(s.candles.filter(candle=>candle!=='INTACT').length,3)
  }
})
test('timeout overlap lights once', () => {
  const s = start()
  const time = {...ctx,now:s.deadline!}
  game.advance(s,time)
  assert.deepEqual(s.last,{candle:1,status:'LIT'})
  const settled = structuredClone(s)
  game.advance(s,time)
  assert.deepEqual(s,settled)
})
test('five directed destructions give the ghost victory', () => {
  const s = start()
  for (let i=1;i<=5;i++) {
    actions(s,i,9,i,'DESTROY')
    if (s.deadline !== null) progress(s)
    if (s.stage === 'DAY_DECISION') progress(s)
  }
  assert.equal(s.winner,'GHOST')
  assert.equal(s.night,5)
  assert.equal(s.deadline,null)
})
