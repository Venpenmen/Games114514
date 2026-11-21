import {test,expect} from '@playwright/test'
import {registerPlayer} from './account-fixtures.ts'
import {writeFileSync} from 'node:fs'
test('four player viewport audit and orientation fallback',async({browser})=>{
 const contexts=await Promise.all(Array.from({length:4},()=>browser.newContext({baseURL:'http://127.0.0.1:3215'})))
 try{
 const pages=await Promise.all(contexts.map(c=>c.newPage()));const a=pages[0]
 await a.goto('/');await registerPlayer(a,'横屏甲')
 await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})}).getByRole('button',{name:'创建房间'}).click()
 await expect(a.locator('.members li')).toHaveCount(1)
 for(let i=1;i<4;i++){await pages[i].goto(a.url());await registerPlayer(pages[i],'横屏'+i)}
 await expect(a.locator('.members li')).toHaveCount(4)
 for(let i=0;i<4;i++){await pages[i].getByRole('button',{name:'肖像 '+(i+1),exact:true}).click();await pages[i].getByRole('button',{name:'准备',exact:true}).click()}
 await a.getByRole('button',{name:'开始游戏',exact:true}).click()
 await expect(a.locator('.nn-game')).toBeVisible()
 const results=[]
 for(const page of pages){const ok=page.getByRole('button',{name:'确定',exact:true});if(await ok.isVisible())await ok.click()}

 for(const [width,height] of [[844,390],[915,412],[740,320],[390,844]]){
 await a.setViewportSize({width,height});await expect(a.getByRole('button',{name:'全屏横屏',exact:true})).toBeVisible()
 await a.screenshot({path:`work/logs/p2082-p2-${width}x${height}.png`})
 if(width>height){
 expect(await a.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(1)
 await expect(a.getByRole('button',{name:'确认提交',exact:true})).toBeInViewport({ratio:1})
 expect(await a.locator('.nn-ring').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThan(70)
 }
 results.push(await a.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,controls:Array.from(document.querySelectorAll('.nn-confirm,.nn-ring,.nn-header,.nn-action-deck')).map(el=>({selector:el.className,rect:el.getBoundingClientRect().toJSON()}))})))
 }
 await expect(a.getByText(/建议旋转手机横屏/)).toBeVisible()
 await a.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('unsupported'))})
 await a.getByRole('button',{name:'全屏横屏',exact:true}).click()
 await expect(a.getByRole('status').filter({hasText:'无法自动全屏'})).toBeVisible()
 await a.setViewportSize({width:844,height:390})
 async function choose(p:typeof a,label?:string){const option=label?p.getByRole('button',{name:label,exact:true}):p.locator('.nn-action-deck button[aria-pressed]').first();await option.click();await p.getByRole('button',{name:'确认提交',exact:true}).click()}
 const picked=a.getByRole('button',{name:'保留 变形者 1',exact:true});await picked.click();await expect(picked).toHaveAttribute('aria-pressed','true');await picked.click();await expect(picked).toHaveAttribute('aria-pressed','false')
 await Promise.all([choose(a,'保留 变形者 1'),choose(pages[1],'保留 盲眼刺客 4'),choose(pages[2],'保留 镜僧 1'),choose(pages[3])])
 await expect(a.locator('.nn-operation')).toHaveAttribute('data-action','draft2')
 await Promise.all([choose(a),choose(pages[1]),choose(pages[2],'保留 隐士 3'),choose(pages[3])])
 await Promise.all(pages.map(p=>choose(p,'跳过')))
 await Promise.all(pages.map((p,i)=>choose(p,i===2?'打出 隐士 3':'跳过')))
 const actor=pages[2];await actor.setViewportSize({width:915,height:412})
 const target=actor.locator('.nn-seat[data-can-target=true]').first();await expect(target).toBeVisible({timeout:15000});await target.click();await expect(target).toHaveClass(/nn-target/);await target.click();await expect(target).not.toHaveClass(/nn-target/);await target.click()
 await expect(actor.getByRole('button',{name:'确认提交',exact:true})).toBeInViewport({ratio:1});await actor.getByRole('button',{name:'确认提交',exact:true}).click()
 await a.setViewportSize({width:1366,height:768});await expect(a.locator('.nn-seat-shell')).toHaveCount(4);expect(await a.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(1)
 writeFileSync('work/logs/p2082-p2-viewports.json' ,JSON.stringify(results,null,2))
 }finally{await Promise.all(contexts.map(c=>c.close()))}
})
