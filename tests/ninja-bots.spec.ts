import {expect,test} from '@playwright/test'
import {fillNinjaRoom,type BotMode} from '../scripts/ninja-bots.ts'

const origin='http://127.0.0.1:3214'
const setups:[number,BotMode][]=[[4,'random'],[11,'simple']]
test.describe.configure({mode:'parallel'})

for(const [count,mode] of setups) {
  test('one browser and '+(count-1)+' '+mode+' bots finish a ninja tournament',async({page})=>{
    test.setTimeout(240_000)
    await page.goto(origin)
    await page.getByRole('textbox',{name:'昵称'}).fill('真人试玩')
    const button=(name:string)=>page.getByRole('button',{name,exact:true})
    await button('保存资料').click()
    const game=page.locator('.game-card').filter({has:page.getByRole('heading',{name:'忍者之夜',exact:true})})
    await game.getByRole('button',{name:'创建房间'}).click()
    await expect(page.locator('.members li')).toHaveCount(1)
    await page.getByLabel('正式玩家数').selectOption(String(count))
    await expect(page.getByLabel('正式玩家数')).toHaveValue(String(count))
    const room=new URL(page.url()).searchParams.get('room')!
    let seed=42+count
    const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
    const setup={origin,room,cookieName:'games_ninja_browser',mode,random:rng}
    if(count===4) {
      const waiting=await fillNinjaRoom(setup)
      await expect(page.getByText(/在线 · 已准备/)).toHaveCount(3)
      await expect(fillNinjaRoom(setup)).rejects.toThrow('等待房间的游戏、对局或人数已变化')
      await waiting.stop()
      await expect(page.locator('.members li')).toHaveCount(1)
    }
    const bots=await fillNinjaRoom(setup)
    try {
      expect(bots.count).toBe(count-1)
      await expect(page.getByText(/在线 · 已准备/)).toHaveCount(count-1)
      await button('肖像 1').click()
      await button('准备').click()
      await expect(page.getByText(/在线 · 已准备/)).toHaveCount(count)
      await button('开始游戏').click()
      await expect(page.locator('.nn-seat')).toHaveCount(count)
      await expect(page.locator('.nn-seat').filter({hasText:'练习机器人'})).toHaveCount(count-1)
      const actions=page.locator('.nn-options button[aria-pressed]')
      let submitted=''
      let humanActions=0
      while(true) {
        const ready=await page.waitForFunction(last=>{
          const game=document.querySelector('.nn-game')
          const phase=game?.getAttribute('data-phase-token')
          if(game?.querySelector('.nn-champion')) return 'finished'
          if(phase && phase!==last && game?.querySelector('.nn-options button[aria-pressed]')) return phase
          return false
        },submitted,{timeout:55_000})
        const phase=await ready.jsonValue()
        if(phase==='finished') break
        if(typeof phase!=='string') throw new Error('未取得当前行动阶段')
        await actions.first().click()
        await button('确认提交').click()
        submitted=phase
        humanActions++
      }
      expect(humanActions).toBeGreaterThan(5)
      await expect(page.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
      const scores=await page.locator('.nn-champion > p').allTextContents()
      expect(scores).toHaveLength(count)
      expect(Math.max(...scores.map(score=>Number(score.match(/(\d+) 分/)?.[1])))).toBeGreaterThanOrEqual(10)
      await page.screenshot({path:'work/logs/ninja-bots-'+count+'.png',fullPage:true})
    } finally {
      await bots.stop()
    }
    await expect(page.getByRole('heading',{name:/冠军 ·/})).toBeVisible()
    await expect(page.locator('.nn-seat').filter({hasText:/练习机器人.*离线/s})).toHaveCount(count-1)
  })
}
