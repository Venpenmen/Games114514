<script setup lang="ts">
import {ref,useId} from 'vue'
import frozenRules from '../../docs/games/night-of-the-ninja/RULES.md?raw'
import {cards,deck,phaseNames,phases,skills,type Skill} from './cards.ts'
import {guides,help} from './rule-guide.ts'
import {asset} from './art.ts'
import CardFace from './CardFace.vue'
import './p20.css'

defineProps<{step?:string}>()
const dialog=ref<HTMLDialogElement>()
const title=useId()
const pages={quick:'一分钟入门',skills:'技能图解',full:'完整冻结规则',stage:'当前阶段帮助'} as const
const tab=ref<keyof typeof pages>('quick')
function open(page:keyof typeof pages) {
  tab.value=page
  dialog.value?.showModal()
}
const categories:{title:string;skills:Skill[]}[]=[
  {title:'查看情报',skills:['spy','mystic']},
  {title:'交换与资源',skills:['shift','dig','merchant','thief']},
  {title:'公开与攻击',skills:['trouble','judge','blind','shinobi']},
  {title:'反应与揭示',skills:['mirror','martyr','master']},
]
const example=(skill:Skill)=>deck.find(card=>card.skill===skill)!.id
type Block={kind:'h2'|'h3'|'h4'|'p'|'quote'|'ul'|'ol'|'table';lines:string[]}
const blocks:Block[]=[]
for(const line of frozenRules.split(/\r?\n/)){
  if(!line.trim()) continue
  const heading=line.match(/^(#{1,4}) (.*)$/)
  if(heading) {
    blocks.push({kind:heading[1].length<3?'h2':heading[1].length===3?'h3':'h4',lines:[heading[2]]})
    continue
  }
  if(/^\|[\s:|\-]+\|$/.test(line)) continue
  const kind=line.startsWith('|')?'table':line.startsWith('>')?'quote':line.startsWith('- ')?'ul':/^\d+\. /.test(line)?'ol':'p'
  const content=line.replace(/^(> ?|- |\d+\. )/,'').replace(/\\$/,'')
  if(kind!=='p' && blocks.at(-1)?.kind===kind) blocks.at(-1)!.lines.push(content)
  else blocks.push({kind,lines:[content]})
}
const cells=(line:string)=>line.split('|').slice(1,-1).map(cell=>cell.trim())
const readable=(line:string)=>line.replace(/\*\*/g,'').replace(/<(https?:\/\/[^>]+)>/g,'$1')
</script>

<template>
  <div class="nn-rule-entry">
    <button type="button" @click="open('quick')">游戏规则</button>
    <button v-if="step" type="button" @click="open('stage')">阶段帮助</button>
    <dialog ref="dialog" class="nn-guide" :aria-labelledby="title">
      <header class="nn-guide-heading">
        <h2 :id="title">忍者之夜 · 游戏规则</h2>
        <form method="dialog"><button autofocus>关闭</button></form>
      </header>
      <nav aria-label="规则章节">
        <button v-for="(label,key) in pages" v-show="key!=='stage' || step" :key="key" type="button"
          :aria-pressed="tab===key" @click="tab=key">{{ label }}</button>
      </nav>
      <div v-if="tab==='quick'" class="nn-guide-body">
        <h3>赢下比拼，积累 10 分荣誉</h3>
        <p>每轮先为流派争取奖励，荣誉分留给个人。轮末发完所有奖励后，总分最高且至少 10 分的玩家夺冠。</p>
        <ol class="nn-guide-flow">
          <li><img :src="asset('crane')" alt=""><div><strong>领取身份</strong><p>查看自己的流派与等级。1 是最高等级。</p></div></li>
          <li><img :src="asset('card-back')" alt=""><div><strong>两步轮抽</strong><p>发到三张 → 留一、向左传二 → 从收到的两张再留一。</p></div></li>
          <li><img :src="asset('spy')" alt=""><div><strong>五阶段夜晚</strong><p>先秘密选择、再统一亮牌，按编号结算。</p>
            <div class="nn-guide-phases"><span v-for="phase in phases" :key="phase" :data-phase="phase">{{ phaseNames[phase] }}</span></div></div></li>
          <li><img :src="asset('lotus')" alt=""><div><strong>流派揭示</strong><p>存活者揭示真实流派。比较等级，平手就比较下一位。</p></div></li>
          <li><img :src="asset('honor-front')" alt=""><div><strong>荣誉结算</strong><p>胜派成员与存活浪人领奖。各人只能查看自己的分值。</p></div></li>
        </ol>
        <p class="nn-guide-example">示例：鹤派最高是 2，莲派最高是 3 → 鹤派获胜，即使阵亡的鹤派成员也领奖。首脑和平局另有规则。</p>
      </div>
      <div v-else-if="tab==='skills'" class="nn-guide-body">
        <p>按用途查找技能。各牌的正式阶段和编号以卡面为准。</p>
        <section v-for="group in categories" :key="group.title">
          <h3>{{ group.title }}</h3>
          <article v-for="skill in group.skills" :key="skill" class="nn-guide-skill">
            <CardFace :id="example(skill)" compact/>
            <div>
              <h4>{{ skills[skill][0] }} · 示例 {{ cards[example(skill)].number }} 号</h4>
              <p>发动条件 · {{ guides[skill][0] }}</p>
              <p>目标 · {{ guides[skill][1] }}</p>
              <p class="nn-guide-example">{{ guides[skill][2] }}</p>
            </div>
          </article>
        </section>
      </div>
      <div v-else-if="tab==='stage' && step" class="nn-guide-body">
        <h3>{{ help[step]?.[0] }}</h3>
        <p>{{ help[step]?.[1] }}</p>
        <button type="button" @click="tab='skills'">查看技能图解</button>
      </div>
      <div v-else class="nn-guide-body nn-frozen-rules">
        <template v-for="(block,i) in blocks" :key="i">
          <div v-if="block.kind==='table'" class="nn-rule-table" tabindex="0">
            <table><thead><tr><th v-for="(cell,n) in cells(block.lines[0])" :key="n" scope="col">{{ readable(cell) }}</th></tr></thead>
              <tbody><tr v-for="(line,row) in block.lines.slice(1)" :key="row"><td v-for="(cell,n) in cells(line)" :key="n">{{ readable(cell) }}</td></tr></tbody>
            </table>
          </div>
          <component :is="block.kind" v-else-if="block.kind==='ul' || block.kind==='ol'">
            <li v-for="(line,n) in block.lines" :key="n">{{ readable(line) }}</li>
          </component>
          <blockquote v-else-if="block.kind==='quote'"><p v-for="(line,n) in block.lines" :key="n">{{ readable(line) }}</p></blockquote>
          <component v-else :is="block.kind">{{ readable(block.lines[0]) }}</component>
        </template>
      </div>
    </dialog>
  </div>
</template>
