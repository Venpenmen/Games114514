import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { createConnection, createServer } from 'node:net'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const scope = process.env.GAMES_SERVICE_SCOPE ?? ''
if (scope && !/^[a-z0-9-]+$/.test(scope)) throw new Error('无效的项目服务实例名')
const logs = scope ? 'work/logs/'+scope : 'work/logs'
const keyFile = logs + '/server-control'
const fingerprint = createHash('sha256').update(resolve('.').toLowerCase()+(scope ? ':'+scope : '')).digest('hex')
const pipe = '\\\\.\\pipe\\games114514-' + fingerprint

function request(message) {
  return new Promise(resolve => {
    const socket = createConnection(pipe)
    socket.setTimeout(1500)
    socket.on('connect', () => socket.write(message))
    socket.on('data', data => { resolve(data.toString()); socket.destroy() })
    socket.on('error', () => resolve(null))
    socket.on('timeout', () => { resolve(null); socket.destroy() })
    socket.on('close', () => resolve(null))
  })
}

if (process.argv[2] === 'worker') {
  const key = process.env.GAMES_CONTROL_KEY
  delete process.env.GAMES_CONTROL_KEY
  const control = createServer(socket => {
    socket.setTimeout(1500, () => socket.destroy())
    socket.on('error', () => socket.destroy())
    socket.once('data', data => {
      const message = data.toString()
      if (message === 'ping') socket.end('running')
      else if (message === key) {
        socket.end('stopping')
        control.close()
        process.emit('SIGTERM')
      } else socket.end('denied')
    })
  })
  control.listen(pipe, () => {
    writeFileSync(keyFile,key)
    process.once('exit', () => {
      try { if (readFileSync(keyFile,'utf8') === key) unlinkSync(keyFile) } catch {}
    })
    void import('../apps/server/index.ts')
  })
} else if (process.argv[2] === 'status') {
  process.exitCode = await request('ping') === 'running' ? 0 : 1
} else if (process.argv[2] === 'start') {
  if (await request('ping')) throw new Error('项目服务已运行。')
  mkdirSync(logs,{recursive:true})
  const output = openSync(logs+'/server.log','w')
  const errors = openSync(logs+'/server-error.log','w')
  const child = spawn(process.execPath,['--env-file-if-exists=.env','scripts/service.mjs','worker'],{
    detached:true,windowsHide:true,stdio:['ignore',output,errors],
    env:{...process.env,GAMES_CONTROL_KEY:randomBytes(32).toString('hex')},
  })
  child.unref()
  closeSync(output)
  closeSync(errors)
  for (let attempt=0;attempt<40;attempt++) {
    await delay(250)
    const line = readFileSync(logs+'/server.log','utf8').trim()
    if (line.startsWith('Games114514 ')) { console.log(line); process.exit(0) }
    if (child.exitCode !== null) break
  }
  throw new Error('项目启动失败。请查看 '+logs+'/server-error.log。')
} else {
  if (!await request('ping')) {
    console.log('项目服务当前未通过启动脚本运行。')
  } else {
    if (await request(readFileSync(keyFile,'utf8')) !== 'stopping') throw new Error('项目服务拒绝停止请求。')
    for (let attempt=0;attempt<40;attempt++) {
      await delay(250)
      if (!await request('ping')) { console.log('项目服务已停止。'); process.exit(0) }
    }
    throw new Error('项目服务停止超时。')
  }
}
