<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { avatars, type Profile } from '../../../packages/protocol/index.ts'
import PlayerAvatar from './PlayerAvatar.vue'

type Device={session_id:string;device_label:string;last_seen_at:number}
type Account={profile:Profile;account:{username:string;status:string;created_at:number;last_login_at:number};devices:Device[];currentDevice:string}
type Player={player_id:string;nickname_snapshot:string;score:number|null;rank:number|null;outcome:'win'|'loss'}
type History={more:boolean;totals:{game_id:string;played:number;won:number;best_score:number|null}[];
  matches:{match_id:string;game_id:string;started_at:number|null;finished_at:number;players:Player[];
    result:{winners:string[];details?:{winner?:string;roles?:Record<string,string>}}}[]}
const props=defineProps<{api:<T>(path:string,method?:string,body?:unknown)=>Promise<T>; games:{id:string;name:string}[]}>()
const emit=defineEmits<{close:[];profile:[Profile];logout:[]}>()
const account=ref<Account>(), history=ref<History>(), offset=ref(0)
const name=ref(''), avatar=ref(0), password=ref(''), next=ref('')
const error=ref(''), notice=ref(''), busy=ref(false)
const date=(value:number)=>new Date(value).toLocaleString()
const role=(value?:string)=>value==='HUMAN'?'人类':value==='GHOST'?'诡异':''
const gameName=(id:string)=>props.games.find(game=>game.id===id)?.name??id
async function loadAccount() {account.value=await props.api<Account>('account')}
async function loadHistory(page=0) {
  history.value=await props.api<History>('history?offset='+page)
  offset.value=page
}
async function act(action:()=>Promise<void>) {
  if(busy.value) return
  busy.value=true; error.value=''; notice.value=''
  try {await action()} catch(err) {error.value=(err as Error).message} finally {busy.value=false}
}
onMounted(()=>act(async()=>{
  await Promise.all([loadAccount(),loadHistory()])
  name.value=account.value!.profile.name
  avatar.value=account.value!.profile.avatar
}))
function copyId() {
  return act(async()=>{await navigator.clipboard.writeText(account.value!.profile.id);notice.value='已复制玩家 ID'})
}
async function save() {
  await act(async()=>{
    const profile=await props.api<Profile>('profile','PUT',{name:name.value,avatar:avatar.value})
    if(account.value) account.value.profile=profile
    emit('profile',profile)
    notice.value='资料已保存'
  })
}
async function revoke(id:string) {
  await act(async()=>{
    await props.api('auth/revoke','POST',{id})
    await loadAccount()
    notice.value='设备会话已撤销'
  })
}
async function changePassword() {
  await act(async()=>{
    await props.api('auth/password','POST',{password:password.value,next:next.value})
    password.value=next.value=''
    await loadAccount()
    notice.value='密码已更新，其他设备已退出'
  })
}
</script>

<template>
  <section class="panel stack account-center">
    <div class="actions"><h1>个人中心</h1><button type="button" @click="emit('close')">返回</button></div>
    <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <template v-if="account">
      <section class="stack">
        <h2>个人资料</h2>
        <p><PlayerAvatar :name="account.profile.name" :glyph="avatars[account.profile.avatar]" online/> {{ account.profile.name }} · {{ account.account.username }}</p>
        <p>注册于 {{ date(account.account.created_at) }} · {{ account.account.status==='active'?'正常':account.account.status }}</p>
        <label>玩家 ID <input :value="account.profile.id" readonly></label>
        <button type="button" @click="copyId">复制玩家 ID</button>
        <form class="stack" @submit.prevent="save">
          <label>昵称 <input v-model="name" required maxlength="40"></label>
          <label>账户头像 <select v-model="avatar"><option v-for="(icon,i) in avatars" :key="icon" :value="i">{{ icon }}</option></select></label>
          <button :disabled="busy">保存资料</button>
        </form>
      </section>
      <section class="stack">
        <h2>账户安全</h2>
        <p>最近登录 {{ date(account.account.last_login_at) }}</p>
        <ul><li v-for="device in account.devices" :key="device.session_id" class="actions">
          <span>{{ device.device_label }} · {{ date(device.last_seen_at) }}{{ device.session_id===account.currentDevice?' · 当前设备':'' }}</span>
          <button v-if="device.session_id!==account.currentDevice" :disabled="busy" @click="revoke(device.session_id)">撤销设备</button>
        </li></ul>
        <div class="actions">
          <button :disabled="busy || account.devices.length<2" @click="revoke('others')">退出所有其他设备</button>
          <button :disabled="busy" @click="act(async()=>{await api('auth/logout','POST');emit('logout')})">退出当前设备</button>
        </div>
        <form class="stack" @submit.prevent="changePassword">
          <label>当前密码 <input v-model="password" type="password" autocomplete="current-password" required></label>
          <label>新密码 <input v-model="next" type="password" autocomplete="new-password" minlength="10" required></label>
          <button :disabled="busy">修改密码</button>
        </form>
      </section>
      <section v-if="history" class="stack">
        <h2>游戏战绩</h2>
        <p v-for="game in games" :key="game.id">
          {{ game.name }} · {{ history.totals.find(item=>item.game_id===game.id)?.played??0 }} 场
          · {{ history.totals.find(item=>item.game_id===game.id)?.won??0 }} 胜
          <template v-for="item in history.totals.filter(item=>item.game_id===game.id)" :key="item.game_id">
            · 胜率 {{ Math.round(item.won/item.played*100) }}%<template v-if="item.best_score!==null"> · 最高 {{ item.best_score }} 分</template>
          </template>
        </p>
        <h2>历史对局</h2>
        <p v-if="!history.matches.length">暂无已完成的对局</p>
        <article v-for="match in history.matches" :key="match.match_id" class="account-match">
          <h3>{{ gameName(match.game_id) }}</h3>
          <p>{{ match.started_at===null?'':date(match.started_at)+' 开始 · ' }}{{ date(match.finished_at) }} 结束</p>
          <p v-if="match.result.details?.winner">{{ role(match.result.details.winner) }}阵营获胜</p>
          <ul><li v-for="player in match.players" :key="player.player_id">
            {{ player.nickname_snapshot }}{{ player.player_id===account.profile.id?'（你）':'' }} · {{ player.outcome==='win'?'获胜':'落败' }}
            <template v-if="player.score!==null"> · {{ player.score }} 分 · 第 {{ player.rank }} 名</template>
            <template v-if="match.result.details?.roles?.[player.player_id]"> · {{ role(match.result.details.roles[player.player_id]) }}</template>
          </li></ul>
        </article>
        <div class="actions">
          <button :disabled="busy || !offset" @click="act(()=>loadHistory(offset-20))">上一页</button>
          <button :disabled="busy || !history.more" @click="act(()=>loadHistory(offset+20))">下一页</button>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.account-center {max-width:48rem;margin-inline:auto}
.account-center input,.account-center select {width:100%;min-width:0}
.account-center section {border-top:1px solid #475145;padding-top:.9rem}
.account-match {border:1px solid #475145;padding:.65rem;border-radius:.45rem}
.account-center ul {padding-inline-start:1.15rem}
</style>
