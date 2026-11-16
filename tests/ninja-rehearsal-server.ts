import {resolve} from 'node:path'
import {createPlatform} from '../apps/server/service.ts'
import {nightOfTheNinja} from '../games/night-of-the-ninja/engine.ts'

let seed=83
const platform=createPlatform({
  database:resolve('work/logs/ninja-rehearsal-'+process.pid+'.db'),
  origin:'http://127.0.0.1:3215',secure:false,cookieName:'games_ninja_rehearsal',
  plugins:[nightOfTheNinja], assets:resolve('dist'),
  random:limit=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)%limit),
})
platform.server.listen(3215,'127.0.0.1')
