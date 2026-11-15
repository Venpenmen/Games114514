import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ghostCandle as game } from './engine.ts'
const players = ['a','b','c']
const ctx = {now:0,random:() => 0}
const start = () => game.start(players,{night:30,day:60},ctx)
function actions(s: ReturnType<typeof start>, a:number,b:number,c:number,action:string) {
  game.command(s,'b',{kind:'night',candle:a,action:'LIGHT'},ctx)
  game.command(s,'c',{kind:'night',candle:b,action:'LIGHT'},ctx)
  game.command(s,'a',{kind:'night',candle:c,action},ctx)
}
for (const [a,b,c,action,target,status] of [
  [2,2,2,'DESTROY',2,'DESTROYED'],
  [2,2,3,'DESTROY',2,'LIT'],
  [2,3,3,'LIGHT',3,'LIT'],
  [2,3,4,'LIGHT',1,'DESTROYED'],
  [2,3,4,'DESTROY',1,'DESTROYED'],
] as const) {
  test(`night ${[a,b,c,action].join('/')}`, () => {
    const s = start()
    actions(s,a,b,c,action)
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
    else actions(s,i,i,i,'DESTROY')
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
