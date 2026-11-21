import {test,expect} from '@playwright/test'
import {registerPlayer} from './account-fixtures.ts'
import {writeFileSync} from 'node:fs'
const evidence=process.env.NINJA_TOURNAMENT_EVIDENCE??'work/logs/release-tournament-'
test('landscape real tournament round replay and champion panels',async({browser})=>{
 test.setTimeout(240000)
 const contexts=await Promise.all([844,915,740,844].map((width,i)=>browser.newContext({baseURL:'http://127.0.0.1:3215',hasTouch:true,viewport:{width,height:[390,412,320,390][i]}})))
 try{
 const pages=await Promise.all(contexts.map(c=>c.newPage())),a=pages[0]
 await a.goto('/');await registerPlayer(a,'横屏冠军甲')
 await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})}).getByRole('button',{name:'创建房间'}).click()
 await a.getByLabel(/演出速度/).selectOption('0.8');await a.waitForTimeout(150)
 for(let i=1;i<4;i++){await pages[i].goto(a.url());await registerPlayer(pages[i],'横屏玩家'+i)}
 for(let i=0;i<4;i++){await pages[i].getByRole('button',{name:'肖像 '+(i+1),exact:true}).click();await pages[i].getByRole('button',{name:'准备',exact:true}).click()}
 await a.getByRole('button',{name:'开始游戏',exact:true}).click()
 const modes=[]
 async function checkDialog(page:typeof a,label:string){await page.getByRole('button',{name:label,exact:true}).click();const d=page.locator('dialog[open]').last();await expect(d).toBeVisible();expect(await d.evaluate(e=>e.scrollWidth-e.clientWidth)).toBeLessThanOrEqual(1);await d.evaluate(e=>{e.scrollTop=e.scrollHeight});await page.screenshot({path:evidence+'replay-'+label+'-'+page.viewportSize()!.width+'.png'});await expect(d.getByRole('button',{name:'关闭',exact:true}).first()).toBeInViewport();await page.keyboard.press('Escape')}
 for(let round=1;round<=8;round++){
 for(const step of ['draft1','draft2','commit','commit','commit','commit','commit']){
 await expect(a.locator('.nn-operation')).toHaveAttribute('data-action',step,{timeout:20000})
 const before=await a.locator('.nn-game').getAttribute('data-phase-token')
 await Promise.all(pages.map(async page=>{
 const close=page.getByRole('button',{name:'确定',exact:true});if(await close.isVisible())await close.click()
 const options=page.locator('.nn-action-deck button[aria-pressed]');const pass=page.getByRole('button',{name:'跳过',exact:true});await (await pass.count()?pass:options.first()).click();await page.getByRole('button',{name:'确认提交',exact:true}).click()
 }))
 await expect(a.locator('.nn-game')).not.toHaveAttribute('data-phase-token',before!)
 }
 await expect(a.locator('.nn-game')).toHaveAttribute('data-mode',/ready|champion/,{timeout:45000})
 const mode=await a.locator('.nn-game').getAttribute('data-mode');modes.push({round,mode})
 for(const [i,page] of pages.entries()){
 const metrics=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollHeight,overs:Array.from(document.querySelectorAll('main,main *')).filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.bottom>innerHeight+1}).map(e=>({tag:e.tagName,cls:e.className,rect:e.getBoundingClientRect().toJSON(),position:getComputedStyle(e).position,overflow:getComputedStyle(e).overflow,display:getComputedStyle(e).display})).slice(0,40)}))
 writeFileSync(evidence+'round-'+round+'-'+i+'.json',JSON.stringify(metrics,null,2));if(metrics.scroll>metrics.height+1)await page.screenshot({path:evidence+'round-overflow.png',fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1)}
 if(mode==='champion')break
 await checkDialog(a,'本轮复盘')
 await Promise.all(pages.map(async page=>{await page.locator('.nn-action-deck button[aria-pressed]').first().click();await page.getByRole('button',{name:'确认提交',exact:true}).click()}))
 }
 await expect(a.locator('.nn-game')).toHaveAttribute('data-mode','champion')
 await expect(a.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
 await a.getByRole('button',{name:'房间管理',exact:true}).click();await expect(a.getByRole('button',{name:'开始新一局',exact:true})).toBeVisible();await a.getByRole('button',{name:'收起房间管理',exact:true}).click()
 for(const [width,height] of [[844,390],[915,412],[740,320]]){
 await a.setViewportSize({width,height});await expect(a.getByRole('heading',{name:/冠军 ·/})).toBeInViewport({ratio:1});await checkDialog(a,'完整复盘');await a.screenshot({path:evidence+'champion-'+width+'.png'})
 }
 writeFileSync(evidence+'tournament.json',JSON.stringify(modes,null,2))
 }finally{await Promise.all(contexts.map(c=>c.close()))}
})
