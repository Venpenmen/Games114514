import {test,expect} from '@playwright/test'
import {registerPlayer} from './account-fixtures.ts'
import {writeFileSync} from 'node:fs'
for(const count of [4,6,8,9,11])test(count+' real landscape target interaction',async({browser})=>{
 const contexts=await Promise.all(Array.from({length:count},()=>browser.newContext({baseURL:'http://127.0.0.1:3215',hasTouch:true,viewport:{width:844,height:390}})))
 try{
 const pages=await Promise.all(contexts.map(c=>c.newPage()));const a=pages[0]
 await a.goto('/');await registerPlayer(a,'席位甲')
 await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})}).getByRole('button',{name:'创建房间'}).click()
 await expect(a.locator('.members li')).toHaveCount(1);await a.getByLabel('轮抽秒数').selectOption('90');await a.waitForTimeout(150);await a.getByLabel('技能目标秒数').selectOption('60');await a.waitForTimeout(150);await a.getByLabel('正式玩家数').selectOption(String(count))
 for(let i=1;i<count;i++){await pages[i].goto(a.url());await registerPlayer(pages[i],'席位'+i)}
 for(let i=0;i<count;i++){await pages[i].getByRole('button',{name:'肖像 '+(i+1),exact:true}).click();await pages[i].getByRole('button',{name:'准备',exact:true}).click()}
 await a.getByRole('button',{name:'开始游戏',exact:true}).click();await expect(a.locator('.nn-seat-shell')).toHaveCount(count)
 const ok=a.getByRole('button',{name:'确定',exact:true});if(await ok.isVisible())await ok.click()
 test.setTimeout(180000)
 async function pick(page:typeof a,pattern?:RegExp){const options=page.locator('.nn-action-deck button[aria-pressed]');const preferred=pattern?page.getByRole('button',{name:pattern}):options.first();await (await preferred.count()?preferred.first():options.first()).click();await page.getByRole('button',{name:'确认提交',exact:true}).click()}
 for(const page of pages){const close=page.getByRole('button',{name:'确定',exact:true});if(await close.isVisible())await close.click()}
 await Promise.all(pages.map(p=>pick(p,/^保留 密探/)))
 await expect(a.locator('.nn-operation')).toHaveAttribute('data-action','draft2',{timeout:15000})
 await Promise.all(pages.map(p=>pick(p,/^保留 密探/)))
 await expect(a.locator('.nn-operation')).toHaveAttribute('data-action','commit')
 await Promise.all(pages.map(p=>pick(p,/^打出 密探/)))
 let actor=pages[0]
 await expect.poll(async()=>{for(const p of pages)if(await p.locator('.nn-seat[data-can-target=true]').count()){actor=p;return true}return false},{timeout:20000}).toBe(true)
 const ids=await actor.locator('.nn-seat[data-can-target=true]').evaluateAll(nodes=>nodes.map(n=>n.closest('.nn-seat-shell')!.getAttribute('data-player')!))
 expect(ids.length).toBe(count-1)
 const records=[]
 for(const badge of await actor.locator('.nn-identity-rank-badge').all())await expect(badge).toHaveText(/^\d+$/)
 const known=actor.locator('.nn-identity-trigger.nn-identity-known').first();await expect(known).toBeVisible();expect(await known.evaluate(el=>getComputedStyle(el).boxShadow)).not.toBe('none')

 for(const [width,height] of [[844,390],[915,412],[740,320],[1366,768]]){
 await actor.setViewportSize({width,height})
 for(const id of ids){const target=actor.locator('.nn-seat-shell[data-player="'+id+'"] .nn-seat');await target.tap();await expect(target).toHaveClass(/nn-target/);await target.tap();await expect(target).not.toHaveClass(/nn-target/)}
 const illegal=actor.locator('.nn-seat:not([data-can-target=true])');for(const item of await illegal.all())await expect(item).toBeDisabled()
 const first=actor.locator('.nn-seat[data-can-target=true]').first();await first.tap()
 await expect(actor.getByRole('button',{name:'确认提交',exact:true})).toBeInViewport({ratio:1})
 if(width<1000)expect(await actor.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBeLessThanOrEqual(1)
 if(process.env.NINJA_CHECK_STAGE_AVOIDANCE)writeFileSync('work/logs/p2082-p3-d-after-'+count+'-'+width+'.json',JSON.stringify(await actor.evaluate(()=>({seats:Array.from(document.querySelectorAll('.nn-seat-shell'),el=>el.getBoundingClientRect().toJSON()),stage:document.querySelector('.nn-stage')!.getBoundingClientRect().toJSON(),ring:document.querySelector('.nn-ring')!.getBoundingClientRect().toJSON(),cards:Array.from(document.querySelectorAll('.nn-table-play'),el=>({card:el.getAttribute('data-card'),rect:el.getBoundingClientRect().toJSON(),image:el.querySelector('.nn-card-art img')!.getBoundingClientRect().toJSON(),transform:getComputedStyle(el).transform,inline:el.getAttribute('style')}))})),null,2))
 if(width<1000 && process.env.NINJA_CHECK_STAGE_AVOIDANCE)await expect.poll(()=>actor.locator('.nn-table-play').evaluateAll(cards=>{
 const stage=document.querySelector('.nn-stage')!.getBoundingClientRect()
 return cards.filter(card=>{const r=card.getBoundingClientRect();return r.left<stage.right&&r.right>stage.left&&r.top<stage.bottom&&r.bottom>stage.top}).length
 })).toBe(0)
 if(width<1000 && process.env.NINJA_CHECK_STAGE_AVOIDANCE)await expect.poll(()=>actor.locator('.nn-table-play').evaluateAll(cards=>{
 const ring=document.querySelector('.nn-ring')!.getBoundingClientRect();const seats=Array.from(document.querySelectorAll('.nn-seat-shell'),n=>n.getBoundingClientRect())
 return cards.filter(card=>{const r=card.getBoundingClientRect(),image=card.querySelector('.nn-card-art img')!.getBoundingClientRect();return r.left<ring.left||r.right>ring.right||r.top<ring.top||r.bottom>ring.bottom||image.width<r.width-3||image.height<r.height-3||seats.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)}).length
 })).toBe(0)
 const bound=await actor.locator('.nn-seat-shell').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),i=n.querySelector('.nn-identity-trigger')!.getBoundingClientRect();return {player:n.getAttribute('data-player'),seat:r.toJSON(),identity:i.toJSON()}}))
 for(const pair of bound){expect(pair.identity.left).toBeGreaterThanOrEqual(pair.seat.left-1);expect(pair.identity.right).toBeLessThanOrEqual(pair.seat.right+1)}
 records.push({width,height,targets:ids,bound,publicCards:await actor.locator('.nn-table-play').count(),executionActors:await actor.locator('.nn-execution-actor').count()})
 if(width===844)await actor.screenshot({path:'work/logs/p2082-p3-d-target-'+count+'.png'})
 await first.tap()
 }
 await actor.setViewportSize({width:915,height:412});const chosen=actor.locator('.nn-seat[data-can-target=true]').first();const chosenId=await chosen.locator('..').getAttribute('data-player');const identity=actor.locator('.nn-seat-shell[data-player="'+chosenId+'"] .nn-identity-trigger');const before=await identity.boundingBox();await chosen.tap();await actor.getByRole('button',{name:'确认提交',exact:true}).click()
 await expect(actor.locator('.nn-seat.nn-target')).toHaveCount(0)
 await expect(identity).toHaveClass(/nn-identity-known/,{timeout:15000})
 const after=await identity.boundingBox();expect(Math.abs(after!.x-before!.x)).toBeLessThanOrEqual(1);expect(Math.abs(after!.y-before!.y)).toBeLessThanOrEqual(1)

 if(process.env.NINJA_FINISH_PUBLIC_ROUND && (!process.env.NINJA_E_COUNTS || process.env.NINJA_E_COUNTS.split(',').includes(String(count)))){
 const snapshot=()=>actor.locator('.nn-seat-shell').evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-player'),rect:n.querySelector('.nn-identity-trigger')!.getBoundingClientRect().toJSON()})))
 const original=await snapshot()
 const end=Date.now()+90000
 while(Date.now()<end){
   if(await a.locator('.nn-operation[data-action=commit]').count() && await a.locator('.nn-header [data-phase=mystic]').count())break
   for(const page of pages){
     const close=page.getByRole('button',{name:'确定',exact:true});if(await close.isVisible())await close.click()
     const legal=page.locator('.nn-seat[data-can-target=true]');if(await legal.count()){await legal.first().tap();await page.getByRole('button',{name:'确认提交',exact:true}).click();break}
   }
   await a.waitForTimeout(150)
 }
 await expect(a.locator('.nn-header [data-phase=mystic]').first()).toBeVisible({timeout:10000})
 let death:string|null=null
 for(let phase=0;phase<4;phase++){
   if(phase!==2){await Promise.all(pages.map(async page=>{if(!await page.locator('.nn-seat[data-self=true].nn-dead').count())await pick(page,/^跳过$/)}));continue}
   await expect(a.locator('.nn-header [data-phase=blind]').first()).toBeVisible({timeout:20000})
   let attacker:typeof actor|undefined
   for(const page of pages)if(await page.getByRole('button',{name:/^打出 盲眼刺客/}).count()){attacker=page;break}
   await Promise.all(pages.map(page=>pick(page,page===attacker?/^打出 盲眼刺客/:/^跳过$/)))
   if(attacker){
     await expect(attacker.locator('.nn-seat[data-can-target=true]').first()).toBeVisible({timeout:20000})
     const victim=attacker.locator('.nn-seat[data-can-target=true]').first();death=await victim.locator('..').getAttribute('data-player')
     const prior=await snapshot();await victim.tap();await attacker.getByRole('button',{name:'确认提交',exact:true}).click()
     // Deliberately allow the authenticated victim's reaction deadline to expire.
     // The real server must adjudicate death; no DOM/state injection is used.
     const dead=actor.locator('.nn-seat-shell[data-player="'+death+'"]')
     await expect(dead.locator('.nn-dead')).toBeVisible({timeout:45000})
     await expect(dead.locator('.player-avatar>img')).toHaveCSS('filter','grayscale(1) brightness(0.65)')
     const post=await snapshot();writeFileSync('work/logs/p2082-p3-e-death-'+count+'.json',JSON.stringify({death,prior,post},null,2))
     const old=prior.find(x=>x.id===death)!,now=post.find(x=>x.id===death)!
     expect(Math.abs(old.rect.x-now.rect.x)).toBeLessThanOrEqual(1);expect(Math.abs(old.rect.y-now.rect.y)).toBeLessThanOrEqual(1)
     await actor.screenshot({path:'work/logs/p2082-p3-e-death-'+count+'.png'})
   }
 }
 await expect(actor.locator('.nn-game')).toHaveAttribute('data-mode',/ready|champion/,{timeout:90000})
 const final=await snapshot()
 for(const start of original){const finish=final.find(x=>x.id===start.id)!;expect(Math.abs(start.rect.x-finish.rect.x)).toBeLessThanOrEqual(1);expect(Math.abs(start.rect.y-finish.rect.y)).toBeLessThanOrEqual(1)}
 await expect(actor.locator('.nn-seat-shell:not(:has(.nn-dead)) .nn-identity-known')).toHaveCount(count-(death?1:0))
 for(const badge of await actor.locator('.nn-identity-rank-badge').all())await expect(badge).toHaveText(/^\d+$/)
 await actor.screenshot({path:'work/logs/p2082-p3-e-public-'+count+'.png'})
 writeFileSync('work/logs/p2082-p3-e-public-'+count+'.json',JSON.stringify({original,final,death,deathCovered:Boolean(death)},null,2))
 }
 writeFileSync('work/logs/p2082-p3-d-target-'+count+'.json',JSON.stringify(records,null,2))
 }finally{await Promise.all(contexts.map(c=>c.close()))}
})
