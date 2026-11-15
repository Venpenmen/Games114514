import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./tests',
  timeout:120_000,
  use:{baseURL:'http://127.0.0.1:3197',channel:'msedge'},
  webServer:[{
    command:'node apps/server/index.ts',
    url:'http://127.0.0.1:3197',
    env:{PORT:'3197',PUBLIC_ORIGIN:'http://127.0.0.1:3197',DATABASE_PATH:'work/logs/browser.db'},
    reuseExistingServer:false,
  },{
    command:'node tests/dice-server.ts',
    url:'http://127.0.0.1:3198',
    reuseExistingServer:false,
  }],
})
