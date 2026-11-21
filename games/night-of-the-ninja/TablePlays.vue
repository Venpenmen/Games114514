<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { publicView } from './engine.ts'
import CardFace from './CardFace.vue'
import { cards, skills } from './cards.ts'

type State=ReturnType<typeof publicView>
type Play=State['cardArea']['played'][number]
type Point={x:number;y:number}
type Flying={play:Play;point:Point}
const props=defineProps<{ring?:HTMLElement;state:State;name:(id:string)=>string;effects:'full'|'light'|'reduced';epoch?:number;seatLayout:number}>()
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
  const placed:DOMRect[]=[]
  const landscape=matchMedia('(orientation:landscape) and (max-width:1000px) and (max-height:500px)').matches
  const padding=landscape?(height<=160?.5:2):5
  const intersects=(a:DOMRect,b:DOMRect)=>a.left<b.right+padding && a.right>b.left-padding &&
    a.top<b.bottom+padding && a.bottom>b.top-padding
  // The painted card is portrait, not a square around its center. Include its rotation.
  const boxFor=(point:Point & {angle:number})=>{
    const angle=Math.abs(point.angle)*Math.PI/180
    const cardWidth=size.value+2,cardHeight=Math.max(44,size.value/.72+2)
    const w=cardWidth*Math.cos(angle)+cardHeight*Math.sin(angle)
    const h=cardHeight*Math.cos(angle)+cardWidth*Math.sin(angle)
    return new DOMRect(frame.left+(landscape?1:0)+point.x-w/2,frame.top+(landscape?1:0)+point.y-h/2,w,h)
  }
  const collisions=(items:{card:string;point:Point & {angle:number}}[])=>{
    let cost=0
    for(const {point} of items) {
      const box=boxFor(point)
      if(box.left<frame.left+padding || box.right>frame.right-padding ||
         box.top<frame.top+padding || box.bottom>frame.bottom-padding) cost+=100
      cost+=obstacles.filter(other=>intersects(box,other)).length*10
      cost+=placed.filter(other=>intersects(box,other)).length*10
    }
    if(landscape)for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)if(intersects(boxFor(items[i].point),boxFor(items[j].point)))cost+=10
    return cost
  }
  for(const shell of Array.from(shells)) {
    const group=plays.filter(play=>play.player===shell.dataset.player)
    if(!group.length) continue
    const box=shell.getBoundingClientRect()
    const sx=box.left-frame.left+box.width/2, sy=box.top-frame.top+box.height/2
    const dx=center.x-sx, dy=center.y-sy, length=Math.hypot(dx,dy)||1
    const nx=dx/length,ny=dy/length
    // Distance to the actual edge of the combined nameplate + identity card.
    const edge=Math.min(Math.abs(nx)>.001?box.width/(2*Math.abs(nx)):Infinity,
      Math.abs(ny)>.001?box.height/(2*Math.abs(ny)):Infinity)
    const distance=edge+size.value/.72*.58+8
    const gap=size.value*(props.state.seats.length>=9?.5:.66)
    const fan=(depth:number,side:number)=>group.map((play,index)=>{
      const spread=index-(group.length-1)/2
      return {card:play.card,point:{x:sx+nx*depth-ny*(gap*spread+side),
        y:sy+ny*depth+nx*(gap*spread+side),angle:spread*(props.state.seats.length>=9?9:14)}}
    })
    const candidates=[0,12,-12,24,-24,40,-40,56,-56,80,-80].flatMap(side=>
      [0,10,20,32,48,64,80,-8,-16].map(delta=>fan(distance+delta,side)))
    // Landscape keeps the owner relationship horizontal, independent of table center angle.
    if(landscape){
      const stage=props.ring!.querySelector('.nn-stage')!.getBoundingClientRect()
      const left=sx<center.x,cardWidth=size.value+2,cardHeight=Math.max(44,size.value/.72+2)
      const inner=left?box.right-frame.left+cardWidth/2+padding:box.left-frame.left-cardWidth/2-padding
      const limit=left?stage.left-frame.left-cardWidth/2-padding:stage.right-frame.left+cardWidth/2+padding
      const xs=[inner,(inner+limit)/2,limit]
      const preferred=[]
      for(const delta of [0,-12,12,-24,24,-48,48,-72,72])for(const x of xs){
        preferred.push(group.map((play,index)=>({card:play.card,point:{x,y:sy+delta+(index-(group.length-1)/2)*(cardHeight+padding*2),angle:0}})))
      }
      candidates.unshift(...preferred)
    }
    // Dense landscape: sample the free band at the stage's vertical center first.
    // A grid anchored at the top misses this narrow band between both seat rows.
    if(landscape && !candidates.some(items=>collisions(items)===0)) {
      const stage=props.ring!.querySelector('.nn-stage')?.getBoundingClientRect()
      const ys=stage?[(stage.top+stage.bottom)/2-frame.top]:[height/2]
      for(let y=Math.max(44,size.value/.72)/2+2;y<height-Math.max(44,size.value/.72)/2-2;y+=size.value/.72+7)ys.push(y)
      const spare:{x:number;y:number}[]=[]
      for(const y of ys)for(let x=size.value/2+2;x<width-size.value/2-2;x+=size.value+7)spare.push({x,y})
      spare.sort((a,b)=>Math.hypot(a.x-sx,a.y-sy)-Math.hypot(b.x-sx,b.y-sy))
      candidates.push(...spare.map(origin=>group.map((play,index)=>({card:play.card,point:{x:origin.x+(index-(group.length-1)/2)*(size.value+7),y:origin.y,angle:0}}))))
      // Edge-aligned candidates cover narrow free rectangles missed by a fixed grid.
      const hw=((size.value+2)+(group.length-1)*(size.value+7))/2,hh=Math.max(44,size.value/.72+2)/2
      const xs=[hw+padding,width-hw-padding],edgeYs=[hh+padding,height-hh-padding,...ys]
      for(const obstacle of [...obstacles,...placed]) {
        xs.push(obstacle.left-frame.left-1-hw-padding,obstacle.right-frame.left-1+hw+padding)
        edgeYs.push(obstacle.top-frame.top-1-hh-padding,obstacle.bottom-frame.top-1+hh+padding)
      }
      const edges=xs.flatMap(x=>edgeYs.map(y=>({x,y}))).sort((a,b)=>Math.hypot(a.x-sx,a.y-sy)-Math.hypot(b.x-sx,b.y-sy))
      candidates.push(...edges.map(origin=>group.map((play,index)=>({card:play.card,point:{x:origin.x+(index-(group.length-1)/2)*(size.value+7),y:origin.y,angle:0}}))))

    }
    const chosen=candidates.find(items=>collisions(items)===0) ??
      candidates.reduce((best,items)=>collisions(items)<collisions(best)?items:best,candidates[0])
    for(const {card,point} of chosen) {points.set(card,point);placed.push(boxFor(point))}
  }
  if(landscape && [...points.values()].some((p,i,a)=>{const b=boxFor(p);return b.left<frame.left+padding||b.right>frame.right-padding||b.top<frame.top+padding||b.bottom>frame.bottom-padding||obstacles.some(o=>intersects(b,o))||a.slice(i+1).some(q=>intersects(b,boxFor(q)))})){
    const hw=(size.value+2)/2,hh=Math.max(44,size.value/.72+2)/2
    const xs=[hw+padding,width-hw-padding,...obstacles.flatMap(b=>[b.left-frame.left-1-hw-padding,b.right-frame.left-1+hw+padding])]
    const slots:Point[]=[]
    for(const x of xs)for(let y=hh+padding;y<=height-hh-padding;y+=hh*2+padding*2){const b=boxFor({x,y,angle:0});if(b.left>=frame.left+padding&&b.right<=frame.right-padding&&!obstacles.some(o=>intersects(b,o)))slots.push({x,y})}
    const unique=slots.filter((p,i)=>slots.findIndex(q=>Math.abs(p.x-q.x)<1&&Math.abs(p.y-q.y)<1)===i)
    let attempts=0
    const used:DOMRect[]=[],packed=new Map<string,Point & {angle:number}>()
    function pack(index:number):boolean{
      if(index===plays.length)return true
      if(++attempts>10000)return false
      const play=plays[index],owner=Array.from(shells!).find(s=>s.dataset.player===play.player)!.getBoundingClientRect()
      const ordered=[...unique].sort((a,b)=>Math.hypot(frame.left+a.x-owner.x-owner.width/2,frame.top+a.y-owner.y-owner.height/2)-Math.hypot(frame.left+b.x-owner.x-owner.width/2,frame.top+b.y-owner.y-owner.height/2))
      for(const p of ordered){const point={...p,angle:0},b=boxFor(point);if(used.some(o=>intersects(b,o)))continue;used.push(b);packed.set(play.card,point);if(pack(index+1))return true;packed.delete(play.card);used.pop()}
      return false
    }
    if(pack(0))return packed
  }
  return points
}
const positions=computed(()=>props.seatLayout ? layout(visible.value) : new Map<string,Point & {angle:number}>())
const activeSpecial=computed(()=>props.state.presentation?.events.find(event=>
  event.card && ['mirror','martyr','master'].includes(event.kind)))
