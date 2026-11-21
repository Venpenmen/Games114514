import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import type { Express, Request, Response } from 'express'
import type { IncomingHttpHeaders } from 'node:http'
import { avatars, type Profile } from '../../packages/protocol/index.ts'

const lifetime = 30*86_400_000
const cookieOptions = {httpOnly:true,sameSite:'strict' as const,path:'/'}
export const hash = (value:string) => createHash('sha256').update(value).digest('hex')
export type Session = {id:string; accountId:string; profile:Profile; expires:number}

export function migrateAccounts(db:DatabaseSync) {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000')
  db.exec('BEGIN IMMEDIATE')
  try {
    const version=Number(db.prepare('PRAGMA user_version').get()?.user_version)
    if(version>1) throw new Error('Unsupported account database version')
    if(version===0) db.exec(`
      CREATE TABLE accounts(account_id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at INTEGER NOT NULL,last_login_at INTEGER NOT NULL);
      CREATE TABLE player_profiles(player_id TEXT PRIMARY KEY,account_id TEXT NOT NULL UNIQUE REFERENCES accounts,
        nickname TEXT NOT NULL,avatar_key TEXT NOT NULL,updated_at INTEGER NOT NULL);
      CREATE TABLE auth_sessions(session_id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts,
        token_hash TEXT NOT NULL UNIQUE,device_label TEXT NOT NULL,created_at INTEGER NOT NULL,last_seen_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,revoked_at INTEGER);
      CREATE INDEX auth_devices ON auth_sessions(account_id,revoked_at,expires_at);
      CREATE TABLE match_records(match_id TEXT PRIMARY KEY,game_id TEXT NOT NULL,room_code TEXT NOT NULL,
        started_at INTEGER,finished_at INTEGER NOT NULL,result_json TEXT NOT NULL);
      CREATE TABLE match_participants(match_id TEXT NOT NULL REFERENCES match_records,player_id TEXT NOT NULL,
        nickname_snapshot TEXT NOT NULL,score INTEGER,rank INTEGER,outcome TEXT NOT NULL,PRIMARY KEY(match_id,player_id));
      CREATE INDEX match_player_history ON match_participants(player_id,match_id);
      CREATE TABLE match_control(match_id TEXT NOT NULL,player_id TEXT NOT NULL,session_id TEXT NOT NULL REFERENCES auth_sessions,
        control_version INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(match_id,player_id));
      PRAGMA user_version=1;`)
    db.exec('COMMIT')
  } catch(error) {db.exec('ROLLBACK');throw error}
}

async function passwordKey(password:string,salt:string) {
  return await new Promise<Buffer>((resolve,reject)=>{
    scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>{
      if(error) reject(error)
      else resolve(key)
    })
  })
}
function validPassword(value:unknown):value is string {
  return typeof value==='string' && [...value].length>=10 && Buffer.byteLength(value)<=256
}
export function validProfile(name:unknown,avatar:unknown):name is string {
  return typeof name==='string' && !!name && [...name].length<=20 && !/[\p{Cc}]/u.test(name) &&
    Number.isInteger(avatar) && !!avatars[avatar as number]
}

