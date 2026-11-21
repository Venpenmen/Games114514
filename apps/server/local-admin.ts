import {createServer, createConnection} from 'node:net'
import {createHash, randomBytes, timingSafeEqual} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync, unlinkSync} from 'node:fs'
import {join, resolve} from 'node:path'

export type AdminAction='list'|'stop'|'dissolve'
export type AdminRequest={action:AdminAction;code?:string;matchId?:string|null}
export type AdminConfig={scope:string;directory:string}
export function adminLocation(scope:string,directory:string) {
  if(!/^[a-z0-9-]{1,64}$/.test(scope)) throw new Error('Invalid admin scope')
  const hash=createHash('sha256').update(resolve('.').toLowerCase()+':'+scope).digest('hex').slice(0,32)
  return {pipe:'\\\\.\\pipe\\games114514-match-'+hash,keyPath:join(directory,'match-admin.key')}
}
export function openLocalAdmin(config:AdminConfig,handle:(req:AdminRequest)=>unknown) {
  const {pipe,keyPath}=adminLocation(config.scope,config.directory)
  const secret=randomBytes(32).toString('hex')
  mkdirSync(config.directory,{recursive:true})
  const server=createServer(socket=>{
    socket.setTimeout(3000,()=>socket.destroy())
    let data=''
    socket.on('data',chunk=>{
      data+=chunk.toString()
      if(data.length>4096){socket.end(JSON.stringify({ok:false,error:'Request too large'})+'\n');return}
      if(!data.includes('\n')) return
      const line=data.slice(0,data.indexOf('\n'))
      data=''
      try {
        const input=JSON.parse(line)
        const token=typeof input.secret==='string'?Buffer.from(input.secret):Buffer.alloc(0)
        const expected=Buffer.from(secret)
        if(token.length!==expected.length||!timingSafeEqual(token,expected)) throw new Error('Unauthorized')
        if(!['list','stop','dissolve'].includes(input.action)) throw new Error('Unknown action')
        const result=handle({action:input.action,code:input.code,matchId:input.matchId})
        socket.end(JSON.stringify({ok:true,result})+'\n')
      }catch(error){socket.end(JSON.stringify({ok:false,error:error instanceof Error?error.message:'Admin error'})+'\n')}
    })
    socket.on('error',()=>{})
  })
  const ready=new Promise<void>((done,fail)=>{
    server.once('error',fail)
    server.listen(pipe,()=>{
      server.off('error',fail)
      writeFileSync(keyPath,secret,{mode:0o600})
      done()
    })
  })
  async function close(){
    await ready.catch(()=>{})
    if(server.listening) await new Promise<void>(done=>server.close(()=>done()))
    try{if(readFileSync(keyPath,'utf8')===secret) unlinkSync(keyPath)}catch{}
  }
  return {ready,close}
}
export async function requestLocalAdmin(config:AdminConfig,req:AdminRequest):Promise<any> {
  const {pipe,keyPath}=adminLocation(config.scope,config.directory)
  const secret=readFileSync(keyPath,'utf8').trim()
  return await new Promise((done,fail)=>{
    const socket=createConnection(pipe)
    socket.setTimeout(3500,()=>socket.destroy(new Error('Management channel timed out')))
    let data=''
    socket.on('connect',()=>socket.write(JSON.stringify({...req,secret})+'\n'))
    socket.on('data',chunk=>{
      data+=chunk.toString()
      if(data.length>65536){socket.destroy(new Error('Management response too large'));return}
      if(data.includes('\n')){
        try{const result=JSON.parse(data.slice(0,data.indexOf('\n')));socket.end();if(result.ok)done(result.result);else fail(new Error(result.error))}
        catch(error){fail(error)}
      }
    })
    socket.on('error',fail)
    socket.on('end',()=>{if(!data.includes('\n'))fail(new Error('Management channel closed'))})
  })
}
