import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {io} from 'socket.io-client'
import {createPlatform} from '../apps/server/service.ts'
import {fillClassicRoom} from '../scripts/classic-bots.ts'
import {fillNinjaRoom} from '../scripts/ninja-bots.ts'
import {protocolVersion,type Command,type Reply,type Snapshot} from '../packages/protocol/index.ts'

// Small deterministic game plugins: verify real lobby, Socket.IO, server ready reset
// and second start independently from each game's random match duration.
test('all three bot groups automatically re-ready after completion and host can restart', {timeout:40_000},async()=>{
  const port=3228,origin='http://127.0.0.1:'+port
  const specs=[{id:'ghost-candle',count:3,needsLobby:false},
    {id:'dice-werewolf',count:3,needsLobby:true},
    {id:'night-of-the-ninja',count:4,needsLobby:true}]
  const plugins=specs.map(({id,count,needsLobby})=>({
    id,version:1,name:id,minPlayers:count,maxPlayers:count,
    defaults:id==='night-of-the-ninja'?{playerCount:count}:{},
    settings:[],
    config:(x:unknown)=>x,
    ...(needsLobby?{lobby:{select:(x:any)=>x.portrait,ready:(x:unknown)=>typeof x==='number'}}:{}),
    start:(_players:string[],_config:unknown,_ctx:unknown)=>({phase:0,deadline:null,done:false}),
    command:(s:{phase:number;done:boolean})=>{s.done=true;s.phase++},
    advance:()=>{},public:()=>({submitted:[],stage:'NO_ACTION'}),
    private:()=>({role:'HUMAN',options:[]}),finished:(s:{done:boolean})=>s.done,
    canChat:()=>false,
  }))
  const platform=createPlatform({database:'work/logs/bots-restart-check.db',origin,
    secure:false,cookieName:'games_bot_restart',plugins})
  await new Promise<void>((resolve,reject)=>platform.server.listen(port,'127.0.0.1',resolve).once('error',reject))
  try{
    for(const {id:gameId,count,needsLobby} of specs){
      const session=await fetch(origin+'/api/session',{method:'POST',headers:{origin}})
      const cookie=session.headers.get('set-cookie')?.split(';')[0]!
      assert.ok(cookie?.startsWith('games_bot_restart='))
      const profile=await fetch(origin+'/api/profile',{method:'PUT',
        headers:{origin,cookie,'content-type':'application/json'},
        body:JSON.stringify({name:'测试房主',avatar:0})})
      assert.equal(profile.status,200)
      const {id}=await profile.json() as {id:string}
      const socket=io(origin,{transports:['websocket'],extraHeaders:{origin,cookie},autoConnect:false,timeout:5000})
      let snap:Snapshot|undefined
      socket.on('room',(value:Snapshot)=>{snap=value})
      const send=async(type:string,room?:string,data?:unknown,match?:Snapshot['match'])=>{
        const r=await socket.timeout(5000).emitWithAck('command',
          {v:protocolVersion,id:randomUUID(),room,type,data,match:match?.id,phase:match?.phase} satisfies Command) as Reply
        if(!r.ok)throw new Error(type+': '+r.error)
        return r
      }
      try{
        await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);socket.connect()})
        const {room}=await send('create',undefined,{gameId})
        assert.ok(room)
        const base={origin,room,cookieName:'games_bot_restart',count:count-1,
          modes:Array(count-1).fill('simple') as ('simple')[],mode:'simple' as const}
        const bots=gameId==='night-of-the-ninja'
          ?await fillNinjaRoom(base)
          :await fillClassicRoom({...base,gameId:gameId as 'ghost-candle'|'dice-werewolf'})
        try{
          assert.equal(snap?.members.length,count)
          if(needsLobby)await send('lobby',room,{portrait:0})
          await send('ready',room,true)
          await send('start',room)
          const first=snap!.match!
          await send('game',room,{value:'finish'},first)
          assert.equal(snap!.match!.finished,true)
          const readyUntil=Date.now()+10_000
          while(Date.now()<readyUntil && snap!.members.filter(m=>m.id!==id).some(m=>!m.ready))
            await new Promise(resolve=>setTimeout(resolve,100))
          assert.equal(snap!.members.filter(m=>m.id!==id&&m.ready).length,count-1,gameId+' bots not auto-ready')
          if(needsLobby)await send('lobby',room,{portrait:0})
          await send('ready',room,true)
          await send('start',room)
          assert.notEqual(snap!.match!.id,first.id,gameId+' did not start a second match')
          assert.equal(snap!.match!.finished,false)
          console.log(gameId+' successfully restarted')
        }finally{await bots.stop()}
      }finally{socket.disconnect()}
    }
  }finally{await platform.close()}
})
