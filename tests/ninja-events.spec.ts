import {expect,test,type Page} from '@playwright/test'

test('real exchange and mirror reaction gate their corresponding animations',async({browser})=>{
  const baseURL='http://127.0.0.1:3215'
  const contexts=await Promise.all(Array.from({length:4},()=>browser.newContext({baseURL})))
  try{
    const pages=await Promise.all(contexts.map(context=>context.newPage()))
    const [a,b,c,d]=pages
    const btn=(page:Page,name:string)=>page.getByRole('button',{name,exact:true})
    const stage=(page:Page)=>page.locator('.nn-header > div:first-child > h2')
    async function login(page:Page,name:string,url=baseURL){
      await page.goto(url)
      await page.getByRole('textbox',{name:'昵称'}).fill(name)
      await btn(page,'保存资料').click()
    }
    async function select(page:Page,choice?:string){
      const controls=page.locator('.nn-options')
      await (choice?controls.getByRole('button',{name:choice,exact:true}):controls.locator('button[aria-pressed]').first()).click()
      await btn(page,'确认提交').click()
    }
    await login(a,'甲')
    await a.getByRole('heading',{name:'忍者之夜',exact:true}).locator('..').getByRole('button',{name:'创建房间'}).click()
    await expect(a.locator('.members li')).toHaveCount(1)
    const link=a.url()
    for(const [i,page] of [b,c,d].entries()){
      await login(page,['乙','丙','丁'][i],link)
      await expect(a.locator('.members li')).toHaveCount(i+2)
    }
    await Promise.all(pages.map(async(page,i)=>{await btn(page,'肖像 '+(i+1)).click();await btn(page,'准备').click()}))
    await expect(a.getByText(/在线 · 已准备/)).toHaveCount(4)
    await btn(a,'开始游戏').click()
    await expect(stage(a)).toHaveText('第一步轮抽')
    await Promise.all([select(a,'保留 变形者 1'),select(b,'保留 盲眼刺客 4'),select(c,'保留 镜僧 1'),select(d)])
    await expect(stage(a)).toHaveText('第二步轮抽')
    await Promise.all(pages.map(page=>select(page)))
    for(const title of ['密探','隐士']){
      await expect(a.locator('.nn-header [data-phase]')).toContainText(title)
      await Promise.all(pages.map(page=>select(page,'跳过')))
    }
    await expect(a.locator('.nn-header [data-phase]')).toContainText('骗徒')
    await Promise.all([select(a,'打出 变形者 1'),...[b,c,d].map(page=>select(page,'跳过'))])
    await select(a,'乙')
    await select(a,'丙')
    await expect(b.locator('.nn-event[data-event=swap]')).toHaveCount(0)
    await select(a,'交换')
    await expect(b.locator('.nn-event[data-event=swap]')).toContainText('乙、丙')
    await expect(b.locator('.nn-event[data-event=swap]')).not.toContainText(/鹤派|莲派/)
    await expect(b.locator('.nn-paths[data-kind=swap] span')).toHaveCount(2)
    await expect(c.getByText(/身份可能变化/).first()).toBeVisible()
    await expect(a.locator('.nn-header [data-phase]')).toContainText('盲眼刺客')
    await Promise.all([select(b,'打出 盲眼刺客 4'),...[a,c,d].map(page=>select(page,'跳过'))])
    await select(b,'丙')
    await expect(stage(c)).toHaveText('刺杀反应')
    await expect(c.locator('.nn-seat.nn-dead')).toHaveCount(0)
    await expect(c.locator('.nn-event[data-event=attack]')).toBeVisible()
    await expect(c.locator('.nn-event[data-event=death]')).toHaveCount(0)
    await select(c,'发动 镜僧 1')
    await expect(a.locator('.nn-seat.nn-dead')).toContainText('乙')
    await expect(a.locator('.nn-event[data-event=mirror]')).toBeVisible()
    await expect(a.locator('.nn-event[data-event=death]')).toContainText('乙')
    await a.reload()
    await expect(a.locator('.nn-seat.nn-dead')).toContainText('乙')
    await expect(a.locator('.nn-event')).toHaveCount(0)
  }finally{await Promise.all(contexts.map(context=>context.close()))}
})
