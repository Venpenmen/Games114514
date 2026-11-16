<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import type {Snapshot} from '../../packages/protocol/index.ts'
import RoomChat from '../../apps/web/components/RoomChat.vue'
import GameHistory from '../../apps/web/components/GameHistory.vue'
import {cards,phaseNames,skills} from './cards.ts'
import type {publicView,privateView,PublicEvent} from './engine.ts'
import {asset,labels} from './art.ts'
import Rules from './Rules.vue'
import './theme.css'

const props=defineProps<{room:Snapshot;player:string;connectionEpoch?:number;send:(type:string,data:unknown)=>Promise<boolean>}>()
const match=computed(()=>props.room.match!)
const state=computed(()=>match.value.public as ReturnType<typeof publicView>)
const privateState=computed(()=>props.room.spectator?undefined:match.value.private as ReturnType<typeof privateView>)
const name=(id:string)=>props.room.members.find(p=>p.id===id)?.name??'玩家'
const selected=ref('')
const pending=ref(false)
watch(()=>match.value.phase,()=>{selected.value=''})
const ownOptions=computed(()=>privateState.value?.options??[])
const selection=computed(()=>ownOptions.value.find(option=>option.value===selected.value))
async function confirm() {
  if(!selection.value||pending.value||props.room.pausedMs!==undefined) return
  pending.value=true
  try {await props.send('game',{value:selected.value})}
  finally {pending.value=false}
}
const clock=ref(Date.now())
let ticker:number
onMounted(()=>{ticker=window.setInterval(()=>{clock.value=Date.now()},200)})
onUnmounted(()=>clearInterval(ticker))
const seconds=computed(()=>Math.max(0,Math.ceil(((match.value.deadline??clock.value)-clock.value)/1000)))
const modes:Record<typeof state.value.mode,string>={
  draft1:'第一步轮抽',draft2:'第二步轮抽',commit:'秘密出牌',play:'公开出牌',
  target:'选择目标',second:'选择第二名目标',choice:'技能确认',recover:'选择弃牌',
  reaction:'刺杀反应',reveal:'流派揭示',awards:'荣誉结算',ready:'下一轮准备',champion:'冠军',
}
const polar=(index:number)=>{
  const offset=state.value.seats.findIndex(p=>p.id===props.player)
  const angle=((index-(offset<0?0:offset))/state.value.seats.length)*2*Math.PI
  return {left:(50-42*Math.sin(angle))+'%',top:(49+41*Math.cos(angle))+'%'}
}
const effects=ref<'full'|'light'|'reduced'>(matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':innerWidth<620?'light':'full')
const emit=defineEmits<{audioCue:[{matchId:string;sequence:number;kind:string}]}>()
const shown=ref<PublicEvent>()
const ring=ref<HTMLElement>()
const paths=computed(()=>{
  const event=shown.value
  if(!event||!ring.value||effects.value!=='full') return []
  const frame=ring.value.getBoundingClientRect()
  const center=(element:Element|undefined|null)=>{
    const box=element?.getBoundingClientRect()
    return box?{x:box.left+box.width/2-frame.left,y:box.top+box.height/2-frame.top}:null
  }
  const stage=center(ring.value.querySelector('.nn-stage'))
  const seats=ring.value.querySelectorAll('.nn-seat')
  const actors=event.actors.map(id=>center(seats[state.value.seats.findIndex(seat=>seat.id===id)]))
  const route=(from:typeof stage,to:typeof stage,image?:string)=>from&&to?[{image,style:{
    left:from.x+'px',top:from.y+'px','--nn-dx':(to.x-from.x)+'px','--nn-dy':(to.y-from.y)+'px',
  }}]:[]
  if(event.kind==='play'&&event.card) return route(actors[0],stage,asset(cards[event.card].skill))
  if(event.kind==='swap') return [...route(actors[0],actors[1]),...route(actors[1],actors[0])]
  if(event.kind==='honor'||event.kind==='martyr') return actors.flatMap(target=>route(stage,target,asset('honor-back')))
  return []
})
let cursor=0
let privateCursor=0
const letter=ref(false)
let letterTimer:number|undefined
let effectTimer:number|undefined
let queued:PublicEvent[]=[]
function showNext() {
  clearTimeout(effectTimer)
  shown.value=undefined
  const now=Date.now()
  while(queued.length) {
    const next=queued[0]
    const start=next.presentationAt!
    const end=start+next.duration!
    if(end<=now) {queued.shift();continue}
    if(start>now) {
      effectTimer=window.setTimeout(showNext,start-now)
      return
    }
    queued.shift()
    shown.value=next
    emit('audioCue',{matchId:match.value.id,sequence:next.seq,kind:next.kind})
    effectTimer=window.setTimeout(showNext,end-now)
    return
  }
}
watch([()=>props.connectionEpoch,()=>state.value.events.at(-1)?.seq,()=>privateState.value?.intel.at(-1)?.seq],([epoch,latest,intel],[oldEpoch])=>{
  if(epoch!==oldEpoch) {
    clearTimeout(effectTimer)
    clearTimeout(letterTimer)
    shown.value=undefined
    letter.value=false
    queued=[]
    cursor=latest??0
    privateCursor=intel??0
    return
  }
  if(intel && intel>privateCursor) {
    privateCursor=intel
    letter.value=true
    clearTimeout(letterTimer)
    letterTimer=window.setTimeout(()=>{letter.value=false},1800)
  }
  if(!latest||latest<=cursor) return
  queued.push(...state.value.events.filter(event=>event.seq>cursor&&event.duration))
  cursor=latest
  if(!shown.value) showNext()
})
onMounted(()=>{
  cursor=state.value.events.at(-1)?.seq??0
  privateCursor=privateState.value?.intel.at(-1)?.seq??0
})
onUnmounted(()=>{clearTimeout(effectTimer);clearTimeout(letterTimer)})
const cardName=(id:string)=>skills[cards[id].skill][0]
const ranks=(identities:NonNullable<PublicEvent['identities']>,house:'crane'|'lotus')=>
  Object.values(identities).filter(identity=>identity.house===house)
    .map(identity=>identity.rank).sort((a,b)=>a-b).join('、')||'无存活者'
</script>

<template>
  <article class="nn-game" :data-phase-token="match.phase" :data-mode="state.mode" :data-effects="effects" :style="{'--nn-scene':'url('+asset('castle')+')','--nn-mobile-scene':'url('+asset('castle-mobile')+')'}">
    <header class="nn-header">
      <div><p>第 {{ state.round }} 轮<span v-if="state.night" :data-phase="state.night"> · {{ ({spy:'◈',mystic:'✦',trickster:'◇',blind:'◒',shinobi:'❖'})[state.night] }} {{ phaseNames[state.night] }}</span></p>
      <h2>{{ modes[state.mode] }}</h2><p v-if="room.pausedMs!==undefined">全员离线，比赛已暂停</p><p v-else-if="match.deadline">剩余 {{ seconds }} 秒 · {{ state.submitted }} 人已提交</p></div>
      <p v-if="privateState" class="nn-identity">
        <template v-if="privateState.known">
          <img :src="asset(privateState.known.house)" alt="">
          {{ labels[privateState.known.house] }}
          <span v-if="privateState.known.rank" class="nn-rank" :aria-label="'等级 '+privateState.known.rank+'，1 最高'">
            <strong>{{ privateState.known.rank }}</strong><span aria-hidden="true">{{ '◆'.repeat(privateState.known.rank) }}</span>
          </span>
        </template>
        <template v-else>身份可能变化</template> · {{ privateState.score }} 荣誉分
      </p>
      <div class="actions"><Rules/><label>演出 <select v-model="effects"><option value="full">完整</option><option value="light">轻量</option><option value="reduced">减少动态</option></select></label></div>
      <p v-if="room.spectator">旁观中 · 仅公开信息</p>
    </header>
    <div ref="ring" class="nn-ring">
      <div class="nn-seats" aria-label="玩家席位">
      <button v-for="(p,i) in state.seats" :key="p.id" :style="polar(i)" class="nn-seat" :aria-label="name(p.id)+(p.id===player?'（本人）':'')" :class="{'nn-dead':!p.alive,'nn-target':selection?.target===p.id,'nn-focus':state.current?.player===p.id || shown?.actors.includes(p.id)}"
        :disabled="!ownOptions.some(option=>option.target===p.id)" @click="selected=ownOptions.find(option=>option.target===p.id)!.value">
        <img :src="asset('portrait-'+p.portrait)" alt="" :class="{'nn-death-flash':shown?.kind==='death' && shown.actors.includes(p.id),'nn-attack-target':shown?.kind==='attack' && shown.actors[1]===p.id}">
        <strong>{{ name(p.id) }}{{ p.id===player?'（你）':'' }}</strong>
        <small>{{ p.alive?'存活':'已死亡' }} · {{ room.members.find(member=>member.id===p.id)?.online?'在线':'离线' }}</small>
        <small><img :src="asset('honor-back')" alt=""> {{ p.honorCount }} 枚荣誉
          <img v-if="p.id!==player && p.handCount" :src="asset('card-back')" :alt="p.handCount+' 张未公开牌'"></small>
      </button>
      </div>
      <section class="nn-stage">
        <p v-if="state.current">执行 · {{ name(state.current.player) }} · {{ cardName(state.current.card) }}</p>
        <div v-if="shown" :key="shown.seq" class="nn-event" :data-event="shown.kind" aria-live="polite">
          <img v-if="shown.card" :src="asset(cards[shown.card].skill)" alt="">
          <div>
            <p>{{ shown.text }}</p><p v-if="shown.actors.length">{{ shown.actors.map(name).join('、') }}</p>
            <p v-if="shown.kind==='reveal' && shown.identities">鹤派 {{ ranks(shown.identities,'crane') }} · 莲派 {{ ranks(shown.identities,'lotus') }}</p>
            <div v-if="shown.identities" class="nn-reveal">
              <span v-for="([id,identity],i) in Object.entries(shown.identities)" :key="id" :style="{'--reveal-order':i}">
                <img :src="asset(identity.house)" alt="">{{ name(id) }} · {{ labels[identity.house] }} {{ identity.rank || '' }}
              </span>
            </div>
          </div>
          <img v-if="shown.kind==='honor' || shown.kind==='martyr'" :src="asset('honor-back')" alt="荣誉徽章">
        </div>
        <p v-if="letter" class="nn-letter" role="status"><span aria-hidden="true">封</span> 收到私人密函 · 可在情报中查阅</p>
        <div v-if="ownOptions.length" class="nn-options">
          <button v-for="option in ownOptions" :key="option.value" :aria-pressed="selected===option.value" @click="selected=option.value">
            <img v-if="option.card" :src="asset(cards[option.card].skill)" alt="">
            <span>{{ option.target?name(option.target):option.card?option.label+' '+cardName(option.card)+' '+cards[option.card].number:option.label }}</span>
          </button>
          <p v-if="selection?.card">{{ skills[cards[selection.card].skill][1] }}</p>
          <button class="primary" :disabled="!selection || pending || room.pausedMs!==undefined" @click="confirm">确认提交</button>
        </div>
        <p v-else-if="privateState?.submitted">已提交，等待结算</p>
        <p v-else-if="!match.finished">等待当前步骤完成</p>
        <div v-if="state.champions.length" class="nn-champion">
          <h3>冠军 · {{ state.champions.map(name).join('、') }}</h3>
          <div class="nn-champion-cards">
            <figure v-for="p in state.seats.filter(seat=>state.champions.includes(seat.id))" :key="p.id">
              <img :src="asset('portrait-'+p.portrait)" alt=""><figcaption>{{ name(p.id) }} · {{ state.finalScores?.[p.id] }} 分</figcaption>
            </figure>
          </div>
          <p v-for="(score,id) in state.finalScores" :key="id">{{ name(id) }} · {{ score }} 分</p>
        </div>
      </section>
      <div v-if="shown && paths.length" :key="shown.seq" class="nn-paths" :data-kind="shown.kind" aria-hidden="true">
        <span v-for="(path,i) in paths" :key="i" :style="path.style">
          <img v-if="path.image" :src="path.image" alt=""><b v-else>◇</b>
        </span>
      </div>
    </div>
    <div v-if="privateState" class="nn-hand" aria-label="本人手牌">
      <details v-for="card in privateState.hand" :key="card"><summary><img :src="asset(cards[card].skill)" alt="">{{ cardName(card) }} {{ cards[card].number }}</summary><p>{{ skills[cards[card].skill][1] }}</p></details>
    </div>
    <aside class="nn-journal">
      <GameHistory title="公开时间线">
        <section v-for="event in state.events" :key="event.seq">
          <p>第 {{ event.round }} 轮 · {{ event.text }} {{ event.actors.map(name).join('、') }}</p>
          <img v-if="event.card" class="nn-thumb" :src="asset(cards[event.card].skill)" alt="">
          <p v-for="(identity,id) in event.identities" :key="id">{{ name(id) }} · {{ labels[identity.house] }}{{ identity.rank?' '+identity.rank:'' }}（公开时）</p>
        </section>
      </GameHistory>
      <template v-if="privateState">
        <GameHistory title="私人情报">
          <section v-if="privateState.known"><img class="nn-thumb" :src="asset(privateState.known.house)" alt="">本人：{{ labels[privateState.known.house] }} {{ privateState.known.rank || '' }}</section>
          <section>本人荣誉 <span v-for="token in privateState.honor" :key="token.id" class="nn-honor"><img :src="asset('honor-front')" alt="">{{ token.value }}</span></section>
          <section v-for="entry in privateState.intel" :key="entry.seq">第 {{ entry.round }} 轮<span v-if="entry.phase"> · {{ phaseNames[entry.phase] }}</span> · {{ new Date(entry.at).toLocaleTimeString() }} · {{ entry.text }} {{ entry.target ? name(entry.target) : '' }} {{ entry.identity ? labels[entry.identity.house]+' '+(entry.identity.rank||'') : '' }} {{ entry.card ? cardName(entry.card)+' '+cards[entry.card].number : '' }} {{ entry.honor ?? '' }}</section>
        </GameHistory>
        <RoomChat :messages="room.chat" :members="room.members" :scope="room.code+':'+match.id" :player="player" :can-chat="!match.finished" :send="text=>send('chat',text)"/>
      </template>
    </aside>
  </article>
</template>
