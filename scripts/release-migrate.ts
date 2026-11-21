import {DatabaseSync} from 'node:sqlite'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {migrateAccounts} from '../apps/server/accounts.ts'
import {plugins} from '../apps/server/plugins.ts'
export function upgradeLegacy(database:string,stop?:{code:string;bodyHash:string}){
 const db=new DatabaseSync(database)
 try{
  if(stop){const row=db.prepare('SELECT body FROM rooms WHERE code=?').get(stop.code);if(!row||createHash('sha256').update(String(row.body)).digest('hex')!==stop.bodyHash)throw Error('Legacy room changed; refusing release stop')}
  migrateAccounts(db)
  let archived=0,stopped:string|null=null
  db.exec('BEGIN IMMEDIATE')
  try{
   for(const row of db.prepare('SELECT code,body,updated FROM rooms').all()){
    const room=JSON.parse(String(row.body)),game=plugins.find(p=>p.id===room.gameId)
    if(stop?.code===room.code){
     if(!room.match||game?.finished(room.match.state))throw Error('Authorized room no longer active')
     const match=room.match.id;delete room.match;delete room.pausedMs;delete room.emptySince;delete room.clockAt;room.members.forEach((p:{ready:boolean})=>p.ready=false);room.updated=Date.now();room.lastMemberActivityAt=room.updated
     db.prepare('DELETE FROM match_control WHERE match_id=?').run(match)
     const result=db.prepare('UPDATE rooms SET body=?,updated=? WHERE code=? AND body=?').run(JSON.stringify(room),room.updated,room.code,String(row.body));if(result.changes!==1)throw Error('Legacy stop conflict');stopped=room.code;continue
    }
    if(!game||game.version!==room.version||!room.match||!game.finished(room.match.state))continue
    const result=game.finalResult?.(room.match.state);if(!result)continue
    const ids=room.members.map((p:{id:string})=>p.id)
    if(!result.winners.length||result.winners.some(id=>!ids.includes(id)))throw Error('Invalid legacy result')
    const saved=db.prepare('INSERT OR IGNORE INTO match_records VALUES (?,?,?,?,?,?)').run(room.match.id,room.gameId,room.code,room.match.startedAt??null,Number(row.updated),JSON.stringify(result));if(!saved.changes)continue
    for(const p of room.members){const score=result.scores?.[p.id];db.prepare('INSERT INTO match_participants VALUES (?,?,?,?,?,?)').run(room.match.id,p.id,p.name,score??null,score===undefined?null:1+ids.filter((id:string)=>result.scores![id]>score).length,result.winners.includes(p.id)?'win':'loss')}
    archived++
   }
   db.exec('COMMIT')
  }catch(error){db.exec('ROLLBACK');throw error}
  const integrity=db.prepare('PRAGMA integrity_check').get()?.integrity_check;if(integrity!=='ok')throw Error('Database integrity failed')
  return {archived,stopped,integrity}
 }finally{db.close()}
}
if(resolve(process.argv[1]??'')===resolve('scripts/release-migrate.ts')){
 if(process.argv[2]!=='--production-authorized')throw Error('Explicit production authorization argument required')
 const c=JSON.parse(readFileSync('work/logs/release-context.json','utf8')),old=new DatabaseSync(join(c.backup,'production.db'),{readOnly:true});const body=String(old.prepare('SELECT body FROM rooms WHERE code=?').get('452690')!.body);old.close()
 const result=upgradeLegacy(c.database,{code:'452690',bodyHash:createHash('sha256').update(body).digest('hex')});writeFileSync('work/logs/production-migration.json',JSON.stringify(result,null,2));console.log(result)
}
