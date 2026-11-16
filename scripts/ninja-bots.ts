import {randomUUID} from 'node:crypto'
import {io} from 'socket.io-client'
import {protocolVersion,type Command,type Reply,type Snapshot} from '../packages/protocol/index.ts'
import {cards} from '../games/night-of-the-ninja/cards.ts'
import type {privateView,publicView} from '../games/night-of-the-ninja/engine.ts'

export type BotMode = 'random'|'simple'|'strategic'
type PublicView = ReturnType<typeof publicView>
type OwnView = NonNullable<ReturnType<typeof privateView>>
type Choice = OwnView['options'][number]
type Setup = {
  origin:string; cookieName:string; room:string; mode:BotMode; count?:number; modes?:BotMode[];
  random?:()=>number; report?:(message:string)=>void; signal?:AbortSignal;
}

const gameId='night-of-the-ninja'
const strength={spy:2,mystic:4,shift:5,dig:4,trouble:3,merchant:2,thief:5,judge:6,blind:6,shinobi:7,mirror:8,martyr:7,master:9}

export function choose(options:Choice[],state:PublicView,mode:BotMode,random:()=>number) {
  const pick=(items:Choice[])=>items[Math.floor(random()*items.length)]
  if(mode==='random') return pick(options)
  const score=(choice:Choice)=>{
    if(choice.target) return state.seats.find(seat=>seat.id===choice.target)?.honorCount??0
    if(choice.card) return strength[cards[choice.card].skill]
    if(choice.value==='pass') return -1
    if(choice.value==='yes' || (state.mode==='commit' && choice.value.includes(','))) return 10
    return 0
  }
  const weighted=(choice:Choice)=>score(choice)+(mode==='strategic' && choice.card ? (['judge','blind','shinobi','mirror','martyr'].includes(cards[choice.card].skill)?4:0):0)
  const best=Math.max(...options.map(weighted))
  return pick(options.filter(choice=>weighted(choice)===best))
}

