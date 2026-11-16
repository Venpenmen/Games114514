<script setup lang="ts">
import RoomChat from '../../apps/web/components/RoomChat.vue'
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import type { Snapshot } from '../../packages/protocol/index.ts'
import type { DicePublic } from './engine.ts'
import Die from './Die.vue'
import Rules from './Rules.vue'
import { portraits } from './portraits.ts'
import './theme.css'

const props=defineProps<{room:Snapshot;player:string;send:(type:string,data:unknown)=>Promise<boolean>}>()
const match=computed(()=>props.room.match!)
const state=computed(()=>match.value.public as DicePublic)
const identity=computed(()=>(match.value.private as {identity:number}).identity)
const now=ref(Date.now())
const stageSeconds={ACTION:30,VOTE:30,REVOTE:30,BALLOT:3,SUMMARY:8,CHAMPION:0}
const clock=computed(()=>Math.min(stageSeconds[state.value.stage],Math.max(0,Math.ceil(((match.value.deadline ?? now.value)-now.value)/1000))))
let timer:number
onMounted(()=>{timer=window.setInterval(()=>{now.value=Date.now()},200)})
onUnmounted(()=>{clearInterval(timer);void audio?.close()})
const labels={ACTION:'逐点报数',VOTE:'投票处决',REVOTE:'重新投票',BALLOT:'公开票型',SUMMARY:'本局结算',CHAMPION:'比赛结束'}
const causes={health:'生命值处决',vote:'投票处决',dealer:'庄家清场'}
const name=(id:string)=>props.room.members.find(member=>member.id===id)?.name ?? '离席玩家'
const voting=computed(()=>state.value.stage==='VOTE' || state.value.stage==='REVOTE')
const submitted=computed(()=>state.value.submitted.includes(props.player))
const pending=ref(false)
async function submit(kind:string,value:number) {
  if(pending.value) return
  pending.value=true
  try { await props.send('game',{kind,value}) }
  finally { pending.value=false }
}
const results=ref<HTMLDialogElement>()
const resultTitle=useId()
const summary=computed(()=>state.value.summary)
const reviewed=ref<DicePublic['summary']>(null)
function review() {
  reviewed.value=summary.value
  results.value?.showModal()
}
const showSummary=computed(()=>state.value.stage==='SUMMARY'||state.value.stage==='CHAMPION')
const muted=ref((localStorage.getItem('games-muted') ?? localStorage.getItem('ghost-muted'))!=='false')
let audio:AudioContext|undefined
function sound(frequency:number) {
  if (!audio || muted.value || audio.state!=='running') return
  const tone=audio.createOscillator()
  const gain=audio.createGain()
  tone.type='triangle'
  tone.frequency.setValueAtTime(frequency,audio.currentTime)
  tone.frequency.exponentialRampToValueAtTime(frequency/2,audio.currentTime+.16)
  gain.gain.setValueAtTime(.1,audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2)
  tone.connect(gain).connect(audio.destination)
  tone.start()
  tone.stop(audio.currentTime+.21)
}
function toggleSound() {
  muted.value=!muted.value
  localStorage.setItem('games-muted',String(muted.value))
  if(!muted.value) { audio??=new AudioContext(); void audio.resume().then(()=>sound(240)) }
}
watch(()=>state.value.executions.length,(count,previous)=>{if(count>previous)sound(145)})
watch(()=>state.value.game,()=>sound(280))
const recentBallot=computed(()=>state.value.ballots.at(-1))
</script>

