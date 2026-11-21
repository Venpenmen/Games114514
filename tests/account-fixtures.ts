import {randomUUID} from 'node:crypto'
import {expect,type Page} from '@playwright/test'

export async function registerPlayer(page:Page,name:string,username='u_'+randomUUID().replaceAll('-','').slice(0,17)) {
  await page.getByRole('button',{name:'创建账户',exact:true}).click()
  await page.getByRole('textbox',{name:'用户名'}).fill(username)
  await page.getByLabel('密码',{exact:true}).fill('browser test phrase')
  await page.getByRole('textbox',{name:'昵称'}).fill(name)
  await page.getByRole('button',{name:'注册并登录',exact:true}).click()
  return username
}

export async function loginPlayer(page:Page,username:string) {
  await page.getByRole('textbox',{name:'用户名'}).fill(username)
  await page.getByLabel('密码',{exact:true}).fill('browser test phrase')
  await page.getByRole('button',{name:'登录',exact:true}).click()
  await expect(page.getByRole('heading',{name:'游戏大厅'})).toBeVisible()
}
