import {randomUUID} from 'node:crypto'
import {io} from 'socket.io-client'
import {botAuth,botLogout,botResumable} from './bot-auth.ts'
import {protocolVersion,type Command,type Reply,type Snapshot} from '../packages/protocol/index.ts'
import type {BotMode} from './ninja-bots.ts'

export type ClassicGame='ghost-candle'|'dice-werewolf'
export type ClassicSetup={
  origin:string;cookieName:string;room:string;gameId:ClassicGame;
  count:number;modes:BotMode[];report?:(message:string)=>void;
  random?:()=>number;signal?:AbortSignal
}
type GhostPublic={stage:string;night:number;candles:('INTACT'|'LIT'|'DESTROYED')[];submitted:string[];winner?:string}
type GhostPrivate={role:'GHOST'|'HUMAN'}
type DicePublic={stage:string;face:number;points:{face:number;hp:number;removed:boolean}[];submitted:string[];scores:Record<string,number>;summary?:unknown}
const pick=<T>(items:T[],random:()=>number):T=>items[Math.min(items.length-1,Math.floor(random()*items.length))]

export function chooseClassic(gameId:ClassicGame,match:NonNullable<Snapshot['match']>,me:string,members:Snapshot['members'],mode:BotMode,random:()=>number):unknown|null {
  const s=match.public as GhostPublic&DicePublic
  if(!s || s.submitted?.includes(me))return null
  if(gameId==='ghost-candle'){
    const privateState=match.private as GhostPrivate|undefined
    if(!privateState?.role)return null
    if(s.stage==='NIGHT'){
      const intact=s.candles.flatMap((value,i)=>value==='INTACT'?[i+1]:[])
      if(!intact.length)return null
      const candle=mode==='random'?pick(intact,random):intact[0]
      return {kind:'night',candle,action:privateState.role==='GHOST'?'DESTROY':'LIGHT'}
    }
    if(s.stage==='DAY_DISCUSSION')return {kind:'discuss'}
    if(s.stage==='DAY_DECISION')return {kind:'decision',yes:mode!=='random'||random()<0.65}
    if(s.stage==='ACCUSATION'||s.stage==='REVOTE'){
      const others=members.filter(m=>m.id!==me).map(m=>m.id)
      return others.length?{kind:'vote',target:pick(others,random)}:null
    }
    return null
  }
  if(s.stage==='ACTION'){
    const point=s.points?.find(p=>p.face===s.face)
    const value=mode==='random'?(random()<.5?-1:1):point && point.hp<=-3?1:random()<.6?1:-1
    return {kind:'act',value}
  }
  if(s.stage==='VOTE'||s.stage==='REVOTE'){
    const options=s.points?.filter(p=>!p.removed)??[]
    if(!options.length)return null
    const face=mode==='random'?pick(options,random).face:
      [...options].sort((a,b)=>a.hp-b.hp)[0].face
    return {kind:'vote',value:face}
  }
  return null
}

