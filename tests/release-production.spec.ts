import {test,expect} from '@playwright/test'
import {registerPlayer} from './account-fixtures.ts'
import {writeFileSync} from 'node:fs'
test('production browser login, three game lobbies and account',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'登录',exact:true})).toBeVisible();await registerPlayer(page,'发布浏览器验收')
 const games=['诡吹灯','骰子狼人杀','忍者之夜'],results=[]
 for(const name of games){await page.locator('.game-card').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:'创建房间',exact:true}).click();await expect(page.locator('.members li')).toHaveCount(1);await page.getByRole('button',{name:'游戏规则',exact:true}).click();await expect(page.locator('dialog[open]')).toBeVisible();await page.keyboard.press('Escape');await page.screenshot({path:'work/logs/production-browser-'+games.indexOf(name)+'.png'});results.push({game:name,code:new URL(page.url()).searchParams.get('room')});await page.getByRole('button',{name:'退出房间',exact:true}).click();await expect(page.getByRole('heading',{name:'游戏大厅',exact:true})).toBeVisible()}
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.game-card')).toHaveCount(3);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);await page.getByRole('button',{name:/发布浏览器验收/}).click();await expect(page.getByRole('heading',{name:'个人资料',exact:true})).toBeVisible();await page.screenshot({path:'work/logs/production-account-mobile.png'});writeFileSync('work/logs/production-browser.json',JSON.stringify({games:results,login:true,account:true,mobile:true},null,2))
})
