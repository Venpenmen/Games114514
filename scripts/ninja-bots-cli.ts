import {createHash} from 'node:crypto'
import {createServer,createConnection,type Socket} from 'node:net'
import {createInterface} from 'node:readline/promises'
import {fileURLToPath} from 'node:url'
import {stdin,stdout} from 'node:process'
import {fillNinjaRoom,type BotMode} from './ninja-bots.ts'

const fingerprint=createHash('sha256').update(fileURLToPath(new URL('../',import.meta.url)).toLowerCase()).digest('hex')
const pipe='\\\\.\\pipe\\games-ninja-bots-'+fingerprint

async function stopRunning() {
  await new Promise<void>((resolve,reject)=>{
    const socket=createConnection(pipe)
    socket.setTimeout(15000,()=>socket.destroy(new Error('等待机器人停止超时')))
    socket.once('connect',()=>socket.write('stop'))
    socket.once('data',()=>{
      console.log('机器人已停止。')
      socket.end()
      resolve()
    })
    socket.once('error',error=>{
      if((error as NodeJS.ErrnoException).code==='ENOENT') {
        console.log('当前没有运行的机器人。')
        resolve()
      } else reject(error)
    })
  })
}

async function run(room:string,mode:BotMode) {
  const abort=new AbortController()
  const waiting:Socket[]=[]
  const server=createServer(socket=>{
    socket.setTimeout(15000,()=>socket.destroy())
    socket.on('error',()=>socket.destroy())
    socket.once('data',chunk=>{
      if(chunk.toString()!=='stop') {socket.destroy();return}
      waiting.push(socket)
      abort.abort()
    })
  })
  await new Promise<void>((resolve,reject)=>{
    server.once('error',reject)
    server.listen(pipe,resolve)
  }).catch(error=>{
    if((error as NodeJS.ErrnoException).code==='EADDRINUSE') throw new Error('已有一组机器人运行，请先执行 ninja-bots.cmd stop')
    throw error
  })
  const stop=()=>abort.abort()
  process.on('SIGINT',stop)
  process.on('SIGTERM',stop)
  let group:Awaited<ReturnType<typeof fillNinjaRoom>>|undefined
  try {
    group=await fillNinjaRoom({origin:'http://127.0.0.1:3213',cookieName:'games_ninja_preview',room,mode,
      signal:abort.signal,report:console.log})
    console.log('已加入并准备 '+group.count+' 名机器人。请在网页选择肖像、准备并开始游戏。')
    console.log('停止：在此窗口按 Ctrl+C，或另开终端运行 ninja-bots.cmd stop。')
    if(!abort.signal.aborted) await new Promise<void>(resolve=>abort.signal.addEventListener('abort',()=>resolve(),{once:true}))
  } catch(error) {
    if(!abort.signal.aborted) throw error
  } finally {
    await group?.stop()
    for(const socket of waiting) socket.end('stopped')
    await new Promise<void>(resolve=>server.close(()=>resolve()))
    process.off('SIGINT',stop)
    process.off('SIGTERM',stop)
  }
}

try {
  let [room,mode]=process.argv.slice(2)
  if(room==='stop') {
    await stopRunning()
  } else {
    if(!room) {
      const prompt=createInterface({input:stdin,output:stdout})
      try {
        room=(await prompt.question('六位房间码：')).trim()
        mode=(await prompt.question('模式 simple / random（默认 simple）：')).trim()
      } finally {prompt.close()}
    }
    mode ||= 'simple'
    if(!/^\d{6}$/.test(room) || (mode!=='simple' && mode!=='random')) throw new Error('用法：ninja-bots.cmd [六位房间码] [simple|random]，或 ninja-bots.cmd stop')
    await run(room,mode)
  }
} catch(error) {
  console.error(error instanceof Error ? error.message : '机器人启动失败')
  process.exitCode=1
}
