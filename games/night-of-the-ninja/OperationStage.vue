<script setup lang="ts">
import {computed} from 'vue'
import {cards,skills,phaseNames} from './cards.ts'
import {asset} from './art.ts'
import type {publicView,privateView} from './engine.ts'
import CardFace from './CardFace.vue'
import IdentityCard from './IdentityCard.vue'

type State=ReturnType<typeof publicView>
type Own=NonNullable<ReturnType<typeof privateView>>
type Option=Own['options'][number]
const props=defineProps<{state:State;own?:Own;selected:string;locked:boolean;name:(id:string)=>string}>()
defineEmits<{select:[string];confirm:[]}>()
const options=computed(()=>props.own?.options??[])
const step=computed(()=>props.own?.action?.step??props.state.mode)
const targets=computed(()=>props.own?.action?.targets??[])
const aiming=computed(()=>options.value.some(option=>option.target))
const current=computed(()=>props.state.current && cards[props.state.current.card])
const ownIntel=computed(()=>{
  if(step.value!=='choice' || !current.value) return []
  return targets.value.flatMap(id=>{
    const entry=props.own?.intel.findLast(item=>item.round===props.state.round && item.target===id && item.source===current.value?.skill)
    return entry?[entry]:[]
  })
})
const prompt=computed(()=>{
  if(!props.own) return '旁观 · 当前公开战况'
  if(props.own.submitted) return '已提交 · 等待其他玩家或阶段结束'
  if(!options.value.length) return props.state.mode==='commit' ? '本阶段无需你出牌' : '等待当前步骤完成'
  switch(step.value){
    case 'draft1': return '选一张留下，其余两张向左传'
    case 'draft2': return '从别人传来的两张中留一张'
    case 'commit': return '秘密选择本阶段要打出的牌'
    case 'target': return current.value?.skill==='shift'?'选择第一名目标':'选择一名合法目标'
    case 'second': return '选择第二名目标'
    case 'recover': return '从查到的弃牌中取得一张'
    case 'reaction': return '你受到攻击，选择一张反应牌或不反应'
    case 'ready': return '查看本轮结果，然后准备下一轮'
    case 'choice':
      if(options.value.some(option=>option.value.startsWith('give:'))) return '选择要交出的一枚本人荣誉，或放弃交换'
      if(options.value.some(option=>option.value.startsWith('take:'))) return '从对方的荣誉背面选一枚，或放弃交换'
      if(options.value.some(option=>option.value==='house')) return '查阅目标流派或查阅对方一枚荣誉'
      if(current.value?.skill==='shift') return '核对两份私人情报，决定是否交换'
      if(current.value?.skill==='shinobi') return '查看取得的身份，决定是否刺杀'
      if(current.value?.skill==='trouble') return '查看取得的身份，决定是否公开'
      if(current.value?.skill==='dig') return '决定立即使用这张牌，或留在手牌中'
      return '选择技能的后续效果'
    default: return '选择并确认你的行动'
  }
})
const stageHelp=computed(()=>{
  if(step.value==='draft1') return '本次秘密保留 1 张 · 其余 2 张 → 左手玩家'
  if(step.value==='draft2') return '右手玩家 → 传来 2 张 · 保留 1 张 · 另 1 张进入弃牌区'
  if(step.value==='commit' && props.state.night) return phaseNames[props.state.night]+'阶段 · 全员提交后统一亮牌，按编号依次执行'
  if(step.value==='reaction') return '本次攻击最多使用一张反应牌。超时视为不反应。'
  return ''
})
const handMode=computed(()=>['draft1','draft2','commit','reaction'].includes(step.value))
const inactiveCards=computed(()=>props.own?.hand.filter(id=>!options.value.some(option=>option.card===id))??[])
const cardIds=(option:Option)=>option.card?[option.card]:
  step.value==='commit' && option.value.includes(',')?option.value.split(','):[]
const optionLabel=(option:Option)=>option.card?
  option.label+' '+skills[cards[option.card].skill][0]+' '+cards[option.card].number:option.label
