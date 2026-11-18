import {test} from 'node:test'
import assert from 'node:assert/strict'
import {presentedGhost as ghost,presentedDice as dice} from './plugins.ts'
import {nightOfTheNinja as ninja,defaults} from '../../games/night-of-the-ninja/engine.ts'
import {presentationSpeed} from '../../packages/game-sdk/presentation.ts'
import {createPlatform} from './service.ts'
import {mkdtempSync,rmSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {io,type Socket} from 'socket.io-client'
import type {Snapshot} from '../../packages/protocol/index.ts'
const ctx={now:1000,random:(_n:number)=>0}
for(const speed of [.8,1,1.35,1.7]) {
  test(`authoritative classic barriers ${speed}, persisted resume and independent input clock`,()=>{
    let s=ghost.start(['a','b','c'],ghost.config({night:30,day:60,presentationSpeed:speed}),ctx)
    for(const id of s.players) ghost.command(s,id,{kind:'night',candle:1,action:'LIGHT'},ctx)
    assert(s.uxPresentation)
    assert.equal(s.deadline,1000+3500*speed)
    const view=ghost.public(s) as any
    assert.equal(view.stage,'PRESENTATION')
    assert.equal(view.candles[0],'LIT')
    assert.throws(()=>ghost.command(s,'a',{kind:'discuss'},ctx),/演出/)
    const ending=s.deadline!
    const barrierPhase=s.phase
    s=JSON.parse(JSON.stringify(s))
    ghost.advance(s,{...ctx,now:ending-1});assert(s.uxPresentation)
    // Model the platform's all-offline pause/resume shift.
    s.deadline=ending+9000
    ghost.advance(s,{...ctx,now:s.deadline})
    assert(!s.uxPresentation)
    assert(s.phase>barrierPhase)
    assert.equal(s.stage,'DAY_DISCUSSION')
    assert.equal(s.deadline,ending+9000+60000)
    assert.equal(s.candles.filter(c=>c==='LIT').length,1)
  })
  test(`ninja ordered event deadlines scale ${speed}; input windows do not`,()=>{
    const s=ninja.start(['a','b','c','d'],{...defaults,presentationSpeed:speed},ctx)
    assert.equal(s.deadline,1000+defaults.draft*1000)
    let holds=0
    for(let i=0;i<400 && holds<5;i++) {
      const end:number=s.deadline!
      ninja.advance(s,{...ctx,now:end})
      if(s.mode==='presentation') {
        assert(s.presentation)
        assert.equal(s.deadline,end+s.presentation.duration)
        const roundtrip=JSON.parse(JSON.stringify(s))
        assert.deepEqual(ninja.public(roundtrip),ninja.public(s))
        assert.throws(()=>ninja.command(s,'a',{value:'pass'},{...ctx,now:end+1}))
        holds++
      }
    }
    assert.equal(holds,5)
  })
  test(`dice full round and automatic continuation respect ${speed} presentation duration`,()=>{
    let draw=0,now=1000
    const random=(n:number)=>draw++%n
    const s=dice.start(['a','b','c'],dice.config({target:3,presentationSpeed:speed}),{now,random},{a:0,b:1,c:2})
    for(let i=0;i<100&&!s.summary;i++) {
      if(s.uxPresentation||s.stage==='BALLOT') {now=s.deadline!;dice.advance(s,{now,random});continue}
      for(const id of s.players)dice.command(s,id,s.stage==='ACTION'?{kind:'act',value:-1}:{kind:'vote',value:s.points.find(p=>!p.removed)!.face},{now,random})
    }
    assert.equal(s.stage,'SUMMARY')
    assert(s.uxPresentation)
    const hidden=dice.public(s) as any
    assert.equal(hidden.summary,null)
    const beforeScores={a:0,b:0,c:0}
    assert.deepEqual(hidden.scores,beforeScores)
    now=s.deadline!;dice.advance(s,{now,random})
    assert.equal(s.deadline,now+8000*speed)
    const scores=structuredClone(s.scores),game=s.game
    const end=s.deadline!
    dice.advance(s,{now:end-1,random});assert.equal(s.game,game)
    dice.advance(s,{now:end,random});assert.equal(s.game,game+1)
    assert.deepEqual(s.scores,scores)
    assert.equal(s.deadline,end+30000)
  })
}
test('dice action barriers preserve identities and summary deadline scales exactly once',()=>{
  let draw=0
  const c={...ctx,random:(n:number)=>draw++%n}
  const s=dice.start(['a','b','c'],dice.config({target:3,presentationSpeed:1.7}),c,{a:0,b:1,c:2})
  const identity=dice.private(s,'a')
  for(const id of s.players)dice.command(s,id,{kind:'act',value:1},c)
  assert.equal(s.uxPresentation?.duration,3400)
  assert.deepEqual(dice.private(s,'a'),identity)
  dice.advance(s,{...c,now:s.deadline!})
  assert.equal(s.deadline,1000+3400+30000)
  s.stage='SUMMARY';s.deadline=1000+8000*1.7
  const restored=JSON.parse(JSON.stringify(s))
  dice.advance(restored,{...c,now:s.deadline!-1})
  assert.equal(restored.deadline,s.deadline)
})
test('speed validation, default and old saves',()=>{
  assert.equal(presentationSpeed({}),1.35)
  for(const value of [0,2,'1',NaN])assert.throws(()=>presentationSpeed({presentationSpeed:value}))
  const old=ghost.start(['a','b','c'],{night:30,day:60},ctx)
  for(const id of old.players)ghost.command(old,id,{kind:'night',candle:1,action:'LIGHT'},ctx)
  assert.equal(old.uxPresentation,undefined)
  assert.equal(old.deadline,61000)
})
test('real authenticated sockets, host lock, all-offline restart and barrier restoration',async t=>{
  const directory=mkdtempSync(resolve('work/ux-service-'))
  let clock=100_000
  const origin='http://ux.test'
  const open=()=>createPlatform({database:resolve(directory,'test.db'),origin,secure:false,plugins:[ghost],now:()=>clock,random:()=>0})
  let platform=open(),url=''
  const sockets:Socket[]=[]
  t.after(async()=>{sockets.forEach(s=>s.disconnect());await platform.close();rmSync(directory,{recursive:true,force:true})})
  async function listen(){await new Promise<void>(done=>platform.server.listen(0,'127.0.0.1',done));const address=platform.server.address();assert(address&&typeof address!=='string');url='http://127.0.0.1:'+address.port}
  await listen()
  const cookies=await Promise.all([0,1,2].map(async i=>{
    const r=await fetch(url+'/api/auth/register',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({username:'ux_'+randomUUID().replaceAll('-','').slice(0,14),password:'ux protocol test phrase',name:'UX'+i,avatar:0})})
    assert.equal(r.status,201);return r.headers.get('set-cookie')!.split(';')[0]
  }))
  async function connect(cookie:string){
    const socket=io(url,{forceNew:true,extraHeaders:{cookie,origin}});sockets.push(socket)
    const rooms=new Map<string,Snapshot>();socket.on('room',(r:Snapshot)=>rooms.set(r.code,r))
    await new Promise<void>((done,fail)=>{socket.once('connect',done);socket.once('connect_error',fail)})
    return {socket,rooms}
  }
  let clients=await Promise.all(cookies.map(connect))
  async function send(client:typeof clients[number],type:string,code?:string,data?:unknown){
    const match=code?client.rooms.get(code)?.match:undefined
    return await client.socket.timeout(3000).emitWithAck('command',{v:1,id:randomUUID(),type,room:code,data,match:match?.id,phase:match?.phase,controlVersion:match?.controlVersion})
  }
  const created=await send(clients[0],'create',undefined,{gameId:'ghost-candle'});assert(created.ok)
  const code=created.room
  for(const client of clients.slice(1))assert((await send(client,'join',code)).ok)
  assert(!(await send(clients[1],'config',code,{night:30,day:60,presentationSpeed:.8})).ok)
  assert((await send(clients[0],'config',code,{night:30,day:60,presentationSpeed:.8})).ok)
  for(const client of clients)assert((await send(client,'ready',code,true)).ok)
  assert((await send(clients[0],'start',code)).ok)
  assert(!(await send(clients[0],'config',code,{night:30,day:60,presentationSpeed:1.7})).ok)
  for(const client of clients)assert((await send(client,'game',code,{kind:'night',candle:1,action:'LIGHT'})).ok)
  assert((await send(clients[0],'sync',code)).ok)
  const barrier=clients[0].rooms.get(code)!.match!
  assert.equal((barrier.public as any).stage,'PRESENTATION')
  assert(!(await send(clients[0],'game',code,{kind:'discuss'})).ok)
  for(const client of clients)assert((await send(client,'leave',code)).ok)
  await platform.close();clock+=60_000;platform=open();await listen()
  clients=await Promise.all(cookies.map(connect))
  for(const client of clients)assert((await send(client,'join',code,{resume:true})).ok)
  assert((await send(clients[0],'sync',code)).ok)
  const recovered=clients[0].rooms.get(code)!.match!
  assert.equal(recovered.deadline,clock+2800)
  assert.deepEqual(recovered.public,barrier.public && {...barrier.public as object,presentation:{...(barrier.public as any).presentation,startedAt:clock,endsAt:clock+2800}})
  clock+=2800;platform.tick()
  assert((await send(clients[0],'sync',code)).ok)
  const after=clients[0].rooms.get(code)!.match!
  assert.equal((after.public as any).stage,'DAY_DISCUSSION')
  assert.equal(after.deadline,clock+60000)
  assert.equal((after.public as any).candles.filter((c:string)=>c==='LIT').length,1)
  assert((await send(clients[2],'detach')).ok)
  let lobbyNotified=false
  clients[2].socket.on('left',value=>{if(value===code)lobbyNotified=true})
  for(let i=0;i<40&&!clients[0].rooms.get(code)!.match!.finished;i++) {
    clock=clients[0].rooms.get(code)!.match!.deadline!
    platform.tick();assert((await send(clients[0],'sync',code)).ok)
  }
  assert(clients[0].rooms.get(code)!.match!.finished)
  await new Promise(done=>setTimeout(done,30))
  assert(lobbyNotified,'detached lobby must refresh its resume entry when the match finishes')
})
