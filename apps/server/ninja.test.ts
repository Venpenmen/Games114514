import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {io,type Socket} from 'socket.io-client'
import {createPlatform} from './service.ts'
import {nightOfTheNinja,publicView,privateView} from '../../games/night-of-the-ninja/engine.ts'
import {ghostCandle} from '../../games/ghost-candle/engine.ts'
import {diceWerewolf} from '../../games/dice-werewolf/engine.ts'
import type {Reply,Snapshot} from '../../packages/protocol/index.ts'

for(const count of [4,5,7,11]) test('ninja real socket tournament '+count+' players',async t=>{
  const folder=mkdtempSync(resolve('work/ninja-socket-'))
  const origin='http://ninja.test'
  let time=100000
  let seed=2048+count
  const random=(limit:number)=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)%limit)
  const open=()=>createPlatform({database:resolve(folder,'test.db'),origin,secure:false,cookieName:'ninja_test',
    plugins:[nightOfTheNinja,ghostCandle,diceWerewolf],now:()=>time,random})
  let platform=open()
  let url=''
  let allSockets:Socket[]=[]
  async function listen() {
    await new Promise<void>(done=>platform.server.listen(0,'127.0.0.1',done))
    const address=platform.server.address()
    assert(address&&typeof address!=='string')
    url='http://127.0.0.1:'+address.port
  }
  t.after(async()=>{allSockets.forEach(socket=>socket.disconnect());await platform.close();rmSync(folder,{recursive:true,force:true})})
  await listen()
  async function register(name:string) {
    const reply=await fetch(url+'/api/session',{method:'POST',headers:{origin}})
    assert.equal(reply.status,200)
    const cookie=reply.headers.get('set-cookie')!.split(';')[0]
    assert(cookie.startsWith('ninja_test='))
    const profile=await fetch(url+'/api/profile',{method:'PUT',headers:{origin,cookie,'content-type':'application/json'},body:JSON.stringify({name,avatar:0})})
    assert.equal(profile.status,200)
    return cookie
  }
  async function connect(cookie:string) {
    const socket=io(url,{transports:['websocket'],extraHeaders:{origin,cookie},reconnection:false})
    allSockets.push(socket)
    const client:{socket:Socket; snapshot?:Snapshot}={socket}
    socket.on('room',(snapshot:Snapshot)=>{client.snapshot=snapshot})
    await new Promise<void>((done,fail)=>{socket.once('connect',done);socket.once('connect_error',fail)})
    return client
  }
  const cookies=await Promise.all(Array.from({length:count+1},(_,i)=>register('忍者'+i)))
  let guests=await Promise.all(cookies.map(connect))
  let room:string|undefined
  async function send(client:typeof guests[number],type:string,data?:unknown,more:object={}):Promise<Reply>{
    const match=client.snapshot?.match
    return client.socket.timeout(4000).emitWithAck('command',{v:1,id:randomUUID(),type,data,room,match:match?.id,phase:match?.phase,...more})
  }
  const created=await send(guests[0],'create',{gameId:'night-of-the-ninja'})
  assert(created.ok&&created.room);room=created.room
  assert((await send(guests[0],'config',{playerCount:count})).ok)
  for(const player of guests.slice(1,count)) assert((await send(player,'join')).ok)
  assert.equal((await send(guests[count],'join')).ok,false)
  assert.equal((await send(guests[1],'start')).ok,false)
  for(const [i,player] of guests.slice(0,count).entries()) {
    assert((await send(player,'lobby',{portrait:i})).ok)
    assert((await send(player,'ready',true)).ok)
  }
  assert((await send(guests[0],'start')).ok)
  const syncPlayers=async()=>{
    for(const player of guests.slice(0,count)) assert((await send(player,'sync')).ok)
  }
  await syncPlayers()
  assert((await send(guests[count],'watch')).ok)
  assert.equal(guests[count].snapshot?.spectator,true)
  assert(!Object.hasOwn(guests[count].snapshot!.match!,'private'))
  assert.equal((await send(guests[count],'game',{value:'pass'})).ok,false)
  assert.equal((await send(guests[count],'chat','forbidden')).ok,false)
  if(count===4) {
    const original=guests[0].snapshot!.match!
    const replayId='ninja-recovery-receipt'
    const choice=(original.private as NonNullable<ReturnType<typeof privateView>>).options[0].value
    assert((await send(guests[0],'game',{value:choice},{id:replayId})).ok)
    assert((await send(guests[0],'game',{value:choice},{id:replayId})).ok)
    assert.equal((guests[0].snapshot!.match!.public as ReturnType<typeof publicView>).submitted,1)
    for (const guest of guests.slice(0,count)) guest.socket.disconnect()
    await new Promise<void>(done=>setImmediate(done))
    await platform.close()
    time+=48*60*60*1000
    allSockets=[]
    platform=open()
    await listen()
    const watcher=await connect(cookies[count])
    assert((await send(watcher,'watch')).ok)
    assert.equal(watcher.snapshot?.match?.deadline,null)
    guests=[...await Promise.all(cookies.slice(0,count).map(connect)),watcher]
    await syncPlayers()
    const resumed=guests[0].snapshot!.match!
    assert.equal(resumed.phase,original.phase)
    assert.equal(resumed.deadline,time+45_000)
    assert.equal((resumed.private as ReturnType<typeof privateView>)?.submitted,true)
    // Receipts age out after 24h. A replay with the stale phase must still be rejected.
    time=resumed.deadline!+800
    platform.tick()
    await syncPlayers()
    assert.equal(guests[0].snapshot?.match?.phase,original.phase+1)
    assert.equal((await send(guests[0],'game',{value:choice},{id:replayId,phase:original.phase})).ok,false)
    assert((await send(guests[0],'leave')).ok)
    await syncAfterHostLeaves()
    const oldHost=guests[1].snapshot!.host
    const clock=time
    const offline=new Promise<void>((done,fail)=>{
      const timer=setTimeout(()=>fail(new Error('host presence update missing')),2000)
      function update(snapshot:Snapshot){
        if(snapshot.code===room && snapshot.members.some(member=>member.id===oldHost&&!member.online)){
          clearTimeout(timer)
          guests[0].socket.off('room',update)
          done()
        }
      }
      guests[0].socket.on('room',update)
    })
    guests[1].socket.disconnect()
    await offline
    time=clock+119_000
    platform.tick()
    assert((await send(guests[0],'sync')).ok)
    assert.equal(guests[0].snapshot!.host,oldHost)
    time=clock+121_000
    platform.tick()
    assert((await send(guests[0],'sync')).ok)
    assert.equal(guests[0].snapshot!.host,guests[0].snapshot!.members[0].id)
    guests[1]=await connect(cookies[1])
    assert((await send(guests[1],'join')).ok)
    async function syncAfterHostLeaves(){
      assert((await send(guests[1],'sync')).ok)
      assert.equal(guests[1].snapshot?.host,guests[1].snapshot?.members[1].id)
      assert((await send(guests[0],'join')).ok)
    }
  }
  let steps=0
  let lastRound=0
  let pausedPresentation=false
  for(;steps<650;steps++) {
    await syncPlayers()
    const match=guests[0].snapshot!.match!
    const visible=match.public as ReturnType<typeof publicView>
    assert(!Object.hasOwn(visible,'finalScores') || match.finished)
    assert(visible.seats.every(seat=>!Object.hasOwn(seat,'identity')&&!Object.hasOwn(seat,'hand')&&!Object.hasOwn(seat,'honor')))
    assert(visible.events.every((event,i)=>i===0||event.seq>visible.events[i-1].seq))
    const views=guests.slice(0,count).map(guest=>guest.snapshot!.match!.private as NonNullable<ReturnType<typeof privateView>>)
    assert(!Object.hasOwn(visible,'tableTargets'))
    assert(!Object.hasOwn(guests[count].snapshot!.match!.public as object,'tableTargets'))
    assert(views.every(view=>JSON.stringify(view.tableTargets)===JSON.stringify(views[0].tableTargets)))
    if(!match.finished) {
      assert(!Object.hasOwn(visible,'replay'))
      assert(!Object.hasOwn(guests[count].snapshot!.match!.public as object,'replay'))
      assert(views.every(view=>!Object.hasOwn(view,'replay')))
    }
    if(count===4 && visible.presentation && !pausedPresentation) {
      pausedPresentation=true
      const remaining=match.deadline!-time
      assert(remaining>0)
      assert(views.every(view=>!view.options.length))
      assert.equal((await send(guests[0],'game',{value:'pass'})).ok,false)
      guests.forEach(guest=>guest.socket.disconnect())
      await new Promise<void>(done=>setImmediate(done))
      await platform.close()
      time+=86_400_000
      allSockets=[]
      platform=open()
      await listen()
      const observer=await connect(cookies[count])
      assert((await send(observer,'watch')).ok)
      const paused=observer.snapshot!.match!
      assert.equal(paused.deadline,null)
      assert.equal((paused.public as ReturnType<typeof publicView>).presentation?.id,visible.presentation.id)
      guests=[...await Promise.all(cookies.slice(0,count).map(connect)),observer]
      await syncPlayers()
      const resumed=guests[0].snapshot!.match!
      assert.equal(resumed.phase,match.phase)
      assert.equal(resumed.deadline,time+remaining)
      assert.equal((resumed.public as ReturnType<typeof publicView>).presentation?.id,visible.presentation.id)
      continue
    }
    const tokens=views.flatMap(view=>view.honor)
    assert.equal(new Set(tokens.map(token=>token.id)).size,tokens.length)
    assert(views.every(view=>view.score===view.honor.reduce((total,token)=>total+token.value,0)))
    if(lastRound!==visible.round && visible.mode==='draft1') {
      assert.equal(new Set(views.flatMap(view=>view.hand)).size,count*3)
      assert.equal(views.filter(view=>view.known?.house==='ronin').length,count%2)
      lastRound=visible.round
    }
    if(match.finished) {
      assert(visible.round>=3)
      assert(visible.champions.length>=1)
      assert(visible.replayComplete)
      assert(visible.replay?.some(entry=>entry.step==='deal' && entry.round===1))
      assert(Math.max(...Object.values(visible.finalScores!))>=10)
      break
    }
    const commands=views.flatMap((view,index)=>{
      if(!view.options.length) return []
      const choices=view.options.filter(option=>option.value!=='pass')
      // Keep some rounds peaceful; deliberately play all actionable skills on alternating rounds.
      const choice=visible.mode==='commit' && visible.round%2===0 ? view.options[0] : choices[0]??view.options[0]
      return [{guest:guests[index],choice}]
    })
    if(commands.length) {
      const outcomes=await Promise.all(commands.map(({guest,choice})=>send(guest,'game',{value:choice.value})))
      assert(outcomes.every(result=>result.ok),JSON.stringify(outcomes))
    } else {
      time=match.deadline!
      platform.tick()
    }
    time+=1100
  }
  if(count===4) assert(pausedPresentation)
  assert(steps<650,'must reach a champion through real socket commands')
})
