import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./tests',
  timeout:120_000,
  use:{baseURL:'http://127.0.0.1:3197',channel:'msedge'},
  webServer:[{
    command:'node apps/server/index.ts',
    url:'http://127.0.0.1:3197',
    env:{PORT:'3197',PUBLIC_ORIGIN:'http://127.0.0.1:3197',DATABASE_PATH:'work/logs/browser-'+process.pid+'.db',GAMES_WEB_ASSETS:process.env.NINJA_TEST_ASSETS??'dist'},
    reuseExistingServer:false,
  },{
    command:'node tests/dice-server.ts',
    url:'http://127.0.0.1:3198',
    reuseExistingServer:false,
  },{
    command:'node apps/server/index.ts',
    url:'http://127.0.0.1:3214',
    env:{PORT:'3214',PUBLIC_ORIGIN:'http://127.0.0.1:3214',DATABASE_PATH:'work/logs/ninja-browser-'+process.pid+'.db',
      SESSION_COOKIE_NAME:'games_ninja_browser',NODE_ENV:'development',GAMES_WEB_ASSETS:process.env.NINJA_TEST_ASSETS??'dist'},
    reuseExistingServer:false,
  },{
    command:'node tests/ninja-rehearsal-server.ts',
    url:'http://127.0.0.1:3215',
    reuseExistingServer:false,
  }],
})
