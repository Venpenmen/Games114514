<script setup lang="ts">
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import type {Snapshot} from '../../packages/protocol/index.ts'
import RoomChat from '../../apps/web/components/RoomChat.vue'
import GameHistory from '../../apps/web/components/GameHistory.vue'
import {cards,phaseNames,skills} from './cards.ts'
import type {publicView,privateView,PublicEvent} from './engine.ts'
import {asset,labels} from './art.ts'
import Rules from './Rules.vue'
import MatchReplay from './MatchReplay.vue'
import CardFace from './CardFace.vue'
import IntelPanel from './IntelPanel.vue'
import IdentityCard from './IdentityCard.vue'
import OperationStage from './OperationStage.vue'
import {timelineRows,revealedPlayers} from './timeline.ts'
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
  reaction:'刺杀反应',reveal:'流派揭示',awards:'荣誉结算',ready:'下一轮准备',champion:'冠军',presentation:'公开演出',
}
const step=computed(()=>privateState.value?.action?.step??state.value.mode)
const attack=computed(()=>state.value.mode==='reaction'?state.value.events.findLast(event=>event.kind==='attack'):undefined)
const roundResult=computed(()=>(['reveal','awards','ready','champion'].includes(state.value.mode) || state.value.presentation?.events.some(event=>['reveal','honor','champion'].includes(event.kind)))
  ? state.value.events.findLast(event=>event.round===state.value.round && event.kind==='reveal'):undefined)
const awardResult=computed(()=>roundResult.value
  ? state.value.events.findLast(event=>event.round===state.value.round && event.seq>roundResult.value!.seq && event.kind==='honor'):undefined)
