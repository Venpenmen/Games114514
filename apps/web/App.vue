<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { io } from 'socket.io-client'
import { avatars, protocolVersion, type Profile, type Snapshot, type Reply } from '../../packages/protocol/index.ts'
import { gameArtwork, gameLobbies, gameRules, gameViews } from './games.ts'
type Game = {id:string;name:string;min:number;max:number;settings:{key:string;label:string;options:number[]}[]}
const catalog = ref<Game[]>([])
const profile = ref<Profile>()
const room = ref<Snapshot>()
const code = ref(new URLSearchParams(location.search).get('room') ?? '')
const activeCode = ref(code.value)
const connected = ref(false)
const editing = ref(false)
const name = ref('')
const avatar = ref(0)
const error = ref('')
const copied = ref(false)
const socket = io({autoConnect:false})
const game = computed(() => catalog.value.find(item => item.id === room.value?.gameId))
const view = computed(() => gameViews.get(room.value?.gameId ?? ''))
const lobby = computed(() => gameLobbies.get(room.value?.gameId ?? ''))
const rules = computed(() => gameRules.get(room.value?.gameId ?? ''))
const me = computed(() => room.value?.members.find(item => item.id === profile.value?.id))
const host = computed(() => room.value?.host === profile.value?.id)
const playing = computed(() => room.value?.match && !room.value.match.finished)
function setCode(value: string) {
  activeCode.value = value
  const url = new URL(location.href)
  if (value) url.searchParams.set('room', value)
  else url.searchParams.delete('room')
  history.replaceState(null,'',url)
}
socket.on('connect', () => {
  connected.value = true
  if (activeCode.value && profile.value?.name) void send('join', undefined, activeCode.value)
})
socket.on('disconnect', () => { connected.value = false })
socket.on('connect_error', () => { error.value = '连接失败，请刷新页面恢复会话' })
socket.on('room', (value: Snapshot) => {
  if (value.code === activeCode.value) room.value = value
})
socket.on('left', (value: string) => {
  if (value === activeCode.value) { room.value = undefined; setCode('') }
})
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data = await response.json()
  if (!response.ok) throw new Error(data.error)
  return data
}
onMounted(async () => {
  try {
    catalog.value = await api<Game[]>('catalog')
    profile.value = (await api<Profile | null>('me')) ?? await api<Profile>('session','POST')
    edit()
    editing.value = !profile.value.name
    socket.connect()
  } catch (err) { error.value = (err as Error).message }
})
function edit() {
  name.value = profile.value?.name ?? ''
  avatar.value = profile.value?.avatar ?? 0
  editing.value = true
}
async function save() {
  error.value = ''
  try {
    profile.value = await api<Profile>('profile','PUT',{name:name.value,avatar:avatar.value})
    editing.value = false
    if (activeCode.value && !room.value && connected.value) await send('join',undefined,activeCode.value)
  } catch (err) { error.value = (err as Error).message }
}
async function send(type: string, data?: unknown, target = room.value?.code) {
  error.value = ''
  if (!socket.connected) { error.value = '连接中，请稍后重试'; return false }
  try {
    const match = room.value?.match
    const reply: Reply = await socket.timeout(5000).emitWithAck('command',{
      v:protocolVersion,id:crypto.randomUUID(),type,data,room:target,match:match?.id,phase:match?.phase,
    })
    if (!reply.ok) { error.value = reply.error; return false }
    if ((type === 'join' || type === 'create') && reply.room) {
      setCode(reply.room)
      await socket.timeout(5000).emitWithAck('command',{v:protocolVersion,id:crypto.randomUUID(),type:'sync',room:reply.room})
    }
    return true
  } catch { error.value = '服务器响应超时'; return false }
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
  <header class="bar"><div class="bar-inner">
    <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span>多人联机小游戏合集</a>
    <button v-if="profile?.name" class="profile" @click="edit">{{ avatars[profile.avatar] }} {{ profile.name }}</button>
  </div></header>
  <main>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-if="profile && !connected" role="status">正在连接服务器…</p>
    <form v-if="editing" class="panel stack" @submit.prevent="save">
      <h1>个人资料</h1>
      <label>昵称 <input v-model="name" required maxlength="40" placeholder="输入昵称"></label>
      <label>头像 <select v-model="avatar"><option v-for="(icon,i) in avatars" :key="icon" :value="i">{{ icon }}</option></select></label>
      <div class="actions"><button class="primary">保存资料</button><button v-if="profile?.name" type="button" @click="editing=false">取消</button></div>
    </form>
    <template v-else-if="profile && !room">
      <div class="lobby-heading">
        <h1>游戏大厅</h1>
        <form class="join-form" @submit.prevent="send('join',undefined,code)">
          <label>房间码 <input v-model.trim="code" placeholder="六位房间码" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required></label><button>加入房间</button>
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
      <section class="panel room-panel">
        <div class="actions room-heading">
          <h1>{{ game?.name }} · {{ room.code }}</h1>
          <div class="actions">
            <component v-if="rules && !room.match" :is="rules"/>
            <button @click="share">{{ copied ? '已复制链接' : '复制邀请链接' }}</button>
          </div>
        </div>
        <ul v-if="!lobby || !playing" class="members"><li v-for="member in room.members" :key="member.id">
          <span class="member-avatar" aria-hidden="true">{{ avatars[member.avatar] }}</span>
          <span class="member-name">{{ member.name }}</span>
          <small>{{ member.id===room.host?'房主 · ':'' }}{{ member.online?'在线':'离线' }} · {{ member.ready?'已准备':'未准备' }}</small>
          <button v-if="host && !playing && member.id!==room.host" @click="send('kick',{id:member.id})">移出</button>
        </li></ul>
        <template v-if="!playing">
          <component v-if="lobby && me" :is="lobby" :room="room" :player="me.id" :send="send"/>
          <div v-if="host" class="actions"><label v-for="field in game?.settings" :key="field.key">{{ field.label }}
            <select :value="(room.config as Record<string,number>)[field.key]" @change="setting(field.key,$event)">
              <option v-for="value in field.options" :key="value" :value="value">{{ value }}</option>
            </select>
          </label></div>
          <div class="actions">
            <button @click="send('ready',!me?.ready)">{{ me?.ready ? '取消准备' : '准备' }}</button>
            <button v-if="host" class="primary" @click="send('start')">{{ room.match ? '开始新一局' : '开始游戏' }}</button>
            <button @click="send('leave')">退出房间</button><button v-if="host" @click="send('dissolve')">解散房间</button>
          </div>
        </template>
      </section>
      <component v-if="view && room.match && me" :is="view" :key="room.match.id" :room="room" :player="me.id" :send="send"/>
    </template>
  </main>
</template>
