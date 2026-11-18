import {registerPlayer} from './account-fixtures.ts'
import {expect,test,type Page} from '@playwright/test'
const evidence=process.env.NINJA_TEST_ASSETS?'ninja-p20':'ninja'

test('four isolated browsers complete a real ninja tournament and inspect private and public UI',async({browser})=>{
  test.setTimeout(120000)
  const baseURL=process.env.NINJA_PLAY_URL??'http://127.0.0.1:3214'
  const contexts=await Promise.all(Array.from({length:5},(_,i)=>browser.newContext({
    baseURL, viewport:i===1?{width:320,height:720}:process.env.NINJA_PLAY_URL?{width:1280,height:720}:{width:1366,height:850},
  })))
  try {
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b,c,d,observer]=pages
    const players=[a,b,c,d]
    const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true})
    const banner=(page:Page)=>page.locator('.nn-header > div:first-child > h2')
    async function login(page:Page,name:string,url=baseURL) {
      await page.goto(url)
      await registerPlayer(page,name)
      await expect(page.getByRole('button',{name:new RegExp(name)})).toBeVisible()
    }
    await login(a,'甲')
    const card=a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})})
    await expect(card.locator('img')).toBeVisible()
    await card.getByRole('button',{name:'创建房间'}).click()
    await expect(a.locator('.members li')).toHaveCount(1)
    const roomUrl=a.url()
    await Promise.all([login(b,'乙',roomUrl),login(c,'丙',roomUrl),login(d,'丁',roomUrl),login(observer,'旁观者')])
    await expect(a.locator('.members li')).toHaveCount(4)
    await Promise.all(players.map((page,i)=>button(page,'肖像 '+(i+1)).click()))
    await Promise.all(players.map(page=>button(page,'准备').click()))
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(4)
    await button(a,'开始游戏').click()
    await expect(banner(a)).toHaveText('第一步轮抽')
    await expect.poll(()=>a.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBe(0)
    await expect(button(a,'确认提交')).toBeInViewport({ratio:1})
    await observer.getByRole('textbox',{name:'房间码'}).fill(new URL(roomUrl).searchParams.get('room')!)
    await button(observer,'旁观房间').click()
    await expect(observer.getByText('旁观中 · 仅公开信息')).toBeVisible()
    await expect(observer.getByRole('button',{name:'私人情报'})).toHaveCount(0)
    await expect(observer.getByRole('textbox',{name:'聊天消息'})).toHaveCount(0)
    await expect(observer.getByRole('button',{name:'完整复盘'})).toHaveCount(0)
    await expect(observer.locator('.nn-private-toast')).toHaveCount(0)
    await expect(observer.locator('.nn-hand')).toHaveCount(0)
    await expect(b.locator('.nn-seat')).toHaveCount(4)
    const mobileHand=b.getByRole('button',{name:/收起手牌/})
    await expect(mobileHand).toBeVisible()
    await mobileHand.click()
    await expect(b.locator('.nn-operation[data-hand-open=false] .nn-hand')).toBeHidden()
    await b.getByRole('button',{name:/展开手牌/}).click()
    await expect(mobileHand).toHaveAttribute('aria-expanded','true')
    for(const [width,height] of [[375,667],[390,844],[430,932],[740,390],[768,1024],[1024,768]]) {
      await b.setViewportSize({width,height})
      expect(await b.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await expect(b.locator('.nn-seat[data-self=true]')).toBeVisible()
    }
    await b.setViewportSize({width:320,height:720})
    await b.locator('.nn-seat[data-self=true]').click()
    await expect(b.getByRole('dialog',{name:'身份牌详情'})).toBeVisible()
    await b.keyboard.press('Escape')
    await button(b,'游戏规则').click()
    await button(b,'完整玩法指南').click()
    const mobileGuide=b.getByRole('dialog',{name:/游戏规则/})
    await expect(mobileGuide).toContainText('超时与重连')
    expect(await mobileGuide.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true)
    await b.keyboard.press('Escape')
    expect(await b.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    for(const page of [a,b]) {
      await expect(page.locator('.nn-options button img').first()).toBeVisible()
      expect(await page.locator('.nn-options button img').first().evaluate((image:HTMLImageElement)=>image.decode().then(()=>image.naturalWidth))).toBeGreaterThan(0)
    }
    await a.emulateMedia({reducedMotion:'reduce'})
    await a.screenshot({path:'work/logs/'+evidence+'-desktop.png',fullPage:true})
    await b.screenshot({path:'work/logs/'+evidence+'-mobile.png',fullPage:true})
    await button(b,'设置').click()
    const settings=b.getByRole('dialog',{name:'游戏设置'})
    await settings.getByLabel('演出').selectOption('reduced')
    await settings.getByRole('button',{name:'关闭'}).click()
    await expect(b.locator('.nn-game')).toHaveAttribute('data-effects','reduced')
    await button(b,'返回大厅').click()
    const returning=b.getByRole('dialog',{name:'返回游戏大厅？'})
    await returning.getByRole('button',{name:'继续游戏'}).click()
    await expect(b.locator('.nn-seat')).toHaveCount(4)
    await button(b,'返回大厅').click()
    await returning.getByRole('button',{name:'确认返回'}).click()
    await expect(a.locator('.nn-seat').getByRole('img',{name:'乙，离线'})).toHaveCount(1)
    await expect(button(b,'继续对局')).toBeVisible()
    await b.reload()
    await button(b,'继续对局').click()
    await expect(b.locator('.nn-seat[data-self=true]')).toContainText('乙')
    await expect(a.locator('.nn-seat').getByRole('img',{name:'乙，在线'})).toHaveCount(1)
    await expect(banner(b)).toHaveText('第一步轮抽')
    for(let round=1;round<=5;round++) {
      for(const label of ['第一步轮抽','第二步轮抽','秘密出牌','秘密出牌','秘密出牌','秘密出牌','秘密出牌']) {
        await expect(banner(a)).toHaveText(label)
        const before=await a.locator('.nn-game').getAttribute('data-phase-token')
        await Promise.all(players.map(async page=>{
          await expect(banner(page)).toHaveText(label)
          await page.locator('.nn-options button[aria-pressed]').first().click()
          await button(page,'确认提交').click()
        }))
        for (const page of players) await expect(page.locator('.nn-game')).not.toHaveAttribute('data-phase-token',before!)
      }
      await expect(a.locator('.nn-round-result')).toContainText('鹤派')
      await expect(banner(a)).toHaveText(/下一轮准备|冠军/,{timeout:18_000})
      if(await banner(a).textContent()==='冠军') break
      await Promise.all(players.map(async page=>{
        await page.locator('.nn-options button[aria-pressed]').first().click()
        await button(page,'确认提交').click()
      }))
    }
    await expect(a.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
    await expect(observer.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
    await a.screenshot({path:'work/logs/'+evidence+'-champion.png',fullPage:true})
    await expect.poll(()=>a.evaluate(()=>document.documentElement.scrollHeight-innerHeight)).toBe(0)
    await button(b,'公开时间线').click()
    await expect(b.locator('.nn-timeline > li[data-kind=champion]')).toContainText('比赛结算')
    await expect(b.getByRole('dialog',{name:'公开时间线'})).toBeVisible()
    await button(observer,'完整复盘').click()
    expect(await observer.locator('.nn-replay details').count()).toBeGreaterThan(1)
    await observer.locator('.nn-replay details summary').first().click()
    await expect(observer.locator('.nn-replay [data-step=deal] .nn-card-face').first()).toBeVisible()
    await expect(observer.locator('.nn-replay [data-step=draft1]').first()).toContainText('传出')
    await expect(observer.locator('.nn-replay [data-step=round-score]').first()).toContainText('分')
    if(process.env.NINJA_PLAY_URL) await button(a,'解散房间').click()
  } finally { await Promise.all(contexts.map(context=>context.close())) }
})

for(const count of [6,8,9,11]) test(count+' real seats fit the desktop ring and mobile target area',async({browser})=>{
  test.setTimeout(90_000)
  const baseURL='http://127.0.0.1:3214'
  const contexts=await Promise.all(Array.from({length:count},(_,i)=>browser.newContext({baseURL,
    viewport:i===1?{width:320,height:720}:{width:1440,height:900}})))
  try {
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b]=pages
    async function login(page:Page,i:number,url=baseURL){
      await page.goto(url)
      await registerPlayer(page,'练习机器人第'+(i+1)+'号')
    }
    await login(a,0)
    await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})}).getByRole('button',{name:'创建房间'}).click()
    await expect(a.locator('.members li')).toHaveCount(1)
    await a.getByLabel('正式玩家数').selectOption(String(count))
    await Promise.all(pages.slice(1).map((page,i)=>login(page,i+1,a.url())))
    await expect(a.locator('.members li')).toHaveCount(count)
    await a.getByLabel('轮抽秒数').selectOption('30')
    await Promise.all(pages.map(async (page,i)=>{
      await page.getByRole('button',{name:'肖像 '+(i+1),exact:true}).click()
      await page.getByRole('button',{name:'准备',exact:true}).click()
    }))
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(count)
    await a.getByRole('button',{name:'开始游戏',exact:true}).click()
    for(const page of [a,b]) {
      await expect(page.locator('.nn-seat')).toHaveCount(count)
      const seats=await page.locator('.nn-seat').evaluateAll(nodes=>nodes.map(node=>{
        const {x,y,width,height}=node.getBoundingClientRect()
        return {x,y,width,height,self:(node as HTMLElement).dataset.self==='true'}
      }))
      const self=seats.find(seat=>seat.self)!
      expect(self.y).toBeGreaterThan(Math.max(...seats.filter(seat=>!seat.self).map(seat=>seat.y)))
      for(const [i,a] of seats.entries()) for(const b of seats.slice(i+1))
        expect(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y,
          JSON.stringify({viewport:page.viewportSize(),a,b})).toBe(true)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
    for (const [width,height] of [[1920,1080],[1366,768],[1280,720]]) {
      await a.setViewportSize({width,height})
      await expect.poll(()=>a.evaluate(()=>({
        scroll:document.documentElement.scrollHeight,
        height:innerHeight,
      }))).toEqual({scroll:height,height})
      await expect(a.getByRole('button',{name:'确认提交'})).toBeInViewport({ratio:1})
      await expect(a.locator('.nn-seat[data-self=true]')).toBeInViewport({ratio:1})
      await expect(a.locator('.nn-seat-info')).toHaveCount(count)
      await expect.poll(()=>a.locator('.nn-seat-shell').evaluateAll(nodes=>{
        const seats=nodes.map(node=>node.getBoundingClientRect())
        return seats.some((a,i)=>seats.slice(i+1).some(b=>a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom))
      }),{message:`${width}×${height} 席位相交`}).toBe(false)
      const overlays=await a.locator('.nn-seat-shell').evaluateAll(nodes=>nodes.some(node=>{
        const name=node.querySelector('strong')!.getBoundingClientRect()
        const identity=node.querySelector('.nn-identity-trigger')!.getBoundingClientRect()
        return name.right>identity.left && name.left<identity.right && name.top<identity.bottom && name.bottom>identity.top
      }))
      expect(overlays).toBe(false)
      const cards=await a.locator('.nn-identity-trigger').evaluateAll(elements=>elements.map(element=>{
        const box=element.getBoundingClientRect()
        return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width}
      }))
      expect(cards.every(card=>card.width>=(count===9?39:31))).toBe(true)
      await expect.poll(()=>a.locator('.nn-ring').evaluate(ring=>{
        const cards=Array.from(ring.querySelectorAll('.nn-identity-trigger'),el=>el.getBoundingClientRect())
        const blocks=Array.from(ring.querySelectorAll('.nn-seat-shell,.nn-stage'),el=>el.getBoundingClientRect())
        const covers=(a:DOMRect,b:DOMRect)=>a.left<b.right-1 && b.left<a.right-1 && a.top<b.bottom-1 && b.top<a.bottom-1
        return cards.flatMap((card,i)=>[
          ...blocks.flatMap((block,j)=>j!==i && covers(card,block)?[{card:i,block:j,box:card.toJSON()}]:[]),
          ...cards.flatMap((other,j)=>j>i && covers(card,other)?[{card:i,other:j,box:card.toJSON()}]:[]),
        ])
      }),{message:`${count} 人 ${width}×${height} 身份牌碰撞`}).toEqual([])
      if(count===9 && width===1366) {
        await a.screenshot({path:'work/logs/p20-8-1-1-nine-seats.png'})
        const trigger=a.locator('.nn-identity-trigger').first()
        const widthBefore=(await trigger.boundingBox())!.width
        await trigger.hover()
        await expect.poll(async()=>(await trigger.boundingBox())!.width).toBeGreaterThan(widthBefore*1.35)
        await trigger.click()
        await expect(a.getByRole('dialog',{name:'身份牌详情'})).toBeVisible()
        await a.keyboard.press('Escape')
        await a.mouse.move(0,0)
        await trigger.evaluate(element=>element.blur())
        await expect.poll(async()=>(await trigger.boundingBox())!.width).toBeLessThan(widthBefore*1.05)
      }
      const clipped=await a.locator('.nn-seat-info').evaluateAll(nodes=>nodes.some(node=>{
        const seat=node.closest('button')!.getBoundingClientRect()
        return Array.from(node.children).some(child=>{
          const box=child.getBoundingClientRect()
          return child.scrollWidth>child.clientWidth+1 || box.left<seat.left-1 || box.right>seat.right+1 || box.bottom>seat.bottom+1
        })
      }))
      expect(clipped,`${width}×${height} 名片文字裁切`).toBe(false)
    }
    for (const page of [a,b]) {
      const images=page.locator('.nn-game img')
      await images.evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())))
    }
    await a.screenshot({path:'work/logs/'+evidence+'-'+count+'-desktop.png',fullPage:true})
    await b.screenshot({path:'work/logs/'+evidence+'-'+count+'-mobile.png',fullPage:true})
    const action=a.locator('.nn-operation')
    if(count!==11) return
    await expect(action).toHaveAttribute('data-action','draft2',{timeout:36_000})
    await expect(action.locator('.nn-card-deck button .nn-card-face')).toHaveCount(2)
  } finally {await Promise.all(contexts.map(context=>context.close()))}
})
