import {createInterface} from 'node:readline/promises'
import {stdin,stdout} from 'node:process'
import {fillNinjaRoom,type BotMode} from './ninja-bots.ts'
import {fillClassicRoom,type ClassicGame} from './classic-bots.ts'

type GameId=ClassicGame|'night-of-the-ninja'
const ports={
  '1':{port:3216,cookieName:'games_ninja_p20',label:'P20 新版'},
  '2':{port:3213,cookieName:'games_ninja_preview',label:'原试玩版'},
} as const
const games:Record<string,{id:GameId;label:string;maxBots:number}>={
  '1':{id:'night-of-the-ninja',label:'忍者之夜',maxBots:10},
  '2':{id:'ghost-candle',label:'诡吹灯',maxBots:2},
  '3':{id:'dice-werewolf',label:'骰子狼人杀',maxBots:2},
}
const difficulty:Record<string,BotMode>={e:'random',n:'simple',h:'strategic','1':'random','2':'simple','3':'strategic'}
const words:Record<BotMode,string>={random:'简单（随机）',simple:'普通（启发）',strategic:'困难（强化启发）'}
const input=createInterface({input:stdin,output:stdout,terminal:stdin.isTTY})
let current:{stop:()=>Promise<void>;room:string;port:number;count:number;game:string}|undefined
let stopping=false
let closing=false
const abort=new AbortController()
const ask=async(question:string)=>(await input.question(question)).trim()
async function stop(){
  if(stopping)return
  stopping=true
  try{
    if(current){
      const old=current
      current=undefined
      await old.stop()
      console.log('已断开 '+old.port+' / '+old.game+' / 房间 '+old.room+' 的 '+old.count+' 名机器人。')
    }else console.log('当前没有由管理器运行的机器人。')
  }finally{stopping=false}
}
async function shutdown(){
  if(!closing){
    closing=true
    abort.abort()
    input.close()
  }
  await stop()
}
// The manager is a child of the cmd shell. If the console disappears,
// Windows normally terminates the child; this guard additionally handles
// an orphaned process whose parent has disappeared.
const parentPid=process.ppid
const parentGuard=setInterval(()=>{
  if(closing||!parentPid||parentPid===process.pid)return
  try{process.kill(parentPid,0)}catch{void shutdown()}
},1000)
parentGuard.unref()
for(const signal of ['SIGINT','SIGTERM','SIGHUP','SIGBREAK'] as const){
  process.on(signal,()=>{void shutdown()})
}

async function run(){
  console.log('\n=== Games114514 · 统一机器人管理器 ===')
  console.log('关闭本 CMD 窗口，机器人连接也会随管理器退出。')
  while(!closing){
    try{
      console.log('\n[1] 启动或切换房间   [2] 停止全部机器人   [3] 查看状态   [0] 退出')
      const choice=await ask('请选择：')
      if(choice==='0'){await shutdown();break}
      if(choice==='2'){await stop();continue}
      if(choice==='3'){
        console.log(current?`当前：${current.port} / ${current.game} / 房间 ${current.room} / ${current.count} 名机器人`:'当前没有运行的机器人。')
        continue
      }
      if(choice!=='1'){console.log('请输入 0、1、2 或 3。');continue}
      const version=await ask('服务器 [1] 3216 新版（默认） [2] 3213 旧版：')||'1'
      if(version!=='1'&&version!=='2'){console.log('服务器选择无效。');continue}
      const server=ports[version]
      const gameChoice=await ask('游戏 [1] 忍者之夜 [2] 诡吹灯 [3] 骰子狼人杀：')
      const game=games[gameChoice]
      if(!game){console.log('游戏选择无效。');continue}
      const room=await ask('六位房间码（保留开头的 0）：')
      if(!/^\d{6}$/.test(room)){console.log('房间码必须为六位数字。');continue}
      const raw=await ask(`机器人数量（1～${game.maxBots}，需要先留出真人位置）：`)
      const count=Number(raw)
      if(!/^\d+$/.test(raw)||!Number.isInteger(count)||count<1||count>game.maxBots){
        console.log('机器人数量超出该游戏限制。');continue
      }
      console.log('难度：1=简单（随机） 2=普通（规则启发） 3=困难（强化规则启发）。')
      const profile=await ask('统一难度（如 2），或逐个难度（如 1,2）：')
      const entries=profile.replace(/\s/g,'').toLowerCase().split(',')
      const rawModes=entries.length===1?Array(count).fill(entries[0]):entries
      if(rawModes.length!==count||rawModes.some(item=>!difficulty[item])){
        console.log('难度设置无效；逐个设置必须与机器人数量一致。');continue
      }
      const modes:BotMode[]=rawModes.map(item=>difficulty[item])
      console.log('目标：'+server.label+' / '+game.label+' / 房间 '+room+' / '+count+' 名机器人')
      console.log(modes.map((mode,i)=>(i+1)+'号 '+words[mode]).join('，'))
      const confirm=await ask('确认切换？输入 Y：')
      if(confirm.toLowerCase()!=='y'){console.log('已取消，当前机器人不变。');continue}
      await stop()
      console.log('正在连接目标房间……')
      try{
        const base={origin:'http://127.0.0.1:'+server.port,cookieName:server.cookieName,
          room,count,modes,signal:abort.signal,
          report:(message:string)=>console.log('[机器人] '+message)}
        const group=game.id==='night-of-the-ninja'
          ?await fillNinjaRoom({...base,mode:'simple'})
          :await fillClassicRoom({...base,gameId:game.id})
        if(closing){await group.stop();break}
        current={stop:group.stop,room,port:server.port,count:group.count,game:game.label}
        console.log('成功：'+group.count+' 名机器人已加入并准备，管理器持续运行。')
      }catch(error){
        console.error('加入失败：'+(error instanceof Error?error.message:String(error)))
        console.log('请检查游戏、端口、房间码和剩余空位；可直接在菜单重试。')
      }
    }catch(error){
      if(closing)break
      console.error('操作失败：'+(error instanceof Error?error.message:String(error)))
    }
  }
}
try{await run()}finally{await shutdown()}
