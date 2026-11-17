import {createInterface} from 'node:readline/promises'
import {stdin,stdout} from 'node:process'
import {resolve} from 'node:path'
import {requestLocalAdmin} from '../apps/server/local-admin.ts'

const config={scope:'ninja-p20',directory:resolve('work/logs/ninja-p20')}
const input=createInterface({input:stdin,output:stdout})
const ask=async prompt=>(await input.question(prompt)).trim()
const query=async()=>await requestLocalAdmin(config,{action:'list'})
async function show(){
  const rooms=await query()
  console.log('\n=== 3216 本地测试房间 / 比赛 ===')
  if(!rooms.length)console.log('当前没有房间')
  for(const room of rooms){
    const state=room.active?'进行中':room.matchId?'已结束':'等待中'
    console.log(room.code+'  '+room.game+'  '+state+'  '+room.online+'/'+room.players+' 在线'
      +'  '+(room.round===null?'':'第'+room.round+'轮 ') +(room.mode??'')
      +(room.paused?' [暂停]':''))
  }
  return rooms
}
async function main(){
  console.log('Games114514 · 本地对局管理器 (3216)')
  console.log('退出此脚本不会影响游戏服务；仅管理指令会改变指定房间。')
  while(true) {
    let rooms
    try{rooms=await show()}catch(error){
      console.error('无法连接本机管理通道：'+String(error.message??error))
      console.log('请确认 3216 服务已更新并启动。')
      break
    }
    const choice=(await ask('\n[R]刷新 [W]每5秒监控 [S]终止本场 [D]解散房间 [0]退出 > ')).toLowerCase()
    if(choice==='0')break
    if(choice==='w'){
      console.log('每5秒刷新，按 Enter 返回菜单。')
      const timer=setInterval(()=>{void show().catch(error=>console.error(String(error)))},5000)
      try{await ask('')}finally{clearInterval(timer)}
      continue
    }
    if(choice==='r')continue
    if(choice!=='s'&&choice!=='d')continue
    const code=await ask('输入要操作的六位房间号：')
    const room=rooms.find(item=>item.code===code)
    if(!room){console.log('房间不存在，请刷新状态后重试。');continue}
    if(choice==='s'&&!room.matchId){console.log('该房间没有比赛。');continue}
    const action=choice==='s'?'stop':'dissolve'
    const word=choice==='s'?'STOP':'DELETE'
    const desc=choice==='s'?'终止比赛，保留房间与席位':'永久解散该房间，释放全部席位'
    console.log('目标：'+room.code+' / '+room.game+' / '+room.players+'人 / '+(room.matchId??'无比赛'))
    console.log('即将：'+desc)
    if(await ask('确认请完整输入 '+word+' '+code+' ：')!==word+' '+code){
      console.log('已取消。');continue
    }
    try{
      const result=await requestLocalAdmin(config,{action,code:room.code,matchId:room.matchId})
      console.log('已完成：'+result.action+' '+result.code)
    }catch(error){console.error('操作未执行：'+String(error.message??error))}
  }
}
try{if(process.argv.includes('--list')) await show();else await main()}finally{input.close()}
