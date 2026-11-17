<script setup lang="ts">
import {computed} from 'vue'
import GameHistory from '../../apps/web/components/GameHistory.vue'
import CardFace from './CardFace.vue'
import IdentityCard from './IdentityCard.vue'
import {asset} from './art.ts'
import {cards,phaseNames} from './cards.ts'
import type {publicView,ReplayEntry} from './engine.ts'
import {timelineRows,type TableTargets} from './timeline.ts'

const props=defineProps<{state:ReturnType<typeof publicView>;name:(id:string)=>string;roundOnly?:boolean;targets?:TableTargets}>()
const portrait=(id:string)=>props.state.seats.find(seat=>seat.id===id)?.portrait
const labels:Record<string,string>={deal:'初始身份与发牌',draft1:'第一步轮抽',draft2:'第二步轮抽',commit:'实际出牌',target:'指定目标',second:'指定第二目标',choice:'技能选择',recover:'取得弃牌',reaction:'反应选择',intel:'私人情报', 'round-score':'本轮累计荣誉'}
const entries=computed<ReplayEntry[]>(()=>{
  if(!props.roundOnly) return props.state.replay??[]
  const rows=timelineRows(props.state.events,props.targets??[],props.state.round)
  const ordinary=rows.flatMap(row=>{
    const events=row.kind==='batch'?row.events:row.kind==='execution'?[row.play,...row.details]:[row.event]
    return events.map(event=>{
      const id=event.card??(row.kind==='execution'?row.play.card:undefined)
      const phase=id?cards[id].phase:undefined
      return {round:event.round,step:event.kind,result:event,phase:phase && phase!=='special'?phase:null}
    })
  })
  return [...ordinary,...(props.state.roundShifts??[]).map((item,i)=>({
    round:props.state.round,step:'变形者实际结果',phase:null,
    result:{seq:-1-i,round:props.state.round,at:0,kind:'shift-result',actors:item.actors,
      text:item.exchanged?'实际发生交换。':'实际没有交换。'},
  }))]
})
const rounds=computed(()=>{
  const rounds: {round:number; groups:{name:string;entries:ReplayEntry[]}[]}[]=[]
  for(const entry of entries.value) {
    if(rounds.at(-1)?.round!==entry.round) rounds.push({round:entry.round,groups:[]})
    const groups=rounds.at(-1)!.groups
    const name=['deal','round','draft1','draft2'].includes(entry.step)?'发牌与轮抽':entry.phase?phaseNames[entry.phase]:'轮末与结算'
    if(groups.at(-1)?.name!==name) groups.push({name,entries:[]})
    groups.at(-1)!.entries.push(entry)
  }
  return rounds
})
const rankings=computed(()=>Object.entries(props.state.finalScores??{}).sort((a,b)=>b[1]-a[1]))
function transfers(entry:ReplayEntry) {
  return (entry.honorChanges??[]).flatMap(to=>to.gained.flatMap(token=>{
    const from=entry.honorChanges?.find(change=>change.lost.some(item=>item.id===token.id))
    return from?[{from:from.id,to:to.id,token}]:[]
  }))
}
const choiceCards=(entry:ReplayEntry)=>entry.choice?.split(',').filter(id=>Object.hasOwn(cards,id))??[]
function choiceText(entry:ReplayEntry) {
  const value=entry.choice
  if(!value||choiceCards(entry).length) return ''
  if(value==='pass') return entry.step==='commit'?'跳过出牌':'放弃或超时未发动'
  if(value==='yes') return '发动效果'
  if(value==='house') return '查看流派'
  const token=value.match(/^(view|give|take):(\d+)$/)
  if(token) return ({view:'查看荣誉',give:'交出荣誉',take:'换入荣誉'}[token[1]]??'荣誉')+' #'+token[2]
  return props.name(value)
}
</script>

