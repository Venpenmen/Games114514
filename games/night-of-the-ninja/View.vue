<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import type {Snapshot} from '../../packages/protocol/index.ts'
import RoomChat from '../../apps/web/components/RoomChat.vue'
import GameHistory from '../../apps/web/components/GameHistory.vue'
import {cards,phaseNames,skills} from './cards.ts'
import type {publicView,privateView,PublicEvent} from './engine.ts'
import {asset,labels} from './art.ts'
import Rules from './Rules.vue'
import CardFace from './CardFace.vue'
import IntelPanel from './IntelPanel.vue'
import IdentityCard from './IdentityCard.vue'
import OperationStage from './OperationStage.vue'
import './theme.css'
import './p20.css'

const props=defineProps<{room:Snapshot;player:string;connectionEpoch?:number;send:(type:string,data:unknown)=>Promise<boolean>}>()
const match=computed(()=>props.room.match!)
const state=computed(()=>match.value.public as ReturnType<typeof publicView>)
const privateState=computed(()=>props.room.spectator?undefined:match.value.private as ReturnType<typeof privateView>)
const name=(id:string)=>props.room.members.find(p=>p.id===id)?.name??'玩家'
const selected=ref('')
const pending=ref(false)
watch([()=>match.value.id,()=>match.value.phase,()=>props.connectionEpoch],()=>{selected.value=''})
const ownOptions=computed(()=>privateState.value?.options??[])
const locked=computed(()=>pending.value || props.room.pausedMs!==undefined)
const targetOptions=computed(()=>new Map(ownOptions.value.filter(option=>option.target).map(option=>[option.target,option.value])))
const select=(value:string)=>{if(!locked.value) selected.value=selected.value===value?'':value}
const polar=(index:number)=>{
  const offset=Math.max(0,state.value.seats.findIndex(seat=>seat.id===props.player))
  const angle=(index-offset)*2*Math.PI/state.value.seats.length
  return {left:(50-42*Math.sin(angle))+'%',top:(50+40*Math.cos(angle))+'%'}
}
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
  resolve:'技能结算',target:'选择目标',second:'选择第二名目标',choice:'技能确认',recover:'选择弃牌',
  reaction:'刺杀反应',reveal:'流派揭示',awards:'荣誉结算',ready:'下一轮准备',champion:'冠军',
}
const step=computed(()=>privateState.value?.action?.step??state.value.mode)
const attack=computed(()=>state.value.mode==='reaction'?state.value.events.findLast(event=>event.kind==='attack'):undefined)
const roundResult=computed(()=>['reveal','awards','ready','champion'].includes(state.value.mode)
  ? state.value.events.findLast(event=>event.round===state.value.round && event.kind==='reveal'):undefined)
const awardResult=computed(()=>roundResult.value
  ? state.value.events.findLast(event=>event.round===state.value.round && event.seq>roundResult.value!.seq && event.kind==='honor'):undefined)
