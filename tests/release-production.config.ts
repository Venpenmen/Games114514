import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'.',testMatch:'release-production.spec.ts',timeout:60000,use:{baseURL:'http://127.0.0.1:3199',channel:'msedge'}})
