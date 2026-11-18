import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {io} from 'socket.io-client'
import {createPlatform} from '../apps/server/service.ts'
import {ghostCandle} from '../games/ghost-candle/engine.ts'
import {diceWerewolf} from '../games/dice-werewolf/engine.ts'
import {protocolVersion,type Command,type Snapshot,type Reply} from '../packages/protocol/index.ts'
import {fillClassicRoom,chooseClassic,type ClassicGame} from '../scripts/classic-bots.ts'

test('one client and two classic bots can complete both legacy games', {timeout:125_000},async()=>{
  const port=3227,origin='http://127.0.0.1:'+port
  const platform=createPlatform({database:'work/logs/classic-bots-check.db',
    origin,secure:false,cookieName:'games_classic_check',plugins:[ghostCandle,diceWerewolf]})
  await new Promise<void>((resolve,reject)=>platform.server.listen(port,'127.0.0.1',()=>resolve()).once('error',reject))
  try{
    for(const gameId of ['ghost-candle','dice-werewolf'] as const){
      const session=await fetch(origin+'/api/session',{method:'POST',headers:{origin}})
      const cookie=session.headers.get('set-cookie')?.split(';')[0]!
      assert.ok(cookie?.startsWith('games_classic_check='))
      const profile=await fetch(origin+'/api/profile',{method:'PUT',
        headers:{origin,cookie,'content-type':'application/json'},
        body:JSON.stringify({name:'自动化真人',avatar:0})})
      assert.equal(profile.status,200)
      const {id}=await profile.json() as {id:string}
      const socket=io(origin,{transports:['websocket'],extraHeaders:{origin,cookie},autoConnect:false,timeout:5000})
      let snap:Snapshot|undefined
      const send=async(type:string,room?:string,data?:unknown,match?:Snapshot['match'])=>{
        const r=await socket.timeout(5000).emitWithAck('command',
          {v:protocolVersion,id:randomUUID(),type,room,data,match:match?.id,phase:match?.phase} satisfies Command) as Reply
        if(!r.ok)throw new Error(type+': '+r.error)
        return r
      }
      socket.on('room',(s:Snapshot)=>{snap=s})
      try{
        await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);socket.connect()})
        const {room}=await send('create',undefined,{gameId})
        assert.ok(room)
        // A new lobby must have exactly one human member.
        assert.equal(snap?.members.length,1)
        if(gameId==='dice-werewolf')await send('config',room,{target:3})
        const bots=await fillClassicRoom({origin,cookieName:'games_classic_check',room,gameId,count:2,
          modes:['simple','strategic']})
        try{
          assert.equal(snap?.members.length,3)
          if(gameId==='dice-werewolf')await send('lobby',room,{portrait:0})
          await send('ready',room,true)
          await send('start',room)
          const until=Date.now()+90_000
          let attempted=''
          let actions=0
          while(Date.now()<until){
            const m=snap?.match
            if(m?.finished)break
            const token=m?.id+':'+m?.phase
            if(m&&token!==attempted){
              const choice=chooseClassic(gameId,m,id,snap!.members,'random',Math.random)
              if(choice!==null){
                attempted=token
                try{await send('game',room,choice,m);actions++}catch(error){
                  if(!/阶段已变化|阶段已结束|已提交|已确认/.test(String(error)))throw error
                }
              }
            }
            await new Promise(resolve=>setTimeout(resolve,100))
          }
          assert.ok(snap?.match?.finished,gameId+' did not reach winner')
          assert.ok(actions>2,gameId+' human did not take real actions')
          console.log(gameId+' finished, human actions '+actions)
          const previousId=snap!.match!.id
          const readyUntil=Date.now()+8000
          while(Date.now()<readyUntil && snap?.members.filter(m=>m.id!==id).some(m=>!m.ready))
            await new Promise(resolve=>setTimeout(resolve,150))
          assert.equal(snap?.members.filter(m=>m.id!==id && m.ready).length,2,
            gameId+' bots did not auto-ready after game ended')
          if(gameId==='dice-werewolf')await send('lobby',room,{portrait:0})
          await send('ready',room,true)
          await send('start',room)
          assert.notEqual(snap?.match?.id,previousId,gameId+' second game did not start')
          assert.equal(snap?.match?.finished,false)
          console.log(gameId+' restarted successfully with same bots')
        }finally{await bots.stop()}
      }finally{socket.disconnect()}
    }
  }finally{await platform.close()}
})
