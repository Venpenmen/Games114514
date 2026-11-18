<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import GameToolbar from './components/GameToolbar.vue'
import AccountCenter from './components/AccountCenter.vue'
import PlayerAvatar from './components/PlayerAvatar.vue'
import { io } from 'socket.io-client'
import { avatars, protocolVersion, type Profile, type Snapshot, type Reply } from '../../packages/protocol/index.ts'
import { gameArtwork, gameLobbies, gameRules, gameViews } from './games.ts'
type Game = {spectators?:boolean;id:string;name:string;min:number;max:number;settings:{key:string;label:string;options:number[]}[]}
type Resumable={gameId:string;name:string;code:string;matchId:string;takeover:boolean}
const resumable=ref<Resumable[]>([])
const occupied=ref<{code:string;name?:string}|null>(null)
const resuming=ref(false)
let resumableRequest=0
async function refreshResumable() {
  if(!profile.value || room.value || activeCode.value) return
  const request=++resumableRequest
  const [matches,seat]=await Promise.all([api<Resumable[]>('resumable-matches').catch(()=>[]),
    api<{code:string;name:string}|null>('occupied-room').catch(()=>null)])
  if(request===resumableRequest) {resumable.value=matches;occupied.value=seat}
}
async function resumeMatch(item:Resumable) {
  if(resuming.value || room.value || activeCode.value) return
  resuming.value=true
  try {
    if(!await send(item.takeover?'takeover':'join',{resume:true},item.code,item.matchId)) await refreshResumable()
  } finally {resuming.value=false}
}
const catalog = ref<Game[]>([])
const speedNames:Record<string,string>={'0.8':'快速','1':'标准','1.35':'舒缓','1.7':'慢速'}
const profile = ref<Profile>()
const room = ref<Snapshot>()
const code = ref(new URLSearchParams(location.search).get('room') ?? '')
const activeCode = ref(code.value)
const watching = ref(new URLSearchParams(location.search).get('watch')==='1')
const connectionEpoch = ref(0)
let nextSnapshotIsSync = true
const restoring = ref(Boolean(code.value))
const connected = ref(false)
const editing = ref(new URLSearchParams(location.search).get('page')==='account')
const name = ref('')
const username=ref(''), password=ref('')
const registering=ref(false), loading=ref(true), authenticating=ref(false)
const legacy=ref<Profile|null>(null)
const avatar = ref(0)
const error = ref('')
const copied = ref(false)
const tabId=sessionStorage.getItem('games.tab')??crypto.randomUUID()
sessionStorage.setItem('games.tab',tabId)
const socket = io({autoConnect:false,auth:{tab:tabId}})
let routeEpoch=0
if(!history.state?.gamesRoute && (activeCode.value || editing.value)) {
  const deepLink=location.href
  const lobbyUrl=new URL(deepLink)
  for(const key of ['room','watch','page']) lobbyUrl.searchParams.delete(key)
  history.replaceState({gamesRoute:true},'',lobbyUrl)
  history.pushState({gamesRoute:true},'',deepLink)
}
const game = computed(() => catalog.value.find(item => item.id === room.value?.gameId))
const view = computed(() => gameViews.get(room.value?.gameId ?? ''))
const lobby = computed(() => gameLobbies.get(room.value?.gameId ?? ''))
const rules = computed(() => gameRules.get(room.value?.gameId ?? ''))
const me = computed(() => room.value?.members.find(item => item.id === profile.value?.id))
const host = computed(() => room.value?.host === profile.value?.id)
const playing = computed(() => room.value?.match && !room.value.match.finished)
function setCode(value: string,replace=false) {
  activeCode.value = value
  const url = new URL(location.href)
  if (value) url.searchParams.set('room', value)
  else url.searchParams.delete('room')
  if (value && watching.value) url.searchParams.set('watch','1')
  else url.searchParams.delete('watch')
  if(editing.value) url.searchParams.set('page','account')
  else url.searchParams.delete('page')
  if(url.href!==location.href) history[replace?'replaceState':'pushState']({gamesRoute:true},'',url)
}
function detach() {
  if(socket.connected) socket.emit('command',{v:protocolVersion,id:crypto.randomUUID(),type:'detach'},()=>{})
}
function goLobby(account=false) {
  routeEpoch++
  detach()
  room.value=undefined
  editing.value=account
  watching.value=false
  setCode('')
  void refreshResumable()
}
window.addEventListener('popstate',()=>{
  const open=document.activeElement?.closest<HTMLDialogElement>('dialog[open]')??Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1)
  const chat=document.querySelector<HTMLButtonElement>('.room-chat.is-open .room-chat-heading button')
  if(open || chat) {
    if(open) open.close()
    else chat?.click()
    const destination=new URL(location.href)
    if(activeCode.value) destination.searchParams.set('room',activeCode.value)
    else destination.searchParams.delete('room')
    if(watching.value) destination.searchParams.set('watch','1')
    else destination.searchParams.delete('watch')
    if(editing.value) destination.searchParams.set('page','account')
    else destination.searchParams.delete('page')
    history.pushState({gamesRoute:true},'',destination)
    return
  }
  routeEpoch++
  detach()
  const params=new URLSearchParams(location.search)
  room.value=undefined
  watching.value=params.get('watch')==='1'
  editing.value=params.get('page')==='account'
  activeCode.value=params.get('room')??''
  if(activeCode.value && connected.value) void send(watching.value?'watch':'join',undefined,activeCode.value)
  else void refreshResumable()
})
socket.on('connect', () => {
  connected.value = true
  nextSnapshotIsSync = true
  if (activeCode.value && profile.value?.name) void send(watching.value?'watch':'join', undefined, activeCode.value)
  else void refreshResumable()
})
socket.on('disconnect', () => { connected.value = false })
socket.on('session-revoked',()=>{returnToLogin();error.value='当前设备会话已失效'})
socket.on('control-lost',(value:{code:string})=>{
  if(value.code!==activeCode.value) return
  room.value=undefined
  setCode('')
  error.value='对局已切换到其他设备'
  void refreshResumable()
})
socket.on('connect_error', () => { restoring.value = false; error.value = '连接失败，请刷新页面恢复会话' })
socket.on('room', (value: Snapshot) => {
  if (value.code === activeCode.value && Boolean(value.spectator)===watching.value) {
    if(nextSnapshotIsSync) { connectionEpoch.value++; nextSnapshotIsSync=false }
    room.value = value
    if (value.match) editing.value = false
  }
})
socket.on('left', (value: string) => {
  resumable.value = resumable.value.filter(item => item.code !== value)
  if (value === activeCode.value) { room.value = undefined; setCode('') }
  void refreshResumable()
})
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await response.json()
  if (!response.ok) throw new Error(data.error)
  return data
}
onMounted(async () => {
  try {
    const [games,current]=await Promise.all([api<Game[]>('catalog'),api<Profile|null>('me')])
    catalog.value=games
    if(current) connect(current)
    else {
      legacy.value=await api<Profile|null>('legacy')
      registering.value=!!legacy.value
      restoring.value=false
    }
  } catch (err) { restoring.value = false; error.value = (err as Error).message }
  finally {loading.value=false}
})
function connect(current:Profile) {
  profile.value=current
  password.value=''
  socket.connect()
  void refreshResumable()
}
function returnToLogin() {
  socket.disconnect()
  profile.value=undefined
  room.value=undefined
  resumable.value=[]
  resumableRequest++
  editing.value=restoring.value=watching.value=registering.value=false
  setCode('')
  error.value=''
}
async function authenticate() {
  if(authenticating.value) return
  authenticating.value=true
  error.value=''
  try {
    const details={username:username.value,password:password.value,name:name.value,avatar:avatar.value,claim:!!legacy.value && registering.value}
    const current=await api<Profile>('auth/'+(registering.value?'register':'login'),'POST',details)
    legacy.value=null
    connect(current)
  } catch(err) {error.value=(err as Error).message}
  finally {authenticating.value=false}
}
async function send(type: string, data?: unknown, target = room.value?.code, matchId?:string) {
  const epoch=routeEpoch
  error.value = ''
  if (!socket.connected) { error.value = '连接中，请稍后重试'; return false }
  try {
    const match = room.value?.match
    const reply: Reply = await socket.timeout(5000).emitWithAck('command',{
      v:protocolVersion,id:crypto.randomUUID(),type,data,room:target,match:matchId??match?.id,phase:match?.phase,controlVersion:match?.controlVersion,
    })
    if(epoch!==routeEpoch) return false
    if (!reply.ok) {
      if(reply.occupiedRoom) occupied.value={code:reply.occupiedRoom}
      error.value = reply.error
      if (target===activeCode.value && (type==='join' || type==='watch') &&
          ['房间不存在或已过期','此房间不能旁观'].includes(reply.error)) {
        room.value = undefined
        watching.value = false
        restoring.value = false
        setCode('')
        void refreshResumable()
      }
      if(type==='join' && target===activeCode.value && reply.error.includes('本设备没有操作权')) {
        room.value=undefined
        setCode('')
        void refreshResumable()
      }
      return false
    }
    if ((type === 'join' || type === 'create' || type==='takeover') && reply.room) {
      watching.value=false
      editing.value=false
      setCode(reply.room)
      await socket.timeout(5000).emitWithAck('command',{v:protocolVersion,id:crypto.randomUUID(),type:'sync',room:reply.room})
    }
    return true
  } catch {if(epoch===routeEpoch) error.value = '服务器响应超时';return false}
  finally {if(epoch===routeEpoch && type==='join') restoring.value=false}
}
async function watchRoom() {
  if (!/^\d{6}$/.test(code.value)) {error.value='请输入六位房间码'; return}
  watching.value=true
  setCode(code.value)
  if (!await send('watch',undefined,code.value)) { watching.value=false; setCode('') }
}
async function leaveWatch() {
  await send('unwatch')
  watching.value=false
  room.value=undefined
  setCode('')
}
function setting(key:string, event:Event) {
  const input = event.target as HTMLSelectElement
  void send('config',{...(room.value?.config as Record<string,number>),[key]:Number(input.value)})
}
async function share() {
  try { await navigator.clipboard.writeText(location.href); copied.value = true }
  catch { error.value = '请复制地址栏里的邀请链接' }
}
</script>