const honorFace=(option:Option)=>option.value.startsWith('give:')
  ? props.own?.honor.find(token=>token.id===Number(option.value.slice(5)))?.value
  : undefined
const isToken=(option:Option)=>/^(view|give|take):/.test(option.value)
const passLabel=computed(()=>step.value==='reaction'?'不使用反应':
  step.value==='commit'?'本阶段不出牌':current.value?.skill==='dig'?'保留手牌':
  current.value?.skill==='merchant'?'结束这次技能':'不发动额外效果')
</script>

<template>
  <section class="nn-operation" :data-action="step">
    <p class="nn-operation-kicker">{{ options.length ? '轮到你操作' : own?.submitted ? '行动已锁定' : '当前战况' }}</p>
    <h3 aria-live="polite">{{ prompt }}</h3>
    <p v-if="stageHelp" class="nn-step-help">{{ stageHelp }}</p>
    <p v-if="!options.length && state.mode==='commit' && own && !own.submitted" class="nn-step-help">已死亡的玩家仍可公聊并查看结果。</p>

    <div v-if="targets.length" class="nn-target-trail" aria-label="已确认目标">
      <span v-for="(id,i) in targets" :key="id">目标 {{ i+1 }} · {{ name(id) }}</span>
    </div>
    <div v-if="ownIntel.length" class="nn-decision-intel" aria-label="本次技能的私人情报">
      <template v-for="entry in ownIntel" :key="entry.seq">
        <IdentityCard v-if="entry.identity" :identity="entry.identity" :caption="name(entry.target!)+' · 取得时'"/>
        <span v-if="entry.honor!==undefined" class="nn-decision-token">
          <span class="nn-honor"><img :src="asset('honor-front')" alt=""><b>{{ entry.honor }}</b></span> 查阅时的分值
        </span>
      </template>
    </div>
    <div v-if="options.length" class="nn-options">
      <div v-if="!aiming" class="nn-action-deck" :class="{'nn-card-deck':options.some(option=>cardIds(option).length),'nn-hand':handMode}"
        :aria-label="handMode?'本人手牌':undefined">
        <button v-for="option in options" :key="option.value" type="button" class="nn-choice"
          :class="{'nn-choice-card':cardIds(option).length,'nn-choice-pass':option.value==='pass'}"
          :aria-label="optionLabel(option)" :aria-pressed="selected===option.value" :disabled="locked"
          @click="$emit('select',option.value)">
          <template v-if="cardIds(option).length">
            <span class="nn-choice-cards"><CardFace v-for="id in cardIds(option)" :key="id" :id="id" :compact="cardIds(option).length>1"/></span>
            <strong>{{ option.label }}</strong>
          </template>
          <template v-else-if="isToken(option)">
            <span class="nn-honor"><img :src="asset(honorFace(option)===undefined?'honor-back':'honor-front')" alt=""><b v-if="honorFace(option)!==undefined">{{ honorFace(option) }}</b></span>
            <strong>{{ option.label }}</strong>
          </template>
          <template v-else>
            <img v-if="option.value==='house'" :src="asset('card-back')" alt="">
            <span v-else class="nn-choice-symbol" aria-hidden="true">{{ option.value==='pass'?'—':'◇' }}</span>
            <strong>{{ option.value==='pass'?passLabel:option.label }}</strong>
          </template>
          <small v-if="selected===option.value" class="nn-choice-selected">已选</small>
        </button>
        <div v-for="id in handMode?inactiveCards:[]" :key="id" class="nn-hand-card">
          <CardFace :id="id" compact/>
          <small>{{ step==='draft2'?'第一步已保留 · 已锁定':'当前不可操作' }}</small>
        </div>
      </div>
      <div class="nn-confirm">
        <span>{{ selected ? '已选 · 等待确认' : '先选一项，再确认' }}</span>
        <button type="button" class="primary" :disabled="!selected || locked" @click="$emit('confirm')">确认提交</button>
      </div>
    </div>
    <div v-if="own?.hand.length && (!handMode || !options.length)" class="nn-hand" aria-label="本人手牌">
      <CardFace v-for="id in own.hand" :key="id" :id="id" compact/>
    </div>
  </section>
</template>
