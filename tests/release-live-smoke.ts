import {io,type Socket} from 'socket.io-client'
import {randomUUID,randomBytes,createHash} from 'node:crypto'
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import assert from 'node:assert/strict'
import {createPlatform} from '../apps/server/service.ts'
import {plugins} from '../apps/server/plugins.ts'
import {protocolVersion,type Snapshot,type Reply} from '../packages/protocol/index.ts'
const live=process.env.RELEASE_SMOKE_URL
const c=JSON.parse(readFileSync('work/logs/release-context.json','utf8'))
let app:ReturnType<typeof createPlatform>|undefined
const origin=live??'http://127.0.0.1:3233'
if(!live){const db=resolve('work/logs/smoke-copy.db');copyFileSync(join(c.backup,'production.db'),db);app=createPlatform({database:db,secure:true,plugins,cookieName:'games_session_'+createHash('sha256').update(c.database.toLowerCase()).digest('hex').slice(0,12),assets:resolve('dist')});await new Promise<void>(done=>app!.server.listen(3233,'127.0.0.1',done))}
type Client={socket:Socket;id:string;rooms:Map<string,Snapshot>}
const clients:Client[]=[],results:unknown[]=[],sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms))
async function send(client:Client,type:string,code?:string,data?:unknown){const m=code?client.rooms.get(code)?.match:undefined;return await new Promise<Reply>(done=>client.socket.emit('command',{v:protocolVersion,id:randomUUID(),type,room:code,match:m?.id,phase:m?.phase,controlVersion:m?.controlVersion,data},done))}
async function checked(client:Client,type:string,code?:string,data?:unknown){const reply=await send(client,type,code,data);assert(reply.ok,JSON.stringify(reply));return reply}
try{
 for(let i=0;i<4;i++){const response=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username:'rel_'+randomUUID().replaceAll('-','').slice(0,16),password:randomBytes(20).toString('hex'),name:'发布验收'+(i+1),avatar:i})});assert.equal(response.status,201);const profile=await response.json(),cookie=response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');const socket=io(origin,{transports:['websocket'],extraHeaders:{Origin:origin,Cookie:cookie},auth:{tab:randomUUID()}});const client={socket,id:profile.id,rooms:new Map<string,Snapshot>()};socket.on('room',room=>client.rooms.set(room.code,room));socket.on('left',code=>client.rooms.delete(code));clients.push(client);await new Promise<void>((done,fail)=>{socket.once('connect',done);socket.once('connect_error',fail)})}
 const catalog=await (await fetch(origin+'/api/catalog')).json()
 for(const gameId of ['ghost-candle','dice-werewolf','night-of-the-ninja']){
  const host=clients[0],game=catalog.find((g:any)=>g.id===gameId),count=gameId==='night-of-the-ninja'?4:3
  const made=await checked(host,'create',undefined,{gameId});const code=made.ok?made.room!:''
  const config={...game.defaults,presentationSpeed:0.8,...(gameId==='dice-werewolf'?{target:3}:{})};await checked(host,'config',code,config)
  for(const client of clients.slice(1,count))await checked(client,'join',code)
  for(const [i,client] of clients.slice(0,count).entries()){if(gameId!=='ghost-candle')await checked(client,'lobby',code,{portrait:i});await checked(client,'ready',code,true)}
  await checked(host,'start',code);let chatted=false;if(gameId!=='ghost-candle'){await checked(host,'chat',code,'发布验证：三游戏真实协议与数据隔离');chatted=true}
  const sent=new Set<string>(),end=Date.now()+240000;let actions=0
  while(Date.now()<end){const match=host.rooms.get(code)?.match;if(match?.finished)break
   if(gameId==='ghost-candle'&&!chatted&&(match?.public as any)?.stage==='DAY_DISCUSSION'){await checked(host,'chat',code,'发布验证：三游戏真实协议与数据隔离');chatted=true}
   for(const [i,client] of clients.slice(0,count).entries()){
    const m=client.rooms.get(code)?.match;if(!m||m.finished)continue
    const s=m.public as any,own=m.private as any,key=client.id+':'+m.phase;if(sent.has(key)||(Array.isArray(s.submitted)&&s.submitted.includes(client.id)))continue
    let data:any
    if(gameId==='night-of-the-ninja'){const option=own?.options?.find((o:any)=>o.value==='pass')??own?.options?.[0];if(option)data={value:option.value}}
    else if(gameId==='ghost-candle'){
      if(s.stage==='NIGHT'){const candle=s.candles.findIndex((v:string)=>v==='INTACT')+1;data={kind:'night',candle,action:'LIGHT'}}
      if(s.stage==='DAY_DISCUSSION')data={kind:'discuss'}
      if(s.stage==='DAY_DECISION')data={kind:'decision',yes:false}
    }else{
      if(s.stage==='ACTION')data={kind:'act',value:i===2?-1:1}
      if(s.stage==='VOTE'||s.stage==='REVOTE'){const spared=(host.rooms.get(code)?.match?.private as any)?.identity;const target=s.points.find((p:any)=>!p.removed&&p.face!==spared);if(target)data={kind:'vote',value:target.face}}
    }
    if(data){await checked(client,'game',code,data);sent.add(key);actions++}
   }
   await sleep(40)
  }
  assert.equal(host.rooms.get(code)?.match?.finished,true,gameId+' did not finish')
  assert(chatted);results.push({gameId,code,actions,finished:true,players:count,websocket:true,chat:chatted});console.log(gameId+' complete, '+actions+' actual commands')
  for(const client of clients.slice(0,count))await checked(client,'leave',code)
 }
 const denied=await fetch(origin+'/api/tdm',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,404)
 writeFileSync('work/logs/'+(live?'production-smoke':'rehearsal-smoke')+'.json',JSON.stringify({origin,results,tdm:404,accountsCreated:4,ownRoomsClosed:true},null,2))
}finally{for(const client of clients)client.socket.disconnect();if(app)await app.close()}
