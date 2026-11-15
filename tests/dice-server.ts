import {resolve} from 'node:path'
import {createPlatform} from '../apps/server/service.ts'
import {diceWerewolf} from '../games/dice-werewolf/engine.ts'

const port=3198
const origin='http://127.0.0.1:'+port
let draw=0
const platform=createPlatform({
  database:resolve('work/logs/dice-browser-'+process.pid+'.db'),origin,secure:false,
  plugins:[diceWerewolf],assets:resolve('dist'),
  // Browser fixture only. Ordinary identities cycle through 1,2,3.
  // Subsequent draws without replacement produce three distinct identities.
  random:limit=>limit===6 ? draw++%3 : 0,
})
platform.server.listen(port,'127.0.0.1')
