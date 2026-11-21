<script setup lang="ts">
import {computed,ref,onMounted} from 'vue'
import Die from '../../../games/dice-werewolf/Die.vue'
import ninja0 from './guides/ninja-draft1.jpg'
import ninja1 from './guides/ninja-draft2.jpg'
import ninja2 from './guides/ninja-commit.jpg'
import ninja3 from './guides/ninja-target.jpg'
import ninja4 from './guides/ninja-choice.jpg'
import ninja5 from './guides/ninja-reaction.jpg'
import ninja6 from './guides/ninja-review.jpg'
import ghostBoard from './guides/ghost-board.png'
import diceTable from './guides/dice-table.png'
const props=defineProps<{gameId:string}>()
const dialog=ref<HTMLDialogElement>()
const ninja=computed(()=>props.gameId==='night-of-the-ninja')
const dice=computed(()=>props.gameId==='dice-werewolf')
const names:Record<string,string>={'night-of-the-ninja':'忍者之夜','ghost-candle':'诡吹灯','dice-werewolf':'骰子狼人杀'}
const selected=ref(0)
const mobileGuide=ref(false)
onMounted(()=>{mobileGuide.value=matchMedia('(max-width:1000px) and (max-height:500px) and (orientation:landscape)').matches})
import mobile0 from './guides/ninja-mobile-draft1.jpg'
import mobile1 from './guides/ninja-mobile-draft2.jpg'
import mobile2 from './guides/ninja-mobile-commit.jpg'
import mobile3 from './guides/ninja-mobile-target.jpg'
import mobile4 from './guides/ninja-mobile-choice.jpg'
import mobile5 from './guides/ninja-mobile-reaction.jpg'
import mobile6 from './guides/ninja-mobile-review.jpg'
const mobileImages:Record<string,string>={'./guides/ninja-mobile-draft1.jpg':mobile0,'./guides/ninja-mobile-draft2.jpg':mobile1,'./guides/ninja-mobile-commit.jpg':mobile2,'./guides/ninja-mobile-target.jpg':mobile3,'./guides/ninja-mobile-choice.jpg':mobile4,'./guides/ninja-mobile-reaction.jpg':mobile5,'./guides/ninja-mobile-review.jpg':mobile6}
const mobileKeys=['draft1','draft2','commit','target','choice','reaction','review']
const mobileText=[
 '① 点击底部手牌，已选牌上浮；② 确认保留；③ 顶栏返回/房间/指南/设置；④ 右侧规则、出牌区与情报入口。',
 '① 从收到的两张中保留一张；② 第一张保持锁定；③ 确认第二步；④ 传牌按真实相邻座次进行。',
 '① 选择合法牌，或「本阶段不出牌」；② 统一确认；③ 两侧名片旁点击身份牌详情；④ 中央显示公开演出。',
 '① 金框为已选目标，再点取消；② 中央显示正在执行的技能；③ 确认目标；④ 右侧查看出牌区、时间线、私人情报。',
 '① 两名目标的身份仅本人可见；② 选择交换或不交换，随后按提示揭示/隐藏；③ 底部确认；④ 核对目标顺序。商人同样在中央查阅和选择双方荣誉。',
 '① 受攻击者选择合法反应或不使用反应；② 留意反应时间；③ 确认；④ 死亡以服务端最终裁决为准。',
 '① 右侧时间线、私人情报、出牌区及轮末复盘；② 中央轮末结果；③ 轮次与阶段；④ 返回大厅保留席位。右下角可直接输入聊天，展开阅读记录，关闭后回到手牌操作。'
]
const shownNinjaSteps=computed(()=>mobileGuide.value?ninjaSteps.map((s,i)=>({...s,src:mobileImages['./guides/ninja-mobile-'+mobileKeys[i]+'.jpg'],text:mobileText[i]})):ninjaSteps)
const ninjaSteps=[
 {src:ninja0,title:'两步轮抽 · 第一步保留',text:'点选一张手牌上浮，再点确认。其余两张向左传；中央只展示传牌提示。顶部可返回大厅、查看房间号、打开指南或设置。'},
 {src:ninja1,title:'两步轮抽 · 第二步保留',text:'第一步保留牌已锁定；从新收到的两张中再保留一张，然后确认。传牌演出结束后操作计时才开始。'},
 {src:ninja2,title:'秘密出牌与本阶段不出牌',text:'从合法手牌中选择，点确认才秘密提交；选择本阶段不出牌后同样需要确认。无合法牌时按当前提示处理；旁观、只读、死亡或非本人行动时不能操作。'},
 {src:ninja3,title:'目标选择 · 青蓝悬停，金色选中',text:'点击圆桌上合法玩家，再点确认。青蓝框是合法悬停，持续金框是已选目标；再次悬停不改变金色。非法目标不能选。名片旁的身份牌可查看授权详情。'},
 {src:ninja4,title:'技能的二次决定',text:'按真实技能选项依次完成目标一、目标二及后续决定。图中变形者已查看两名目标，仍需确认交换或不交换，并遵守结果公开要求。私人情报只对本人开放。'},
 {src:ninja5,title:'刺杀反应',text:'受攻击者在倒计时内选择合法反应牌，或明确选择不使用反应，然后确认。其他玩家只看公开攻击；真实裁决演出后才公布死亡并继续。'},
 {src:ninja6,title:'舞台、历史与复盘入口',text:'中央显示当前公开牌、技能及结果。侧栏进入出牌区、公开时间线、私人情报和聊天；轮末可查看本轮复盘，冠军后开放完整复盘。返回大厅保留席位，可从大厅继续对局。'}
]
</script>
<template>
  <button aria-label="UI 操作指南" title="UI 操作指南" @click="dialog?.showModal()">?</button>
  <dialog ref="dialog" class="ui-guide" aria-label="UI 操作指南">
    <header><div><small>界面操作教学 · 非实际对局</small><h2>{{ names[gameId] }} · UI 操作指南</h2></div><button autofocus @click="dialog?.close()">关闭</button></header>
    <p>下面使用真实卡牌组件与界面结构示意。点击示意不会提交游戏操作；具体效果与优先级请查阅「游戏规则」。</p>
    <section v-if="ninja" class="ninja-screenshots">
      <nav aria-label="指南版本"><button :aria-pressed="!mobileGuide" @click="mobileGuide=false">桌面指南</button><button :aria-pressed="mobileGuide" @click="mobileGuide=true">手机横屏指南</button></nav>
      <p>以下为隔离真实四人对局截图，青色编号框是教学标注。点击图片可查看清晰原图；截图中的身份、手牌和房间号仅为该次测试示例。</p>
      <figure v-for="(step,i) in shownNinjaSteps" :key="i"><h3>{{ i+1 }} · {{ step.title }}</h3>
        <a :href="step.src" target="_blank" rel="noopener" :aria-label="step.title+'：查看原图'"><img :src="step.src" :alt="step.title+'，实际界面和操作区域编号标注'" loading="lazy"></a>
        <figcaption>{{ step.text }}</figcaption>
      </figure>
    </section>
    <section v-else-if="dice"><h3>① 身份骰与公共生命值</h3><figure><img :src="diceTable" alt="实际界面的六点数赌桌：每个点数下方显示生命值和处决状态"><figcaption>① 认准公共点数 → ② 看下方生命值 → ③ 按阶段投票；这不是你的私人身份骰。</figcaption></figure><div class="guide-dice"><Die :face="3"/><span>私人身份骰：仅本人可见</span><Die :face="6"/><span>公共点数：生命值 / 待处决状态</span></div>
      <h3>② 红黑操作 → 确认 → 投票</h3><div class="guide-flow"><b class="red">红牌 +1</b><b>黑牌 −1</b><span>→ 当前公共点数生命值 →</span><b>点击点数投票处决</b></div><p>逐点秘密提交红黑牌；确认后不能修改。投票选择仍存活的点数，平票按阶段提示重投。处决以公开裁决为准。</p>
      <h3>③ 单局与整场</h3><p>单局结算展示身份、处决原因、生命值和累计积分；结算倒计时随房间演出速度变化，之后自动续局。可查看上一局详情；冠军是整场结束，加赛不等于冠军。</p>
    </section>
    <section v-else><h3>① 九宫格选蜡烛 → 行动 → 确认</h3><figure><img :src="ghostBoard" alt="实际蜡烛九宫格界面，点击标有完整的蜡烛"><figcaption>① 点击完整蜡烛 → ② 诡异选择行动 → ③ 点击「确认行动」；以下小网格可练习点选。</figcaption></figure><div class="guide-candles"><button v-for="i in 9" :key="i" :class="{selected:selected===i}" @click="selected=i">🕯<small>{{ i }}</small></button></div><p>仅完整蜡烛可选。人类只能点亮，诡异可点亮或摧毁；点击选择后秘密确认。亮起和摧毁的蜡烛不可再选。</p>
      <h3>② 讨论 → 是否寻找 → 指认</h3><div class="guide-flow"><b>白天讨论与公聊</b><span>→</span><b>按阶段选择是否寻找</b><span>→</span><b>点击其他玩家指认</b></div><p>指认不能选择自己。等待公开票型与重投提示；胜负以服务端结果为准。</p>
    </section>
    <section><h3>④ 信息入口与返回</h3><div class="guide-flow"><b>身份牌 / 私人情报<br>仅授权信息</b><b>公开牌 / 历史<br>已公开结果</b><b>聊天<br>公共消息与未读</b></div><p>{{ ninja?'点击席位右侧身份牌查看可确认身份与暴露状态；出牌区查看公开牌，时间线看当前轮，轮末与终局复盘查看已解密历史。':'' }}聊天入口打开消息面板；历史入口可随时关闭后继续操作。</p>
      <div class="guide-nav"><span>返回大厅</span><span>房间号</span><span>?</span><span>设置</span></div><p>返回大厅需确认，席位及进度保留；大厅「继续对局」恢复原席位。旁观与只读标签页不能提交行动，需符合权限后接管操作。设置仅控制本人表现偏好，房间速度开局后锁定。</p>
    </section>
    <button @click="dialog?.close()">已了解，继续游戏</button>
  </dialog>
