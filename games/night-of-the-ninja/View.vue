<script setup lang="ts">
import ViewportMode from './ViewportMode.vue'
import PlayerAvatar from "../../apps/web/components/PlayerAvatar.vue"
import {effects} from '../../apps/web/components/effects.ts'
import {computed,onMounted,onUnmounted,ref,watch} from 'vue'
import type {Snapshot} from '../../packages/protocol/index.ts'
import RoomChat from '../../apps/web/components/RoomChat.vue'
import GameHistory from '../../apps/web/components/GameHistory.vue'
import {cards,phaseNames,skills} from './cards.ts'
import type {publicView,privateView,PublicEvent} from './engine.ts'
import {asset,labels} from './art.ts'
import Rules from './Rules.vue'
import MatchReplay from './MatchReplay.vue'
import TablePlays from './TablePlays.vue'
import CardFace from './CardFace.vue'
import IntelPanel from './IntelPanel.vue'
import IdentityCard from './IdentityCard.vue'
import OperationStage from './OperationStage.vue'
import {timelineRows,revealedPlayers} from './timeline.ts'
import './theme.css'
import './p20.css'
import './landscape.css'

const props=defineProps<{room:Snapshot;player:string;connectionEpoch?:number;send:(type:string,data:unknown)=>Promise<boolean>}>()
const match=computed(()=>props.room.match!)
const state=computed(()=>match.value.public as ReturnType<typeof publicView>)
const privateState=computed(()=>props.room.spectator?undefined:match.value.private as ReturnType<typeof privateView>)
const identityDialog=ref<HTMLDialogElement>(), playDrawer=ref<HTMLDialogElement>()
const inspected=ref<string>()
const subject=computed(()=>state.value.seats.find(seat=>seat.id===inspected.value))
const exposure={unseen:'未暴露',partial:'部分暴露',full:'完全暴露',pending:'待确认'}
const historyViews=computed(()=>state.value.events.filter(event=>event.round===state.value.round && event.kind==='identity-view' && event.actors[1]===inspected.value))
const historyGroups=computed(()=>{
  const id=inspected.value
  if(!id) return []
  const groups:{label:string;events:PublicEvent[]}[]=[{label:'首次秘密决定前',events:[]}]
  let hiddenCount=0
  for(const event of state.value.events) {
    if(event.round!==state.value.round) continue
    if(event.kind==='shift-result' && event.text==='变形者隐藏了结果，身份可能变化。' && event.actors.includes(id)) {
      hiddenCount++
      groups.push({label:`第 ${hiddenCount} 次秘密决定后`,events:[]})
    } else if(event.kind==='identity-view' && event.actors[1]===id) {
      groups.at(-1)!.events.push(event)
    }
  }
  if(!hiddenCount) groups[0].label='本轮查看记录'
  return groups.filter(group=>group.events.length)
})
const sources={hand:'手牌',discard:'掘墓回收',reaction:'反应牌',master:'轮末揭示'}
const statuses={queued:'等待结算',resolving:'结算中',resolved:'已结算',skipped:'未发动'}
function inspectIdentity(id:string) {
  inspected.value=id
  identityDialog.value?.showModal()
}
const name=(id:string)=>props.room.members.find(p=>p.id===id)?.name??'玩家'
const selected=ref('')
const shiftPicked=ref<string[]>([]),merchantGive=ref<number|null>(null),merchantTake=ref<number|null>(null)
const pending=ref(false)
watch([()=>match.value.id,()=>state.value.round,()=>state.value.night,()=>privateState.value?.action?.step,()=>Boolean(privateState.value?.merchant),()=>props.connectionEpoch],()=>{selected.value='';shiftPicked.value=[];merchantGive.value=null;merchantTake.value=null})
const ownOptions=computed(()=>privateState.value?.options??[])
const locked=computed(()=>pending.value || props.room.pausedMs!==undefined)
const shiftPairMode=computed(()=>step.value==='target' && ownOptions.value.some(option=>option.value.startsWith('pair:')))
const targetOptions=computed(()=>{
  if(shiftPairMode.value) return new Map(state.value.seats.filter(p=>
    ownOptions.value.some(option=>option.value.startsWith('pair:') && option.value.split(':').includes(p.id)))
    .map(p=>[p.id,p.id]))
  return new Map(ownOptions.value.filter(option=>option.target).map(option=>[option.target!,option.value]))
})
const select=(value:string)=>{
  if(locked.value) return
  if(shiftPairMode.value) {
    shiftPicked.value=shiftPicked.value.includes(value)?shiftPicked.value.filter(id=>id!==value):
      shiftPicked.value.length<2?[...shiftPicked.value,value]:[shiftPicked.value[0],value]
    selected.value=''
    return
  }
  if(value==='pass' && privateState.value?.merchant){merchantGive.value=null;merchantTake.value=null}
  selected.value=selected.value===value?'':value
}
const chooseMerchant=(side:'give'|'take',id:number)=>{
  if(locked.value)return
  if(side==='give')merchantGive.value=merchantGive.value===id?null:id
  else merchantTake.value=merchantTake.value===id?null:id
  selected.value=''
}
const polar=(index:number)=>{
  const offset=Math.max(0,state.value.seats.findIndex(seat=>seat.id===props.player))
  const count=state.value.seats.length
  const relative=(index-offset+count)%count
  const angle=relative*2*Math.PI/count
  const topCount=Math.ceil(count/2),bottomCount=count-topCount
  const band=(n:number,y:number,reverse=false)=>Array.from({length:n},(_,i)=>({x:8+84*(reverse?n-1-i:i)/Math.max(1,n-1),y}))
  const perimeter=[...band(topCount,18),...band(bottomCount,82,true)]
  let self=topCount
  for(let i=topCount;i<count;i++)if(Math.abs(perimeter[i].x-50)<Math.abs(perimeter[self].x-50))self=i
  const point=perimeter[(self+relative)%count]

  const rows=Math.ceil((count-1)/2)+1
  const row=relative===0?rows-1:Math.floor((relative-1)/2)
  return {'--nn-landscape-columns':topCount,'--nn-landscape-x':(count<=4?50-40*Math.sin(angle):point.x)+'%','--nn-landscape-y':(count<=4?50+32*Math.cos(angle):point.y)+'%',left:(50-42*Math.sin(angle))+'%',top:(50+40*Math.cos(angle))+'%',
    '--nn-mobile-x':relative===0?'12%':relative%2?'12%':'88%',
    '--nn-mobile-y':(row+.5)*100/rows+'%'}

}
const selection=computed(()=>{
  if(shiftPairMode.value && shiftPicked.value.length===2)
    return ownOptions.value.find(option=>option.value==='pair:'+shiftPicked.value.join(':'))
  if(privateState.value?.merchant && selected.value!=='pass' &&
    merchantGive.value!==null && merchantTake.value!==null)
    return ownOptions.value.find(option=>option.value==='swap:'+merchantGive.value+':'+merchantTake.value)
  return ownOptions.value.find(option=>option.value===selected.value)
})
async function confirm() {
  if(!selection.value||pending.value||props.room.pausedMs!==undefined) return
  pending.value=true
  try {await props.send('game',{value:selection.value.value})}
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
const emit=defineEmits<{audioCue:[{matchId:string;sequence:number;kind:string}]}>()
const presented=computed(()=>state.value.presentation?.events??(attack.value?[attack.value]:[]))
const recoveredPresentation=ref<number>()
const staticPresentation=computed(()=>!!state.value.presentation &&
  (recoveredPresentation.value===state.value.presentation.id || props.room.pausedMs!==undefined))
const shown=computed(()=>presented.value.at(-1))
// Use only the publicly projected, currently resolving card; never raw hidden targets.
const activeExecution=computed(()=>state.value.cardArea.played.find(play=>
  play.status==='resolving' && play.card===state.value.current?.card &&
  play.player===state.value.current?.player))
const activeTargets=computed(()=>activeExecution.value?.targets??[])
const activeActor=computed(()=>activeExecution.value?.player)
const isActiveTarget=(id:string)=>activeTargets.value.includes(id)
const roundEvents=computed(()=>timelineRows(state.value.events,privateState.value?.tableTargets??[],state.value.round))
const batchTitle=(event:PublicEvent)=>event.card && cards[event.card].phase!=='special'
  ? phaseNames[cards[event.card].phase as keyof typeof phaseNames]+'阶段 · 同时亮牌' : '同时亮牌'
const major=(event:PublicEvent)=>['identity','houses','mirror','martyr','death','swap','honor','reveal','champion'].includes(event.kind)
const ring=ref<HTMLElement>()
const seatLayout=ref(0)
let seatObserver:ResizeObserver|undefined
function placeIdentityCards() {
  const board=ring.value
  if(!board || !matchMedia('(min-width:801px)').matches) return
  const frame=board.getBoundingClientRect()
  const seats=Array.from(board.querySelectorAll<HTMLElement>('.nn-seat-shell'))
  const stage=board.querySelector('.nn-stage')?.getBoundingClientRect()
  const used:DOMRect[]=stage?[stage]:[]
  for(const seat of seats) {
    seat.style.removeProperty('--seat-shift-x')
    seat.style.removeProperty('--seat-shift-y')
    const base=seat.getBoundingClientRect()
    const width=base.width,height=base.height
    const intersects=(a:DOMRect,b:DOMRect)=>a.left<b.right+3 && b.left<a.right+3 && a.top<b.bottom+3 && b.top<a.bottom+3
    const x=Math.min(Math.max(base.left,frame.left+3),frame.right-width-3)
    const candidates=[0,12,-12,24,-24,36,-36,48,-48,64,-64,80,-80].flatMap(dy=>[0,16,-16,32,-32,64,-64].map(dx=>new DOMRect(Math.max(frame.left+3,Math.min(x+dx,frame.right-width-3)),Math.max(frame.top+3,Math.min(base.top+dy,frame.bottom-height-3)),width,height)))
    const chosen=candidates.find(box=>!used.some(other=>intersects(box,other)))??candidates[0]
    seat.style.setProperty('--seat-shift-x',chosen.left-base.left+'px')
    seat.style.setProperty('--seat-shift-y',chosen.top-base.top+'px')
    used.push(chosen)
  }
  seatLayout.value++
}
onMounted(()=>{
  seatObserver=new ResizeObserver(placeIdentityCards)
  watch(()=>[ring.value,state.value.seats.length] as const,([board])=>{
    seatObserver?.disconnect()
    if(board) {
      seatObserver?.observe(board)
      board.querySelectorAll('.nn-seat-shell,.nn-stage,.nn-identity-trigger').forEach(element=>seatObserver?.observe(element))
      placeIdentityCards()
    }
  },{immediate:true,flush:'post'})
})
onUnmounted(()=>seatObserver?.disconnect())

const passing=ref(false)
let passTimer:number|undefined
watch([()=>match.value.id,()=>state.value.mode,()=>match.value.phase,()=>props.connectionEpoch],([id,mode,phase,epoch],[oldId,oldMode,oldPhase,oldEpoch])=>{
  clearTimeout(passTimer)
  passing.value=id===oldId && epoch===oldEpoch && oldMode==='draft1' && (mode==='draft2'||!!state.value.presentation?.events.some(event=>event.kind==='draft-pass')) && phase===oldPhase+1
  if(passing.value) passTimer=window.setTimeout(()=>{passing.value=false},state.value.presentation?.duration??740)
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
  if(event.kind==='play'&&event.card && innerWidth<=800) return route(actors[0],stage,asset(cards[event.card].skill))
  if(event.kind==='swap') return [...route(actors[0],actors[1]),...route(actors[1],actors[0])]
  if(event.kind==='honor'||event.kind==='martyr') return actors.flatMap(target=>route(stage,target,asset('honor-back')))
  return []
})
let privateCursor=0
type PrivateEntry=NonNullable<ReturnType<typeof privateView>>['intel'][number]
type PrivateNotice=PrivateEntry & {roundIdentity?:true}
const freshIntel=ref<PrivateNotice>()
const privateQueue:PrivateNotice[]=[]
let letterTimer:number|undefined
function nextPrivate() {
  clearTimeout(letterTimer)
  freshIntel.value=privateQueue.shift()
  if(freshIntel.value) letterTimer=window.setTimeout(nextPrivate,8000)
}
function announceRoundIdentity() {
  const identity=privateState.value?.known
  if(state.value.mode!=='draft1' || !identity) return
  const key='ninja-round-identity:'+props.player+':'+match.value.id
  const round=state.value.round
  if(sessionStorage.getItem(key)===String(round)) return
  sessionStorage.setItem(key,String(round))
  privateQueue.push({seq:0,at:0,round,identity,text:'本轮身份已揭晓。',roundIdentity:true})
  if(!freshIntel.value) nextPrivate()
}
watch([()=>props.connectionEpoch,()=>state.value.round,()=>privateState.value?.intel.at(-1)?.seq],
  ([epoch,round,intel],[oldEpoch,oldRound])=>{
    if(epoch!==oldEpoch || round!==oldRound) {
      privateQueue.length=0
      nextPrivate()
      privateCursor=intel??0
      announceRoundIdentity()
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
  announceRoundIdentity()
})
onUnmounted(()=>{clearTimeout(letterTimer);clearTimeout(passTimer)})
const cardName=(id:string)=>skills[cards[id].skill][0]
const eventLabels:Record<string,[string,string]> = {
  target:['→','技能选定目标'],
  round:['◈','新一轮'], 'reveal-card':['◇','亮牌'], play:['▷','执行'],
  'identity-view':['◉','查看身份'],'shift-result':['⇄','变形者结果'], identity:['◉','公开身份'], swap:['⇄','交换身份'], attack:['→','指定攻击目标'],
  mirror:['↶','镜僧反应'], martyr:['✦','殉道者反应'], death:['×','死亡'],
  honor:['◈','荣誉变动'], pool:['＋','荣誉池'], master:['✦','首脑'],
  reveal:['⚑','轮末揭示'], champion:['★','比赛结算'],
}
const ranks=(identities:NonNullable<PublicEvent['identities']>,house:'crane'|'lotus')=>
  Object.values(identities).filter(identity=>identity.house===house)
    .map(identity=>identity.rank).sort((a,b)=>a-b).join('、')||'无存活者'
</script>

<template>
  <article class="nn-game nn-p20" :data-presentation="state.presentation?.id" :data-static-presentation="staticPresentation" :data-match="match.id" :data-phase-token="match.phase" :data-mode="state.mode" :data-effects="effects" :data-confirm="ownOptions.length>0" :style="{'--ux-speed':state.presentationSpeed,'--ux-event-duration':(state.presentation?.duration??100000)+'ms','--nn-scene':'url('+asset('castle')+')','--nn-mobile-scene':'url('+asset('castle-mobile')+')'}">
    <ViewportMode/>
    <header class="nn-header">
      <div><p>第 {{ state.round }} 轮<span v-if="state.night" :data-phase="state.night"> · {{ ({spy:'◈',mystic:'✦',trickster:'◇',blind:'◒',shinobi:'❖'})[state.night] }} {{ phaseNames[state.night] }}</span></p>
      <h2>{{ modes[step] ?? '技能结算' }}</h2><p v-if="state.mode==='ready' || state.mode==='champion'" class="nn-intermission-public" role="status">本轮身份已全部公开，可对照牌桌与复盘。</p><p v-if="room.pausedMs!==undefined">全员离线，比赛已暂停</p><p v-else-if="match.deadline" class="nn-clock" :class="{'nn-clock-urgent':seconds<=5}">剩余 {{ seconds }} 秒 · {{ state.submitted }} 人已提交</p></div>
      <p v-if="privateState" class="nn-identity">
        <template v-if="privateState.known">
          <img :src="asset(privateState.known.house)" alt="">
          {{ labels[privateState.known.house] }}
          <span v-if="privateState.known.rank" class="nn-rank" :aria-label="'等级 '+privateState.known.rank">
            <strong>{{ privateState.known.rank }}</strong><span aria-hidden="true">{{ '◆'.repeat(privateState.known.rank) }}</span>
          </span>
        </template>
        <template v-else>身份可能变化</template> · {{ privateState.score }} 荣誉分
      </p>
      <div class="actions"><Rules :step="step"/></div>
      <p v-if="room.spectator">旁观中 · 仅公开信息</p>
    </header>
    <div ref="ring" class="nn-ring" :data-seat-count="state.seats.length" :data-dense="state.seats.length>=9" :style="{'--nn-player-count':state.seats.length,'--nn-mobile-rows':Math.ceil((state.seats.length-1)/2)+1}">
      <div class="nn-seats" aria-label="玩家席位">
      <div v-for="(p,i) in state.seats" :key="p.id" class="nn-seat-shell" :data-player="p.id" :style="polar(i)">
      <button type="button" class="nn-seat"
        :data-self="p.id===player" :aria-label="name(p.id)+(p.id===player?'（本人）':'')"
        :aria-pressed="targetOptions.has(p.id)?(shiftPairMode?shiftPicked.includes(p.id):selection?.target===p.id):undefined"
        :data-can-target="!locked && targetOptions.has(p.id)"
        :data-execution-actor="activeActor===p.id"
        :data-execution-target="isActiveTarget(p.id)"
        :disabled="targetOptions.size>0 && (locked || !targetOptions.has(p.id))"
        @click="targetOptions.has(p.id)?select(targetOptions.get(p.id)!):inspectIdentity(p.id)"
        :class="{'nn-dead':!p.alive,'nn-target':selection?.target===p.id || shiftPicked.includes(p.id),'nn-focus':state.current?.player===p.id || shown?.actors.includes(p.id),'nn-execution-actor':activeActor===p.id,'nn-execution-target':isActiveTarget(p.id)}">
        <PlayerAvatar :src="asset('portrait-'+p.portrait)" :name="name(p.id)" :online="room.members.some(member=>member.id===p.id && member.online)" compact :image-class="{'nn-death-flash':shown?.kind==='death' && shown.actors.includes(p.id),'nn-attack-target':shown?.kind==='attack' && shown.actors[1]===p.id}"/>
        <span class="nn-seat-info"><strong :title="name(p.id)"><span class="nn-seat-name-text">{{ name(p.id) }}{{ p.id===player?'（你）':'' }}</span></strong>
        <small class="nn-seat-status" :title="(p.alive?'存活':'已死亡')+' · '+(room.members.find(member=>member.id===p.id)?.online?'在线':'离线')">
          <span :aria-label="p.alive?'存活':'已死亡'">{{ p.alive?'♥':'×' }}</span>
          <span class="nn-status-label">{{ room.members.find(member=>member.id===p.id)?.online?'在线':'离线' }}</span>
          <span class="nn-seat-honor" :aria-label="'荣誉 '+p.honorCount" :title="'荣誉 '+p.honorCount"><img :src="asset('honor-back')" alt=""> {{ p.honorCount }}</span> <span :title="'手牌 '+p.handCount+' 张'" :aria-label="'手牌 '+p.handCount+' 张'">▤{{ p.handCount }}</span>
        </small>
        <small v-if="targetOptions.size">{{ shiftPairMode && shiftPicked.includes(p.id)?'目标 '+(shiftPicked.indexOf(p.id)+1):privateState?.action?.targets.includes(p.id) ? '目标 '+(privateState.action.targets.indexOf(p.id)+1) : targetOptions.has(p.id)?'可选':'不可选' }}</small>
        <small v-if="isActiveTarget(p.id)" class="nn-execution-tag">技能目标{{ activeTargets.length>1 ? ' '+(activeTargets.indexOf(p.id)+1):'' }}</small>
        <small v-else-if="activeActor===p.id" class="nn-actor-tag">执行者</small></span>
      </button>
      <button type="button" class="nn-identity-trigger"
        :class="{'nn-identity-known':Boolean(privateState?.identities?.[p.id]??p.identity)}"
        :aria-label="'查看 '+name(p.id)+' 的身份牌'" @click="inspectIdentity(p.id)">
        <img :src="asset((privateState?.identities?.[p.id]??p.identity)?.house??'card-back')" alt="">
        <span v-if="(privateState?.identities?.[p.id]??p.identity)?.rank" class="nn-identity-rank-badge">{{ (privateState?.identities?.[p.id]??p.identity)?.rank }}</span>
      </button>
      </div>
      </div>
      <TablePlays :ring="ring" :state="state" :name="name" :effects="effects" :epoch="connectionEpoch" :seat-layout="seatLayout"/>
      <section class="nn-stage">
        <p v-if="step==='draft1'">保留一张 · 两张传给左邻</p>
        <p v-else-if="step==='draft2'">收到右邻的两张牌</p>
        <p v-else-if="targetOptions.size">{{ step==='second'?'选择目标二':'从圆桌选择目标' }}</p>
        <div v-if="state.current" class="nn-active-card">
          <CardFace :id="state.current.card" compact/>
          <div><p>当前公开执行 · {{ name(state.current.player) }}</p>
            <p v-if="activeTargets.length" class="nn-execution-route">{{ name(activeActor!) }} → {{ activeTargets.map(name).join('、') }}</p>
            <p class="nn-active-effect">{{ skills[cards[state.current.card].skill][1] }}</p>
            <p v-if="attack">{{ attack.actors.map(name).join(' → ') }} · 攻击尚未裁决</p></div>
        </div>
        <div v-for="item in presented" :key="item.seq" class="nn-event" :class="{'nn-major-event':major(item)}" :data-event="item.kind" aria-live="polite">
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
          <p role="status"><span aria-hidden="true">封</span> {{ freshIntel.viewedBy ? name(freshIntel.viewedBy)+' 查看了你的 '+cardName(freshIntel.card!)+' '+cards[freshIntel.card!].number+'。' : freshIntel.actor ? name(freshIntel.actor)+' 对你使用了 '+cardName(freshIntel.actingCard!)+ '。' : freshIntel.counterpart ? '你与 '+name(freshIntel.counterpart)+' 是本次变形者的两名目标。'+freshIntel.text : (freshIntel.source ? skills[freshIntel.source][0]+' · ' : '')+freshIntel.text }}</p>
          <div class="nn-letter-cards">
            <IdentityCard v-if="freshIntel.identity" :identity="freshIntel.identity" :caption="freshIntel.roundIdentity?'你的本轮身份':freshIntel.target ? name(freshIntel.target)+' · 取得时' : '取得时的身份'"/>
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
          :locked="locked" :name="name" :shift-picked="shiftPicked" :shift-pair-mode="shiftPairMode"
          :merchant-give="merchantGive" :merchant-take="merchantTake"
          @merchant-give="chooseMerchant('give',$event)" @merchant-take="chooseMerchant('take',$event)"
          @select="select" @confirm="confirm"/>
    <aside class="nn-journal">
      <button @click="playDrawer?.showModal()">出牌区</button>
      <dialog ref="playDrawer" class="nn-board-dialog nn-play-drawer" aria-label="出牌区">
        <header><h2>第 {{ state.round }} 轮 · 出牌区</h2><form method="dialog"><button autofocus>关闭</button></form></header>
        <div class="nn-piles">
          <span><img :src="asset('card-back')" alt=""> 未发牌堆 {{ state.cardArea.undealt }} 张</span>
          <span><img :src="asset('card-back')" alt=""> 轮抽弃牌堆 {{ state.cardArea.discard }} 张</span>
        </div>
        <p v-if="!state.cardArea.played.length">暂无已公开牌</p>
        <article v-for="item in state.cardArea.played" :key="item.card">
          <CardFace :id="item.card"/>
          <p>{{ name(item.player) }} · {{ sources[item.source] }} · {{ statuses[item.status] }}</p>
          <p v-if="item.targets.length">目标：{{ item.targets.map(name).join('、') }}</p>
        </article>
      </dialog>
      <dialog ref="identityDialog" class="nn-board-dialog" aria-label="身份牌详情">
        <header><h2>{{ subject ? name(subject.id) : '' }} · 身份牌</h2><form method="dialog"><button autofocus>关闭</button></form></header>
        <template v-if="subject">
          <IdentityCard :identity="privateState?.identities?.[subject.id]??subject.identity" caption="当前可确认身份"/>
          <p>{{ exposure[privateState?.exposures?.[subject.id]??subject.exposure] }}</p>
          <h3>公开查看记录</h3>
          <p v-if="!historyViews.length">本轮暂无公开查看记录</p>
          <section v-for="group in historyGroups" :key="group.label">
            <h4>{{ group.label }}</h4>
            <ul><li v-for="event in group.events" :key="event.seq">{{ name(event.actors[0]) }} · {{ event.card?cardName(event.card):'技能' }}</li></ul>
          </section>
        </template>
      </dialog>
      <MatchReplay v-if="match.finished" :state="state" :name="name"/>
      <MatchReplay v-else-if="state.mode==='ready'" :key="state.round" :state="state" :name="name"
        round-only :targets="privateState?.tableTargets"/>
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