async function spawnBot(setup:Setup,number:number) {
  const {origin,cookieName,room,mode,random=Math.random,report=()=>{},signal}=setup
  const name='练习机器人'+number
  const session=await fetch(origin+'/api/session',{method:'POST',headers:{origin},redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(5000),...(signal?[signal]:[])])})
  const cookie=session.headers.get('set-cookie')?.split(';')[0]
  if(!session.ok || !cookie?.startsWith(cookieName+'=')) throw new Error('未找到专用试玩会话，请检查隔离服务')
  const profile=await fetch(origin+'/api/profile',{
    method:'PUT',headers:{origin,cookie,'content-type':'application/json'},redirect:'error',
    signal:AbortSignal.any([AbortSignal.timeout(5000),...(signal?[signal]:[])]),
    body:JSON.stringify({name,avatar:0}),
  })
  if(!profile.ok) throw new Error('机器人游客资料设置失败')
  const {id}=await profile.json() as {id:string}
  const socket=io(origin,{transports:['websocket'],extraHeaders:{origin,cookie},autoConnect:false,timeout:4000})
  let snapshot:Snapshot|undefined
  let joined=false
  let closing=false
  let busy=false
  let timer:ReturnType<typeof setTimeout>|undefined
  let attempted=''
  const send=(type:string,data?:unknown,match?:Snapshot['match'])=>socket.timeout(3500).emitWithAck(
    'command',{v:protocolVersion,id:randomUUID(),room,type,data,match:match?.id,phase:match?.phase} satisfies Command,
  ) as Promise<Reply>
  async function checked(type:string,data?:unknown) {
    const reply=await send(type,data)
    if(!reply.ok) throw new Error(reply.error)
  }
  function schedule() {
    clearTimeout(timer)
    const roomState=snapshot
    const match=roomState?.match
    if(!joined || closing || busy || !socket.connected || !match || match.finished || roomState.pausedMs!==undefined) return
    const own=match.private as OwnView|undefined
    const key=match.id+':'+match.phase
    if(!own?.options.length || attempted===key) return
    timer=setTimeout(async()=>{
      if(closing || !socket.connected || snapshot?.match?.id!==match.id || snapshot.match.phase!==match.phase) return
      const option=choose(own.options,match.public as PublicView,mode,random)
      attempted=key
      busy=true
      try {
        const reply=await send('game',{value:option.value},match)
        if(!reply.ok && !['对局或阶段已变化','比赛已暂停'].includes(reply.error)) report(name+' 提交被拒绝，等待下一阶段。')
      } catch {
        if(socket.connected && !closing) {
          attempted=''
          try { await checked('sync') } catch { attempted=key }
        }
      } finally {
        busy=false
        schedule()
      }
    },150+Math.floor(random()*200))
  }
  socket.on('room',(next:Snapshot)=>{
    if(next.code!==room || next.spectator || next.gameId!==gameId || !next.members.some(member=>member.id===id)) return
    const finished=next.match?.finished && !snapshot?.match?.finished
    snapshot=next
    if(finished && number===1) report('比赛已产生冠军。可以在网页查看结果，或停止机器人。')
    schedule()
  })
  socket.on('left',(code:string)=>{
    if(code===room) {
      joined=false
      snapshot=undefined
      clearTimeout(timer)
      socket.disconnect()
    }
  })
  socket.on('connect',()=>{
    if(!joined || closing) return
    attempted=''
    void checked('sync').catch(()=>report(name+' 未能恢复席位。'))
  })
  socket.on('disconnect',()=>{
    clearTimeout(timer)
    snapshot=undefined
  })
  try {
    await new Promise<void>((resolve,reject)=>{
      socket.once('connect',resolve)
      socket.once('connect_error',reject)
      socket.connect()
    })
    await checked('join',{gameId,waitingMembers:number})
    joined=true
    if(!snapshot) throw new Error('目标房间未返回有效的忍者之夜快照')
    const capacity=(snapshot.config as {playerCount:number}).playerCount
    if(!Number.isInteger(capacity)||capacity<4||capacity>11) throw new Error('房间人数配置无效')
    await checked('lobby',{portrait:number})
    await checked('ready',true)
    schedule()
    return {capacity,stop}
  } catch(error) {
    await stop()
    throw error
  }

  async function stop() {
    closing=true
    clearTimeout(timer)
    try {
      if(joined && snapshot && !snapshot.match && socket.connected) await send('leave')
    } catch {
      // Disconnect still releases the connection if the preview is already unavailable.
    } finally {
      socket.disconnect()
    }
  }
}

export async function fillNinjaRoom(setup:Setup) {
  if(!/^\d{6}$/.test(setup.room)) throw new Error('请输入六位房间码')
  const bots:Awaited<ReturnType<typeof spawnBot>>[]=[]
  let capacity=0
  if(setup.count!==undefined && (!Number.isInteger(setup.count)||setup.count<1||setup.count>10)) throw new Error('机器人数量必须在 1～10 人之间')
  if(setup.modes && (setup.modes.length!==setup.count || setup.modes.some(mode=>!['random','simple','strategic'].includes(mode)))) throw new Error('机器人难度配置无效')
  const stop=async()=>{await Promise.all(bots.map(bot=>bot.stop()))}
  try {
    for(let number=1;setup.count===undefined?(number===1||number<capacity):(number<=setup.count);number++) {
      setup.signal?.throwIfAborted()
      const bot=await spawnBot({...setup,mode:setup.modes?.[number-1]??setup.mode},number)
      bots.push(bot)
      if(number===1) {
        capacity=bot.capacity
        if(setup.count!==undefined && setup.count>=capacity) throw new Error('机器人数量必须小于房间正式玩家数')
      }
      else if(bot.capacity!==capacity) throw new Error('填充期间正式人数已变化，请停止后重试')
    }
    return {count:bots.length,stop}
  } catch(error) {
    await stop()
    throw error
  }
}
