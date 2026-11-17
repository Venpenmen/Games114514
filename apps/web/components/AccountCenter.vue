<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { avatars, type Profile } from '../../../packages/protocol/index.ts'
import PlayerAvatar from './PlayerAvatar.vue'

type Device={session_id:string;device_label:string;created_at:number;last_seen_at:number}
type Account={profile:Profile;account:{username:string;status:string;created_at:number;last_login_at:number};devices:Device[];currentDevice:string}
type Player={player_id:string;nickname_snapshot:string;score:number|null;rank:number|null;outcome:'win'|'loss'}
type History={more:boolean;totals:{game_id:string;played:number;won:number;best_score:number|null}[];
  matches:{match_id:string;game_id:string;started_at:number|null;finished_at:number;players:Player[];
    result:{winners:string[];details?:{winner?:string;roles?:Record<string,string>}}}[]}
const props=defineProps<{api:<T>(path:string,method?:string,body?:unknown)=>Promise<T>; games:{id:string;name:string}[]}>()
const emit=defineEmits<{close:[];profile:[Profile];logout:[]}>()
const account=ref<Account>(), history=ref<History>()
const tabs=[['profile','◉','个人资料'],['security','◇','账户安全'],['stats','▥','游戏战绩'],['history','◷','历史对局']] as const
const tab=ref<(typeof tabs)[number][0]>('profile')
const title=computed(()=>tabs.find(item=>item[0]===tab.value)![2])
const heading=ref<HTMLElement>()
const editing=ref(false), name=ref(''), avatar=ref(0), preview=ref(0)
const password=ref(''), next=ref(''), confirm=ref(''), reveal=ref(false)
const modal=ref<HTMLDialogElement>(), modalKind=ref<'avatar'|'password'|'revoke'|'detail'>('avatar')
const revokeId=ref(''), detail=ref<History['matches'][number]>()
const busy=ref(false), error=ref(''), notice=ref(''), modalError=ref('')
const date=(value:number)=>new Date(value).toLocaleString()
const role=(value?:string)=>value==='HUMAN'?'人类':value==='GHOST'?'诡异':''
const gameName=(id:string)=>props.games.find(game=>game.id===id)?.name??id
const total=computed(()=>history.value?.totals.reduce((acc,item)=>({played:acc.played+item.played,won:acc.won+item.won}),{played:0,won:0})??{played:0,won:0})
const rate=(won:number,played:number)=>played?Math.round(won/played*100):0
const own=(match:History['matches'][number])=>match.players.find(player=>player.player_id===account.value?.profile.id)
const outcome=(player?:Player)=>player?.outcome==='win'?'获胜':player?.outcome==='loss'?'落败':'—'
const score=(player?:Player)=>player?.score==null?'—':player.score+' 分 · 第 '+player.rank+' 名'
const game=ref(''), result=ref(''), order=ref('newest')
const rows=ref<History['matches']>([]), loadingHistory=ref(false), historyError=ref('')
const page=ref(0), starts=ref([0]), more=ref(false)
let historyRequest=0
async function readHistory(index:number,start:number) {
  const request=++historyRequest
  loadingHistory.value=true
  historyError.value=''
  const selectedGame=game.value, selectedResult=result.value, reverse=order.value==='oldest'
  const selected=history.value?.totals.filter(item=>!selectedGame || item.game_id===selectedGame)??[]
  const available=selected.reduce((sum,item)=>sum+(selectedResult==='win'?item.won:selectedResult==='loss'?item.played-item.won:item.played),0)
  const matches:History['matches']=[]
  let position=start, nextStart=start, offset=-1, chunk:History['matches']=[]
  try {
    while(available && position<total.value.played && matches.length<11 && request===historyRequest) {
      const absolute=reverse?total.value.played-1-position:position
      const block=Math.floor(absolute/20)*20
      if(block!==offset) {
        chunk=block===0?history.value!.matches:(await props.api<History>('history?offset='+block)).matches
        offset=block
      }
      const match=chunk[absolute-block]
      if(!match) break
      position++
      if((!selectedGame || match.game_id===selectedGame) && (!selectedResult || own(match)?.outcome===selectedResult)) {
        matches.push(match)
        if(matches.length===10) nextStart=position
      }
    }
    if(request!==historyRequest) return
    rows.value=matches.slice(0,10)
    page.value=index
    more.value=matches.length>10
    starts.value[index+1]=nextStart
  } catch(err) {
    if(request===historyRequest) historyError.value=(err as Error).message
  } finally {if(request===historyRequest) loadingHistory.value=false}
}
function resetHistory() {starts.value=[0];void readHistory(0,0)}
async function act(action:()=>Promise<void>,inModal=false) {
  if(busy.value) return
  busy.value=true
  const target=inModal?modalError:error
  target.value='';notice.value=''
  try {await action()} catch(err) {target.value=(err as Error).message} finally {busy.value=false}
}
async function loadAccount() {account.value=await props.api<Account>('account')}
onMounted(()=>act(async()=>{
  const [data,records]=await Promise.all([props.api<Account>('account'),props.api<History>('history?offset=0')])
  account.value=data
  history.value=records
  resetHistory()
}))
async function selectTab(value:typeof tab.value) {
  if(value===tab.value) return
  tab.value=value
  await nextTick()
  heading.value?.focus()
}
function edit() {
  name.value=account.value!.profile.name
  avatar.value=account.value!.profile.avatar
  editing.value=true
}
const dirty=computed(()=>editing.value && (name.value!==account.value?.profile.name || avatar.value!==account.value?.profile.avatar))
function leave() {
  if(!dirty.value || window.confirm('放弃尚未保存的资料修改？')) emit('close')
}
async function open(kind:typeof modalKind.value) {
  modalError.value=''
  modalKind.value=kind
  if(kind==='avatar') preview.value=avatar.value
  await nextTick()
  modal.value?.showModal()
}
function closed() {
  password.value=next.value=confirm.value=''
  reveal.value=false
}
function copyId() {return act(async()=>{await navigator.clipboard.writeText(account.value!.profile.id);notice.value='已复制玩家 ID'})}
function save() {return act(async()=>{
  const profile=await props.api<Profile>('profile','PUT',{name:name.value,avatar:avatar.value})
  account.value!.profile=profile
  emit('profile',profile)
  editing.value=false
  notice.value='资料已保存'
})}
function revoke() {return act(async()=>{
  await props.api('auth/revoke','POST',{id:revokeId.value})
  modal.value?.close()
  await loadAccount()
  notice.value='设备会话已撤销'
},true)}
function changePassword() {
  if(next.value!==confirm.value) {modalError.value='两次输入的新密码不同';return}
  return act(async()=>{
    await props.api('auth/password','POST',{password:password.value,next:next.value})
    modal.value?.close()
    await loadAccount()
    notice.value='密码已更新，其他设备已退出'
  },true)
}
function inspect(match:History['matches'][number]) {detail.value=match;open('detail')}
</script>