const effects=ref<'full'|'light'|'reduced'>(matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':innerWidth<620?'light':'full')
const emit=defineEmits<{audioCue:[{matchId:string;sequence:number;kind:string}]}>()
const shown=ref<PublicEvent>()
const ring=ref<HTMLElement>()
const passing=ref(false)
let passTimer:number|undefined
watch([()=>match.value.id,()=>state.value.mode,()=>match.value.phase,()=>props.connectionEpoch],([id,mode,phase,epoch],[oldId,oldMode,oldPhase,oldEpoch])=>{
  clearTimeout(passTimer)
  passing.value=id===oldId && epoch===oldEpoch && oldMode==='draft1' && mode==='draft2' && phase===oldPhase+1
  if(passing.value) passTimer=window.setTimeout(()=>{passing.value=false},740)
})
const paths=computed(()=>{
  const event=shown.value
  if(!ring.value || effects.value==='reduced' || (!passing.value && (!event || effects.value!=='full'))) return []
  const frame=ring.value.getBoundingClientRect()
  const center=(element:Element|undefined|null)=>{
    const box=element?.getBoundingClientRect()
    return box?{x:box.left+box.width/2-frame.left,y:box.top+box.height/2-frame.top}:null
  }
  const stage=center(ring.value.querySelector('.nn-stage'))
  const seats=ring.value.querySelectorAll('.nn-seat')
  const route=(from:typeof stage,to:typeof stage,image?:string)=>from&&to?[{image,style:{
    left:from.x+'px',top:from.y+'px','--nn-dx':(to.x-from.x)+'px','--nn-dy':(to.y-from.y)+'px',
  }}]:[]
  if(passing.value) return Array.from(seats,(seat,index)=>{
    const from=center(seat)
    const to=center(seats[(index+1)%seats.length])
    const back=asset('card-back')
    return route(from,to,back).flatMap(path=>[path,{...path,style:{...path.style,animationDelay:'.13s'}}])
  }).flat()
  if(!event) return []
  const actors=event.actors.map(id=>center(seats[state.value.seats.findIndex(seat=>seat.id===id)]))
  if(event.kind==='play'&&event.card) return route(actors[0],stage,asset(cards[event.card].skill))
  if(event.kind==='swap') return [...route(actors[0],actors[1]),...route(actors[1],actors[0])]
  if(event.kind==='honor'||event.kind==='martyr') return actors.flatMap(target=>route(stage,target,asset('honor-back')))
  return []
})
let cursor=0
let privateCursor=0
const letter=ref(false)
const freshIntel=computed(()=>letter.value?privateState.value?.intel.at(-1):undefined)
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
onUnmounted(()=>{clearTimeout(effectTimer);clearTimeout(letterTimer);clearTimeout(passTimer)})
const cardName=(id:string)=>skills[cards[id].skill][0]
const ranks=(identities:NonNullable<PublicEvent['identities']>,house:'crane'|'lotus')=>
  Object.values(identities).filter(identity=>identity.house===house)
    .map(identity=>identity.rank).sort((a,b)=>a-b).join('、')||'无存活者'
</script>

<template>
  <article class="nn-game nn-p20" :data-phase-token="match.phase" :data-mode="state.mode" :data-effects="effects" :data-confirm="ownOptions.length>0" :style="{'--nn-scene':'url('+asset('castle')+')','--nn-mobile-scene':'url('+asset('castle-mobile')+')'}">
    <header class="nn-header">
      <div><p>第 {{ state.round }} 轮<span v-if="state.night" :data-phase="state.night"> · {{ ({spy:'◈',mystic:'✦',trickster:'◇',blind:'◒',shinobi:'❖'})[state.night] }} {{ phaseNames[state.night] }}</span></p>
      <h2>{{ modes[step] ?? '技能结算' }}</h2><p v-if="room.pausedMs!==undefined">全员离线，比赛已暂停</p><p v-else-if="match.deadline" class="nn-clock" :class="{'nn-clock-urgent':seconds<=5}">剩余 {{ seconds }} 秒 · {{ state.submitted }} 人已提交</p></div>
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
      <div class="actions"><Rules :step="step"/><label>演出 <select v-model="effects"><option value="full">完整</option><option value="light">轻量</option><option value="reduced">减少动态</option></select></label></div>
      <p v-if="room.spectator">旁观中 · 仅公开信息</p>
    </header>
    <div ref="ring" class="nn-ring" :data-dense="state.seats.length>=9">
      <div class="nn-seats" aria-label="玩家席位">
      <button v-for="(p,i) in state.seats" :key="p.id" type="button" class="nn-seat" :style="polar(i)"
        :data-self="p.id===player" :aria-label="name(p.id)+(p.id===player?'（本人）':'')"
        :aria-pressed="targetOptions.has(p.id)?selection?.target===p.id:undefined"
        :disabled="locked || !targetOptions.has(p.id)" @click="select(targetOptions.get(p.id)!)"
        :class="{'nn-dead':!p.alive,'nn-target':selection?.target===p.id,'nn-focus':state.current?.player===p.id || shown?.actors.includes(p.id)}">
        <img :src="asset('portrait-'+p.portrait)" alt="" :class="{'nn-death-flash':shown?.kind==='death' && shown.actors.includes(p.id),'nn-attack-target':shown?.kind==='attack' && shown.actors[1]===p.id}">
        <strong>{{ name(p.id) }}{{ p.id===player?'（你）':'' }}</strong>
        <small>{{ p.alive?'存活':'已死亡' }} · {{ room.members.find(member=>member.id===p.id)?.online?'在线':'离线' }}</small>
        <small><img :src="asset('honor-back')" alt=""> {{ p.honorCount }} 枚荣誉
          <img v-if="p.id!==player && p.handCount" class="nn-seat-card-back" :src="asset('card-back')" :alt="p.handCount+' 张未公开牌'"></small>
        <small v-if="targetOptions.size">{{ privateState?.action?.targets.includes(p.id) ? '目标 '+(privateState.action.targets.indexOf(p.id)+1) : targetOptions.has(p.id)?'可选':'不可选' }}</small>
      </button>
      </div>
      <section class="nn-stage">
        <p v-if="step==='draft1'">保留一张 · 两张传给左邻</p>
        <p v-else-if="step==='draft2'">收到右邻的两张牌</p>
        <p v-else-if="targetOptions.size">{{ step==='second'?'选择目标二':'从圆桌选择目标' }}</p>
        <div v-if="state.current" class="nn-active-card">
          <CardFace :id="state.current.card" compact/>
          <div><p>当前公开执行 · {{ name(state.current.player) }}</p><strong>{{ cardName(state.current.card) }}</strong>
            <p v-if="attack">{{ attack.actors.map(name).join(' → ') }} · 攻击尚未裁决</p></div>
        </div>
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
        <section v-if="freshIntel" class="nn-letter" aria-label="新收到的私人情报">
          <p role="status"><span aria-hidden="true">封</span> {{ freshIntel.source ? skills[freshIntel.source][0]+' · ' : '' }}{{ freshIntel.text }}</p>
          <div class="nn-letter-cards">
            <IdentityCard v-if="freshIntel.identity" :identity="freshIntel.identity" :caption="freshIntel.target ? name(freshIntel.target)+' · 取得时' : '取得时的身份'"/>
            <CardFace v-if="freshIntel.card" :id="freshIntel.card" compact/>
          </div>
        </section>
        <section v-if="roundResult" class="nn-round-result">
          <h3>{{ roundResult.text }}</h3>
          <p v-if="roundResult.identities">鹤派 {{ ranks(roundResult.identities,'crane') }} · 莲派 {{ ranks(roundResult.identities,'lotus') }}</p>
          <p v-if="awardResult"><img :src="asset('honor-back')" alt=""> {{ awardResult.actors.map(name).join('、') }} · {{ awardResult.text }}</p>
        </section>
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
      <div v-if="paths.length" :key="passing?'draft-pass':shown?.seq" class="nn-paths" :data-kind="passing?'draft-pass':shown?.kind" aria-hidden="true">
        <span v-for="(path,i) in paths" :key="i" :style="path.style">
          <img v-if="path.image" :src="path.image" alt=""><b v-else>◇</b>
        </span>
      </div>
    </div>
    <OperationStage v-if="!match.finished" :state="state" :own="privateState" :selected="selection?.value??''"
          :locked="locked" :name="name" @select="select" @confirm="confirm"/>
    <aside class="nn-journal">
      <GameHistory title="公开时间线">
        <section v-for="event in state.events" :key="event.seq">
          <p>第 {{ event.round }} 轮 · {{ event.text }} {{ event.actors.map(name).join('、') }}</p>
          <img v-if="event.card" class="nn-thumb" :src="asset(cards[event.card].skill)" alt="">
          <p v-for="(identity,id) in event.identities" :key="id">{{ name(id) }} · {{ labels[identity.house] }}{{ identity.rank?' '+identity.rank:'' }}（公开时）</p>
        </section>
      </GameHistory>
      <template v-if="privateState">
        <IntelPanel :own="privateState" :seats="state.seats" :name="name"/>
        <RoomChat :messages="room.chat" :members="room.members" :scope="room.code+':'+match.id" :player="player" :can-chat="!match.finished" :send="text=>send('chat',text)"/>
      </template>
    </aside>
  </article>
</template>
