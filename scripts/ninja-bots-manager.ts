import {createInterface} from 'node:readline/promises'
import {stdin,stdout} from 'node:process'
import {fillNinjaRoom,type BotMode} from './ninja-bots.ts'

const ports={
  '1':{port:3216,cookieName:'games_ninja_p20',label:'P20 新版'},
  '2':{port:3213,cookieName:'games_ninja_preview',label:'原试玩版'},
} as const
const difficulty:Record<string,BotMode>={e:'random',n:'simple',h:'strategic', '1':'random','2':'simple','3':'strategic'}
const words:Record<BotMode,string>={random:'简单（随机）',simple:'普通（规则启发）',strategic:'困难（强化规则启发）'}
const input=createInterface({input:stdin,output:stdout,terminal:stdin.isTTY})
let current:{stop:()=>Promise<void>;room:string;port:number;count:number}|undefined
let stopping=false
let closing=false
const ask=async(question:string)=> (await input.question(question)).trim()
async function stop(){
  if(stopping) return
  stopping=true
  try {
    if(current) {
      const old=current
      current=undefined
      await old.stop()
      console.log('已停止 '+old.port+' 房间 '+old.room+' 的 '+old.count+' 名机器人。')
    } else console.log('目前没有由新管理器运行的机器人。')
  } finally {stopping=false}
}
async function run(){
  console.log('\n=== 忍者之夜 · 统一机器人管理器 ===')
  console.log('可选择 3216 新版或 3213 旧版；设置人数和各机器人的难度。')
  while(!closing) {
    try {
      console.log('\n[1] 启动或切换房间   [2] 停止全部机器人   [3] 查看状态   [0] 退出')
      const choice=await ask('请选择：')
      if(choice==='0'){await stop();break}
      if(choice==='2'){await stop();continue}
      if(choice==='3') {
        console.log(current?'当前：'+current.port+' / 房间 '+current.room+' / '+current.count+' 名机器人':'当前没有运行的机器人。')
        continue
      }
      if(choice!=='1'){console.log('请输入 0、1、2 或 3。');continue}
      const version=await ask('选择服务器 [1] 3216 P20（默认） [2] 3213：')||'1'
      if(version!=='1'&&version!=='2'){console.log('服务器选择无效。');continue}
      const server=ports[version]
      const room=await ask('六位房间码（保留开头的 0）：')
      if(!/^\d{6}$/.test(room)){console.log('房间码必须为六位数字。');continue}
      const raw=await ask('机器人数量（1～10，需留至少一个真人位置）：')
      if(!/^(10|[1-9])$/.test(raw)){console.log('数量必须是 1～10 的整数。');continue}
      const count=Number(raw)
      console.log('难度：1=简单（随机） 2=普通（规则启发） 3=困难（强化启发）。')
      const profile=await ask('输入统一难度（如 2）或逐个难度（如 1,2,3）：')
      const entries=profile.replace(/\s/g,'').toLowerCase().split(',')
      const rawModes=entries.length===1?Array(count).fill(entries[0]):entries
      if(rawModes.length!==count||rawModes.some(item=>!difficulty[item])) {
        console.log('难度格式无效；逐个设置必须与机器人数量一致。')
        continue
      }
      const modes=rawModes.map(item=>difficulty[item])
      const desc=modes.map((mode,i)=>(i+1)+'号 '+words[mode]).join('，')
      console.log('目标：'+server.label+' / 房间 '+room+' / '+count+' 名机器人；'+desc)
      const confirm=await ask('确认切换？输入 Y：')
      if(confirm.toLowerCase()!=='y'){console.log('已取消，当前机器人不变。');continue}
      await stop()
      console.log('正在连接新房间……')
      try {
        const group=await fillNinjaRoom({
          origin:'http://127.0.0.1:'+server.port,cookieName:server.cookieName,
          room,mode:'simple',count,modes,report:message=>console.log('[机器人] '+message),
        })
        current={stop:group.stop,room,port:server.port,count:group.count}
        console.log('成功：'+group.count+' 名机器人已加入并准备。管理菜单仍然保持运行。')
      } catch(error) {
        console.error('加入失败：'+(error instanceof Error?error.message:String(error)))
        console.log('可修改房间设置并重新尝试，无需重开窗口。')
      }
    } catch(error) {
      if(closing) break
      console.error('操作失败：'+(error instanceof Error?error.message:String(error)))
    }
  }
}
process.on('SIGINT',()=>{closing=true;void stop().then(()=>input.close())})
try { await run() } finally {await stop();input.close()}