const effects=ref<'full'|'light'|'reduced'>(matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':innerWidth<620?'light':'full')
const emit=defineEmits<{audioCue:[{matchId:string;sequence:number;kind:string}]}>()
const presented=computed(()=>state.value.presentation?.events??(attack.value?[attack.value]:[]))
const recoveredPresentation=ref<number>()
const staticPresentation=computed(()=>!!state.value.presentation &&
  (recoveredPresentation.value===state.value.presentation.id || props.room.pausedMs!==undefined))
const shown=computed(()=>presented.value.at(-1))
const roundEvents=computed(()=>timelineRows(state.value.events,privateState.value?.tableTargets??[],state.value.round))
const batchTitle=(event:PublicEvent)=>event.card && cards[event.card].phase!=='special'
  ? phaseNames[cards[event.card].phase as keyof typeof phaseNames]+'阶段 · 同时亮牌' : '同时亮牌'
const major=computed(()=>presented.value.some(event=>!['play','attack'].includes(event.kind)))
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
  if(!ring.value || effects.value==='reduced' || (!passing.value && (!event || effects.value!=='full' || staticPresentation.value))) return []
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
let privateCursor=0
type PrivateEntry=NonNullable<ReturnType<typeof privateView>>['intel'][number]
const freshIntel=ref<PrivateEntry>()
const privateQueue:PrivateEntry[]=[]
let letterTimer:number|undefined
function nextPrivate() {
  clearTimeout(letterTimer)
  freshIntel.value=privateQueue.shift()
  if(freshIntel.value) letterTimer=window.setTimeout(nextPrivate,8000)
}
watch([()=>props.connectionEpoch,()=>state.value.round,()=>privateState.value?.intel.at(-1)?.seq],
  ([epoch,round,intel],[oldEpoch,oldRound])=>{
    if(epoch!==oldEpoch || round!==oldRound) {
      privateQueue.length=0
      nextPrivate()
      privateCursor=intel??0
      return
    }
    if(intel && intel>privateCursor) {
      privateQueue.push(...privateState.value!.intel.filter(entry=>entry.seq>privateCursor))
      privateCursor=intel
      if(!freshIntel.value) nextPrivate()
    }
  })
watch([()=>props.connectionEpoch,()=>state.value.presentation?.id],([epoch,id],[oldEpoch,oldId])=>{
  if(epoch!==oldEpoch) recoveredPresentation.value=id
  if(id!==undefined && epoch===oldEpoch && id!==oldId) {
    const cue=state.value.presentation!.events.at(-1)!
    emit('audioCue',{matchId:match.value.id,sequence:id,kind:cue.kind})
  }
})
onMounted(()=>{
  privateCursor=privateState.value?.intel.at(-1)?.seq??0
  recoveredPresentation.value=state.value.presentation?.id
})
onUnmounted(()=>{clearTimeout(letterTimer);clearTimeout(passTimer)})
const cardName=(id:string)=>skills[cards[id].skill][0]
const eventLabels:Record<string,[string,string]> = {
  target:['→','技能选定目标'],
  round:['◈','新一轮'], 'reveal-card':['◇','亮牌'], play:['▷','执行'],
  identity:['◉','公开身份'], swap:['⇄','交换身份'], attack:['→','指定攻击目标'],
  mirror:['↶','镜僧反应'], martyr:['✦','殉道者反应'], death:['×','死亡'],
  honor:['◈','荣誉变动'], pool:['＋','荣誉池'], master:['✦','首脑'],
  reveal:['⚑','轮末揭示'], champion:['★','比赛结算'],
}
const ranks=(identities:NonNullable<PublicEvent['identities']>,house:'crane'|'lotus')=>
  Object.values(identities).filter(identity=>identity.house===house)
    .map(identity=>identity.rank).sort((a,b)=>a-b).join('、')||'无存活者'
</script>

<template>
  <article class="nn-game nn-p20" :data-presentation="state.presentation?.id" :data-static-presentation="staticPresentation" :data-match="match.id" :data-phase-token="match.phase" :data-mode="state.mode" :data-effects="effects" :data-confirm="ownOptions.length>0" :style="{'--nn-scene':'url('+asset('castle')+')','--nn-mobile-scene':'url('+asset('castle-mobile')+')'}">
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
    <div ref="ring" class="nn-ring" :data-dense="state.seats.length>=9" :style="{'--nn-player-count':state.seats.length}">
      <div class="nn-seats" aria-label="玩家席位">
      <button v-for="(p,i) in state.seats" :key="p.id" type="button" class="nn-seat" :style="polar(i)"
        :data-self="p.id===player" :aria-label="name(p.id)+(p.id===player?'（本人）':'')"
        :aria-pressed="targetOptions.has(p.id)?selection?.target===p.id:undefined"
        :disabled="locked || !targetOptions.has(p.id)" @click="select(targetOptions.get(p.id)!)"
        :class="{'nn-dead':!p.alive,'nn-target':selection?.target===p.id,'nn-focus':state.current?.player===p.id || shown?.actors.includes(p.id)}">
        <img :src="asset('portrait-'+p.portrait)" alt="" :class="{'nn-death-flash':shown?.kind==='death' && shown.actors.includes(p.id),'nn-attack-target':shown?.kind==='attack' && shown.actors[1]===p.id}">
        <span class="nn-seat-info"><strong>{{ name(p.id) }}{{ p.id===player?'（你）':'' }}</strong>
        <small class="nn-seat-status" :title="(p.alive?'存活':'已死亡')+' · '+(room.members.find(member=>member.id===p.id)?.online?'在线':'离线')">
          <span :aria-label="p.alive?'存活':'已死亡'">{{ p.alive?'♥':'×' }}</span>
          <span aria-hidden="true">{{ room.members.find(member=>member.id===p.id)?.online?'●':'○' }}</span>
          <span class="nn-status-label">{{ room.members.find(member=>member.id===p.id)?.online?'在线':'离线' }}</span>
          <img :src="asset('honor-back')" alt="荣誉"> {{ p.honorCount }}
        </small>
        <small v-if="targetOptions.size">{{ privateState?.action?.targets.includes(p.id) ? '目标 '+(privateState.action.targets.indexOf(p.id)+1) : targetOptions.has(p.id)?'可选':'不可选' }}</small></span>
      </button>
      </div>
      <section class="nn-stage">
        <p v-if="step==='draft1'">保留一张 · 两张传给左邻</p>
        <p v-else-if="step==='draft2'">收到右邻的两张牌</p>
        <p v-else-if="targetOptions.size">{{ step==='second'?'选择目标二':'从圆桌选择目标' }}</p>
        <div v-if="state.current" class="nn-active-card">
          <CardFace :id="state.current.card" compact/>
          <div><p>当前公开执行 · {{ name(state.current.player) }}</p>
            <p class="nn-active-effect">{{ skills[cards[state.current.card].skill][1] }}</p>
            <p v-if="attack">{{ attack.actors.map(name).join(' → ') }} · 攻击尚未裁决</p></div>
        </div>
        <div v-for="item in presented" :key="item.seq" class="nn-event" :class="{'nn-major-event':major}" :data-event="item.kind" aria-live="polite">
          <img v-if="item.card" :src="asset(cards[item.card].skill)" alt="">
          <div>
            <p>{{ item.text }}</p>
            <p v-if="item.actors.length" class="nn-featured-actors">
              <span v-for="id in item.actors" :key="id">
                <img v-if="state.seats.some(seat=>seat.id===id)" :src="asset('portrait-'+state.seats.find(seat=>seat.id===id)!.portrait)" alt=""> {{ name(id) }}
              </span>
            </p>
            <p v-if="item.kind==='reveal' && item.identities">鹤派 {{ ranks(item.identities,'crane') }} · 莲派 {{ ranks(item.identities,'lotus') }}</p>
            <div v-if="item.identities" class="nn-reveal">
              <span v-for="([id,identity],i) in Object.entries(item.identities)" :key="id" :style="{'--reveal-order':i}">
                <img :src="asset(identity.house)" alt="">{{ name(id) }} · {{ labels[identity.house] }} {{ identity.rank || '' }}
              </span>
            </div>
          </div>
          <img v-if="item.kind==='honor' || item.kind==='martyr'" :src="asset('honor-back')" alt="荣誉徽章">
        </div>
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
        <section v-if="freshIntel" class="nn-letter nn-private-toast" :key="freshIntel.seq" aria-label="新收到的私人情报">
          <p role="status"><span aria-hidden="true">封</span> {{ freshIntel.viewedBy ? name(freshIntel.viewedBy)+' 查看了你的 '+cardName(freshIntel.card!)+' '+cards[freshIntel.card!].number+'。' : freshIntel.actor ? name(freshIntel.actor)+' 对你使用了 '+cardName(freshIntel.actingCard!)+ '。' : (freshIntel.source ? skills[freshIntel.source][0]+' · ' : '')+freshIntel.text }}</p>
          <div class="nn-letter-cards">
            <IdentityCard v-if="freshIntel.identity" :identity="freshIntel.identity" :caption="freshIntel.target ? name(freshIntel.target)+' · 取得时' : '取得时的身份'"/>
            <div v-if="freshIntel.actingCard">执行牌 <CardFace :id="freshIntel.actingCard" compact/></div>
            <div v-if="freshIntel.card"><span v-if="freshIntel.viewedBy">被查看的手牌 </span><CardFace :id="freshIntel.card" compact/></div>
            <span v-if="freshIntel.honor!==undefined" class="nn-honor"><img :src="asset('honor-front')" alt=""><b>{{ freshIntel.honor }}</b></span>
          </div>
          <button type="button" @click="nextPrivate">确定</button>
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
      <MatchReplay v-if="match.finished" :state="state" :name="name"/>
      <GameHistory title="公开时间线">
        <ol class="nn-timeline">
          <li v-for="row in roundEvents" :key="row.key"
            :data-kind="row.kind==='execution'?'play':row.kind==='batch'?'reveal-batch':row.event.kind"
            :data-execution="row.kind==='execution'?row.play.seq:undefined">
            <template v-if="row.kind==='batch'">
              <header><strong>{{ batchTitle(row.events[0]) }}</strong><small>{{ revealedPlayers(row.events).length }} 人 · {{ row.events.length }} 张</small></header>
              <div v-for="[player,held] in revealedPlayers(row.events)" :key="player" class="nn-reveal-line">
                <strong>{{ name(player) }}</strong>
                <span v-for="id in held" :key="id" class="nn-timeline-chip">{{ cardName(id) }} {{ cards[id].number }}</span>
              </div>
            </template>
            <template v-else>
              <header v-if="row.kind==='execution'">
                <strong>{{ name(row.play.actors[0]) }} · {{ cardName(row.play.card!) }} {{ cards[row.play.card!].number }}</strong>
                <small>第 {{ row.play.round }} 轮</small>
              </header>
              <header v-else><strong>{{ eventLabels[row.event.kind]?.[1] ?? '公开事件' }}</strong><small>第 {{ row.event.round }} 轮</small></header>
              <CardFace v-if="row.kind==='execution'" :id="row.play.card!" compact/>
              <p v-if="row.kind==='execution' && !row.details.length">开始执行。</p>
              <div v-for="event in (row.kind==='execution'?row.details:[row.event])" :key="event.key"
                class="nn-timeline-detail" :data-kind="event.kind" :data-execution="event.executionId">
                <div v-if="event.actors.length && !(event.kind==='attack' && row.kind==='execution' &&
                  row.details.some(target=>target.kind==='target' && target.actors[0]===event.actors[0] && target.actors[1]===event.actors[1]))" class="nn-timeline-actors">
                  <template v-for="(id,i) in event.actors" :key="i">
                    <span v-if="i" aria-hidden="true">{{ ['attack','target'].includes(event.kind)?'→':event.kind==='swap'?'⇄':'·' }}</span>
                    <span><img v-if="state.seats.some(seat=>seat.id===id)" :src="asset('portrait-'+state.seats.find(seat=>seat.id===id)!.portrait)" alt=""> {{ name(id) }}</span>
                  </template>
                  <span v-if="event.kind==='mirror' && row.kind==='execution'">→ {{ name(row.play.actors[0]) }}</span>
                </div>
                <p><img v-if="['honor','pool','martyr'].includes(event.kind)" class="nn-timeline-icon" :src="asset('honor-back')" alt=""> {{ event.text }}</p>
                <span v-if="event.kind==='target' && row.kind==='event'" class="nn-timeline-chip">{{ cardName(event.card!) }} {{ cards[event.card!].number }}</span>
                <CardFace v-else-if="event.card && event.kind!=='target'" :id="event.card" compact/>
                <p v-for="(identity,id) in event.identities" :key="id"><img :src="asset(identity.house)" class="nn-timeline-icon" alt=""> {{ name(id) }} · {{ labels[identity.house] }}{{ identity.rank?' '+identity.rank:'' }}（公开时）</p>
              </div>
            </template>
          </li>
        </ol>
      </GameHistory>
      <template v-if="privateState">
        <IntelPanel :key="match.id" :own="privateState" :seats="state.seats" :name="name"/>
        <RoomChat :messages="room.chat" :members="room.members" :scope="room.code+':'+match.id" :player="player" :can-chat="!match.finished" :send="text=>send('chat',text)"/>
      </template>
    </aside>
  </article>
</template>
