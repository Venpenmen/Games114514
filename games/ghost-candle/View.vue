<script setup lang="ts">
import GameResultDialog from '../../apps/web/components/GameResultDialog.vue'
import RoomChat from '../../apps/web/components/RoomChat.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Snapshot } from '../../packages/protocol/index.ts'
import Rules from './Rules.vue'
import './theme.css'
type Public = {
  stage:string;night:number;candles:string[];submitted:string[];winner?:string;roles?:Record<string,string>;
  last?:{candle:number;status:string};ballots:{day:number;round:number;votes:[string,string|null][]}[];
}
const props = defineProps<{room:Snapshot;player:string;send:(type:string,data:unknown)=>Promise<boolean>}>()
const state = computed(() => props.room.match!.public as Public)
const secret = computed(() => props.room.match!.private as {role:string})
const submitted = computed(() => state.value.submitted.includes(props.player))
const canChat = computed(() => ['DAY_DISCUSSION','DAY_DECISION','ACCUSATION','REVOTE'].includes(state.value.stage))
const selected = ref<number>()
const action = ref('LIGHT')
const muted = ref(localStorage.getItem('ghost-muted') !== 'false')
watch(muted,value=>localStorage.setItem('ghost-muted',String(value)))
let audio: AudioContext | undefined
function toggleAudio() {
  muted.value = !muted.value
  if (!muted.value) {
    audio ??= new AudioContext()
    void audio.resume()
  }
}
function cue(frequency:number) {
  if (!audio || muted.value || audio.state !== 'running') return
  const tone = audio.createOscillator()
  const volume = audio.createGain()
  volume.gain.setValueAtTime(0.06,audio.currentTime)
  volume.gain.exponentialRampToValueAtTime(0.001,audio.currentTime+0.2)
  tone.frequency.value = frequency
  tone.connect(volume).connect(audio.destination)
  tone.start()
  tone.stop(audio.currentTime+0.2)
}
const now = ref(Date.now())
let clock: number
onMounted(() => { clock = window.setInterval(() => { now.value=Date.now() },200) })
onUnmounted(() => { clearInterval(clock); void audio?.close() })
watch(() => props.room.match!.phase, () => { selected.value=undefined; action.value='LIGHT' })
watch(() => state.value.last?.candle, () => cue(state.value.last?.status === 'LIT' ? 560 : 170))
watch(() => state.value.winner, winner => { if (winner) cue(740) })
const seconds = computed(() => Math.max(0,Math.ceil(((props.room.match!.deadline ?? now.value)-now.value)/1000)))
watch(seconds, value => { if (value > 0 && value <= 3) cue(360) })
const labels:Record<string,string> = {NIGHT:'夜晚',DAY_DISCUSSION:'白天讨论',DAY_DECISION:'是否寻找诡异',ACCUSATION:'指认诡异',REVOTE:'重新指认',RESULT:'公开投票结果',FINISHED:'对局结束'}
const names = (id:string) => props.room.members.find(member=>member.id===id)?.name ?? '已离开'
const role = (id:string) => id==='GHOST' ? '诡异' : '人类'
const resultKey = computed(() => state.value.stage==='FINISHED' && state.value.winner
  ? [props.room.code,props.room.match!.id,'FINISHED'].join(':') : undefined)
const victory = computed(() => state.value.winner===secret.value.role)
const candleLabel:Record<string,string> = {INTACT:'完好',LIT:'点亮',DESTROYED:'摧毁'}
const command = (data:unknown) => props.send('game',data)
</script>

<template>
  <article class="ghost" :data-stage="state.stage">
    <GameResultDialog :result-key="resultKey" :title="(victory?'胜利':'失败') + ' · ' + role(state.winner ?? '') + (victory?'阵营':'阵营获胜')"
      :victory="victory" theme="ghost">
      <p>{{ role(state.winner ?? '') }}阵营赢得本局。关闭后仍可查看身份、投票及聊天记录。</p>
    </GameResultDialog>
    <header class="ghost-header">
      <div><h2>{{ labels[state.stage] }}</h2>
      <p v-if="state.stage!=='FINISHED'">
      {{ state.stage==='NIGHT' ? '第 '+state.night+' 夜' : '第 '+(state.night+1)+' 天' }} · 剩余 {{ seconds }} 秒
      </p></div>
      <div class="ghost-tools"><p class="role-label">你的身份是 <strong>{{ role(secret.role) }}</strong></p><Rules/><button @click="toggleAudio">{{ muted?'开启音效':'静音' }}</button></div>
    </header>
    <div class="ghost-layout">
    <section class="ghost-board">
    <div class="candles">
      <button v-for="(candle,i) in state.candles" :key="i" :class="[candle.toLowerCase(),{selected:selected===i+1}]"
        :disabled="state.stage!=='NIGHT' || candle!=='INTACT' || submitted" @click="selected=i+1">
        <span class="candle-model" aria-hidden="true"><i class="flame"></i><i class="wax"></i><i class="dish"></i></span>
        <span>{{ i+1 }} · {{ candleLabel[candle] }}</span>
      </button>
    </div>
    <p v-if="state.last">最近一夜 · {{ state.last.candle }} 号蜡烛已{{ candleLabel[state.last.status] }}</p>
    <p v-if="submitted">已提交，等待其他玩家</p>
    <div v-else class="actions">
      <template v-if="state.stage==='NIGHT'">
        <label v-if="secret.role==='GHOST'">行动 <select v-model="action"><option value="LIGHT">点亮</option><option value="DESTROY">摧毁</option></select></label>
        <button :disabled="!selected" @click="command({kind:'night',candle:selected,action})">确认行动</button>
      </template>
      <button v-if="state.stage==='DAY_DISCUSSION'" @click="command({kind:'discuss'})">结束讨论</button>
      <template v-if="state.stage==='DAY_DECISION'"><button @click="command({kind:'decision',yes:true})">寻找诡异</button><button @click="command({kind:'decision',yes:false})">继续入夜</button></template>
      <template v-if="state.stage==='ACCUSATION' || state.stage==='REVOTE'">
        <button v-for="member in room.members.filter(value=>value.id!==player)" :key="member.id" @click="command({kind:'vote',target:member.id})">指认 {{ member.name }}</button>
      </template>
    </div>
    <p v-if="state.stage!=='FINISHED' && state.stage!=='RESULT'">已确认 {{ state.submitted.length }} / {{ room.members.length }}</p>
    </section>
    <aside class="ghost-journal">
    <section v-for="ballot in state.ballots" :key="ballot.day+'-'+ballot.round" class="journal-entry">
      <h3>第 {{ ballot.day }} 天 · 第 {{ ballot.round }} 轮票型</h3>
      <ul><li v-for="[voter,target] in ballot.votes" :key="voter">{{ names(voter) }} → {{ target ? names(target) : '弃票' }}</li></ul>
    </section>
    <section v-if="state.winner" class="journal-entry winner">
      <h3>{{ role(state.winner) }}胜利</h3>
      <ul><li v-for="(value,id) in state.roles" :key="id">{{ names(id) }} · {{ role(value) }}</li></ul>
      <p>三人重新准备后，房主可开启新一局。</p>
    </section>
    <section class="journal-entry">
      <h3>房间公聊</h3>
      <RoomChat :messages="room.chat" :members="room.members" :scope="room.code + ':' + room.match!.id"
        :player="player" :can-chat="canChat" disabled-text="当前阶段禁止发言。" :send="text => send('chat',text)"/>
    </section>
    </aside>
    </div>
  </article>
</template>