export function accounts(db:DatabaseSync,app:Express,options:{cookieName:string;secure:boolean;localHttp?:(headers:IncomingHttpHeaders)=>boolean;now:()=>number;
  revoked(ids:string[]):void}) {
  const {cookieName,secure,now}=options
  const cookieSecure=(req:Request)=>secure && !options.localHttp?.(req.headers)
  const authCookie=cookieName+'_account'
  function secret(cookie:string|undefined,name:string) {
    const token=cookie?.match(new RegExp('(?:^|;\\s*)'+name+'=([a-f0-9]{64})(?:;|$)'))?.[1]
    return token && hash(token)
  }
  function legacy(cookie?:string):Profile|undefined {
    const key=secret(cookie,cookieName)
    if(!key) return
    const row=db.prepare('SELECT profile FROM sessions WHERE secret=? AND expires>?').get(key,now())
    if(row) return JSON.parse(String(row.profile)) as Profile
  }
  function lookup(value:string, byId=false):Session|undefined {
    const row=db.prepare(`SELECT s.session_id,s.account_id,s.expires_at,p.player_id,p.nickname,p.avatar_key
      FROM auth_sessions s JOIN accounts a USING(account_id) JOIN player_profiles p USING(account_id)
      WHERE s.${byId?'session_id':'token_hash'}=? AND s.expires_at>? AND s.revoked_at IS NULL AND a.status='active'`).get(value,now())
    if(row) return {id:String(row.session_id),accountId:String(row.account_id),expires:Number(row.expires_at),
      profile:{id:String(row.player_id),name:String(row.nickname),avatar:Number(String(row.avatar_key).slice(6))}}
  }
  function session(cookie?:string) {
    const key=secret(cookie,authCookie)
    return key ? lookup(key) : undefined
  }
  function issue(accountId:string,req:Request,res:Response) {
    const token=randomBytes(32).toString('hex'), time=now()
    const agent=req.get('user-agent')??''
    const browser=/Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome':/Safari\//.test(agent)?'Safari':'客户端'
    const device=/Mobile|Android|iPhone/.test(agent)?'移动设备':'桌面设备'
    db.prepare('INSERT INTO auth_sessions VALUES (?,?,?,?,?,?,?,NULL)').run(randomUUID(),accountId,hash(token),device+' · '+browser,time,time,time+lifetime)
    res.cookie(authCookie,token,{...cookieOptions,secure:cookieSecure(req),maxAge:lifetime})
  }
  function revoke(accountId:string,condition:'session_id=?'|'session_id<>?',id:string) {
    const rows=db.prepare(`UPDATE auth_sessions SET revoked_at=? WHERE account_id=? AND ${condition} AND revoked_at IS NULL RETURNING session_id`)
      .all(now(),accountId,id)
    options.revoked(rows.map(row=>String(row.session_id)))
  }
  const limits=new Map<string,{until:number;count:number}>()
  function limited(req:Request,res:Response) {
    const time=now(), key=req.socket.remoteAddress??''
    if(limits.size>128) for(const [ip,item] of limits) if(item.until<=time) limits.delete(ip)
    const limit=limits.get(key)
    if(!limit || limit.until<=time) limits.set(key,{until:time+60_000,count:1})
    else if(++limit.count>30) {res.status(429).json({error:'请求过于频繁，请稍后重试'});return true}
    return false
  }
  function auth(req:Request,res:Response) {
    const current=session(req.headers.cookie)
    if(!current) res.status(401).json({error:'请先登录'})
    else touch(current.id)
    return current
  }
  function touch(id:string) {
    const time=now()
    db.prepare('UPDATE auth_sessions SET last_seen_at=? WHERE session_id=? AND last_seen_at<=?').run(time,id,time-60_000)
  }
  async function matches(password:string,encoded:string|undefined) {
    const [salt,key]=(encoded??'').split(':')
    const actual=await passwordKey(password,salt||'unregistered-account')
    return !!key && timingSafeEqual(actual,Buffer.from(key,'hex'))
  }
  const invalid='用户名或密码无效'
  app.get('/api/legacy', (req,res)=>res.json(session(req.headers.cookie)?null:legacy(req.headers.cookie)??null))
  app.post('/api/auth/register',async(req,res)=>{
    if(limited(req,res)) return
    const {username,password,claim}=req.body??{}
    if(typeof username!=='string' || !/^[a-zA-Z0-9_]{3,24}$/.test(username) || !validPassword(password))
      return res.status(400).json({error:'用户名需为 3–24 位字母、数字或下划线，密码至少 10 字符'})
    const initial=claim===true ? legacy(req.headers.cookie) : undefined
    if(claim===true && !initial) return res.status(409).json({error:'旧会话无效或已认领'})
    const salt=randomBytes(16).toString('hex')
    const encoded=salt+':'+(await passwordKey(password,salt)).toString('hex')
    const saved=initial?.name?initial:undefined
    const name=saved?.name ?? (typeof req.body.name==='string'?req.body.name.trim():'')
    const avatar=saved?.avatar ?? (req.body.avatar??0)
    if(!validProfile(name,avatar)) return res.status(400).json({error:'昵称或头像无效'})
    const accountId=randomUUID(), playerId=initial?.id??randomUUID(), time=now()
    db.exec('BEGIN IMMEDIATE')
    try {
      if(initial && legacy(req.headers.cookie)?.id!==initial.id) {
        db.exec('ROLLBACK')
        return res.status(409).json({error:'旧会话无效或已认领'})
      }
      if(db.prepare('SELECT 1 FROM accounts WHERE username=?').get(username.toLowerCase())) {
        db.exec('ROLLBACK')
        return res.status(409).json({error:'该用户名不可用'})
      }
      db.prepare('INSERT INTO accounts VALUES (?,?,?,?,?,?)').run(accountId,username.toLowerCase(),encoded,'active',time,time)
      db.prepare('INSERT INTO player_profiles VALUES (?,?,?,?,?)').run(playerId,accountId,name,'emoji-'+avatar,time)
      if(initial) db.prepare("DELETE FROM sessions WHERE json_extract(profile,'$.id')=?").run(playerId)
      issue(accountId,req,res)
      db.exec('COMMIT')
    } catch(error) {db.exec('ROLLBACK');throw error}
    if(initial) res.clearCookie(cookieName,{...cookieOptions,secure:cookieSecure(req)})
    res.status(201).json({id:playerId,name,avatar})
  })
  app.post('/api/auth/login',async(req,res)=>{
    if(limited(req,res)) return
    const {username,password}=req.body??{}
    if(typeof username!=='string' || !/^[a-zA-Z0-9_]{3,24}$/.test(username) || !validPassword(password))
      return res.status(401).json({error:invalid})
    const read=()=>db.prepare("SELECT * FROM accounts WHERE username=? AND status='active'").get(username.toLowerCase())
    const row=read()
    if(!await matches(password,row && String(row.password_hash)) || !row || read()?.password_hash!==row.password_hash)
      return res.status(401).json({error:invalid})
    const accountId=String(row.account_id)
    db.prepare('UPDATE accounts SET last_login_at=? WHERE account_id=?').run(now(),accountId)
    issue(accountId,req,res)
    const p=db.prepare('SELECT player_id,nickname,avatar_key FROM player_profiles WHERE account_id=?').get(accountId)!
    res.json({id:p.player_id,name:p.nickname,avatar:Number(String(p.avatar_key).slice(6))})
  })
  app.get('/api/account',(req,res)=>{
    const current=auth(req,res)
    if(!current) return
    const account=db.prepare('SELECT username,status,created_at,last_login_at FROM accounts WHERE account_id=?').get(current.accountId)
    const devices=db.prepare(`SELECT session_id,device_label,created_at,last_seen_at,expires_at
      FROM auth_sessions WHERE account_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY last_seen_at DESC`).all(current.accountId,now())
    res.json({profile:current.profile,account,devices,currentDevice:current.id})
  })
  app.post('/api/auth/logout',(req,res)=>{
    const current=session(req.headers.cookie)
    if(current) revoke(current.accountId,'session_id=?',current.id)
    res.clearCookie(authCookie,{...cookieOptions,secure:cookieSecure(req)}).json({ok:true})
  })
  app.post('/api/auth/revoke',(req,res)=>{
    const current=auth(req,res)
    if(!current) return
    const id=req.body?.id
    if(id==='others') revoke(current.accountId,'session_id<>?',current.id)
    else if(typeof id==='string' && id!==current.id) revoke(current.accountId,'session_id=?',id)
    else return res.status(400).json({error:'设备无效'})
    res.json({ok:true})
  })
  app.post('/api/auth/password',async(req,res)=>{
    const current=auth(req,res)
    if(!current || limited(req,res)) return
    const {password,next}=req.body??{}
    if(!validPassword(password)||!validPassword(next)) return res.status(400).json({error:'密码至少 10 字符'})
    const account=db.prepare('SELECT password_hash FROM accounts WHERE account_id=?').get(current.accountId)!
    if(!await matches(password,String(account.password_hash))) return res.status(401).json({error:'当前密码不正确'})
    const salt=randomBytes(16).toString('hex')
    const encoded=salt+':'+(await passwordKey(next,salt)).toString('hex')
    if(!lookup(current.id,true) || !db.prepare('UPDATE accounts SET password_hash=? WHERE account_id=? AND password_hash=?')
      .run(encoded,current.accountId,account.password_hash!).changes) return res.status(409).json({error:'账户状态已变化，请重试'})
    revoke(current.accountId,'session_id<>?',current.id)
    res.json({ok:true})
  })
  return {session,legacy,lookup,touch}
}
