import { resolve } from 'node:path'
import { createPlatform } from './service.ts'
import { ghostCandle } from '../../games/ghost-candle/engine.ts'

import { diceWerewolf } from '../../games/dice-werewolf/engine.ts'

import { nightOfTheNinja } from '../../games/night-of-the-ninja/engine.ts'

const port = Number(process.env.PORT ?? '3100')
const origin = process.env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`
const secure = new URL(origin).protocol === 'https:'
if (process.env.NODE_ENV === 'production' && !secure) throw new Error('生产环境需要 HTTPS PUBLIC_ORIGIN')
const platform = createPlatform({
  database: resolve(process.env.DATABASE_PATH ?? 'games.db'),
  origin, secure, cookieName:process.env.SESSION_COOKIE_NAME, plugins: [ghostCandle, diceWerewolf, nightOfTheNinja],
  assets:resolve(process.env.GAMES_WEB_ASSETS ?? 'dist'),
})
platform.server.listen(port,'127.0.0.1',() => console.log(`Games114514 http://127.0.0.1:${port}`))
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => {
  void platform.close().then(() => { process.exitCode = 0 })
})
