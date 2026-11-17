<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { publicView } from './engine.ts'
import CardFace from './CardFace.vue'
import { cards, skills } from './cards.ts'

type State=ReturnType<typeof publicView>
type Play=State['cardArea']['played'][number]
type Point={x:number;y:number}
type Flying={play:Play;point:Point}
const props=defineProps<{ring?:HTMLElement;state:State;name:(id:string)=>string;effects:'full'|'light'|'reduced';epoch?:number}>()
const visible=computed(()=>props.state.cardArea.played.filter(play=>play.status==='queued'||play.status==='resolving'))
const fading=ref<Flying[]>([])
const bounds=ref({width:0,height:0})
const dialog=ref<HTMLDialogElement>(), selected=ref<Play>()
const fresh=ref<string[]>([])
const timers=new Set<number>()
let observer:ResizeObserver|undefined
const size=computed(()=>Math.max(30,Math.min(props.state.seats.length>=9?45:56,bounds.value.height*.16,bounds.value.width*.07)))
const cardName=(id:string)=>skills[cards[id].skill][0]
function layout(plays:Play[]) {
  const {width,height}=bounds.value
  const points=new Map<string,Point & {angle:number}>()
  const shells=props.ring?.querySelectorAll<HTMLElement>('.nn-seat-shell')
  if(!shells?.length) return points
  const center={x:width/2,y:height/2}
  const frame=props.ring!.getBoundingClientRect()
  const obstacles=Array.from(props.ring!.querySelectorAll<HTMLElement>('.nn-seat-shell,.nn-stage'),element=>element.getBoundingClientRect())
  const placed:Point[]=[]
  const covers=(point:Point)=>{
    const x=point.x+frame.left,y=point.y+frame.top
    return obstacles.some(box=>x+size.value*.46>box.left && x-size.value*.46<box.right &&
      y+size.value*.64>box.top && y-size.value*.64<box.bottom) ||
      placed.some(other=>Math.abs(other.x-point.x)<size.value*.8 && Math.abs(other.y-point.y)<size.value)
  }
  for(const shell of Array.from(shells)) {
    const group=plays.filter(play=>play.player===shell.dataset.player)
    const box=shell.getBoundingClientRect()
    const sx=box.left-frame.left+box.width/2, sy=box.top-frame.top+box.height/2
    const dx=center.x-sx, dy=center.y-sy, length=Math.hypot(dx,dy)||1
    const horizontal=Math.abs(dx)/width>Math.abs(dy)/height
    const distance=(horizontal?box.width:box.height)/2+size.value*(horizontal?.57:.74)+5
    const gap=size.value*(props.state.seats.length>=9?.42:.55)
    const fan=(depth:number,side:number)=>group.map((play,index)=>{
      const spread=index-(group.length-1)/2
      return {card:play.card,point:{x:sx+dx/length*depth-dy/length*(gap*spread+side),
        y:sy+dy/length*depth+dx/length*(gap*spread+side),angle:spread*(props.state.seats.length>=9?9:14)}}
    })
    const candidates=[0,8,16,-8,-16].flatMap(side=>[0,7,14,-7].map(delta=>fan(distance+delta,side)))
    const chosen=candidates.find(items=>items.every(({point})=>!covers(point)))??candidates[0]
    for(const {card,point} of chosen) {points.set(card,point);placed.push(point)}

  }
  return points
}
const positions=computed(()=>layout(visible.value))
const activeSpecial=computed(()=>props.state.presentation?.events.find(event=>
  event.card && ['mirror','martyr','master'].includes(event.kind)))
const specialLive=ref<number>()
function schedule(fn:()=>void,delay:number) {
  const timer=window.setTimeout(()=>{timers.delete(timer);fn()},delay)
  timers.add(timer)
}
function clearAnimations() {
  for(const timer of timers) clearTimeout(timer)
  timers.clear()
  fading.value=[];fresh.value=[];specialLive.value=undefined
}
watch([()=>props.epoch,()=>props.state.round,()=>props.state.cardArea.played,()=>activeSpecial.value?.seq],([epoch,round,played,special],[beforeEpoch,beforeRound,before,beforeSpecial])=>{
  if(epoch!==beforeEpoch || round!==beforeRound || props.effects==='reduced') {clearAnimations();return}
  if(special!==undefined && special!==beforeSpecial) specialLive.value=special
  const wasActive=before.filter(play=>play.status==='queued'||play.status==='resolving')
  const oldPoints=layout(wasActive)
  const introduced=visible.value.filter(play=>!before.some(item=>item.card===play.card)).map(play=>play.card)
  if(introduced.length) {
    fresh.value=[...fresh.value,...introduced]
    schedule(()=>fresh.value=fresh.value.filter(id=>!introduced.includes(id)),430)
  }
  const exits=played.flatMap(play=>{
    const point=oldPoints.get(play.card)
    return point && (play.status==='resolved'||play.status==='skipped')?[{play,point}]:[]
  })
  if(exits.length) {
    fading.value=[...fading.value,...exits]
    schedule(()=>fading.value=fading.value.filter(item=>!exits.some(exit=>exit.play.card===item.play.card)),760)
  }
},{flush:'post'})
watch(()=>props.effects,value=>{if(value==='reduced') clearAnimations()})
function measure() {
  if(props.ring) bounds.value={width:props.ring.clientWidth,height:props.ring.clientHeight}
}
onMounted(()=>{
  observer=new ResizeObserver(measure)
  watch(()=>props.ring,ring=>{
    observer?.disconnect()
    if(ring) {observer?.observe(ring);measure()}
  },{immediate:true})
})
onUnmounted(()=>{observer?.disconnect();clearAnimations()})
function inspect(play:Play) {selected.value=play;dialog.value?.showModal()}
function position(point?:Point,angle=0,travel=true) {
  return point?{left:point.x+'px',top:point.y+'px','--play-angle':angle+'deg',
    '--play-dx':(travel?bounds.value.width/2-point.x:0)+'px','--play-dy':(travel?bounds.value.height/2-point.y:0)+'px'}:{visibility:'hidden' as const}
}
const specialOrigin=computed(()=>{
  const event=activeSpecial.value
  if(!event || event.kind==='master') return {x:bounds.value.width/2,y:bounds.value.height/2}
  return layout([{player:event.actors[0],card:event.card!,source:'reaction',status:'resolved',targets:[]}]).get(event.card!)
    ??{x:bounds.value.width/2,y:bounds.value.height/2}
})
</script>

