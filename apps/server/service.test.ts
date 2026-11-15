import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { io, type Socket } from 'socket.io-client'
import { createPlatform } from './service.ts'
import { ghostCandle } from '../../games/ghost-candle/engine.ts'
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
  const open = () => createPlatform({database:resolve(folder,'test.db'),origin,secure:false,
    plugins:[ghostCandle,fixture],now:()=>clock,random:()=>0})
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
    const response=await fetch(url+'/api/session',{method:'POST',headers:{origin}})
    assert.equal(response.status,200)
    const cookie=response.headers.get('set-cookie')!.split(';')[0]
    const update=await fetch(url+'/api/profile',{method:'PUT',headers:{origin,cookie,'content-type':'application/json'},
      body:JSON.stringify({name,avatar:0})})
    assert.equal(update.status,200)
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
    return client.socket.timeout(2000).emitWithAck('command',{v:1,id:randomUUID(),type,room,data,match:match?.id,phase:match?.phase,...extra})
  }
  const created=await send(a,'create',undefined,{gameId:'ghost-candle'})
  assert(created.ok && created.room)
  const code=created.room
  assert.equal((await send(b,'join',code)).ok,true)
  assert.equal((await send(c,'join',code)).ok,true)
  assert.equal((await send(d,'join',code)).ok,false)
  assert.equal((await send(d,'sync',code)).ok,false)
  assert.equal((await send(b,'dissolve',code)).ok,false)
  assert.equal((await fetch(url+'/api/session',{method:'POST',headers:{origin:'http://wrong.local'}})).status,403)
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
  const original=a.rooms.get(code)!.match!
  sockets.forEach(socket=>socket.disconnect())
  await service.close()
  clock=original.deadline!+5_000
  service=open()
  url=await listen()
  ;[a,b,c,d]=await Promise.all(cookies.map(connect))
  for (const client of [a,b,c]) assert.equal((await send(client,'sync',code)).ok,true)
  const restored=a.rooms.get(code)!.match!
  assert.equal(restored.id,original.id)
  assert.equal(restored.phase,original.phase+1)
  assert.equal(restored.deadline,original.deadline!+120_000)
  assert.equal((await send(a,'game',code,{}, {id:'night-retry-1',phase:original.phase})).ok,true)
  assert.equal((await send(a,'game',code,{}, {phase:original.phase})).ok,false)
  assert.equal((await send(b,'chat',code,'你好')).ok,true)
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
})
