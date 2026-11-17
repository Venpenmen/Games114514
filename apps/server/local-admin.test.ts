import {test} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {mkdtempSync,rmSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {createConnection} from 'node:net'
import {createPlatform} from './service.ts'
import {adminLocation,requestLocalAdmin} from './local-admin.ts'
import {ghostCandle} from '../../games/ghost-candle/engine.ts'

test('local manager lists, rejects stale matches, stops and dissolves without touching other rooms',async t=>{
  const directory=mkdtempSync(resolve('work/match-manager-test-'))
  const config={scope:'test-'+process.pid+'-'+randomUUID().slice(0,8),directory}
  const database=resolve(directory,'data.db')
  const service=createPlatform({database,plugins:[ghostCandle],origin:'http://test.local',
    secure:false,now:()=>1000,random:n=>0,localAdmin:config})
  t.after(async()=>{await service.close();rmSync(directory,{recursive:true,force:true})})
  await service.adminReady
  assert(existsSync(adminLocation(config.scope,config.directory).keyPath))
  const db=new DatabaseSync(database)
  const id=randomUUID()
  const members=['a','b','c'].map(name=>({id:name,name,avatar:0,ready:true}))
  const active=ghostCandle.start(['a','b','c'],ghostCandle.defaults,{now:1000,random:n=>0})
  const room={code:'123456',gameId:'ghost-candle',version:ghostCandle.version,
    config:ghostCandle.defaults,host:'a',members,updated:1000,chat:[],
    match:{id,startedAt:1000,state:active}}
  const waiting={...room,code:'654321',match:undefined}
  db.prepare('INSERT INTO rooms VALUES (?,?,?)').run(room.code,JSON.stringify(room),1000)
  db.prepare('INSERT INTO rooms VALUES (?,?,?)').run(waiting.code,JSON.stringify(waiting),1000)
  let rows=await requestLocalAdmin(config,{action:'list'})
  assert.equal(rows.length,2)
  assert.equal(rows.find((r:any)=>r.code==='123456')?.active,true)
  await assert.rejects(requestLocalAdmin(config,{action:'stop',code:'123456',matchId:randomUUID()}),/changed/)
  assert.equal(JSON.parse(String(db.prepare('SELECT body FROM rooms WHERE code=?').get('123456')!.body)).match.id,id)
  await requestLocalAdmin(config,{action:'stop',code:'123456',matchId:id})
  assert.equal(JSON.parse(String(db.prepare('SELECT body FROM rooms WHERE code=?').get('123456')!.body)).match,undefined)
  await assert.rejects(requestLocalAdmin(config,{action:'dissolve',code:'654321',matchId:id}),/changed/)
  await requestLocalAdmin(config,{action:'dissolve',code:'123456',matchId:null})
  assert.equal(db.prepare('SELECT 1 FROM rooms WHERE code=?').get('123456'),undefined)
  assert(db.prepare('SELECT 1 FROM rooms WHERE code=?').get('654321'))
  const activeMatchId=randomUUID()
  const another={...room,code:'345678',match:{...room.match,id:activeMatchId}}
  db.prepare('INSERT INTO rooms VALUES (?,?,?)').run(another.code,JSON.stringify(another),1000)
  await requestLocalAdmin(config,{action:'dissolve',code:'345678',matchId:activeMatchId})
  assert.equal(db.prepare('SELECT 1 FROM rooms WHERE code=?').get('345678'),undefined)
  assert(db.prepare('SELECT 1 FROM rooms WHERE code=?').get('654321'))
  const {pipe}=adminLocation(config.scope,config.directory)
  const denied=await new Promise<any>((done,fail)=>{
    const socket=createConnection(pipe);let data=''
    socket.on('connect',()=>socket.write(JSON.stringify({action:'list',secret:'wrong'})+'\n'))
    socket.on('data',chunk=>data+=chunk.toString())
    socket.on('end',()=>{try{done(JSON.parse(data))}catch(error){fail(error)}})
    socket.on('error',fail)
  })
  assert.equal(denied.ok,false)
  db.close()
})
