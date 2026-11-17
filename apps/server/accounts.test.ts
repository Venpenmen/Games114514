import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { backup, DatabaseSync } from 'node:sqlite'
import { io, type Socket } from 'socket.io-client'
import { migrateAccounts, hash } from './accounts.ts'
import { createPlatform } from './service.ts'
import { ghostCandle } from '../../games/ghost-candle/engine.ts'
import { diceWerewolf } from '../../games/dice-werewolf/engine.ts'
import { nightOfTheNinja } from '../../games/night-of-the-ninja/engine.ts'
import type { Profile, Reply, Snapshot } from '../../packages/protocol/index.ts'

const origin='http://accounts.test'
const password='private test phrase'
const plugins=[ghostCandle,diceWerewolf,nightOfTheNinja]
const legacySchema=`CREATE TABLE sessions(secret TEXT PRIMARY KEY,profile TEXT NOT NULL,expires INTEGER NOT NULL);
  CREATE TABLE rooms(code TEXT PRIMARY KEY,body TEXT NOT NULL,updated INTEGER NOT NULL);
  CREATE TABLE receipts(key TEXT PRIMARY KEY,body TEXT NOT NULL,created INTEGER NOT NULL);`

async function harness(database:string, now:()=>number) {
  let draw=0
  const service=createPlatform({database,plugins,origin,secure:false,now,random:n=>draw++%n})
  await new Promise<void>(ready=>service.server.listen(0,'127.0.0.1',ready))
  const address=service.server.address()
  assert(address && typeof address!=='string')
  const url='http://127.0.0.1:'+address.port
  const sockets:Socket[]=[]
  async function request(path:string,method='GET',body?:unknown,cookie?:string) {
    return fetch(url+'/api/'+path,{method,headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},
      body:body===undefined?undefined:JSON.stringify(body)})
  }
  async function register(username:string,cookie?:string) {
    const response=await request('auth/register','POST',{username,password,name:username,avatar:1,claim:!!cookie},cookie)
    assert.equal(response.status,201)
    assert.match(response.headers.get('set-cookie')!,/HttpOnly.*SameSite=Strict/)
    return {cookie:response.headers.get('set-cookie')!.split(';')[0],profile:await response.json() as Profile}
  }
  async function connect(cookie:string) {
    const socket=io(url,{transports:['websocket'],reconnection:false,forceNew:true,extraHeaders:{cookie,origin}})
    sockets.push(socket)
    const client={socket,room:undefined as Snapshot|undefined,lost:0}
    socket.on('room',(room:Snapshot)=>client.room=room)
    socket.on('control-lost',()=>client.lost++)
    await new Promise<void>((ready,reject)=>{socket.once('connect',ready);socket.once('connect_error',reject)})
    return client
  }
  function send(client:Awaited<ReturnType<typeof connect>>,type:string,room?:string,data?:unknown,extra={}) {
    const match=client.room?.match
    return client.socket.timeout(2500).emitWithAck('command',{v:1,id:randomUUID(),type,room,data,match:match?.id,
      phase:match?.phase,controlVersion:match?.controlVersion,...extra}) as Promise<Reply>
  }
  return {request,register,connect,send,tick:service.tick,async close() {
    sockets.forEach(socket=>socket.disconnect())
    await service.close()
  }}
}

