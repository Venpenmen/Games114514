import {test,expect} from '@playwright/test'
import {registerPlayer} from './account-fixtures.ts'
for(const [game,count] of [['诡吹灯',3],['骰子狼人杀',3],['忍者之夜',4]] as const) {
  test(`${game} shared navigation, synchronized speed, guide, preferences and resume`,async({browser})=>{
    const contexts=await Promise.all(Array.from({length:count},(_,i)=>browser.newContext({baseURL:'http://127.0.0.1:3197',viewport:i===1?{width:390,height:844}:{width:1366,height:768}})))
    try {
      const pages=await Promise.all(contexts.map(c=>c.newPage()))
      const a=pages[0]
      await a.goto('/');await registerPlayer(a,'教学甲')
      await a.locator('.game-card').filter({has:a.getByRole('heading',{name:game,exact:true})}).getByRole('button',{name:'创建房间'}).click()
      await expect(a.locator('.members li')).toHaveCount(1)
      const url=a.url()
      await Promise.all(pages.slice(1).map(async(p,i)=>{await p.goto(url);await registerPlayer(p,'教学'+i)}))
      await expect(a.locator('.members li')).toHaveCount(count)
      const speed=a.getByLabel(/演出速度/)
      await expect(speed).toHaveValue('1.35')
      await speed.selectOption('0.8')
      await expect(pages[1].getByLabel(/演出速度/)).toHaveCount(0)
      if(game!=='诡吹灯') await Promise.all(pages.map((p,i)=>game==='忍者之夜'?p.getByRole('button',{name:'肖像 '+(i+1),exact:true}).click():p.locator('.dw-portraits button').nth(i).click()))
      await Promise.all(pages.map(p=>p.getByRole('button',{name:'准备',exact:true}).click()))
      await a.getByRole('button',{name:'开始游戏',exact:true}).click()
      for(const p of pages) {
        await expect(p.getByRole('navigation',{name:'对局导航'})).toBeVisible()
        await expect(p.getByRole('button',{name:'UI 操作指南'})).toBeVisible()
      }
      await expect(speed).toHaveCount(0)
      if(game==='忍者之夜') {
        const readonly=await contexts[0].newPage()
        await readonly.goto(url)
        await expect(readonly.getByText('本标签页正在只读查看',{exact:true})).toBeVisible()
        await expect(readonly.getByRole('button',{name:'返回大厅',exact:true})).toHaveCount(1)
        await readonly.getByRole('button',{name:'UI 操作指南'}).click()
        await expect(readonly.getByRole('dialog',{name:'UI 操作指南'})).toBeVisible()
        await readonly.keyboard.press('Escape');await readonly.close()
      }
      if(process.env.UX_CAPTURE_GUIDES && game==='诡吹灯')await a.locator('.candles').screenshot({path:'apps/web/components/guides/ghost-board.png'})
      if(process.env.UX_CAPTURE_GUIDES && game==='骰子狼人杀')await a.locator('.dw-table').screenshot({path:'apps/web/components/guides/dice-table.png'})
      await a.getByRole('button',{name:'UI 操作指南'}).click()
      const guide=a.getByRole('dialog',{name:'UI 操作指南'})
      await expect(guide).toBeVisible()
      if(game==='忍者之夜')await expect(guide.locator('.nn-card-face')).toHaveCount(3)
      else if(game==='骰子狼人杀')await expect(guide.locator('.dw-die')).toHaveCount(2)
      else await expect(guide.locator('.guide-candles button')).toHaveCount(9)
      await a.screenshot({path:`work/logs/ux-${game==='忍者之夜'?'ninja':game==='诡吹灯'?'ghost':'dice'}-guide.png`})
      await a.keyboard.press('Escape')
      await a.getByRole('button',{name:'设置',exact:true}).click()
      await a.getByLabel('个人演出偏好').selectOption('reduced')
      await a.keyboard.press('Escape')
      await a.getByRole('button',{name:'返回大厅',exact:true}).click()
      await expect(a.getByRole('dialog',{name:'返回游戏大厅？'})).toBeVisible()
      await a.getByRole('button',{name:'继续游戏',exact:true}).click()
      await a.getByRole('button',{name:'返回大厅',exact:true}).click()
      await a.getByRole('button',{name:'确认返回',exact:true}).click()
      await expect(a.getByRole('heading',{name:'游戏大厅',exact:true})).toBeVisible()
      await a.getByRole('button',{name:'继续对局',exact:true}).click()
      await expect(a.getByRole('navigation',{name:'对局导航'})).toBeVisible()
      await a.reload()
      await expect(a.getByRole('navigation',{name:'对局导航'})).toBeVisible()
      await a.getByRole('button',{name:'设置',exact:true}).click()
      await expect(a.getByLabel('个人演出偏好')).toHaveValue('reduced')
      await a.keyboard.press('Escape')
      await expect.poll(()=>a.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0)
      if(game==='骰子狼人杀') {
        const ownFace=(await a.getByTestId('own-identity').innerText()).match(/[1-6]/)![0]
        for(let face=1;face<=6;face++) {
          await expect(a.getByRole('button',{name:'增加 +1',exact:true})).toBeVisible({timeout:6000})
          await expect(a.getByRole('heading',{name:'当前点数 '+face,exact:true})).toBeVisible()
          await Promise.all(pages.map(p=>p.getByRole('button',{name:'增加 +1',exact:true}).click()))
          await expect(a.locator('.dw-banner')).toContainText('公开演出')
          await expect(a.getByRole('button',{name:'增加 +1',exact:true})).toHaveCount(0)
        }
        await expect(a.getByRole('button',{name:'投 '+ownFace+' 点',exact:true})).toBeVisible({timeout:6000})
        await Promise.all(pages.map(p=>p.getByRole('button',{name:'投 '+ownFace+' 点',exact:true}).click()))
        await expect(a.locator('.dw-banner')).toContainText('公开演出')
        await expect(a.locator('.game-result[open]')).toHaveCount(0)
        await expect(a.locator('.game-result[open]')).toBeVisible({timeout:6000})
        await expect(a.locator('.dw-banner')).toContainText('第 2 局',{timeout:10000})
        await expect(a.locator('.game-result[open]')).toHaveCount(0)
      }
      if(game==='诡吹灯') {
        await Promise.all(pages.map(async p=>{await p.locator('.candles .intact').first().click();await p.getByRole('button',{name:'确认行动',exact:true}).click()}))
        await expect(a.locator('.ghost')).toHaveAttribute('data-stage','PRESENTATION')
        await expect(a.getByRole('button',{name:'结束讨论',exact:true})).toHaveCount(0)
        await a.reload()
        await expect(a.locator('.ghost')).toHaveAttribute('data-stage','DAY_DISCUSSION',{timeout:6000})
        await expect(a.getByRole('button',{name:'结束讨论',exact:true})).toBeVisible()
      }
    } finally {await Promise.all(contexts.map(c=>c.close()))}
  })
}
