<script setup lang="ts">
import {ref,useId} from 'vue'
import {cards,deck,phaseNames,phases,skills,type Skill} from './cards.ts'
import {guides,help} from './rule-guide.ts'
import {asset} from './art.ts'
import CardFace from './CardFace.vue'
import './p20.css'

defineProps<{step?:string}>()
const dialog=ref<HTMLDialogElement>()
const title=useId()
const pages={quick:'一分钟入门',full:'完整玩法指南',skills:'卡牌与技能图鉴',stage:'当前阶段帮助'} as const
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
const chapters=[
  ['crane','目标与身份','身份等级数字越小越高，等级 1 最高。鹤派与莲派比拼，奇数玩家时加入浪人。个人累计荣誉分达到 10 后，轮末结算最高分夺冠，并列可共同获胜。'],
  ['portrait-0','建房与准备','创建或加入 4～11 人房间，选肖像、准备，房主在玩家准备后开局。'],
  ['card-back','两次轮抽','发三张，留一张，另两张传左。收到两张后再留一张，弃掉另一张。'],
  ['spy','夜晚的五个阶段','密探 → 隐士 → 骗徒 → 盲眼刺客 → 上忍。秘密提交，统一亮牌，依编号从小到大执行。'],
  ['mystic','技能目标与秘密','只有合法目标可以确认。正式玩家能看见已确认的桌面目标，旁观仅见公开事件。未公开的流派、手牌和荣誉分值只供有权玩家查看。'],
  ['mirror','刺杀与反应','盲眼刺客或上忍发动刺杀后，受击者有相应牌时可用镜僧反杀或用殉道者先得一枚荣誉再承受攻击。审判者的处决不能反应。死亡后停止出牌，仍可公聊。'],
  ['master','变形、揭示与首脑','变形者交换流派后，受影响者不自动取得新身份。轮末公开存活者身份，按规则比较双方存活等级。存活首脑改变轮末胜负，浪人首脑阻止两派获取流派奖励。'],
  ['honor-front','派奖、转移与冠军','胜派成员和存活浪人按轮末结果领奖，双方完全打平时存活者领奖；无人存活时无人获奖。荣誉可被窃取或交换，分值累计到比赛结束。'],
  ['card-back','超时与重连','轮抽和必选目标超时由服务器合法代选；可选效果、出牌、反应默认跳过。可用大厅「继续对局」回到原席位。全员离线暂停，旁观不推进时间。'],
]
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
          <li><img :src="asset('crane')" alt=""><div><strong>领取身份</strong><p>查看自己的流派与等级。</p></div></li>
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
      <div v-else class="nn-guide-body">
        <ol class="nn-guide-flow">
          <li v-for="[image,heading,description] in chapters" :key="heading">
            <img :src="asset(image)" alt=""><div><strong>{{ heading }}</strong><p>{{ description }}</p></div>
          </li>
        </ol>
        <button type="button" @click="tab='skills'">查看卡牌与技能图鉴</button>
      </div>
    </dialog>
  </div>
</template>