<template>
  <div class="nn-table-plays" :data-performance="effects" :style="{'--play-size':size+'px'}" aria-label="桌面公开牌">
    <button v-for="play in visible" :key="play.card" class="nn-table-play" :data-status="play.status"
      :data-fresh="fresh.includes(play.card)" :data-owner="play.player" :data-card="play.card"
      :style="position(positions.get(play.card),positions.get(play.card)?.angle)"
      :aria-label="name(play.player)+' · '+cardName(play.card)+' '+cards[play.card].number" @click="inspect(play)">
      <CardFace :id="play.card" compact/>
      <span class="nn-table-caption">{{ cardName(play.card) }}</span>
    </button>
    <span v-for="{play,point} in fading" :key="'exit-'+play.card" class="nn-table-flight" :data-status="play.status"
      :style="position(point,0,play.status==='resolved')" aria-hidden="true"><CardFace :id="play.card" compact/></span>
    <span v-if="activeSpecial && specialLive===activeSpecial.seq && effects!=='reduced'" :key="activeSpecial.seq"
      class="nn-table-flight nn-special-flight" :data-kind="activeSpecial.kind" :style="position(specialOrigin)" aria-hidden="true">
      <CardFace :id="activeSpecial.card!" compact/>
    </span>
    <dialog ref="dialog" class="nn-board-dialog" aria-label="公开卡牌详情">
      <header><h2>公开卡牌详情</h2><form method="dialog"><button autofocus>关闭</button></form></header>
      <template v-if="selected"><CardFace :id="selected.card"/><p>{{ name(selected.player) }}</p>
        <p v-if="selected.targets?.length">目标：{{ selected.targets.map(name).join('、') }}</p>
      </template>
    </dialog>
  </div>
</template>

<style scoped>
.nn-table-plays {position:absolute;inset:0;pointer-events:none;z-index:2}
.nn-table-play,.nn-table-flight {position:absolute;transform:translate(-50%,-50%) rotate(var(--play-angle,0deg));width:var(--play-size);padding:0;border-radius:.2rem}
.nn-table-play {pointer-events:auto;transition:left .24s,top .24s,transform .24s;background:#191d2c;border:1px solid #97805b}
.nn-table-caption {position:absolute;inset:auto 0 0;background:#151924ed;color:#fff2da;font-size:clamp(.52rem,1vw,.68rem);line-height:1.1;text-align:center;padding:2px;overflow-wrap:anywhere}
.nn-table-play[data-status=resolving] {border-color:#ffe3a0;outline:2px solid #ffe3a0;z-index:2}
.nn-table-play[data-fresh=true] {animation:nn-table-reveal .4s ease-out}
.nn-table-play:hover,.nn-table-play:focus-visible {transform:translate(-50%,-50%) scale(1.4);z-index:4}
.nn-table-play :deep(.nn-card-face),.nn-table-flight :deep(.nn-card-face) {display:block;min-width:0;width:100%;padding:0}
.nn-table-play :deep(.nn-card-copy),.nn-table-flight :deep(.nn-card-copy) {display:none}
.nn-table-play :deep(.nn-card-art img),.nn-table-flight :deep(.nn-card-art img) {width:100%;height:auto;aspect-ratio:.72;object-fit:cover}
.nn-table-flight {pointer-events:none;animation:nn-table-exit .68s ease-in-out both}
.nn-table-flight[data-status=skipped] {filter:brightness(.45);animation-duration:.42s}
.nn-special-flight {animation-duration:1.18s;z-index:5}
.nn-special-flight[data-kind=master] {animation-name:nn-table-master;animation-duration:1.28s}
.nn-table-plays[data-performance=light] .nn-table-flight {animation-name:nn-table-reveal;animation-direction:reverse;animation-duration:.35s}
.nn-table-plays[data-performance=reduced] .nn-table-play {animation:none;transition:none}
.nn-board-dialog {pointer-events:auto}
@keyframes nn-table-reveal {from{opacity:0}to{opacity:1}}
@keyframes nn-table-exit {0%{opacity:1} 65%{opacity:1} 100%{opacity:0;transform:translate(calc(-50% + var(--play-dx)),calc(-50% + var(--play-dy))) scale(1.2)}}
@keyframes nn-table-master {0%{opacity:0;transform:translate(-50%,-50%) scale(.6)} 40%,72%{opacity:1;transform:translate(-50%,-50%) scale(1.7)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.7)}}
@media(max-width:800px) {.nn-table-plays {display:none}}
@media(prefers-reduced-motion:reduce) {.nn-table-play {transition:none;animation:none}.nn-table-flight {display:none}}
</style>
