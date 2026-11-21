import {test} from 'node:test'
import assert from 'node:assert/strict'
import {diceWerewolf as game,type DiceState} from './engine.ts'
const players=['a','b','c']
const context={now:0,random:(_limit:number)=>0}
function randomSequence(values:number[]) {
  return (limit:number)=>{
    assert(values.length,'unexpected random draw')
    const value=values.shift()!
    assert(value>=0 && value<limit)
    return value
  }
}
function start(ids=[0,1,2]) {
  return game.start(players,{target:3},{...context,random:randomSequence([...ids])},{a:0,b:1,c:2})
}
function play(s:DiceState,kind:string,values:number[]) {
  players.forEach((player,i)=>game.command(s,player,{kind,value:values[i]},{...context,now:s.deadline!-1}))
}
function advance(s:DiceState,random=context.random) {
  game.advance(s,{random,now:s.deadline!})
}
function roll(s:DiceState) {
  while(s.stage==='ACTION') play(s,'act',[1,1,1])
}
function leaveFaces(s:DiceState,faces:number[]) {s.points.forEach(point=>{point.removed=!faces.includes(point.face)})}
function vote(s:DiceState,face:number) {roll(s); play(s,'vote',[face,face,face])}

test('ordinary identity rerolls a triple, accepts a pair, and projects only own identity',()=>{
  const s=start([1,1,1,4,4,2])
  assert.deepEqual(s.identities,{a:5,b:5,c:3})
  assert.deepEqual(game.private(s,'a'),{identity:5})
  assert.equal('identities' in (game.public(s) as object),false)
  assert.equal(s.points.length,6)
  assert(s.points.every(point=>point.hp===0))
})
test('secret input is immutable and timeout uses the original deadline',()=>{
  const s=start()
  game.command(s,'a',{kind:'act',value:1},context)
  assert.throws(()=>game.command(s,'a',{kind:'act',value:-1},context),/已提交/)
  assert.throws(()=>game.command(s,'b',{kind:'act',value:1},{...context,now:30_000}))
  assert(!Object.hasOwn(game.public(s) as object,'inputs'))
  assert.deepEqual(game.private(s,'a'),{identity:1})
  game.advance(s,{now:31_000,random:randomSequence([0,1])})
  assert.deepEqual(s.last,{face:1,delta:1,hp:1,automatic:2})
  assert.equal(s.deadline,60_000)
  assert.equal(s.face,2)
})
for(const {ids,targets,winners} of [
  {ids:[0,1,2],targets:[1],winners:['b','c']},
  {ids:[0,0,2],targets:[1],winners:['c']},
  {ids:[0,1,2],targets:[1,2,3],winners:[]},
]) {
  test('batch health execution '+ids+' / '+targets,()=>{
    const s=start(ids)
    s.points.forEach(point=>{if(targets.includes(point.face)) point.hp=-4})
    play(s,'act',[-1,-1,1])
    assert.equal(s.points[0].hp,-5)
    assert.equal(s.points[0].removed,false)
    while(s.stage==='ACTION') play(s,'act',[-1,-1,1])
    assert.equal(s.stage,'SUMMARY')
    assert.deepEqual(s.executions,[{cause:'health',faces:targets,round:1}])
    assert.deepEqual(s.summary?.winners,winners)
    for (const id of players) assert.equal(s.scores[id],Number(winners.includes(id)))
  })
}
test('two votes apply atomically and timeout votes are disclosed only after completion',()=>{
  const s=start()
  roll(s)
  game.command(s,'a',{kind:'vote',value:4},{...context,now:s.deadline!-1})
  assert.deepEqual(s.ballots,[])
  assert(!Object.hasOwn(game.public(s) as object,'inputs'))
  advance(s,randomSequence([3,4]))
  assert.deepEqual(s.ballots[0],{round:1,attempt:1,target:4,totals:{4:2,5:1},votes:[
    {player:'a',face:4,automatic:false},{player:'b',face:4,automatic:true},{player:'c',face:5,automatic:true},
  ]})
  assert(s.points[3].removed)
  advance(s)
  roll(s)
  assert.throws(()=>game.command(s,'a',{kind:'vote',value:4},{...context,now:s.deadline!-1}))
})
test('three dry rounds clear only a uniformly selected vacant point and no target resets counter',()=>{
  for(const noEmpty of [false,true]) {
    const s=start()
    if(noEmpty) leaveFaces(s,[1,2,3])
    for(let i=0;i<3;i++) {
      roll(s)
      play(s,'vote',[1,2,3]); advance(s)
      assert.equal(s.stage,'REVOTE')
      play(s,'vote',[3,2,1])
      assert.deepEqual(s.ballots.slice(-2).map(ballot=>ballot.attempt),[1,2])
      advance(s,noEmpty?randomSequence([]):i===2?randomSequence([2]):randomSequence([]))
    }
    assert.equal(s.dryRounds,0)
    assert.deepEqual(s.executions,noEmpty?[]:[{cause:'dealer',faces:[6],round:3}])
    assert.equal(s.stage,'ACTION')
  }
})
test('dealer clearing the last vacant point triggers duplicate special ending',()=>{
  const s=start([1,1,4])
  leaveFaces(s,[2,4,5])
  s.face=2
  s.dryRounds=2
  roll(s)
  play(s,'vote',[2,4,5]); advance(s)
  play(s,'vote',[5,4,2]); advance(s,randomSequence([0]))
  assert.equal(s.summary?.reason,'duplicate')
  assert.deepEqual(s.summary?.winners,['c'])
  assert.deepEqual(s.executions,[{cause:'dealer',faces:[4],round:1}])
})
test('identity execution takes precedence over the two-point ending',()=>{
  for(const target of [4,5]) {
    const s=start([1,1,4])
    leaveFaces(s,[2,4,5])
    s.face=2
    vote(s,target)
    assert.equal(s.summary?.reason,target===4?'duplicate':'identity')
    assert.deepEqual(s.summary?.winners,target===4?['c']:['a','b'])
  }
})
test('tied target enters persistent overtime, prior summary survives, eventual champion remains',()=>{
  const s=start()
  for(let i=1;i<=5;i++) {
    vote(s,i===5?2:3)
    assert.equal(s.scores.a,i)
    assert.equal(s.stage,i===5?'CHAMPION':'SUMMARY')
    assert.equal(s.overtime,i>=3)
    if(i<5) {
      const result=s.summary
      const phase=s.phase
      advance(s,randomSequence(i<3?[0,1,2]:[0,0,0]))
      assert.equal(s.summary,result)
      assert.equal(s.phase,phase+1)
      assert.equal(s.game,i+1)
      assert.deepEqual(s.portraits,{a:0,b:1,c:2})
      assert.equal(new Set(Object.values(s.identities)).size,3)
    }
  }
  assert.deepEqual(s.scores,{a:5,b:4,c:1})
  assert.equal(s.summary?.champion,'a')
  assert.equal(s.deadline,null)
  const ended=structuredClone(s)
  game.advance(s,{...context,now:1e9})
  assert.deepEqual(s,ended)
})
test('unique target also closes a normal match',()=>{
  const s=start()
  s.scores.a=2
  vote(s,3)
  assert.equal(s.summary?.champion,'a')
  assert.equal(s.overtime,false)
})
