import {upgradeLegacy} from '../scripts/release-migrate.ts'
import {readFileSync,copyFileSync,existsSync,writeFileSync} from 'node:fs'
import {resolve,join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {createHash,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import {createPlatform} from '../apps/server/service.ts'
import {plugins} from '../apps/server/plugins.ts'
const c=JSON.parse(readFileSync('work/logs/release-context.json','utf8'))
const file=resolve('work/logs/rehearsal.db');copyFileSync(join(c.backup,'production.db'),file)
const cookie='games_session_'+createHash('sha256').update(c.database.toLowerCase()).digest('hex').slice(0,12)
const old=new DatabaseSync(file,{readOnly:true});const body=String(old.prepare('SELECT body FROM rooms WHERE code=?').get('452690')!.body);old.close()
const migrated=upgradeLegacy(file,{code:'452690',bodyHash:createHash('sha256').update(body).digest('hex')});assert.equal(migrated.stopped,'452690');assert.equal(migrated.archived,2);assert.equal(upgradeLegacy(file).archived,0)
assert(!existsSync('apps/server/test-manager.ts'));assert(!readFileSync('packages/game-sdk/index.ts','utf8').includes('testData'))
const app=createPlatform({database:file,secure:true,plugins,cookieName:cookie,assets:resolve('dist')})
await new Promise<void>(done=>app.server.listen(3232,'127.0.0.1',done))
try{
 const q=new DatabaseSync(file,{readOnly:true});assert.equal(q.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');assert.equal(q.prepare('SELECT count(*) AS n FROM sessions').get()?.n,23);assert.equal(q.prepare('SELECT count(*) AS n FROM rooms').get()?.n,39);assert(q.prepare("SELECT name FROM sqlite_master WHERE name='accounts'").get());assert(!q.prepare("SELECT name FROM sqlite_master WHERE name='test_data'").get());q.close()
 const catalog=await (await fetch('http://127.0.0.1:3232/api/catalog')).json();assert.equal(catalog.games?.length??catalog.length,3)
 const denial=await fetch('http://127.0.0.1:3232/api/auth/register',{method:'POST',headers:{Origin:'https://unrelated.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(denial.status,403)
 const missing=await fetch('http://127.0.0.1:3232/api/tdm',{method:'POST',headers:{Origin:'http://127.0.0.1:3232','Content-Type':'application/json'},body:'{}'});assert.equal(missing.status,404)
 const token=randomBytes(32).toString('hex');const d=new DatabaseSync(file);const profile=JSON.parse(String(d.prepare('SELECT profile FROM sessions LIMIT 1').get()!.profile));d.prepare('INSERT INTO sessions VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),JSON.stringify(profile),Date.now()+86400000);d.close()
 const claimed=await fetch('http://127.0.0.1:3232/api/auth/register',{method:'POST',headers:{Origin:'http://127.0.0.1:3232','Content-Type':'application/json',Cookie:cookie+'='+token},body:JSON.stringify({username:'rehearsal_'+Date.now(),password:'release rehearsal phrase',name:'发布预演',avatar:0,claim:true})});assert.equal(claimed.status,201);assert(!claimed.headers.get('set-cookie')?.split(';').some(s=>s.trim().toLowerCase()==='secure'));const me=await claimed.json();assert.equal(me.id??me.profile?.id,profile.id)
 writeFileSync('work/logs/rehearsal-result.json',JSON.stringify({integrity:'ok',legacySessionsBeforeClaim:23,rooms:39,legacyResultsArchived:2,archiveIdempotent:true,legacyClaimPreservesId:true,cookieNamespacePreserved:true,tdm:false,wrongOrigin:403,publicSameOriginMode:true,permissionBoundary:true},null,2));console.log('Production copy migration, legacy identity claim, cookie namespace and TDM boundary passed')
}finally{await app.close()}