async function spawn(setup:ClassicSetup,index:number){
  const {origin,cookieName,room,gameId,report=()=>{},signal,random=Math.random}=setup
  const mode=setup.modes[index-1]
  const name=(gameId==='ghost-candle'?'灯影机器人':'骰子机器人')+index
  const requestSignal=()=>AbortSignal.any([AbortSignal.timeout(6000),...(signal?[signal]:[])])
  let cookie:string,id:string
  if(cookieName==='games_ninja_preview'){
    const login=await fetch(origin+'/api/session',{method:'POST',headers:{origin},redirect:'error',signal:requestSignal()})
    const legacyCookie=login.headers.get('set-cookie')?.split(';')[0]
    if(!login.ok || !legacyCookie?.startsWith(cookieName+'='))throw Error('旧版游客会话创建失败')
    const response=await fetch(origin+'/api/profile',{method:'PUT',headers:{origin,cookie:legacyCookie,'content-type':'application/json'},body:JSON.stringify({name,avatar:index%6}),signal:requestSignal()})
    if(!response.ok)throw Error('旧版机器人资料设置失败')
    id=(await response.json() as {id:string}).id
    cookie=legacyCookie
  }else{
    ({cookie,id}=await botAuth(origin,cookieName,index,signal))
  }
  const socket=io(origin,{transports:['websocket'],extraHeaders:{origin,cookie},autoConnect:false,timeout:5000})
  let snapshot:Snapshot|undefined
  let joined=false
  let stopping=false
  let busy=false
  let attempted=''
  let timer:ReturnType<typeof setTimeout>|undefined
  let readying=false
  let readyTimer:ReturnType<typeof setTimeout>|undefined
  const send=(type:string,data?:unknown,match?:Snapshot['match'])=>socket.timeout(4000).emitWithAck('command',{
    v:protocolVersion,id:randomUUID(),room,type,data,match:match?.id,phase:match?.phase,controlVersion:match?.controlVersion,
  } satisfies Command) as Promise<Reply>
  const checked=async(type:string,data?:unknown,match?:Snapshot['match'])=>{
    const result=await send(type,data,match)
    if(!result.ok)throw new Error(result.error)
  }
  // Finished matches reset every player's ready status; re-ready without auto-start.
  function scheduleReady(){
    clearTimeout(readyTimer)
    const me=snapshot?.members.find(member=>member.id===id)
    if(!joined||stopping||readying||!socket.connected||!snapshot?.match?.finished||!me||me.ready)return
    readyTimer=setTimeout(async()=>{
      if(stopping||!socket.connected||!snapshot?.match?.finished||
        snapshot.members.find(member=>member.id===id)?.ready)return
      readying=true
      try{
        if(gameId==='dice-werewolf')await checked('lobby',{portrait:(index-1)%6})
        await checked('ready',true)
      }
      catch(error){if(!stopping)report(name+' 自动准备失败：'+String(error))}
      finally{
        readying=false
        if(snapshot?.match?.finished&&!snapshot.members.find(member=>member.id===id)?.ready)
          scheduleReady()
      }
    },1200)
  }
  function schedule(){
    clearTimeout(timer)
    const m=snapshot?.match
    if(!joined||stopping||busy||!socket.connected||!m||m.finished||snapshot?.pausedMs!==undefined)return
    const key=m.id+':'+m.phase
    if(attempted===key)return
    const choice=chooseClassic(gameId,m,id,snapshot!.members,mode,random)
    if(choice===null)return
    timer=setTimeout(async()=>{
      if(stopping||!socket.connected||snapshot?.match?.id!==m.id||snapshot?.match?.phase!==m.phase)return
      attempted=key
      busy=true
      try{await checked('game',choice,m)}
      catch(error){
        const message=error instanceof Error?error.message:String(error)
        if(!/阶段已变化|阶段已结束|已提交|已确认|比赛已暂停/.test(message))report(name+'：'+message)
      }
      finally{busy=false;schedule()}
    },250+Math.floor(random()*300))
  }
  socket.on('room',(next:Snapshot)=>{
    if(next.code!==room||next.gameId!==gameId||next.spectator||!next.members.some(x=>x.id===id))return
    const done=next.match?.finished&&!snapshot?.match?.finished
    snapshot=next
    if(done&&index===1)report(name+'：本局已结束。')
    schedule()
    scheduleReady()
  })
  socket.on('control-lost',(value:{code:string})=>{if(value.code===room){joined=false;clearTimeout(timer);clearTimeout(readyTimer);socket.disconnect();report(name+' 操作权已转移')}})
  socket.on('left',(code:string)=>{if(code===room){joined=false;snapshot=undefined;clearTimeout(timer);clearTimeout(readyTimer);socket.disconnect()}})
  socket.on('disconnect',()=>{clearTimeout(timer);clearTimeout(readyTimer);snapshot=undefined})
  socket.on('connect',()=>{if(joined&&!stopping){attempted='';void checked('sync').catch(()=>{})}})
  async function stop(){
    stopping=true
    clearTimeout(timer)
    clearTimeout(readyTimer)
    try{if(joined&&snapshot&&(!snapshot.match||snapshot.match.finished)&&socket.connected)await send('leave')}
    catch{}finally{
      socket.disconnect()
      if(cookieName!=='games_ninja_preview')await botLogout(origin,cookie)
    }
  }
  try{
    await new Promise<void>((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);socket.connect()})
    // Reuse the same test account and its existing active seat if the manager restarts.
    const existing=cookieName==='games_ninja_preview'?undefined:await botResumable(origin,cookie,room,gameId)
    if(existing)await checked('takeover',{resume:true},{id:existing} as Snapshot['match'])
    else await checked('join')
    joined=true
    if(!snapshot)throw new Error('加入后未收到房间状态')
    if(snapshot.gameId!==gameId)throw new Error('房间游戏种类不匹配')
    const capacity=3
    if(!snapshot.match?.finished && snapshot.match){schedule();return {capacity,stop}}
    if(gameId==='dice-werewolf')await checked('lobby',{portrait:(index-1)%6})
    await checked('ready',true)
    schedule()
    return {capacity,stop}
  }catch(error){await stop();throw error}
}
export async function fillClassicRoom(setup:ClassicSetup){
  if(!/^\d{6}$/.test(setup.room))throw new Error('房间码须为六位数字')
  if(!Number.isInteger(setup.count)||setup.count<1||setup.count>2)throw new Error('这两款游戏固定3人，机器人数量只能为1或2')
  if(setup.modes.length!==setup.count||setup.modes.some(m=>!['random','simple','strategic'].includes(m)))throw new Error('机器人难度配置无效')
  const bots:Awaited<ReturnType<typeof spawn>>[]=[]
  const stop=async()=>{await Promise.allSettled(bots.map(b=>b.stop()))}
  try{
    for(let n=1;n<=setup.count;n++){
      setup.signal?.throwIfAborted()
      bots.push(await spawn(setup,n))
    }
    return {count:bots.length,stop}
  }catch(error){await stop();throw error}
}