const specialLive=ref<number>()
function schedule(fn:()=>void,delay:number) {
  const timer=window.setTimeout(()=>{timers.delete(timer);fn()},delay*props.state.presentationSpeed)
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
watch(()=>props.state.presentation?.id,()=>{clearAnimations()},{flush:'pre'})
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
      <span class="nn-table-caption">{{ cardName(play.card) }}</span><span class="nn-table-owner">{{ name(play.player) }}</span>
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
.nn-table-play,.nn-table-flight {position:absolute;transform:translate(-50%,-50%) rotate(var(--play-angle,0deg));width:var(--play-size);aspect-ratio:.72;padding:0;border-radius:.2rem;overflow:hidden}
.nn-table-play {pointer-events:auto;transition:left .24s,top .24s,transform .24s;background:#191d2c;border:1px solid #97805b}
.nn-table-owner{display:none}
@media(orientation:landscape) and (max-width:1000px) and (max-height:500px){.nn-table-caption{display:none}.nn-table-owner{display:block;position:absolute;inset:auto 0 0;background:#151924ed;color:#fff2da;font-size:8px;line-height:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.nn-table-caption {position:absolute;inset:auto 0 0;background:#151924ed;color:#fff2da;font-size:clamp(.52rem,1vw,.68rem);line-height:1.1;text-align:center;padding:2px;overflow-wrap:anywhere}
.nn-table-play[data-status=resolving] {border-color:#ffe3a0;outline:2px solid #ffe3a0;z-index:2}
.nn-table-play[data-fresh=true] {animation:nn-table-reveal calc(.4s * var(--ux-speed,1)) ease-out}
.nn-table-play:hover,.nn-table-play:focus-visible {transform:translate(-50%,-50%) scale(1.4);z-index:4}
.nn-table-play :deep(.nn-card-face),.nn-table-flight :deep(.nn-card-face) {display:block;box-sizing:border-box;min-width:0;width:100%;height:100%;max-width:none;padding:0;border:0;overflow:hidden}
.nn-table-play :deep(.nn-card-copy),.nn-table-flight :deep(.nn-card-copy) {display:none}
.nn-table-play :deep(.nn-card-art),.nn-table-flight :deep(.nn-card-art) {display:block;width:100%;height:100%;min-width:0;flex:none}
.nn-table-play :deep(.nn-card-art img),.nn-table-flight :deep(.nn-card-art img) {display:block;width:100%;height:100%;aspect-ratio:auto;object-fit:cover;object-position:center}
.nn-table-flight {pointer-events:none;animation:nn-table-exit calc(.68s * var(--ux-speed,1)) ease-in-out both}
.nn-table-flight[data-status=skipped] {filter:brightness(.45);animation-duration:calc(.42s * var(--ux-speed,1))}
.nn-special-flight {animation-duration:calc(1.18s * var(--ux-speed,1));z-index:5}
.nn-special-flight[data-kind=master] {animation-name:nn-table-master;animation-duration:calc(1.28s * var(--ux-speed,1))}
.nn-table-plays[data-performance=light] .nn-table-flight {animation-name:nn-table-reveal;animation-direction:reverse;animation-duration:calc(.35s * var(--ux-speed,1))}
.nn-table-plays[data-performance=reduced] .nn-table-play {animation:none;transition:none}
.nn-board-dialog {pointer-events:auto}
@keyframes nn-table-reveal {from{opacity:0}to{opacity:1}}
@keyframes nn-table-exit {0%{opacity:1} 65%{opacity:1} 100%{opacity:0;transform:translate(calc(-50% + var(--play-dx)),calc(-50% + var(--play-dy))) scale(1.2)}}
@keyframes nn-table-master {0%{opacity:0;transform:translate(-50%,-50%) scale(.6)} 40%,72%{opacity:1;transform:translate(-50%,-50%) scale(1.7)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.7)}}
@media(max-width:800px) {.nn-table-plays {display:none}}
@media(prefers-reduced-motion:reduce) {.nn-table-play {transition:none;animation:none}.nn-table-flight {display:none}}
</style>
