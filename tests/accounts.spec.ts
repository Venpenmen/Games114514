import {expect,test} from '@playwright/test'
import {loginPlayer,registerPlayer} from './account-fixtures.ts'

test('real browsers transfer a seat between devices and manage the account',async({browser,baseURL})=>{
  const contexts=await Promise.all(Array.from({length:4},(_,i)=>browser.newContext({
    baseURL,viewport:i===3?{width:390,height:844}:{width:1280,height:850},
  })))
  try {
    const [first,b,c,second]=await Promise.all(contexts.map(context=>context.newPage()))
    await first.goto('/')
    await expect(first.getByRole('heading',{name:'登录'})).toBeVisible()
    await expect(first.getByRole('heading',{name:'游戏大厅'})).toHaveCount(0)
    const username=await registerPlayer(first,'双设备玩家')
    await first.locator('.game-card').filter({has:first.getByRole('heading',{name:'诡吹灯',exact:true})})
      .getByRole('button',{name:'创建房间'}).click()
    await expect(first.getByRole('heading',{name:/诡吹灯 · \d{6}/})).toBeVisible()
    const invite=first.url()
    await Promise.all([b,c].map(async(page,i)=>{
      await page.goto(invite)
      await registerPlayer(page,'同桌玩家'+i)
      await expect(page.getByRole('button',{name:'准备',exact:true})).toBeVisible()
    }))
    await Promise.all([first,b,c].map(page=>page.getByRole('button',{name:'准备',exact:true}).click()))
    await first.getByRole('button',{name:'开始游戏'}).click()
    const role=first.locator('.role-label strong')
    await expect(role).toBeVisible()
    const secret=await role.textContent()
    await second.goto('/')
    await loginPlayer(second,username)
    await expect(second.locator('.role-label')).toHaveCount(0)
    await second.getByRole('button',{name:'切换到当前设备操作'}).click()
    await expect(second.locator('.role-label strong')).toHaveText(secret!)
    await expect(first.getByRole('heading',{name:'游戏大厅'})).toBeVisible()
    await expect(first.getByRole('alert')).toHaveText('对局已切换到其他设备')
    await expect(first.locator('.role-label')).toHaveCount(0)
    await first.getByRole('button',{name:/双设备玩家/}).click()
    await expect(first.getByRole('heading',{name:'个人中心'})).toBeVisible()
    await expect(first.getByRole('heading',{name:'历史对局'})).toBeVisible()
    await first.getByRole('textbox',{name:'昵称'}).fill('改名玩家')
    await first.getByRole('combobox',{name:'账户头像'}).selectOption({index:5})
    await first.getByRole('button',{name:'保存资料'}).click()
    await expect(first.getByRole('status')).toHaveText('资料已保存')
    await first.getByRole('button',{name:'退出所有其他设备'}).click()
    await expect(second.getByRole('heading',{name:'登录'})).toBeVisible()
    await expect(second.locator('.role-label')).toHaveCount(0)
    await expect(first.getByText(/当前设备/).first()).toBeVisible()
  } finally {
    await Promise.all(contexts.map(context=>context.close()))
  }
})
