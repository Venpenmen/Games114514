import { expect,test,type Page } from '@playwright/test'

test('three isolated guests complete and restart a real online match', async ({browser,baseURL}) => {
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
      await page.getByRole('textbox',{name:'昵称'}).fill(name)
      await button(page,'保存资料').click()
      await expect(page.getByRole('button',{name:new RegExp(name)})).toBeVisible()
    }
    await login(a,names[0])
    await button(a,'创建房间').click()
    await expect(a.getByRole('heading',{name:/诡吹灯 · \d{6}/})).toBeVisible()
    const invite=new URL(a.url())
    const code=invite.searchParams.get('room')!
    await login(b,names[1],invite.pathname+invite.search)
    await login(c,names[2])
    await c.getByRole('textbox',{name:'房间码'}).fill(code)
    await button(c,'加入房间').click()
    for (const page of pages) await expect(page.locator('.members li')).toHaveCount(3)
    await a.getByLabel('夜晚时长（秒）').selectOption('30')
    await Promise.all(pages.map(page=>button(page,'准备').click()))
    await expect(a.getByText('在线 · 已准备',{exact:false})).toHaveCount(3)
    await button(a,'开始游戏').click()
    await Promise.all(pages.map(page=>expect(page.getByRole('heading',{name:'夜晚',exact:true})).toBeVisible()))
    const initialUrl=a.url()
    const role=await a.locator('.ghost strong').first().textContent()
    await a.reload()
    await expect(a).toHaveURL(initialUrl)
    await expect(a.locator('.ghost strong').first()).toHaveText(role!)
    await expect(b.getByRole('heading',{name:'白天讨论'})).toBeVisible({timeout:36_000})
    await expect(c.getByText(/最近一夜/)).toBeVisible()
    await b.getByRole('textbox',{name:'聊天消息'}).fill('三人联机验收')
    await button(b,'发送').click()
    await expect(a.getByText('三人联机验收',{exact:false})).toBeVisible()
    async function all(name:string) {
      await Promise.all(pages.map(page=>button(page,name).click()))
    }
    for (let n=2;n<=3;n++) {
      await all('结束讨论')
      await expect(a.getByRole('heading',{name:'夜晚',exact:true})).toBeVisible()
      const label=await a.locator('.candles .intact').first().innerText()
      const target=label.match(/\d+/)![0]
      await Promise.all(pages.map(async page=>{
        await page.getByRole('button',{name:target+' · 完好',exact:true}).click()
        await button(page,'确认行动').click()
      }))
      await expect(a.getByRole('heading',{name:'白天讨论'})).toBeVisible()
    }
    await all('结束讨论')
    await all('寻找诡异')
    for (let i=0;i<3;i++) await button(pages[i],'指认 '+names[(i+1)%3]).click()
    await expect(a.getByRole('heading',{name:'第 4 天 · 第 1 轮票型'})).toBeVisible()
    await expect(b.getByRole('heading',{name:'重新指认'})).toBeVisible({timeout:8_000})
    const roles=await Promise.all(pages.map(page=>page.locator('.ghost strong').first().textContent()))
    const ghost=roles.indexOf('诡异')
    expect(ghost).toBeGreaterThanOrEqual(0)
    expect(roles.filter(value=>value==='诡异')).toHaveLength(1)
    await Promise.all(pages.map((page,i)=>button(page,'指认 '+names[i===ghost?(i+1)%3:ghost]).click()))
    await expect(c.getByRole('heading',{name:'人类胜利'})).toBeVisible({timeout:8_000})
    await expect(a.getByText(/在线 · 未准备/)).toHaveCount(3)
    await button(a,'开始新一局').click()
    await expect(a.getByRole('alert')).toHaveText('请等待所有玩家在线并准备')
    await all('准备')
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(3)
    await button(a,'开始新一局').click()
    await expect(c.getByRole('heading',{name:'夜晚',exact:true})).toBeVisible()
    await expect(c.locator('.candles .intact')).toHaveCount(9)
    expect(await b.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  } finally {
    await Promise.all(contexts.map(context=>context.close()))
  }
})