<template>
  <article class="dw-saloon">
    <header class="dw-banner">
      <div>
        <p>第 {{ state.game }} 局 · 第 {{ state.round }} 轮 · {{ state.overtime?'加赛':'普通赛' }} · 目标 {{ state.target }} 分</p>
        <h2>{{ labels[state.stage] }}</h2>
        <p v-if="summary?.champion && showSummary">冠军 · {{ name(summary.champion) }}</p>
        <p v-if="match.deadline" class="dw-time" :class="{'dw-urgent':clock<=5}">{{ state.stage==='SUMMARY'?clock+' 秒后续局':'剩余 '+clock+' 秒' }}</p>
      </div>
      <div class="actions"><Rules/><button @click="toggleSound">{{ muted?'开启音效':'静音' }}</button></div>
    </header>

    <div class="dw-seats">
      <section v-for="member in room.members" :key="member.id" class="dw-seat">
        <img :src="portraits[state.portraits[member.id]]?.image" alt="">
        <div><h3>{{ member.name }}</h3><p>{{ state.scores[member.id] }} 分 · {{ member.online?'在线':'离线' }}<span v-if="state.submitted.includes(member.id)"> · 已提交</span></p></div>
        <div v-if="member.id===player" class="dw-private">
          <Die :key="state.game" :face="identity" rolling/><span data-testid="own-identity">身份 {{ identity }} 点</span>
        </div>
      </section>
    </div>

    <div class="dw-floor">
      <section class="dw-table" aria-label="六点数赌桌">
        <div class="dw-table-head">
          <h3>{{ state.stage==='ACTION' ? '当前点数 '+state.face : '公共骰桌' }}</h3>
          <span>连续无处决 {{ state.dryRounds }} / 3</span>
        </div>
        <div class="dw-points">
          <div v-for="point in state.points" :key="point.face" class="dw-point" :class="{
            'dw-current':state.stage==='ACTION'&&state.face===point.face,
            'dw-risk':!point.removed&&point.hp<=-3,'dw-condemned':!point.removed&&point.hp<=-5,
            'dw-removed':point.removed,
          }">
            <Die :face="point.face"/>
            <div class="dw-plinth"><strong>{{ point.face }} 点</strong><span>生命 {{ point.hp }}</span></div>
            <span v-if="point.removed" class="dw-stamp">已处决</span>
            <span v-else-if="point.hp<=-5" class="dw-stamp">待处决</span>
            <span v-else-if="point.hp<=-3" class="dw-danger-label">危险</span>
            <button v-if="voting && !point.removed" :disabled="submitted||pending" @click="submit('vote',point.face)">投 {{ point.face }} 点</button>
          </div>
        </div>
        <p v-if="state.last" class="dw-last">{{ state.last.face }} 点：{{ state.last.delta>0?'+':'' }}{{ state.last.delta }}，生命 {{ state.last.hp }}<span v-if="state.last.automatic"> · 庄家代选 {{ state.last.automatic }} 人</span></p>
        <div v-if="state.stage==='ACTION'" class="actions dw-act">
          <button :disabled="submitted||pending" @click="submit('act',1)">增加 +1</button>
          <button :disabled="submitted||pending" @click="submit('act',-1)">减少 −1</button>
        </div>
        <p v-if="state.stage==='ACTION'||voting">{{ submitted?'已提交，等待其他玩家 · ':'' }}{{ state.submitted.length }} / 3 已提交</p>
      </section>

      <aside class="dw-ledger">
        <section v-if="recentBallot">
          <h3>最近票型 · 第 {{ recentBallot.round }} 轮第 {{ recentBallot.attempt }} 次</h3>
          <p v-for="vote in recentBallot.votes" :key="vote.player">{{ name(vote.player) }} → {{ vote.face }} 点{{ vote.automatic?'（代投）':'' }}</p>
          <p>票数 {{ Object.entries(recentBallot.totals).map(([face,total])=>face+' 点 '+total+' 票').join(' · ') }}</p>
          <p>{{ recentBallot.target===null?'无有效处决':'处决 '+recentBallot.target+' 点' }}</p>
        </section>
        <section v-if="state.executions.length">
          <h3>处决记录</h3>
          <p v-for="(event,i) in state.executions" :key="i">第 {{ event.round }} 轮 · {{ causes[event.cause] }} · {{ event.faces.join('、') }} 点</p>
        </section>
        <section>
          <h3>房间公聊</h3>
          <RoomChat :messages="room.chat" :members="room.members" :scope="room.code + ':' + room.match!.id"
            :player="player" :can-chat="!match.finished" :send="text => send('chat',text)"/>
        </section>
      </aside>
    </div>

    <section v-if="summary" class="dw-results">
      <template v-if="showSummary">
        <h3 v-if="summary.champion">冠军 · {{ name(summary.champion) }}</h3>
        <h3 v-else>第 {{ summary.game }} 局结算{{ summary.overtime?' · 加赛':'' }}</h3>
        <p>{{ summary.executions.map(item=>causes[item.cause]+' '+item.faces.join('、')+' 点').join('；') }}</p>
        <p>{{ summary.points.map(point=>point.face+' 点 '+point.hp).join(' · ') }}</p>
        <ul><li v-for="member in room.members" :key="member.id">{{ member.name }} · 身份 {{ summary.identities[member.id] }} 点 · {{ summary.winners.includes(member.id)?'获胜 +1':'失败 +0' }} · 共 {{ summary.scores[member.id] }} 分</li></ul>
      </template>
      <button @click="review()">{{ showSummary?'查看本局完整结算':'查看上一局结算' }}</button>
    </section>
    <details class="dw-history"><summary>本局完整票型</summary>
      <p v-if="!state.ballots.length">本局暂无公开票型。</p>
      <div v-for="ballot in state.ballots" :key="ballot.round+'-'+ballot.attempt">
        <strong>第 {{ ballot.round }} 轮 · 第 {{ ballot.attempt }} 次</strong>
        <p>{{ ballot.votes.map(vote=>name(vote.player)+' → '+vote.face+' 点'+(vote.automatic?'（代投）':'')).join(' · ') }}</p>
        <p>{{ Object.entries(ballot.totals).map(([face,total])=>face+' 点 '+total+' 票').join(' · ') }} · {{ ballot.target===null?'无有效处决':'处决 '+ballot.target+' 点' }}</p>
      </div>
    </details>

    <dialog ref="results" class="dw-dialog" :aria-labelledby="resultTitle">
      <div class="dw-dialog-header"><h2 :id="resultTitle">第 {{ reviewed?.game }} 局完整结算</h2><form method="dialog"><button autofocus>关闭</button></form></div>
      <div v-if="reviewed" class="dw-dialog-body">
        <h3>身份与积分</h3>
        <p v-for="member in room.members" :key="member.id">{{ name(member.id) }} · {{ reviewed.identities[member.id] }} 点 · {{ reviewed.winners.includes(member.id)?'获胜 +1':'失败 +0' }} · 共 {{ reviewed.scores[member.id] }} 分</p>
        <p v-if="reviewed.champion">冠军 · {{ name(reviewed.champion) }}</p><p v-else-if="reviewed.overtime">进入或继续加赛</p>
        <h3>最终生命值</h3>
        <p v-for="point in reviewed.points" :key="point.face">{{ point.face }} 点 · {{ point.hp }}{{ point.removed?' · 已处决':'' }}</p>
        <h3>处决与票型</h3>
        <p>{{ reviewed.reason==='duplicate'?'两点数特殊终局，同点两人落败。':'处决命中身份，本局结束。' }}</p>
        <p v-for="(event,i) in reviewed.executions" :key="i">第 {{ event.round }} 轮 · {{ causes[event.cause] }} · {{ event.faces.join('、') }} 点</p>
        <div v-for="ballot in reviewed.ballots" :key="ballot.round+'-'+ballot.attempt">
          <strong>第 {{ ballot.round }} 轮 · 第 {{ ballot.attempt }} 次</strong>
          <p>{{ ballot.votes.map(vote=>name(vote.player)+' → '+vote.face+' 点'+(vote.automatic?'（代投）':'')).join(' · ') }}</p>
          <p>{{ Object.entries(ballot.totals).map(([face,total])=>face+' 点 '+total+' 票').join(' · ') }} · {{ ballot.target===null?'无有效处决':'处决 '+ballot.target+' 点' }}</p>
        </div>
      </div>
    </dialog>
  </article>
</template>
