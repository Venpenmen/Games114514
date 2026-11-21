import {test,expect} from '@playwright/test'
import {registerPlayer} from './account-fixtures.ts'
import {writeFileSync} from 'node:fs'
for(const count of [4,6,8,9,11])test(count+' landscape seats and identity binding',async({browser})=>{
 const contexts=await Promise.all(Array.from({length:count},()=>browser.newContext({baseURL:'http://127.0.0.1:3214',viewport:{width:844,height:390}})))
 try{
 const pages=await Promise.all(contexts.map(c=>c.newPage()));const a=pages[0]
 await a.goto('/');await registerPlayer(a,'席位甲')
 await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})}).getByRole('button',{name:'创建房间'}).click()
 await expect(a.locator('.members li')).toHaveCount(1);await a.getByLabel('正式玩家数').selectOption(String(count))
 for(let i=1;i<count;i++){await pages[i].goto(a.url());await registerPlayer(pages[i],'席位'+i)}
 for(let i=0;i<count;i++){await pages[i].getByRole('button',{name:'肖像 '+(i+1),exact:true}).click();await pages[i].getByRole('button',{name:'准备',exact:true}).click()}
 await a.getByRole('button',{name:'开始游戏',exact:true}).click();await expect(a.locator('.nn-seat-shell')).toHaveCount(count)
 const ok=a.getByRole('button',{name:'确定',exact:true});if(await ok.isVisible())await ok.click()
 const records=[]
 for(const [width,height] of [[844,390],[915,412],[740,320],[1366,768]]){
 await a.setViewportSize({width,height})
 await expect.poll(()=>a.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(1)
 const boxes=await a.locator('.nn-seat-shell').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}))
 if(width<1000){
 for(let i=0;i<boxes.length;i++){const b=boxes[i];expect(b.x).toBeGreaterThanOrEqual(0);expect(b.right).toBeLessThanOrEqual(width);expect(b.bottom).toBeLessThanOrEqual(height);for(let j=i+1;j<boxes.length;j++){const c=boxes[j];expect(b.x<c.right&&c.x<b.right&&b.y<c.bottom&&c.y<b.bottom,'overlap '+i+'/'+j).toBe(false)}}
 await expect(a.getByRole('button',{name:'确认提交',exact:true})).toBeInViewport({ratio:1})
 for(const seat of await a.locator('.nn-seat-shell').all()){const button=seat.locator('.nn-identity-trigger');await button.click();await expect(a.getByRole('dialog',{name:'身份牌详情'})).toBeVisible();await a.keyboard.press('Escape')}
 }
 records.push({width,height,boxes})
 if(width===844)await a.screenshot({path:'work/logs/p2082-p3-'+count+'.png'})
 }
 writeFileSync('work/logs/p2082-p3-'+count+'.json',JSON.stringify(records,null,2))
 }finally{await Promise.all(contexts.map(c=>c.close()))}
})