</template>
<style scoped>
.ninja-screenshots img{max-height:none;height:auto}.ninja-screenshots figure{padding-bottom:1rem;border-bottom:1px solid #887443}.ninja-screenshots a:focus-visible{outline:3px solid #65d9ed}
figure{margin:1rem 0}figure img{display:block;width:100%;max-height:24rem;object-fit:contain;border:1px solid #887443;border-radius:.6rem}figcaption{padding:.5rem;color:#e5c579}
.ui-guide{width:min(54rem,95vw);max-height:88dvh;overflow:auto;background:#141d19;color:#f1e6cb;border:1px solid #a68c52;border-radius:1rem;padding:1.2rem}.ui-guide::backdrop{background:#000b}header{display:flex;justify-content:space-between;gap:1rem;align-items:center;position:sticky;top:-1.2rem;background:#141d19;z-index:2}h2{margin:.3rem 0}h3{color:#e5c579}p{line-height:1.7}.guide-hand,.guide-dice,.guide-flow,.guide-nav{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;padding:1rem;border:1px solid #887443;border-radius:.6rem}.guide-hand button{width:10rem;padding:.3rem;transition:transform .15s}.selected{outline:3px solid #e4bd63;transform:translateY(-.35rem)}.guide-flow b,.guide-nav span{background:#283b30;padding:.7rem;border-radius:.4rem}.guide-table{display:grid;grid-template-columns:1fr 1fr;gap:1rem;background:#24382c;padding:1rem;border-radius:40%}.guide-table>*{padding:1rem;text-align:center}.guide-candles{display:grid;grid-template-columns:repeat(3,3.5rem);gap:.6rem;justify-content:center}.guide-candles button{font-size:1.6rem}.guide-candles small{display:block;font-size:.8rem}.red{color:#ff9d93}@media(max-width:600px){.ui-guide{padding:.8rem}.guide-hand{gap:.4rem}.guide-hand button{width:8rem}.guide-flow{gap:.4rem;padding:.5rem;font-size:.9rem}header{top:-.8rem}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
