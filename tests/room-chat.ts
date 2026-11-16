import { expect, type Page } from '@playwright/test'

export async function checkRoomChat(pages: [Page, Page, Page], senderName: string, delayOwn?: {release: () => void; held: () => boolean}) {
  const [reader, sender, other] = pages
  const list = reader.getByRole('list',{name:'公聊记录'})
  const messages = list.locator('li')
  const unread = reader.getByRole('button',{name:/下方有/})
  const input = (page: Page) => page.getByRole('textbox',{name:'聊天消息'})
  async function send(page: Page, message: string) {
    await input(page).fill(message)
    await page.getByRole('button',{name:'发送',exact:true}).click()
    await expect(input(page)).toHaveValue('')
  }
  const distance = () => list.evaluate(el=>el.scrollHeight-el.clientHeight-el.scrollTop)
  const top = () => list.evaluate(el=>el.scrollTop)
  const toTop = () => list.evaluate(el=>{el.scrollTop=0})
  const longText = '<b>仅作为文本</b>『'+ '无空格连写文字'.repeat(24)+'』'
  for(let i=0;i<4;i++) {
    if(i>=2) await reader.waitForTimeout(1050) // Existing per-sender server cooldown.
    await send(i%2 ? other : sender,'历史 '+i+' '+longText)
  }
  await expect(messages).toHaveCount(4)
  await expect.poll(distance).toBeLessThanOrEqual(1)
  await expect(messages.first()).toHaveText('【'+senderName+'】历史 0 '+longText)
  await expect(messages.first().locator('strong')).toHaveText(senderName)
  await expect(messages.first().locator('strong')).toHaveCSS('font-weight','700')
  await expect(messages.first().locator('span')).toHaveCSS('font-weight','400')
  await expect(list).toHaveCSS('list-style-type','none')
  await expect(messages.first().locator('b')).toHaveCount(0)
  expect(await list.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
  await toTop()
  await reader.waitForTimeout(1050)
  await send(sender,'提醒一')
  await send(other,'提醒二')
  await expect(unread).toHaveText('↓ 下方有 2 条新消息')
  expect(await top()).toBe(0)

  // Profile refresh causes a full room snapshot with identical chat contents.
  const profile=await other.request.get('/api/me')
  const {name,avatar}=await profile.json()
  expect((await other.request.put('/api/profile',{headers:{Origin:new URL(other.url()).origin},data:{name,avatar}})).ok()).toBe(true)
  await expect(unread).toHaveText('↓ 下方有 2 条新消息')
  expect(await top()).toBe(0)
  await unread.click()
  await expect(unread).toHaveCount(0)
  await expect.poll(distance).toBeLessThanOrEqual(1)

  await toTop()
  await reader.waitForTimeout(1050)
  await send(sender,'提醒三')
  await expect(unread).toHaveText('↓ 下方有 1 条新消息')
  await list.evaluate(el=>{el.scrollTop=el.scrollHeight})
  await expect(unread).toHaveCount(0)

  await toTop()
  await send(reader,'本人成功消息')
  if(delayOwn) {
    await expect.poll(delayOwn.held).toBe(true)
    await expect.poll(distance).toBeLessThanOrEqual(1)
    await toTop()
    delayOwn.release()
  }
  await expect(messages.last()).toContainText('本人成功消息')
  await expect.poll(distance).toBeLessThanOrEqual(1)
  await toTop()
  await input(reader).fill('发送太快时保留这份草稿')
  await reader.getByRole('button',{name:'发送',exact:true}).click()
  await expect(reader.getByRole('alert')).toHaveText('发言太快')
  await expect(input(reader)).toHaveValue('发送太快时保留这份草稿')
  expect(await top()).toBe(0)

  await reader.reload()
  await expect(messages).toHaveCount(8)
  await expect.poll(distance).toBeLessThanOrEqual(1)
  await expect(unread).toHaveCount(0)
}
