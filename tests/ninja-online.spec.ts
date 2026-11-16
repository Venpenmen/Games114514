import {expect,test,type Page} from '@playwright/test'

test('four isolated browsers complete a real ninja tournament and inspect private and public UI',async({browser})=>{
  test.setTimeout(120000)
  const baseURL='http://127.0.0.1:3214'
  const contexts=await Promise.all(Array.from({length:5},(_,i)=>browser.newContext({
    baseURL, viewport:i===1?{width:320,height:720}:{width:1366,height:850},
  })))
  try {
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b,c,d,observer]=pages
    const players=[a,b,c,d]
    const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true})
    const banner=(page:Page)=>page.locator('.nn-header > div:first-child > h2')
    async function login(page:Page,name:string,url=baseURL) {
      await page.goto(url)
      await page.getByRole('textbox',{name:'昵称'}).fill(name)
      await button(page,'保存资料').click()
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
    await observer.getByRole('textbox',{name:'房间码'}).fill(new URL(roomUrl).searchParams.get('room')!)
    await button(observer,'旁观房间').click()
    await expect(observer.getByText('旁观中 · 仅公开信息')).toBeVisible()
    await expect(observer.getByRole('button',{name:'私人情报'})).toHaveCount(0)
    await expect(observer.getByRole('textbox',{name:'聊天消息'})).toHaveCount(0)
    await expect(observer.locator('.nn-hand')).toHaveCount(0)
    await expect(b.locator('.nn-seat')).toHaveCount(4)
    expect(await b.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
    for(const page of [a,b]) {
      await expect(page.locator('.nn-options button img').first()).toBeVisible()
      expect(await page.locator('.nn-options button img').first().evaluate((image:HTMLImageElement)=>image.decode().then(()=>image.naturalWidth))).toBeGreaterThan(0)
    }
    await a.emulateMedia({reducedMotion:'reduce'})
    await a.screenshot({path:'work/logs/ninja-desktop.png',fullPage:true})
    await b.screenshot({path:'work/logs/ninja-mobile.png',fullPage:true})
    await b.reload()
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
      await expect(a.locator('.nn-event[data-event="reveal"]')).toBeVisible()
      await expect(a.locator('.nn-event[data-event="reveal"]')).toHaveCSS('animation-name','none')
      await expect(banner(a)).toHaveText(/下一轮准备|冠军/,{timeout:10_000})
      if(await banner(a).textContent()==='冠军') break
      await Promise.all(players.map(async page=>{
        await page.locator('.nn-options button[aria-pressed]').first().click()
        await button(page,'确认提交').click()
      }))
    }
    await expect(a.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
    await expect(observer.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
    await a.screenshot({path:'work/logs/ninja-champion.png',fullPage:true})
    await button(b,'公开时间线').click()
    await expect(b.getByRole('dialog',{name:'公开时间线'})).toBeVisible()
  } finally { await Promise.all(contexts.map(context=>context.close())) }
})

test('eleven real seats fit the desktop ring and mobile target area',async({browser})=>{
  test.setTimeout(90_000)
  const baseURL='http://127.0.0.1:3214'
  const contexts=await Promise.all(Array.from({length:11},(_,i)=>browser.newContext({baseURL,
    viewport:i===1?{width:320,height:720}:{width:1440,height:900}})))
  try {
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b]=pages
    async function login(page:Page,i:number,url=baseURL){
      await page.goto(url)
      await page.getByRole('textbox',{name:'昵称'}).fill('席位'+i)
      await page.getByRole('button',{name:'保存资料',exact:true}).click()
    }
    await login(a,0)
    await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'忍者之夜',exact:true})}).getByRole('button',{name:'创建房间'}).click()
    await expect(a.locator('.members li')).toHaveCount(1)
    await a.getByLabel('正式玩家数').selectOption('11')
    await Promise.all(pages.slice(1).map((page,i)=>login(page,i+1,a.url())))
    await expect(a.locator('.members li')).toHaveCount(11)
    await Promise.all(pages.map(async (page,i)=>{
      await page.getByRole('button',{name:'肖像 '+(i+1),exact:true}).click()
      await page.getByRole('button',{name:'准备',exact:true}).click()
    }))
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(11)
    await a.getByRole('button',{name:'开始游戏',exact:true}).click()
    for(const page of [a,b]) {
      await expect(page.locator('.nn-seat')).toHaveCount(11)
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
    }
    for (const page of [a,b]) {
      const images=page.locator('.nn-game img')
      await images.evaluateAll(images=>Promise.all(images.map(image=>(image as HTMLImageElement).decode())))
    }
    await a.screenshot({path:'work/logs/ninja-11-desktop.png',fullPage:true})
    await b.screenshot({path:'work/logs/ninja-11-mobile.png',fullPage:true})
  } finally {await Promise.all(contexts.map(context=>context.close()))}
})
