import {expect,type Page} from '@playwright/test'
import {openChat,closeChat} from './room-chat.ts'

export async function checkGameLayout(page:Page, game:string, board:string, action:string) {
  const dimensions = [[320,700],[360,780],[375,812],[390,844],[430,932],[740,390],[768,1024],[1280,720],[1366,768],[1920,1080]]
  const original=page.viewportSize()!
  for (const [width,height] of dimensions) {
    await page.setViewportSize({width,height})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await expect(page.locator(board)).toBeVisible()
    const key=page.getByRole('button',{name:action,exact:true})
    await expect(key).toBeVisible()
    expect((await key.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    if (width===390 || width===1280) {
      await page.evaluate(()=>window.scrollTo(0,0))
      expect((await key.boundingBox())!.y+(await key.boundingBox())!.height).toBeLessThan(height)
      await page.screenshot({path:'work/logs/p16-'+game+'-'+width+'.png'})
    }
  }
  await page.setViewportSize({width:1280,height:720})
  for(const zoom of ['1.25','1.5']) {
    await page.evaluate(value=>{document.documentElement.style.zoom=value},zoom)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true)
    await expect(page.getByRole('button',{name:action,exact:true})).toBeVisible()
  }
  await page.evaluate(()=>{document.documentElement.style.zoom=''})
  await page.setViewportSize({width:390,height:844})
  await openChat(page)
  const input=page.getByRole('textbox',{name:'聊天消息'})
  if(await input.isVisible()) {
    await input.fill('保留的草稿')
    await closeChat(page)
    await openChat(page)
    await expect(input).toHaveValue('保留的草稿')
    await input.fill('')
    await page.setViewportSize({width:390,height:420})
    await input.focus()
    const area=(await input.boundingBox())!
    expect(area.y+area.height).toBeLessThanOrEqual(420)
    await page.setViewportSize({width:390,height:844})
  }
  await page.screenshot({path:'work/logs/p16-'+game+'-chat.png'})
  await closeChat(page)
  await page.getByRole('button',{name:'历史记录',exact:true}).click()
  const history=page.getByRole('dialog',{name:'历史记录'})
  await expect(history).toBeVisible()
  await page.screenshot({path:'work/logs/p16-'+game+'-history.png'})
  await page.keyboard.press('Escape')
  await expect(history).toBeHidden()
  await page.setViewportSize(original)
}
