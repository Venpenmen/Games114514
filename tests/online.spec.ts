import {registerPlayer} from './account-fixtures.ts'
import {checkGameLayout} from './game-layout.ts'
import {checkRoomChat} from './room-chat.ts'
import { expect,test,type Page } from '@playwright/test'

for (const correct of [true,false]) test('three guests, '+(correct?'human':'ghost')+' victory and restart', async ({browser,baseURL}) => {
  const contexts=await Promise.all([
    browser.newContext({baseURL}),
    browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true}),
    browser.newContext({baseURL}),
  ])
  try {
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b,c]=pages
    const names=['甲','乙','丙']
    const button=(page:Page,name:string)=>page.getByRole('button',{name,exact:true})
    async function login(page:Page,name:string,path='/') {
      await page.goto(path)
      await registerPlayer(page,name)
      await expect(page.getByRole('button',{name:new RegExp(name)})).toBeVisible()
    }
    await login(a,names[0])
    await expect(a.locator('header.bar')).toBeVisible()
    await expect(a.locator('.game-card').filter({has:a.getByRole('heading',{name:'诡吹灯',exact:true})}).locator('.game-cover')).toBeVisible()
    expect(await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'诡吹灯',exact:true})}).locator('.game-cover').evaluate((image: HTMLImageElement) => image.decode().then(() => image.naturalWidth))).toBeGreaterThan(0)
    if (process.env.GAMES_SCREENSHOTS) await a.screenshot({path:'work/logs/lobby-desktop.png',fullPage:true})
    await a.locator('.game-card').filter({has:a.getByRole('heading',{name:'诡吹灯',exact:true})}).getByRole('button',{name:'创建房间'}).click()
    await expect(a.getByRole('heading',{name:/诡吹灯 · \d{6}/})).toBeVisible()
    const invite=new URL(a.url())
    const code=invite.searchParams.get('room')!
    await login(b,names[1],invite.pathname+invite.search)
    await login(c,names[2])
    await c.getByRole('textbox',{name:'房间码'}).fill(code)
    await button(c,'加入房间').click()
    for (const page of pages) await expect(page.locator('.members li')).toHaveCount(3)
    await button(a,'游戏规则').click()
    const rulesTitle = '《诡吹灯》游戏规则'
    const lobbyRules = a.getByRole('dialog',{name:rulesTitle})
    await expect(lobbyRules.getByRole('heading',{name:'三个人如何获胜'})).toBeVisible()
    await a.keyboard.press('Escape')
    await expect(lobbyRules).toBeHidden()
    await expect(button(a,'游戏规则')).toBeFocused()
    await expect(a.locator('header.bar')).toBeVisible()
    await expect(button(a,'复制邀请链接')).toBeVisible()
    await a.getByLabel('夜晚时长（秒）').selectOption('30')
    await Promise.all(pages.map(page=>button(page,'准备').click()))
    await expect(a.getByText('在线 · 已准备',{exact:false})).toHaveCount(3)
    await button(a,'开始游戏').click()
    await Promise.all(pages.map(page=>expect(page.getByRole('heading',{name:'夜晚',exact:true})).toBeVisible()))
    await expect(b.locator('.ghost-seats .player-avatar')).toHaveCount(3)
    const thirdUrl=c.url()
    await c.goto('about:blank')
    await expect(b.locator('.ghost-seats').getByRole('img',{name:'丙，离线'})).toBeVisible()
    await c.goto(thirdUrl)
    await expect(b.locator('.ghost-seats').getByRole('img',{name:'丙，在线'})).toBeVisible()
    await button(b,'游戏规则').click()
    const mobileRules = b.getByRole('dialog',{name:rulesTitle})
    await expect(mobileRules.getByText('查看规则时倒计时继续。全员离线时暂停，有玩家重新上线后继续。')).toBeAttached()
    expect((await mobileRules.boundingBox())!.width).toBeLessThan(390)
    await mobileRules.getByRole('button',{name:'关闭'}).click()
    await expect(mobileRules).toBeHidden()
    if (process.env.GAMES_SCREENSHOTS) {
      await a.screenshot({path:'work/logs/game-desktop.png',fullPage:true})
      await b.screenshot({path:'work/logs/game-mobile.png',fullPage:true})
    }
    await expect(a.locator('header.bar')).toHaveCount(0)
    await expect(button(a,'复制邀请链接')).toHaveCount(0)
    const initialUrl=a.url()
    const role=await a.locator('.ghost strong').first().textContent()
    await a.reload()
    await expect(a).toHaveURL(initialUrl)
    await expect(a.locator('header.bar')).toHaveCount(0)
    await expect(a.locator('.ghost strong').first()).toHaveText(role!)
    await a.locator('.candles .intact').first().click()
    await button(a,'确认行动').click()
    await expect(a.getByText('已提交，等待其他玩家')).toBeVisible()
    await button(a,'返回大厅').click()
    await button(a,'确认返回').click()
    await expect(a.getByRole('heading',{name:'游戏大厅'})).toBeVisible()
    await expect(a.getByText('诡吹灯 · '+code,{exact:true})).toBeVisible()
    await button(a,'继续对局').click()
    await expect(a.locator('.role-label strong')).toHaveText(role!)
    await expect(a.getByText('已提交，等待其他玩家')).toBeVisible()
    await expect(b.getByRole('heading',{name:'白天讨论'})).toBeVisible({timeout:36_000})
    await expect(c.getByText(/最近一夜/)).toBeVisible()
    await expect(c.locator('.ghost-outcome')).toContainText('号蜡烛已')
    await checkGameLayout(b,correct?'ghost':'ghost-defeat','.candles','结束讨论')
    await checkRoomChat([a,b,c], names[1])
    const chatList=a.getByRole('list',{name:'公聊记录'})
    await chatList.evaluate(el=>{el.dataset.instance='original'})
    async function all(name:string) {
      await Promise.all(pages.map(page=>button(page,name).click()))
    }
    for (let n=2;n<=3;n++) {
      await all('结束讨论')
      await expect(a.getByRole('heading',{name:'夜晚',exact:true})).toBeVisible()
      await expect(a.getByRole('textbox',{name:'聊天消息'})).toHaveCount(0)
      await expect(chatList).toHaveAttribute('data-instance','original')
      const label=await a.locator('.candles .intact').first().innerText()
      const target=label.match(/\d+/)![0]
      await Promise.all(pages.map(async page=>{
        await page.getByRole('button',{name:target+' · 完好',exact:true}).click()
        await button(page,'确认行动').click()
      }))
      await expect(a.getByRole('heading',{name:'白天讨论'})).toBeVisible({timeout:10_000})
    }
    await all('结束讨论')
    await all('寻找诡异')
    for (let i=0;i<3;i++) await button(pages[i],'指认 '+names[(i+1)%3]).click()
    await expect(a.getByRole('heading',{name:'第 4 天 · 第 1 轮票型'})).toBeVisible()
    await expect(b.getByRole('heading',{name:'重新指认'})).toBeVisible({timeout:20_000})
    const roles=await Promise.all(pages.map(page=>page.locator('.ghost strong').first().textContent()))
    const ghost=roles.indexOf('诡异')
    expect(ghost).toBeGreaterThanOrEqual(0)
    expect(roles.filter(value=>value==='诡异')).toHaveLength(1)
    const target=correct?ghost:(ghost+1)%3
    const history=a.getByRole('list',{name:'公聊记录'})
    await history.evaluate(el=>{el.scrollTop=0})
    const cast=(i:number)=>button(pages[i],'指认 '+names[i===target?(i+1)%3:target]).click()
    await cast(2)
    await button(c,'返回大厅').click()
    await button(c,'确认返回').click()
    await expect(button(c,'继续对局')).toBeVisible()
    await Promise.all([cast(0),cast(1)])
    await expect(button(c,'继续对局')).toHaveCount(0,{timeout:20_000})
    await c.goto(invite.href)
    for (const [i,page] of pages.entries()) {
      const won=correct?i!==ghost:i===ghost
      const result=page.getByRole('dialog',{name:(won?'胜利':'失败')+' · '+(correct?'人类':'诡异')+(won?'阵营':'阵营获胜')})
      await expect(result).toBeVisible({timeout:20_000})
      await expect(result.getByRole('button',{name:'关闭结果'})).toBeFocused()
      if(i<2) await page.screenshot({path:'work/logs/ghost-result-'+correct+'-'+i+'.png',fullPage:true})
      await page.keyboard.press('Escape')
      await expect(result).toBeHidden()
      await expect(page.locator('header.bar')).toHaveCount(0)
      await expect(button(page,'复制邀请链接')).toHaveCount(0)
    }
    const archived=await (await a.request.get('/api/history')).json()
    expect(archived.matches).toHaveLength(1)
    expect(archived.matches[0].game_id).toBe('ghost-candle')
    expect(archived.matches[0].result.details.winner).toBe(correct?'HUMAN':'GHOST')
    expect(archived.matches[0].players).toHaveLength(3)
    expect(await history.evaluate(el=>el.scrollTop)).toBe(0)
    await expect(history.locator('li')).toHaveCount(8)
    await c.reload()
    await expect(c.getByRole('heading',{name:correct?'人类胜利':'诡异胜利'})).toBeVisible()
    await expect(c.locator('.game-result[open]')).toHaveCount(0)
    if(!correct) {
      await button(c,'退出房间').click()
      await expect(c.locator('header.bar')).toBeVisible()
      return
    }
    await expect(a.getByText(/在线 · 未准备/)).toHaveCount(3)
    await button(a,'开始新一局').click()
    await expect(a.getByRole('alert')).toHaveText('请等待所有玩家在线并准备')
    await all('准备')
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(3)
    await button(a,'开始新一局').click()
    await expect(c.getByRole('heading',{name:'夜晚',exact:true})).toBeVisible()
    await expect(c.locator('.candles .intact')).toHaveCount(9)
    await expect(a.getByRole('list',{name:'公聊记录',includeHidden:true}).locator('li')).toHaveCount(0)
    expect(await b.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  } finally {
    await Promise.all(contexts.map(context=>context.close()))
  }
})
