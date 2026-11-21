import {randomBytes} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs'
import {resolve} from 'node:path'

/** Local credentials for the external test bots; never commit or print them. */
type BotCredential={username:string;password:string}
type Store={version:1;bots:Record<string,BotCredential>}
export type BotAuth={cookie:string;id:string}

const poolFile=resolve('work/logs/bot-p20-accounts.json')
function load():Store {
  try {
    const data=JSON.parse(readFileSync(poolFile,'utf8')) as Store
    if(data.version!==1 || typeof data.bots!=='object')throw Error('机器人凭证文件版本无效')
    return data
  }catch(error) {
    if((error as NodeJS.ErrnoException).code==='ENOENT')return {version:1,bots:{}}
    throw error
  }
}
function save(store:Store) {
  mkdirSync(resolve('work/logs'),{recursive:true})
  const tmp=poolFile+'.tmp-'+process.pid
  writeFileSync(tmp,JSON.stringify(store,null,2),{flag:'wx',mode:0o600})
  renameSync(tmp,poolFile)
}
export async function botAuth(origin:string,cookieName:string,slot:number,signal?:AbortSignal):Promise<BotAuth> {
  if(!Number.isInteger(slot)||slot<1||slot>10)throw Error('测试机器人编号必须为 1～10')
  const store=load()
  const key=origin+'|'+cookieName+'|'+slot
  const firstUse=!store.bots[key]
  if(firstUse){
    // Persist before sending the registration request so a retry will reuse the same identity.
    store.bots[key]={username:'testbot_'+randomBytes(6).toString('hex'),password:randomBytes(32).toString('base64url')}
    save(store)
  }
  const {username,password}=store.bots[key]
  async function request(path:string,body:unknown){
    return fetch(origin+'/api/auth/'+path,{method:'POST',headers:{origin,'content-type':'application/json'},
      body:JSON.stringify(body),redirect:'error',
      signal:AbortSignal.any([AbortSignal.timeout(20000),...(signal?[signal]:[])])})
  }
  const register=()=>request('register',{username,password,name:'测试机器人'+String(slot).padStart(2,'0'),avatar:(slot-1)%6})
  let response=firstUse?await register():await request('login',{username,password})
  if(response.status===401)response=await register()
  if(!response.ok)throw Error('机器人账户认证失败（HTTP '+response.status+'）；检查账户池配置和登录限流')
  const cookie=response.headers.get('set-cookie')?.split(';')[0]
  if(!cookie?.startsWith(cookieName+'_account='))throw Error('正式账户 Cookie 不符合目标服务配置')
  const profile=await response.json() as {id:string}
  if(typeof profile.id!=='string'||!profile.id)throw Error('机器人身份返回异常')
  return {cookie,id:profile.id}
}
export async function botResumable(origin:string,cookie:string,room:string,gameId:string):Promise<string|undefined> {
  const response=await fetch(origin+'/api/resumable-matches',{headers:{origin,cookie},
    signal:AbortSignal.timeout(5000)})
  if(!response.ok)throw Error('无法查询测试机器人的原席位（HTTP '+response.status+'）')
  const matches=await response.json() as {code:string;gameId:string;matchId:string}[]
  return matches.find(item=>item.code===room&&item.gameId===gameId)?.matchId
}
export async function botLogout(origin:string,cookie:string) {
  try {
    await fetch(origin+'/api/auth/logout',{method:'POST',headers:{origin,cookie},
      signal:AbortSignal.timeout(5000)})
  }catch{ /* Server may already be offline. */ }
}