test('accounts, revoked devices and authoritative single-device operation',async t=>{
  const folder=mkdtempSync(resolve('work/account-test-')), database=resolve(folder,'accounts.db')
  let time=1_000_000
  const platform=await harness(database,()=>time)
  t.after(async()=>{await platform.close();rmSync(folder,{recursive:true,force:true})})
  const {request,register,connect,send}=platform
  assert.equal((await request('me')).status,200)
  assert.equal((await request('session','POST')).status,404)
  assert.equal((await request('history')).status,401)
  await assert.rejects(connect(''))
  const [one,two,three]=await Promise.all(['device_one','device_two','device_three'].map(name=>register(name)))
  assert.equal((await request('auth/register','POST',{username:'DEVICE_ONE',password,name:'duplicate'})).status,409)
  assert.equal((await request('auth/login','POST',{username:'device_one',password:'wrong test phrase'})).status,401)
  const login=()=>request('auth/login','POST',{username:'DEVICE_ONE',password})
  const second=await login()
  assert.equal(second.status,200)
  assert.deepEqual(await second.json(),one.profile)
  const otherCookie=second.headers.get('set-cookie')!.split(';')[0]
  const [a,b,c,d]=await Promise.all([one.cookie,two.cookie,three.cookie,otherCookie].map(connect))
  const create=await send(a,'create',undefined,{gameId:'ghost-candle'})
  assert(create.ok && create.room)
  const code=create.room
  for(const peer of [b,c]) assert((await send(peer,'join',code)).ok)
  for(const peer of [a,b,c]) assert((await send(peer,'ready',code,true)).ok)
  assert((await send(a,'start',code)).ok)
  const original=a.room!.match!
  assert(original.private)
  assert((await send(d,'join',code,{resume:true})).ok)
  assert((await send(d,'sync',code)).ok)
  assert.equal(d.room?.readOnly,true)
  assert.equal(Boolean(d.room?.match?.private),false)
  const sameDevice=await connect(one.cookie)
  assert((await send(sameDevice,'join',code)).ok)
  assert.equal(sameDevice.room?.readOnly,true)
  assert.equal(sameDevice.room?.match?.private,undefined)
  assert(!(await send(sameDevice,'game',code,{kind:'night',candle:1,action:'DESTROY'})).ok)
  assert.equal((await (await request('resumable-matches','GET',undefined,otherCookie)).json())[0].takeover,true)
  const originalCommand={id:'delayed-action',match:original.id,phase:original.phase,controlVersion:original.controlVersion}
  assert((await send(a,'game',code,{kind:'night',candle:1,action:'DESTROY'},originalCommand)).ok)
  assert((await send(d,'takeover',code,{resume:true},{match:original.id})).ok)
  assert.equal(d.room?.match?.controlVersion,2)
  assert.equal(d.room?.match?.deadline,original.deadline)
  assert.equal(d.room?.match?.phase,original.phase)
  assert.deepEqual((d.room?.match?.private as {confirmed:unknown}).confirmed,{candle:1,action:'DESTROY'})
  assert(!(await send(a,'game',code,{kind:'night',candle:1,action:'DESTROY'},originalCommand)).ok)
  assert((await send(a,'sync',code)).ok)
  assert.equal(a.room?.match?.private,undefined)
  const switches=await Promise.all([a,d].map(peer=>send(peer,'takeover',code,{resume:true},{match:original.id})))
  assert(switches.every(reply=>reply.ok))
  await Promise.all([a,d].map(peer=>send(peer,'sync',code)))
  assert.equal([a,d].filter(peer=>peer.room?.readOnly===false).length,1)
  assert((await send(a,'takeover',code,{resume:true},{match:original.id})).ok)
  assert(!(await send(a,'game',code,{},originalCommand)).ok)
  for(const peer of [b,c]) assert((await send(peer,'leave',code)).ok)
  const left=new Promise<void>(ready=>a.socket.once('disconnect',()=>ready()))
  assert.equal((await request('auth/logout','POST',{},one.cookie)).status,200)
  await left
  time+=90_000
  platform.tick()
  assert((await send(d,'takeover',code,{resume:true},{match:original.id})).ok)
  assert.equal(d.room?.match?.phase,original.phase)
  assert.equal(d.room?.match?.deadline,time+60_000)
  assert.equal((await request('profile','PUT',{name:'更新昵称',avatar:5},otherCookie)).status,200)
  assert.equal((await (await request('me','GET',undefined,otherCookie)).json()).id,one.profile.id)
  const third=await login()
  const thirdCookie=third.headers.get('set-cookie')!.split(';')[0]
  assert.equal((await request('auth/password','POST',{password,next:'a new longer password'},otherCookie)).status,200)
  assert.equal((await request('account','GET',undefined,thirdCookie)).status,401)
  assert.equal((await login()).status,401)
  const fresh=await request('auth/login','POST',{username:'device_one',password:'a new longer password'})
  assert.equal(fresh.status,200)
  assert.equal((await request('auth/revoke','POST',{id:'others'},otherCookie)).status,200)
  assert.equal((await request('account','GET',undefined,fresh.headers.get('set-cookie')!.split(';')[0])).status,401)
  time+=31*86_400_000
  platform.tick()
  assert.equal((await request('account','GET',undefined,otherCookie)).status,401)
})