<template>
  <section class="account-center">
    <aside class="ac-rail">
      <nav aria-label="个人中心">
        <button v-for="[id,icon,label] in tabs" :key="id" :aria-current="tab===id?'page':undefined" @click="selectTab(id)">
          <span aria-hidden="true">{{ icon }}</span>{{ label }}
        </button>
      </nav>
      <button class="ac-back" @click="leave">返回游戏大厅</button>
    </aside>
    <div class="ac-content">
      <header class="ac-head"><h1 ref="heading" tabindex="-1">{{ title }}</h1><button class="ac-mobile-back" @click="leave">返回大厅</button></header>
      <p v-if="error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
      <p v-if="!account && busy" role="status">正在加载个人中心…</p>
      <template v-if="account">
        <section v-if="tab==='profile'" class="ac-card">
          <div class="ac-identity">
            <PlayerAvatar v-if="!editing" :name="account.profile.name" :glyph="avatars[account.profile.avatar]" online/>
            <button v-else type="button" aria-label="更换头像" @click="open('avatar')">{{ avatars[avatar] }}</button>
            <div><h2>{{ account.profile.name }}</h2><p>{{ account.account.username }}</p></div>
            <button v-if="!editing" class="ac-accent" @click="edit">编辑资料</button>
          </div>
          <dl class="ac-facts">
            <div><dt>登录用户名</dt><dd>{{ account.account.username }}</dd></div>
            <div><dt>玩家 ID</dt><dd>{{ account.profile.id }} <button @click="copyId">复制玩家 ID</button></dd></div>
            <div><dt>注册时间</dt><dd>{{ date(account.account.created_at) }}</dd></div>
            <div><dt>账户状态</dt><dd>{{ account.account.status==='active'?'正常':account.account.status }}</dd></div>
          </dl>
          <form v-if="editing" class="ac-form" @submit.prevent="save">
            <label>昵称 <input v-model="name" required maxlength="40"></label>
            <div class="ac-actions"><button class="ac-accent" :disabled="busy">{{ busy?'正在保存…':'保存修改' }}</button><button type="button" :disabled="busy" @click="editing=false">取消</button></div>
          </form>
        </section>
        <template v-else-if="tab==='security'">
          <section class="ac-card ac-split"><div><h2>密码管理</h2><p>最近登录 {{ date(account.account.last_login_at) }}</p></div><button class="ac-accent" @click="open('password')">修改密码</button></section>
          <section class="ac-card">
            <div class="ac-split"><h2>登录设备</h2><button class="ac-danger" :disabled="busy || account.devices.length<2" @click="revokeId='others';open('revoke')">退出所有其他设备</button></div>
            <div class="ac-grid ac-devices"><article v-for="device in account.devices" :key="device.session_id" class="ac-card">
              <h3>{{ device.device_label }}</h3><p>{{ device.session_id===account.currentDevice?'当前设备 · 会话有效':'会话有效' }}</p>
              <p>登录 {{ date(device.created_at) }}</p><p>最近活动 {{ date(device.last_seen_at) }}</p>
              <button v-if="device.session_id!==account.currentDevice" class="ac-danger" @click="revokeId=device.session_id;open('revoke')">撤销设备</button>
            </article></div>
            <button class="ac-danger" :disabled="busy" @click="act(async()=>{await api('auth/logout','POST');emit('logout')})">退出当前设备</button>
          </section>
        </template>
        <template v-else-if="tab==='stats'">
          <div class="ac-grid ac-totals"><article v-for="[label,value] in [['总对局数',total.played],['获胜场次',total.won],['总胜率',rate(total.won,total.played)+'%']]" :key="label" class="ac-card"><h2>{{ label }}</h2><strong>{{ value }}</strong></article></div>
          <div class="ac-grid"><article v-for="item in games" :key="item.id" class="ac-card">
            <h2>{{ item.name }}</h2>
            <template v-for="stats in [history?.totals.find(entry=>entry.game_id===item.id)]" :key="item.id">
              <p>{{ stats?.played??0 }} 场 · {{ stats?.won??0 }}{{ item.id==='ghost-candle'?' 胜':' 次夺冠' }} · 胜率 {{ rate(stats?.won??0,stats?.played??0) }}%</p>
              <p v-if="stats?.best_score!=null">{{ item.id==='night-of-the-ninja'?'最高荣誉':'最高积分' }} {{ stats.best_score }} 分</p>
            </template>
          </article></div>
        </template>
        <section v-else class="ac-card">
          <div class="ac-filters">
            <label>游戏类型 <select v-model="game" @change="resetHistory"><option value="">全部游戏</option><option v-for="item in games" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
            <label>时间顺序 <select v-model="order" @change="resetHistory"><option value="newest">最新优先</option><option value="oldest">最早优先</option></select></label>
            <label>比赛结果 <select v-model="result" @change="resetHistory"><option value="">全部结果</option><option value="win">获胜</option><option value="loss">落败</option></select></label>
          </div>
          <p v-if="loadingHistory" role="status">正在加载历史…</p>
          <div v-else-if="historyError" role="alert">{{ historyError }} <button @click="resetHistory">重试</button></div>
          <p v-else-if="!rows.length">暂无符合条件的对局</p>
          <table v-else class="ac-history">
            <thead><tr><th scope="col">游戏名称</th><th scope="col">比赛时间</th><th scope="col">比赛结果</th><th scope="col">本人成绩</th><th scope="col">详情</th></tr></thead>
            <tbody><tr v-for="match in rows" :key="match.match_id">
              <td>{{ gameName(match.game_id) }}</td><td>{{ date(match.finished_at) }}</td><td>{{ outcome(own(match)) }}</td><td>{{ score(own(match)) }}</td>
              <td><button @click="inspect(match)">查看详情</button></td>
            </tr></tbody>
          </table>
          <div class="ac-actions ac-pagination">
            <button :disabled="loadingHistory || !page" @click="readHistory(page-1,starts[page-1])">上一页</button><span>第 {{ page+1 }} 页</span>
            <button :disabled="loadingHistory || !more" @click="readHistory(page+1,starts[page+1])">下一页</button>
          </div>
        </section>
      </template>
    </div>
    <dialog ref="modal" class="ac-dialog" :class="{'ac-detail':modalKind==='detail'}" aria-labelledby="account-dialog-title" @close="closed" @cancel="busy && $event.preventDefault()">
      <div class="ac-split">
        <h2 id="account-dialog-title">{{ {avatar:'选择头像',password:'修改密码',revoke:'确认撤销',detail:'对局详情'}[modalKind] }}</h2>
        <button type="button" autofocus :disabled="busy" @click="modal?.close()">{{ modalKind==='detail'?'返回历史列表':'取消' }}</button>
      </div>
      <p v-if="modalError" role="alert">{{ modalError }}</p>
      <template v-if="modalKind==='avatar'">
        <div class="ac-avatars"><button v-for="(glyph,i) in avatars" :key="glyph" :aria-label="'头像 '+glyph" :aria-pressed="preview===i" @click="preview=i">{{ glyph }}</button></div>
        <button class="ac-accent" @click="avatar=preview;modal?.close()">确认头像</button>
      </template>
      <form v-else-if="modalKind==='password'" class="ac-form" @submit.prevent="changePassword">
        <label>当前密码 <input v-model="password" :type="reveal?'text':'password'" autocomplete="current-password" required></label>
        <label>新密码 <input v-model="next" :type="reveal?'text':'password'" autocomplete="new-password" minlength="10" required></label>
        <label>确认新密码 <input v-model="confirm" :type="reveal?'text':'password'" autocomplete="new-password" minlength="10" required></label>
        <div class="ac-actions"><button type="button" :aria-pressed="reveal" @click="reveal=!reveal">{{ reveal?'隐藏密码':'显示密码' }}</button><button class="ac-accent" :disabled="busy">{{ busy?'正在保存…':'保存修改' }}</button></div>
      </form>
      <template v-else-if="modalKind==='revoke'">
        <p>{{ revokeId==='others'?'退出所有其他设备？':'撤销此设备的登录会话？' }}</p>
        <button class="ac-danger" :disabled="busy" @click="revoke">确认撤销</button>
      </template>
      <template v-else-if="detail">
        <h3>{{ gameName(detail.game_id) }}</h3>
        <p v-if="detail.started_at!==null">开始 {{ date(detail.started_at) }}</p><p>结束 {{ date(detail.finished_at) }}</p>
        <p v-if="detail.result.details?.winner">{{ role(detail.result.details.winner) }}阵营获胜</p>
        <p v-else>冠军 {{ detail.players.filter(player=>detail?.result.winners.includes(player.player_id)).map(player=>player.nickname_snapshot).join('、') }}</p>
        <p>我的结果 · {{ outcome(own(detail)) }} · {{ score(own(detail)) }}</p>
        <h3>参赛玩家</h3>
        <ul><li v-for="player in detail.players" :key="player.player_id">
          {{ player.nickname_snapshot }}{{ player.player_id===account?.profile.id?'（你）':'' }} · {{ outcome(player) }} · {{ score(player) }}
          <template v-if="detail.result.details?.roles?.[player.player_id]"> · {{ role(detail.result.details.roles[player.player_id]) }}</template>
        </li></ul>
      </template>
    </dialog>
  </section>
</template>

<style scoped src="./account-center.css"></style>
