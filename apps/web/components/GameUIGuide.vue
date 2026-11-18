<script setup lang="ts">
import {computed,ref} from 'vue'
import CardFace from '../../../games/night-of-the-ninja/CardFace.vue'
import Die from '../../../games/dice-werewolf/Die.vue'
import {deck} from '../../../games/night-of-the-ninja/cards.ts'
import ghostBoard from './guides/ghost-board.png'
import diceTable from './guides/dice-table.png'
const props=defineProps<{gameId:string}>()
const dialog=ref<HTMLDialogElement>()
const ninja=computed(()=>props.gameId==='night-of-the-ninja')
const dice=computed(()=>props.gameId==='dice-werewolf')
const names:Record<string,string>={'night-of-the-ninja':'忍者之夜','ghost-candle':'诡吹灯','dice-werewolf':'骰子狼人杀'}
const selected=ref(0)
</script>
<template>
  <button aria-label="UI 操作指南" title="UI 操作指南" @click="dialog?.showModal()">?</button>
  <dialog ref="dialog" class="ui-guide" aria-label="UI 操作指南">
    <header><div><small>界面操作教学 · 非实际对局</small><h2>{{ names[gameId] }} · UI 操作指南</h2></div><button autofocus @click="dialog?.close()">关闭</button></header>
    <p>下面使用真实卡牌组件与界面结构示意。点击示意不会提交游戏操作；具体效果与优先级请查阅「游戏规则」。</p>
    <section v-if="ninja"><h3>① 底部手牌 → 选中上浮 → 确认</h3>
      <div class="guide-hand"><button v-for="(card,i) in deck.slice(0,3)" :key="card.id" :class="{selected:selected===i}" @click="selected=i"><CardFace :id="card.id" compact/></button></div>
      <div class="guide-flow"><b>第一步：三选一保留</b><span>→ 两张卡背传给相邻席位 →</span><b>第二步：已保留牌锁定，新收到两张再选一</b></div>
      <p>选牌后点击底部「确认」才提交。提交后不可更改。传牌只显示牌背。</p>
      <h3>② 秘密出牌与圆桌目标</h3><div class="guide-table"><span>玩家 A</span><b>当前技能牌<br>↓ 选择合法头像</b><span class="selected">目标一</span><span>目标二</span></div>
      <p>先选择合法手牌组合，统一确认；亮牌后点击圆桌高亮头像选择目标。双目标依次标注一、二，再确认。非法目标不能选。</p>
      <div class="guide-flow"><b>无可出牌：等待自动处理</b><b>主动跳过：点击「跳过」再确认</b><b>无法操作：检查死亡、旁观、只读或当前行动者</b></div>
      <h3>③ 技能二次选择与反应</h3><p>变形者等技能按舞台步骤继续选择；以服务器提供的选项为准。受到刺杀时在倒计时内选合法反应牌，或明确不反应。等待真实裁决演出后才进行下一张牌。</p>
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
figure{margin:1rem 0}figure img{display:block;width:100%;max-height:24rem;object-fit:contain;border:1px solid #887443;border-radius:.6rem}figcaption{padding:.5rem;color:#e5c579}
.ui-guide{width:min(54rem,95vw);max-height:88dvh;overflow:auto;background:#141d19;color:#f1e6cb;border:1px solid #a68c52;border-radius:1rem;padding:1.2rem}.ui-guide::backdrop{background:#000b}header{display:flex;justify-content:space-between;gap:1rem;align-items:center;position:sticky;top:-1.2rem;background:#141d19;z-index:2}h2{margin:.3rem 0}h3{color:#e5c579}p{line-height:1.7}.guide-hand,.guide-dice,.guide-flow,.guide-nav{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;padding:1rem;border:1px solid #887443;border-radius:.6rem}.guide-hand button{width:10rem;padding:.3rem;transition:transform .15s}.selected{outline:3px solid #e4bd63;transform:translateY(-.35rem)}.guide-flow b,.guide-nav span{background:#283b30;padding:.7rem;border-radius:.4rem}.guide-table{display:grid;grid-template-columns:1fr 1fr;gap:1rem;background:#24382c;padding:1rem;border-radius:40%}.guide-table>*{padding:1rem;text-align:center}.guide-candles{display:grid;grid-template-columns:repeat(3,3.5rem);gap:.6rem;justify-content:center}.guide-candles button{font-size:1.6rem}.guide-candles small{display:block;font-size:.8rem}.red{color:#ff9d93}@media(max-width:600px){.ui-guide{padding:.8rem}.guide-hand{gap:.4rem}.guide-hand button{width:8rem}.guide-flow{gap:.4rem;padding:.5rem;font-size:.9rem}header{top:-.8rem}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