<template>
  <GameHistory :title="roundOnly?'本轮复盘':'完整复盘'">
    <div class="nn-replay">
      <template v-if="!roundOnly">
      <p v-if="!state.replayComplete">此存档缺少升级前的复盘明细，仅显示实际保存的内容。</p>
      <h3>最终排名</h3>
      <div v-for="[id,score] in rankings" :key="id" class="nn-replay-person">
        <img v-if="portrait(id)!==undefined" :src="asset('portrait-'+portrait(id))" alt="">
        <strong>{{ rankings.findIndex(([,points])=>points===score)+1 }} · {{ name(id) }} · {{ score }} 分{{ state.champions.includes(id)?' · 冠军':'' }}</strong>
        <IdentityCard v-if="state.finalIdentities?.find(seat=>seat.id===id)?.identity"
          :identity="state.finalIdentities.find(seat=>seat.id===id)!.identity!" caption="最终身份"/>
      </div>
      </template>
      <details v-for="round in rounds" :key="round.round" :open="roundOnly || undefined">
        <summary>第 {{ round.round }} 轮</summary>
        <section v-for="(group,i) in round.groups" :key="i">
          <h3>{{ group.name }}</h3>
          <article v-for="(entry,j) in group.entries" :key="j" class="nn-replay-row" :data-step="entry.step">
            <strong>{{ labels[entry.step] ?? entry.result?.text }}</strong>
            <div v-if="entry.player || entry.result?.actors.length" class="nn-replay-cards">
              <span v-for="(id,k) in (entry.player?[entry.player]:entry.result?.actors)" :key="k" class="nn-replay-person">
                <span v-if="k && ['target','attack'].includes(entry.step)" aria-hidden="true">→</span>
                <img v-if="portrait(id)!==undefined" :src="asset('portrait-'+portrait(id))" alt="">{{ name(id) }}
              </span>
              <span v-if="entry.choice && choiceText(entry)"> → {{ choiceText(entry) }}</span>
            </div>
            <p v-if="entry.intel">{{ entry.intel.text }} {{ entry.intel.target ? name(entry.intel.target) : '' }}{{ entry.intel.viewedBy ? ' · 查看者 '+name(entry.intel.viewedBy) : '' }}{{ entry.intel.honor!==undefined?' · '+entry.intel.honor+' 分':'' }}</p>
            <IdentityCard v-if="entry.intel?.identity" :identity="entry.intel.identity" caption="当时查阅"/>
            <IdentityCard v-for="(identity,id) in entry.result?.identities" :key="id" :identity="identity" :caption="name(id)+' · 当时公开'"/>
            <div class="nn-replay-cards">
              <CardFace v-for="id in choiceCards(entry)" :key="id" :id="id" compact/>
              <CardFace v-if="entry.card || entry.result?.card || entry.intel?.card" :id="(entry.card || entry.result?.card || entry.intel?.card)!" compact/>
            </div>
            <div v-for="item in entry.draft" :key="item.id">
              <strong>{{ name(item.id) }}</strong>
              <div class="nn-replay-cards">保留 <CardFace :id="item.kept" compact/></div>
              <div v-if="item.passed" class="nn-replay-cards">传出 → <CardFace v-for="id in item.passed" :key="id" :id="id" compact/></div>
              <div v-if="item.received" class="nn-replay-cards">← 收到 <CardFace v-for="id in item.received" :key="id" :id="id" compact/></div>
              <div v-if="item.discarded" class="nn-replay-cards">弃牌 <CardFace :id="item.discarded" compact/></div>
            </div>
            <p v-for="transfer in transfers(entry)" :key="transfer.token.id">{{ name(transfer.from) }} → {{ name(transfer.to) }} · {{ transfer.token.value }} 分荣誉</p>
            <div v-for="change in entry.honorChanges" :key="change.id" class="nn-replay-cards">
              <strong>{{ name(change.id) }} · {{ change.before }} → {{ change.after }} 分</strong>
              <span v-for="token in change.gained" :key="'gain-'+token.id" class="nn-honor"><img :src="asset('honor-front')" alt=""><b>+{{ token.value }}</b></span>
              <span v-for="token in change.lost" :key="'loss-'+token.id" class="nn-honor"><img :src="asset('honor-front')" alt=""><b>−{{ token.value }}</b></span>
            </div>
            <small v-if="entry.step==='honor' && !entry.honorChanges && !roundOnly">旧记录仅保留荣誉快照。</small>
            <div v-for="seat in entry.seats" :key="seat.id">
              <strong>{{ name(seat.id) }}</strong>
              <IdentityCard v-if="seat.identity" :identity="seat.identity" :caption="seat.alive ? '当时身份 · 存活' : '当时身份 · 已死亡'"/>
              <div v-if="seat.hand" class="nn-replay-cards"><CardFace v-for="id in seat.hand" :key="id" :id="id" compact/></div>
              <div v-if="seat.honor">累计 {{ seat.score }} 分
                <span v-for="token in seat.honor" :key="token.id" class="nn-honor" :title="'荣誉 #'+token.id"><img :src="asset('honor-front')" alt=""><b>{{ token.value }}</b></span>
              </div>
            </div>
          </article>
        </section>
      </details>
    </div>
  </GameHistory>
</template>
