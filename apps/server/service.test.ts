import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { io, type Socket } from 'socket.io-client'
import { createPlatform } from './service.ts'
import { ghostCandle } from '../../games/ghost-candle/engine.ts'
import { diceWerewolf, type DicePublic } from '../../games/dice-werewolf/engine.ts'
import type { GamePlugin, Turn } from '../../packages/game-sdk/index.ts'
import type { Reply, Snapshot } from '../../packages/protocol/index.ts'

const fixture: GamePlugin<null,Turn> = {
  id:'fixture',name:'测试',version:1,minPlayers:1,maxPlayers:1,defaults:null,settings:[],
  config:()=>null, start:()=>({phase:1,deadline:null}), command(){}, advance(){},
  public:()=>({fixture:true}), private:()=>null, finished:()=>false, canChat:()=>false,
}
test('persistent authenticated rooms, isolated plugins, deadlines, receipts and private recovery', async t => {
  const folder = mkdtempSync(resolve('work/service-test-'))
  let clock=100_000
  const origin='http://test.local'
  const sockets: Socket[]=[]
  let draw=0
  const open = () => createPlatform({database:resolve(folder,'test.db'),origin,secure:false,
    plugins:[ghostCandle,fixture,diceWerewolf],now:()=>clock,random:limit=>limit===6?draw++%3:0})
  let service=open()
  t.after(async () => {
    sockets.forEach(socket=>socket.disconnect())
    await service.close()
    rmSync(folder,{recursive:true,force:true})
  })
  async function listen() {
    await new Promise<void>(done=>service.server.listen(0,'127.0.0.1',done))
    const address=service.server.address()
    assert(address && typeof address!=='string')
    return 'http://127.0.0.1:'+address.port
  }
  let url=await listen()
  async function guest(name:string) {
    const response=await fetch(url+'/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},
      body:JSON.stringify({username:'player_'+randomUUID().slice(0,12).replace('-','_'),password:'classic test phrase',name,avatar:0})})
    assert.equal(response.status,201)
    const cookie=response.headers.get('set-cookie')!.split(';')[0]
    return cookie
  }
  async function connect(cookie:string) {
    const socket=io(url,{extraHeaders:{cookie,origin},forceNew:true})
    sockets.push(socket)
    const client={socket,rooms:new Map<string,Snapshot>()}
    socket.on('room',(room:Snapshot)=>client.rooms.set(room.code,room))
    await new Promise<void>((done,fail)=>{socket.once('connect',done);socket.once('connect_error',fail)})
    return client
  }
  const cookies=await Promise.all(['甲','乙','丙','丁'].map(guest))
  let [a,b,c,d]=await Promise.all(cookies.map(connect))
  function send(client:typeof a,type:string,room?:string,data?:unknown,extra:object={}):Promise<Reply> {
    const match=room ? client.rooms.get(room)?.match : undefined
    return client.socket.timeout(2000).emitWithAck('command',{v:1,id:randomUUID(),type,room,data,match:match?.id,phase:match?.phase,controlVersion:match?.controlVersion,...extra})
  }
  async function resumable(cookie:string) {
    const response=await fetch(url+'/api/resumable-matches',{headers:{cookie}})
    assert.equal(response.status,200)
    const list=await response.json() as {code:string}[]
    return list.map(room=>room.code)
  }
  async function pauseWithSeats(room:string) {
    await send(a,'sync',room)
    const before=a.rooms.get(room)!
    assert.equal(before.canLeaveActive,true)
    const remaining=before.match!.deadline!-clock
    assert(remaining>1000)
    for(const client of [a,b,c]) assert((await send(client,'leave',room)).ok)
    assert((await resumable(cookies[0])).includes(room))
    assert(!(await resumable(cookies[3])).includes(room))
    assert(!(await send(d,'join',room,{resume:true})).ok)
    assert(!(await send(a,'sync',room)).ok)
    clock+=remaining+5_000
    service.tick()
    assert((await send(a,'join',room,{resume:true})).ok)
    const after=a.rooms.get(room)!
    assert.deepEqual(after.match,{...before.match,deadline:clock+remaining})
    assert.equal(after.host,before.host)
    assert.equal(after.members.filter(member=>member.online).length,1)
    for(const client of [b,c]) assert((await send(client,'join',room,{resume:true})).ok)
  }
  const created=await send(a,'create',undefined,{gameId:'ghost-candle'})
  assert(created.ok && created.room)
  const code=created.room
  assert.equal((await send(b,'join',code)).ok,true)
  assert.equal((await send(c,'join',code)).ok,true)
  assert.equal((await send(d,'join',code)).ok,false)
  assert.equal((await send(d,'sync',code)).ok,false)
  assert.equal((await send(b,'dissolve',code)).ok,false)
  assert.equal((await fetch(url+'/api/auth/register',{method:'POST',headers:{origin:'http://wrong.local'}})).status,403)
  const second=await send(d,'create',undefined,{gameId:'fixture'})
  assert(second.ok && second.room)
  await send(d,'ready',second.room,true)
  assert.equal((await send(d,'start',second.room)).ok,true)
  assert.deepEqual(d.rooms.get(second.room)?.match?.public,{fixture:true})
  for (const client of [a,b,c]) assert.equal((await send(client,'ready',code,true)).ok,true)
  assert.equal((await send(a,'start',code)).ok,true)
  assert.equal((a.rooms.get(code)?.match?.private as {role:string}).role,'GHOST')
  await send(b,'sync',code)
  assert.equal((b.rooms.get(code)?.match?.private as {role:string}).role,'HUMAN')
  assert.equal((await send(a,'chat',code,'夜间消息')).ok,false)
  assert.equal((await send(a,'game',code,{kind:'night',candle:2,action:'DESTROY'},{id:'night-retry-1'})).ok,true)
  await pauseWithSeats(code)
  const original=a.rooms.get(code)!.match!
  const remaining=original.deadline!-clock
  sockets.forEach(socket=>socket.disconnect())
  await service.close()
  clock=original.deadline!+5_000
  service=open()
  url=await listen()
  ;[a,b,c,d]=await Promise.all(cookies.map(connect))
  assert((await send(d,'join',second.room)).ok)
  for (const client of [a,b,c]) assert.equal((await send(client,'join',code)).ok,true)
  const paused=a.rooms.get(code)!.match!
  assert.equal(paused.phase,original.phase)
  assert.equal(paused.deadline,clock+remaining)
  assert.deepEqual(paused.private,original.private)
  clock=paused.deadline!
  service.tick()
  await send(a,'sync',code)
  const restored=a.rooms.get(code)!.match!
  assert.equal(restored.id,original.id)
  assert.equal(restored.phase,original.phase+1)
  assert.equal(restored.deadline,clock+120_000)
  assert.equal((await send(a,'game',code,{}, {id:'night-retry-1',phase:original.phase})).ok,true)
  assert.equal((await send(a,'game',code,{}, {phase:original.phase})).ok,false)
  assert.equal((await send(b,'chat',code,'错误对局',{phase:original.phase,match:'wrong-match'})).ok,false)
  assert.equal((await send(b,'chat',code,'你好',{phase:original.phase,id:'stale-chat-once'})).ok,true)
  assert.equal((await send(b,'chat',code,'你好',{phase:original.phase,id:'stale-chat-once'})).ok,true)
  assert.equal(b.rooms.get(code)?.chat.filter(message=>message.text==='你好').length,1)
  assert.equal((await send(b,'chat',code,'太快')).ok,false)
  assert.equal(d.rooms.get(code),undefined)
  const current=a.rooms.get(code)!.match!
  assert.equal(current.phase,restored.phase)
  assert.equal((current.public as {candles:string[]}).candles.filter(value=>value!=='INTACT').length,1)
  for (const client of [b,c]) await send(client,'sync',code)
  const settled=await Promise.all([a,b,c].map(client=>send(client,'game',code,{kind:'discuss'})))
  assert(settled.every(reply=>reply.ok))
  await send(a,'sync',code)
  assert.equal(a.rooms.get(code)?.match?.phase,current.phase+1)
  await Promise.all([a,b,c].map(client=>send(client,'sync',code)))
  const night=a.rooms.get(code)!.match!
  const target=(night.public as {candles:string[]}).candles.indexOf('INTACT')+1
  const nightReplies=await Promise.all([a,b,c].map((client,index)=>send(client,'game',code,{
    kind:'night',candle:target,action:index===0?'DESTROY':'LIGHT',
  }, {id:'night-concurrent-'+index,phase:night.phase})))
  assert(nightReplies.every(reply=>reply.ok))
  assert.equal((await send(a,'game',code,{}, {id:'night-concurrent-0',phase:night.phase})).ok,true)
  await send(a,'sync',code)
  const next=a.rooms.get(code)!.match!
  assert.equal(next.phase,night.phase+1)
  const candles=(next.public as {candles:string[]}).candles
  assert.equal(candles[target-1],'DESTROYED')
  assert.equal(candles.filter(candle=>candle!=='INTACT').length,2)
  clock+=1000
  const denied=await send(a,'create',undefined,{gameId:'dice-werewolf'})
  assert(!denied.ok && denied.occupiedRoom===code)
  for(const client of [a,b,c]) assert((await send(client,'leave',code)).ok)
  clock+=60*60_000
  const third=await send(a,'create',undefined,{gameId:'dice-werewolf'})
  assert(third.ok && third.room)
  const dice=third.room
  assert((await send(b,'join',dice)).ok)
  assert((await send(c,'join',dice)).ok)
  assert.equal((await send(d,'lobby',dice,{portrait:0})).ok,false)
  assert.equal((await send(b,'config',dice,{target:3})).ok,false)
  assert.equal((await send(a,'ready',dice,true)).ok,false)
  assert((await send(a,'config',dice,{target:3})).ok)
  for(const [index,client] of [a,b,c].entries()) {
    assert((await send(client,'lobby',dice,{portrait:index})).ok)
    assert((await send(client,'ready',dice,true)).ok)
  }
  assert.equal((await send(b,'start',dice)).ok,false)
  assert((await send(a,'start',dice)).ok)
  for(const [index,client] of [a,b,c].entries()) {
    assert((await send(client,'sync',dice)).ok)
    const match=client.rooms.get(dice)!.match!
    assert.deepEqual(match.private,{identity:index+1})
    assert(!Object.hasOwn(match.public as object,'identities'))
  }
  assert.equal(d.rooms.get(dice),undefined)
  assert.equal((await send(b,'lobby',dice,{portrait:5})).ok,false)
  assert.deepEqual(new Set(await resumable(cookies[0])),new Set([dice]))
  await pauseWithSeats(dice)
  for(let face=1;face<=6;face++) {
    clock+=1000
    for(const client of [a,b,c]) await send(client,'sync',dice)
    assert((await send(a,'game',dice,{kind:'act',value:1})).ok)
    if(face===1) {
      await pauseWithSeats(dice)
      assert(!(await send(a,'game',dice,{kind:'act',value:-1})).ok)
    }
    const actions=await Promise.all([b,c].map(client=>send(client,'game',dice,{kind:'act',value:1})))
    assert(actions.every(reply=>reply.ok))
  }
  for(const client of [a,b,c]) await send(client,'sync',dice)
  const ballot=a.rooms.get(dice)!.match!
  const cast=await Promise.all([a,b,c].map((client,i)=>send(client,'game',dice,{kind:'vote',value:3},{id:'dice-ballot-'+i})))
  assert(cast.every(reply=>reply.ok))
  await send(a,'sync',dice)
  const result=a.rooms.get(dice)!.match!
  assert.equal((result.public as DicePublic).stage,'SUMMARY')
  const score=(result.public as DicePublic).scores
  const summaryRemaining=result.deadline!-clock
  assert.deepEqual(Object.values(score),[1,1,0])
  sockets.forEach(socket=>socket.disconnect())
  await service.close()
  clock=result.deadline!+1000
  service=open()
  url=await listen()
  ;[a,b,c,d]=await Promise.all(cookies.map(connect))
  assert((await send(d,'join',second.room)).ok)
  for(const client of [a,b,c]) assert((await send(client,'join',dice)).ok)
  const stillSummary=a.rooms.get(dice)!.match!
  assert.equal(stillSummary.phase,result.phase)
  assert.equal(stillSummary.deadline,clock+summaryRemaining)
  assert.deepEqual((stillSummary.public as DicePublic).scores,score)
  clock=stillSummary.deadline!
  service.tick()
  await send(a,'sync',dice)
  const resumed=a.rooms.get(dice)!.match!
  assert.equal(resumed.id,result.id)
  assert.equal(resumed.phase,result.phase+1)
  assert.equal(resumed.deadline,clock+30_000)
  assert.equal((resumed.public as DicePublic).game,2)
  assert.deepEqual((resumed.public as DicePublic).summary?.scores,score)
  assert((await send(a,'game',dice,{kind:'vote',value:3},{id:'dice-ballot-0',phase:ballot.phase})).ok)
  assert.equal((await send(b,'game',dice,{kind:'vote',value:3},{phase:ballot.phase})).ok,false)
  await send(a,'sync',dice)
  assert.deepEqual((a.rooms.get(dice)!.match!.public as DicePublic).scores,score)
  await pauseWithSeats(dice)

  assert((await send(a,'join',dice)).ok)
  for(const client of [a,b,c]) assert((await send(client,'leave',dice)).ok)
  clock+=60*60_000
  assert(!(await send(a,'join',dice,{resume:true})).ok)
  assert(!(await resumable(cookies[0])).includes(dice))

  const waiting=await send(a,'create',undefined,{gameId:'ghost-candle'})
  assert(waiting.ok && waiting.room)
  clock+=30*60_000-1
  assert((await send(a,'sync',waiting.room)).ok)
  clock++
  assert(!(await send(a,'sync',waiting.room)).ok)
  assert(!(await send(b,'join',waiting.room)).ok)
  const disposable=await send(a,'create',undefined,{gameId:'dice-werewolf'})
  assert(disposable.ok && disposable.room)
  assert((await send(a,'dissolve',disposable.room)).ok)
  assert(!(await resumable(cookies[0])).includes(disposable.room))
  assert(!(await send(a,'join',disposable.room,{resume:true})).ok)

  // A legacy active room without timestamps gets a fresh offline interval on startup.
  await service.close()
  const db=new DatabaseSync(resolve(folder,'test.db'))
  db.prepare("UPDATE rooms SET body=json_remove(body,'$.emptySince','$.lastMemberActivityAt') WHERE code=?").run(second.room)
  db.close()
  clock+=24*60*60_000
  service=open()
  url=await listen()
  ;[a,b,c,d]=await Promise.all(cookies.map(connect))
  const activeCode=second.room
  assert((await send(d,'join',activeCode)).ok)
  d.socket.disconnect()
  await new Promise<void>(done=>setImmediate(done))
  clock+=59*60_000
  d=await connect(cookies[3])
  assert((await send(d,'join',activeCode)).ok)
  d.socket.disconnect()
  await new Promise<void>(done=>setImmediate(done))
  await service.close()
  clock+=60*60_000
  service=open()
  url=await listen()
  ;[a,b,c,d]=await Promise.all(cookies.map(connect))
  assert(!(await send(d,'join',activeCode)).ok)
})
