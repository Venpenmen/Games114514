import {checkRoomChat} from './room-chat.ts'
import {expect,test,type Page} from '@playwright/test'

test('three guests play a complete match, sustained overtime and champion',async({browser})=>{
  test.setTimeout(180_000)
  const baseURL='http://127.0.0.1:3198'
  const contexts=await Promise.all([
    browser.newContext({baseURL,viewport:{width:1280,height:900}}),
    browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
    browser.newContext({baseURL}),
  ])
  try {
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b,c]=pages
    let holdNext=true
    let held: (()=>void) | undefined
    await b.routeWebSocket('**/socket.io/**',route=>{
      const server=route.connectToServer()
      server.onMessage(message=>{
        if(holdNext && typeof message==='string' && message.startsWith('42["room"') && message.includes('本人成功消息')) {
          held=()=>route.send(message)
          return
        }
        route.send(message)
      })
    })
    const names=['安妮','比利','克莱']
    const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true})
    const all=(name:string)=>Promise.all(pages.map(page=>button(page,name).click()))
    async function login(page:Page,name:string,path='/') {
      await page.goto(path)
      await page.getByRole('textbox',{name:'昵称'}).fill(name)
      await button(page,'保存资料').click()
    }
    await login(a,names[0])
    const card=a.locator('.game-card').filter({has:a.getByRole('heading',{name:'骰子狼人杀',exact:true})})
    await expect(card.locator('img')).toBeVisible()
    expect(await card.locator('img').evaluate((image:HTMLImageElement)=>image.decode().then(()=>image.naturalWidth))).toBeGreaterThan(0)
    await card.getByRole('button',{name:'创建房间'}).click()
    await expect(a.getByRole('heading',{name:/骰子狼人杀 · \d{6}/})).toBeVisible()
    const invite=new URL(a.url())
    await login(b,names[1],invite.pathname+invite.search)
    await expect(a.locator('.members li')).toHaveCount(2)
    await login(c,names[2],invite.pathname+invite.search)
    await expect(a.locator('.members li')).toHaveCount(3)
    await button(a,'准备').click()
    await expect(a.getByRole('alert')).toHaveText('请先完成游戏准备选项')
    await a.getByLabel('目标积分').selectOption('3')
    await Promise.all([button(a,'黑帽赌徒').click(),button(b,'荒野枪手').click(),button(c,'老牌赌客').click()])
    await all('准备')
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(3)
    await button(a,'开始游戏').click()
    for(const [i,page] of pages.entries()) {
      await expect(page.getByTestId('own-identity')).toHaveText('身份 '+(i+1)+' 点')
      await expect(page.getByTestId('own-identity')).toHaveCount(1)
    }
    await expect(a.locator('.dw-private .dw-roll')).toHaveCSS('animation-name','dw-roll')
    await b.emulateMedia({reducedMotion:'reduce'})
    await expect(b.locator('.dw-private .dw-roll')).toHaveCSS('animation-name','none')
    await b.emulateMedia({reducedMotion:'no-preference'})
    await b.reload()
    await expect(b.getByTestId('own-identity')).toHaveText('身份 2 点')
    await expect(a.locator('.dw-point')).toHaveCount(6)
    for(const [i,point] of (await a.locator('.dw-point').all()).entries()) {
      await expect(point.locator('.dw-face')).toHaveCount(6)
      await expect(point.locator('.dw-face-'+(i+1)+' i')).toHaveCount(i+1)
    }
    expect(await b.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
    await a.screenshot({path:'work/logs/dice-desktop.png',fullPage:true})
    await b.screenshot({path:'work/logs/dice-mobile.png',fullPage:true})
    await checkRoomChat([b,a,c], names[0],{
      held:()=>!!held,
      release:()=>{holdNext=false;held?.()},
    })
    for(let game=1;game<=5;game++) {
      await expect(a.locator('.dw-banner')).toContainText('第 '+game+' 局')
      if(game>=4) await expect(a.locator('.dw-banner')).toContainText('加赛')
      for(let face=1;face<=6;face++) {
        await expect(a.getByRole('heading',{name:'当前点数 '+face,exact:true})).toBeVisible()
        if(game===1 && face===1) {
          await button(a,'增加 +1').click()
          await expect(b.getByText('1 / 3 已提交',{exact:true})).toBeVisible()
          await expect(b.locator('.dw-last')).toHaveCount(0)
          await Promise.all([button(b,'增加 +1').click(),button(c,'增加 +1').click()])
        } else await all(game===1 && face===4?'减少 −1':'增加 +1')
      }
      const target=Number((await (game===5?b:c).getByTestId('own-identity').textContent())?.match(/\d+/)?.[0])
      if(game===1) {
        await Promise.all(pages.map((page,i)=>button(page,'投 '+(i+1)+' 点').click()))
        await expect(a.getByRole('heading',{name:'公开票型',exact:true})).toBeVisible()
        await expect(a.getByText('无有效处决',{exact:true})).toBeVisible()
        await expect(a.getByRole('heading',{name:'重新投票',exact:true})).toBeVisible({timeout:7_000})
        await expect(a.locator('.dw-risk')).toHaveCount(1)
        await all('投 5 点')
        for(const face of [1,2,3,4,6]) {
          await expect(a.getByRole('heading',{name:'当前点数 '+face,exact:true})).toBeVisible({timeout:7_000})
          if(face===6) {
            await expect(a.getByText('待处决',{exact:true})).toBeVisible()
            await a.screenshot({path:'work/logs/dice-condemned.png',fullPage:true})
          }
          await all(face===4?'减少 −1':'增加 +1')
        }
        await expect(a.locator('.dw-removed')).toHaveCount(2)
      }
      await all('投 '+target+' 点')
      if(game<5) {
        await expect(a.getByRole('heading',{name:'本局结算',exact:true})).toBeVisible()
        if(game===1) await button(a,'查看本局完整结算').click()
        await expect(b.locator('.dw-banner')).toContainText('第 '+(game+1)+' 局',{timeout:12_000})
        if(game===1) {
          const dialog=a.getByRole('dialog',{name:'第 1 局完整结算'})
          await expect(dialog.getByText('最终生命值',{exact:true})).toBeVisible()
          await dialog.getByRole('button',{name:'关闭',exact:true}).click()
          await expect(button(a,'查看上一局结算')).toBeVisible()
        }
      }
    }
    await expect(c.getByRole('heading',{name:'冠军 · 安妮'})).toBeVisible()
    await expect(c.locator('.dw-results')).toContainText('共 5 分')
    await expect(c.getByRole('textbox',{name:'聊天消息'})).toHaveCount(0)
    await c.reload()
    await expect(c.getByRole('heading',{name:'冠军 · 安妮'})).toBeVisible()
    await c.screenshot({path:'work/logs/dice-champion.png',fullPage:true})
  } finally {
    await Promise.all(contexts.map(context=>context.close()))
  }
})