test('WAL backup and transactional migration preserve all three old visitor seats',async t=>{
  const folder=mkdtempSync(resolve('work/account-migrate-'))
  t.after(()=>rmSync(folder,{recursive:true,force:true}))
  const database=resolve(folder,'legacy.db'), copied=resolve(folder,'backup.db')
  const old=new DatabaseSync(database)
  const time=2_000_000, players=Array.from({length:4},()=>randomUUID())
  const legacy:Profile={id:players[0],name:'旧玩家',avatar:4}
  const token='0c'.repeat(32), cookie='games_session='+token
  old.exec('PRAGMA journal_mode=WAL;'+legacySchema)
  old.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token),JSON.stringify(legacy),time+20_000)
  let draw=0
  const matches=plugins.map((game,index)=>{
    const ids=players.slice(0,game.minPlayers)
    const state=game.start(ids,game.defaults as never,{now:time,random:n=>index===1?(draw++)%n:0})
    const code=String(123450+index), id=randomUUID()
    old.prepare('INSERT INTO rooms VALUES(?,?,?)').run(code,JSON.stringify({code,gameId:game.id,version:game.version,
      host:ids[0],config:game.defaults,members:ids.map(id=>id===legacy.id?{...legacy,ready:true}:{id,name:'旧成员',avatar:0,ready:true}),
      match:{id,state},updated:time,chat:[]}),time)
    return {code,id}
  })
  await backup(old,copied)
  old.close()
  const restore=new DatabaseSync(copied,{readOnly:true})
  assert.equal(restore.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok')
  assert.equal(restore.prepare('SELECT COUNT(*) AS n FROM rooms').get()?.n,3)
  assert.equal(restore.prepare('PRAGMA user_version').get()?.user_version,0)
  restore.close()
  const broken=new DatabaseSync(resolve(folder,'collision.db'))
  broken.exec('CREATE TABLE player_profiles(dummy TEXT)')
  assert.throws(()=>migrateAccounts(broken))
  assert.equal(broken.prepare('PRAGMA user_version').get()?.user_version,0)
  assert.equal(broken.prepare("SELECT name FROM sqlite_master WHERE name='accounts'").get(),undefined)
  broken.close()
  const platform=await harness(database,()=>time)
  try {
    assert.deepEqual(await (await platform.request('legacy','GET',undefined,cookie)).json(),legacy)
    await assert.rejects(platform.connect(cookie))
    const claimed=await platform.register('legacy_keeper',cookie)
    assert.deepEqual(claimed.profile,legacy)
    assert.equal((await platform.request('auth/register','POST',{username:'repeat_claim',password,claim:true},cookie)).status,409)
    const list=await (await platform.request('resumable-matches','GET',undefined,claimed.cookie)).json()
    assert.equal(list.length,3)
    const player=await platform.connect(claimed.cookie)
    for(const match of matches) {
      assert((await platform.send(player,'join',match.code,{resume:true})).ok)
      assert.equal(player.room?.match?.id,match.id)
      assert(player.room?.match?.private)
    }
  } finally {await platform.close()}
  const reopened=new DatabaseSync(database)
  migrateAccounts(reopened)
  assert.equal(reopened.prepare('PRAGMA user_version').get()?.user_version,1)
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM player_profiles').get()?.n,1)
  assert.equal(reopened.prepare('SELECT COUNT(*) AS n FROM rooms').get()?.n,3)
  reopened.close()
})

test('parallel tabs cannot claim two waiting rooms and removal frees the seat',async t=>{
  const folder=mkdtempSync(resolve('work/one-seat-'))
  const app=await harness(resolve(folder,'test.db'),()=>500_000)
  t.after(async()=>{await app.close();rmSync(folder,{recursive:true,force:true})})
  const {register,connect,send,request}=app
  const [left,right,player]=await Promise.all(['seat_left','seat_right','seat_player'].map(name=>register(name)))
  const [a,b,c,d]=await Promise.all([left.cookie,right.cookie,player.cookie,player.cookie].map(connect))
  const first=await send(a,'create',undefined,{gameId:'ghost-candle'})
  const second=await send(b,'create',undefined,{gameId:'dice-werewolf'})
  assert(first.ok && first.room && second.ok && second.room)
  const [x,y]=await Promise.all([send(c,'join',first.room),send(d,'join',second.room)])
  assert.equal(Number(x.ok)+Number(y.ok),1)
  const winner=x.ok?first.room:second.room
  const loser=x.ok?second.room:first.room
  const refused=x.ok?y:x
  assert(!refused.ok && refused.occupiedRoom===winner)
  assert.equal((await (await request('occupied-room','GET',undefined,player.cookie)).json()).code,winner)
  assert((await send(x.ok?a:b,'kick',winner,{id:player.profile.id})).ok)
  assert((await send(x.ok?d:c,'join',loser)).ok)
})