<template>
  <header v-if="!(profile && editing) && !room?.match && (!restoring || !!room || (editing && !profile?.name))" class="bar"><div class="bar-inner">
    <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span>多人联机小游戏合集</a>
    <button v-if="profile?.name" class="profile" @click="goLobby(true)"><PlayerAvatar :name="profile.name" :glyph="avatars[profile.avatar]" online/> {{ profile.name }}</button>
  </div></header>
  <main :class="{'game-page':room?.match}">
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="profile && !connected" role="status">正在连接服务器…</p>
    <form v-if="!profile && !loading" class="panel stack auth-form" @submit.prevent="authenticate">
      <h1>{{ registering?'注册账户':'登录' }}</h1>
      <p v-if="registering && legacy">注册后将保留旧游客的玩家身份与原有席位。</p>
      <label>用户名 <input v-model="username" required maxlength="24" autocomplete="username"></label>
      <label>密码 <input v-model="password" type="password" required minlength="10" :autocomplete="registering?'new-password':'current-password'"></label>
      <label v-if="registering && !legacy?.name">昵称 <input v-model="name" required maxlength="40" placeholder="输入昵称"></label>
      <label v-if="registering && !legacy?.name">账户头像 <select v-model="avatar"><option v-for="(icon,i) in avatars" :key="icon" :value="i">{{ icon }}</option></select></label>
      <div class="actions">
        <button class="primary" :disabled="authenticating">{{ registering?'注册并登录':'登录' }}</button>
        <button type="button" :disabled="authenticating" @click="registering=!registering">{{ registering?'已有账户，去登录':'创建账户' }}</button>
      </div>
    </form>
    <AccountCenter v-else-if="profile && editing && !room?.match" :api="api" :games="catalog"
      @close="goLobby()" @profile="profile=$event" @logout="returnToLogin"/>
    <template v-else-if="profile && !room">
      <section v-if="resumable.length && !activeCode" class="panel">
        <h2>你有一场正在进行的对局</h2>
        <div v-for="item in resumable" :key="item.code" class="actions">
          <span>{{ item.name }} · {{ item.code }}</span>
          <button :disabled="resuming || !connected" @click="resumeMatch(item)">{{ item.takeover?'切换到当前设备操作':'继续对局' }}</button>
        </div>
      </section>
      <section v-if="occupied && !resumable.some(item=>item.code===occupied?.code)" class="panel actions">
        <span>{{ occupied.name??'已占席' }} · {{ occupied.code }}</span><button @click="send('join',undefined,occupied.code)">返回已占席房间</button>
      </section>
      <div class="lobby-heading">
        <h1>游戏大厅</h1>
        <form class="join-form" @submit.prevent="send('join',undefined,code)">
          <label>房间码 <input v-model.trim="code" placeholder="六位房间码" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required></label><button>加入房间</button><button v-if="catalog.some(game=>game.spectators)" type="button" @click="watchRoom">旁观房间</button>
        </form>
      </div>
      <div class="catalog">
        <article v-for="item in catalog" :key="item.id" class="game-card" :class="{'has-art':gameArtwork.has(item.id)}">
          <img v-if="gameArtwork.has(item.id)" :src="gameArtwork.get(item.id)?.cover" alt="" class="game-cover">
          <div class="game-copy">
            <p class="game-size">{{ item.min === item.max ? item.min : item.min + '–' + item.max }} 人联机</p>
            <h2>{{ item.name }}</h2>
            <p v-if="gameArtwork.get(item.id)?.description" class="game-description">{{ gameArtwork.get(item.id)?.description }}</p>
            <button class="primary" @click="send('create',{gameId:item.id})">创建房间</button>
          </div>
        </article>
        <article class="upcoming"><h2>下一款游戏</h2><p>未开放</p></article>
      </div>
    </template>
    <template v-else-if="room">
      <section v-if="room.readOnly" class="panel stack">
        <h1>{{ game?.name }} · {{ room.code }}</h1>
        <p role="status">本标签页正在只读查看</p>
        <ul><li v-for="member in room.members" :key="member.id">{{ member.name }} · {{ member.online?'在线':'离线' }}{{ !playing && member.ready?' · 已准备':'' }}</li></ul>
        <p v-if="room.match">{{ room.match.finished?'比赛已结束':'比赛进行中' }}</p>
        <div class="actions"><button @click="send('takeover',undefined)">接管操作</button><button v-if="!room.match" @click="goLobby()">返回大厅</button></div>
      </section>
      <section v-else-if="!playing && !room.spectator" class="panel room-panel" :class="{'room-panel-finished':room.match}">
        <div v-if="!room.match" class="actions room-heading">
          <h1>{{ game?.name }} · {{ room.code }}</h1>
          <div class="actions">
            <component v-if="rules && !room.match" :is="rules"/>
            <button v-if="!room.match" @click="share">{{ copied ? '已复制链接' : '复制邀请链接' }}</button>
          </div>
        </div>
        <ul v-if="!lobby || !playing" class="members"><li v-for="member in room.members" :key="member.id">
          <PlayerAvatar class="member-avatar" :name="member.name" :glyph="avatars[member.avatar]" :online="member.online"/>
          <span class="member-name">{{ member.name }}</span>
          <small>{{ member.id===room.host?'房主 · ':'' }}{{ member.online?'在线':'离线' }} · {{ member.ready?'已准备':'未准备' }}</small>
          <button v-if="host && !playing && member.id!==room.host" @click="send('kick',{id:member.id})">移出</button>
        </li></ul>
        <template v-if="!playing">
          <component v-if="lobby && me" :is="lobby" :room="room" :player="me.id" :send="send"/>
          <div v-if="host" class="actions"><label v-for="field in game?.settings" :key="field.key">{{ field.label }}
            <select :value="(room.config as Record<string,number>)[field.key]??(field.key==='presentationSpeed'?1:undefined)" @change="setting(field.key,$event)">
              <option v-for="value in field.options" :key="value" :value="value">{{ field.key==='presentationSpeed'?(speedNames[String(value)]+' · '+value+'×'):value }}</option>
            </select>
          </label></div>
          <div class="actions">
            <button @click="send('ready',!me?.ready)">{{ me?.ready ? '取消准备' : '准备' }}</button>
            <button v-if="host" class="primary" @click="send('start')">{{ room.match ? '开始新一局' : '开始游戏' }}</button>
            <button @click="send('leave')">退出房间</button><button v-if="host" @click="send('dissolve')">解散房间</button>
          </div>
        </template>
      </section>
      <GameToolbar v-if="room.match" :code="room.code" :game-id="room.gameId" :speed="(room.config as {presentationSpeed?:number}).presentationSpeed" @lobby="goLobby()"/>
      <component v-if="view && room.match && (!room.readOnly || room.gameId==='night-of-the-ninja') && (me || room.spectator)" :is="view" :key="room.match.id" :room="room.readOnly?{...room,spectator:true}:room" :player="profile?.id ?? ''" :connection-epoch="connectionEpoch" :send="send"/>
    </template>
  </main>
</template>

<style scoped>
.auth-form {max-width:28rem;margin-inline:auto}
.auth-form input,.auth-form select {width:100%}
</style>
