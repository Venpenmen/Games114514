<script setup lang="ts">
import {computed} from 'vue'
import type {publicView,privateView} from './engine.ts'
import {cards,skills} from './cards.ts'
import {asset} from './art.ts'
import IdentityCard from './IdentityCard.vue'
type Own=NonNullable<ReturnType<typeof privateView>>
const props=defineProps<{state:ReturnType<typeof publicView>;own:Own;selected:string;locked:boolean;name:(id:string)=>string;shiftPicked:string[];intel:Own['intel'];give?:number|null;take?:number|null}>()
defineEmits<{select:[string];give:[number];take:[number]}>()
const skill=computed(()=>cards[props.state.current!.card].skill)
const targetNames=computed(()=>props.own.action?.targets.map(props.name).join('、')??'')
const label=(option:Own['options'][number])=>option.value==='house'?'查看流派':skill.value==='shift'&&props.own.action?.step==='choice'&&option.value==='pass'?'不交换':option.label
const selectedTarget=computed(()=>props.own.options.find(o=>o.value===props.selected)?.target)
const pair=computed(()=>props.own.options.some(o=>o.value.startsWith('pair:')))
</script>
<template>
 <Teleport to=".nn-stage" defer>
 <section class="nn-mobile-skill" :data-skill="skill" :data-step="own.action?.step" aria-label="手机技能操作">
  <header><strong>{{ skills[skill][0] }}</strong><span class="nn-mobile-target-route" :title="targetNames">{{ targetNames || (pair?'点选圆桌上的两名目标':'选择合法效果，随后确认') }}</span></header>
  <div v-if="pair" class="nn-mobile-pair"><div v-for="i in 2" :key="i"><b>目标 {{ i }}</b><span :title="shiftPicked[i-1]?name(shiftPicked[i-1]):''">{{ shiftPicked[i-1]?name(shiftPicked[i-1]):'尚未选择' }}</span></div><p>再点取消 · 两名不同目标 · 底部统一确认</p></div>
  <div v-else-if="own.action?.step==='target'||own.action?.step==='second'" class="nn-mobile-pair"><p>{{ own.action?.step==='second'?'点选圆桌上的第二名目标':'点选圆桌上的合法目标' }}</p><p>{{ selectedTarget?'已选 · '+name(selectedTarget):'尚未选择' }}</p><p>底部确认后才提交</p></div>
  <div v-else-if="own.merchant" class="nn-mobile-exchange">
   <div class="nn-mobile-token-columns">
    <section><h4>自己的荣誉</h4><div class="nn-mobile-token-grid">
     <button v-for="(t,i) in own.merchant.mine" :key="t.id" :aria-label="'交出第 '+(i+1)+' 枚荣誉'" :aria-pressed="give===t.id" :disabled="locked" @click="$emit('give',t.id)"><span class="nn-honor"><img :src="asset('honor-front')" alt=""><b>{{ t.value }}</b></span><small>第 {{ i+1 }} 枚</small></button>
    </div></section>
    <section><h4 :title="name(own.merchant.target)">{{ name(own.merchant.target) }}的荣誉</h4><div class="nn-mobile-token-grid">
     <button v-for="t in own.merchant.theirs" :key="t.id" :aria-label="'取得第 '+t.index+' 枚荣誉'" :aria-pressed="take===t.id" :disabled="locked" @click="$emit('take',t.id)"><span class="nn-honor"><img :src="asset(t.value===undefined?'honor-back':'honor-front')" alt=""><b v-if="t.value!==undefined">{{ t.value }}</b></span><small>第 {{ t.index }} 枚</small></button>
    </div></section>
   </div>
   <button class="nn-mobile-pass" :aria-pressed="selected==='pass'" :disabled="locked" @click="$emit('select','pass')">放弃交换</button>
  </div>
  <template v-else>
   <p v-if="skill==='merchant'" class="nn-mobile-read-hint">{{ own.options.filter(o=>o.value.startsWith('view:')).length ? '选择一枚荣誉查阅；未查阅的分值保持隐藏' : '目标没有可查阅的荣誉' }}</p>
   <div v-if="intel.length" class="nn-mobile-identities"><IdentityCard v-for="(entry,i) in intel" :key="entry.seq" :identity="entry.identity??null" :caption="entry.target?'目标 '+(i+1)+' · '+name(entry.target)+' · 查看时':'查看结果'"/></div>
   <div class="nn-mobile-effect-grid">
    <button v-for="option in own.options" :key="option.value" :aria-label="label(option)" :aria-pressed="selected===option.value" :disabled="locked" @click="$emit('select',option.value)">
     <span v-if="option.value.startsWith('view:')" class="nn-honor"><img :src="asset('honor-back')" alt=""></span>
     <img v-else-if="option.value==='house'" class="nn-mobile-house-back" :src="asset('card-back')" alt="">
     <strong>{{ label(option) }}</strong>
    </button>
   </div>
  </template>
 </section>
 </Teleport>
</template>
<style scoped>
.nn-mobile-skill{display:none}
@media(orientation:landscape) and (max-width:1000px) and (max-height:500px){.nn-mobile-skill{display:flex}}
</style>
