<script setup lang="ts">
import { ref, useId } from 'vue'

const dialog = ref<HTMLDialogElement>()
const title = useId()
const cases = [
  { title: '两名人类选到一起', hint: '诡异没有摧毁他们选的那根', humanA: '③ 点亮', humanB: '③ 点亮', ghost: '⑤ 摧毁', result: '③ 点亮', outcome: 'lit', explain: '两名人类同选，就有机会点亮蜡烛。' },
  { title: '诡异猜中了共同目标', hint: '三人都选第 3 根，诡异要摧毁', humanA: '③ 点亮', humanB: '③ 点亮', ghost: '③ 摧毁', result: '③ 摧毁', outcome: 'destroy', explain: '注意：三人同选时，诡异的摧毁会成功。' },
  { title: '人类没有选到一起', hint: '诡异摧毁了其中一人的目标', humanA: '② 点亮', humanB: '⑥ 点亮', ghost: '② 摧毁', result: '② 摧毁', outcome: 'destroy', explain: '人类选得不同，诡异命中任何一人的蜡烛，就能摧毁它。' },
  { title: '诡异也能选择点亮', hint: '人类选得不同，诡异选中其中一根并点亮', humanA: '② 点亮', humanB: '⑥ 点亮', ghost: '⑥ 点亮', result: '⑥ 点亮', outcome: 'lit', explain: '诡异也可以暂时帮忙点亮，隐藏自己的意图。' },
  { title: '谁也没能配合上', hint: '人类选得不同，诡异没有选中任何一人的目标', humanA: '② 点亮', humanB: '⑥ 点亮', ghost: '⑧ 摧毁', result: '随机摧毁一根', outcome: 'destroy', explain: '系统从所有还完好的蜡烛中，随机摧毁一根，可能不在三人的选择里。' },
] as const
</script>

<template>
  <button type="button" @click="dialog?.showModal()">游戏规则</button>
  <dialog ref="dialog" class="rules" :aria-labelledby="title">
    <header class="rules-head">
      <div>
        <span class="eyebrow">三人 · 隐藏身份 · 快速上手</span>
        <h2 :id="title">《诡吹灯》游戏规则</h2>
      </div>
      <form method="dialog"><button autofocus>关闭</button></form>
    </header>
    <div class="rules-body">
      <section class="intro">
        <h3>三个人如何获胜</h3>
        <p>三个人里，有 <strong>2 名人类</strong>和 <strong>1 名诡异</strong>。开局后只知道自己的身份，谁是诡异，要靠你们自己判断。</p>
        <div class="goal-grid">
          <div class="goal human-goal">
            <span class="goal-symbol" aria-hidden="true">🔥</span>
            <strong>人类怎么赢？</strong>
            <p>点亮 <b>5 根</b>蜡烛，或者白天投票<strong>找出诡异</strong>。</p>
          </div>
          <div class="goal ghost-goal">
            <span class="goal-symbol" aria-hidden="true">💀</span>
            <strong>诡异怎么赢？</strong>
            <p>摧毁 <b>5 根</b>蜡烛，或者让大家<strong>错认一名人类</strong>。</p>
          </div>
        </div>
        <p class="small-note">桌上一共有 9 根蜡烛。每晚只会有 1 根变成“点亮”或“摧毁”，发生变化的蜡烛之后不能再选。</p>
      </section>

      <section>
        <h3>晚上：各自偷偷选蜡烛</h3>
        <div class="steps">
          <div><span class="step-number">1</span><p>从还完好的蜡烛里选 <strong>1 根</strong>。</p></div>
          <div><span class="step-number">2</span><p><strong>人类</strong>只能选择“点亮”；<strong>诡异</strong>可以选择“点亮”或“摧毁”。</p></div>
          <div><span class="step-number">3</span><p>确认后不能改。三人都确认，或倒计时结束，就会公布这一晚的结果。</p></div>
        </div>
        <p>但三个人的选择不一定都能成功。看下面这些例子，就知道最终会发生什么。</p>
      </section>

      <section>
        <h3>看看夜晚会发生什么</h3>
        <p class="small-note">下面的甲、乙是真正的人类，第三位是诡异。数字表示蜡烛编号，三个人的选择平时是保密的，这里只是为了讲清楚规则。</p>
        <div class="example-grid">
          <article v-for="(example, i) in cases" :key="i" class="example-card">
            <div class="example-title">
              <span class="example-number">{{ i + 1 }}</span>
              <div><h4>{{ example.title }}</h4><p>{{ example.hint }}</p></div>
            </div>
            <div class="choices" aria-label="三位玩家的选择">
              <div><span>人类甲</span><strong>{{ example.humanA }}</strong></div>
              <div><span>人类乙</span><strong>{{ example.humanB }}</strong></div>
              <div><span>诡异</span><strong>{{ example.ghost }}</strong></div>
            </div>
            <div class="result" :class="example.outcome">
              <span aria-hidden="true">{{ example.outcome === 'lit' ? '🔥' : '💀' }}</span>
              <strong>最终：{{ example.result }}</strong>
            </div>
            <p class="example-explain">{{ example.explain }}</p>
          </article>
        </div>
        <p class="small-note">记住一个关键点：<strong>两名人类同选也不保证点亮</strong>。如果诡异恰好选中同一根并选择摧毁，那根蜡烛就会被摧毁。</p>
      </section>

      <section>
        <h3>白天：聊天，找出谁在说谎</h3>
        <p>每晚结束，大家都能在公聊里讨论：昨晚为什么是这个结果？谁的说法值得相信？也可以商量下一晚的计划。</p>
        <div class="day-flow">
          <div><strong>第 2、3 天</strong><span>聊天讨论 → 进入下一夜</span></div>
          <div><strong>从第 4 天开始</strong><span>聊天讨论 → 决定要不要寻找诡异</span></div>
          <div><strong>至少 2 人同意寻找</strong><span>每人秘密指认另外两人中的一位</span></div>
          <div><strong>至少 2 票指向同一人</strong><span>找到诡异，人类胜；错指人类，诡异胜</span></div>
        </div>
        <p class="small-note">第一轮指认如果没人拿到 2 票，就再投一次；第二轮仍未达成，就进入下一夜。没有至少 2 人同意寻找，也会直接进入下一夜。</p>
      </section>

      <section class="last-notes">
        <h3>还有几件事</h3>
        <ul>
          <li>只公开每晚哪根蜡烛发生变化，<strong>不会公开三个人分别选了什么</strong>。</li>
          <li>超时没选，系统会代选：人类随机点亮、诡异随机摧毁一根完好的蜡烛，再按同样规则结算。</li>
          <li>白天三人可以提前结束讨论；寻找表决、指认和重投每次限时 30 秒。未提交算弃权。</li>
          <li>确认过的夜晚行动或投票不能修改。白天讨论、寻找和指认时可以聊天。</li>
        </ul>
        <p class="timer-note">查看规则或断线时，对局倒计时继续。</p>
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.rules {
  color:#f2e4cb; background:#211b14; border:1px solid #8d704c; border-radius:.85rem; padding:0;
  width:min(49rem,calc(100% - 1rem)); max-height:calc(100dvh - 1rem); overflow:auto; overscroll-behavior:contain;
}
.rules::backdrop { background:#080704c9; }
.rules-head {
  display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 1.25rem;
  position:sticky;top:0;background:#2a2117;z-index:2;border-bottom:1px solid #6a543a;
}
.rules-head h2 {font-size:clamp(1.15rem,4vw,1.55rem);margin:.15rem 0 0}
.rules-head button {white-space:nowrap}
.eyebrow {font-size:.75rem;letter-spacing:.08em;color:#c6ab83}
.rules-body {display:grid;gap:1.35rem;padding:1.2rem}
.rules-body section {min-width:0}
.rules h3 {font-size:1.13rem;color:#f5c887;margin:0 0 .65rem}
.rules p {line-height:1.65;margin:.35rem 0}
.goal-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin:.85rem 0}
.goal {position:relative;background:#2b251c;border:1px solid #62513c;border-radius:.7rem;padding:.9rem}
.goal strong {display:block;color:#f7ddab;font-size:1.02rem}
.goal p {margin:.35rem 0 0}
.goal-symbol {float:right;font-size:1.6rem}
.human-goal {border-color:#7b6234}.ghost-goal {border-color:#81585d}
.small-note {font-size:.91rem;color:#d6c5ab}
.steps {display:grid;gap:.4rem;margin:.7rem 0 1rem}
.steps>div {display:flex;gap:.65rem;align-items:flex-start}
.steps p {margin:0}
.step-number,.example-number {background:#725431;color:#fff4d9;display:grid;place-items:center;flex:none;border-radius:50%;width:1.45rem;height:1.45rem;font-size:.85rem;font-weight:700}
.example-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;margin:.85rem 0}
.example-card {background:#2a241e;border:1px solid #5e4e3d;border-radius:.7rem;padding:.8rem;min-width:0}
.example-title {display:flex;align-items:center;gap:.55rem;margin-bottom:.65rem}
.example-title h4 {font-size:1rem;margin:0;color:#f2dbb5}
.example-title p {font-size:.78rem;color:#cdb89a;margin:0}
.choices {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.32rem}
.choices>div {display:grid;gap:.2rem;text-align:center;padding:.55rem .1rem;background:#191713;border-radius:.35rem}
.choices span {font-size:.76rem;color:#c9b89e}
.choices strong {font-size:clamp(.72rem,2.2vw,.92rem);overflow-wrap:anywhere}
.result {display:flex;justify-content:center;gap:.45rem;align-items:center;margin:.65rem 0 .4rem;padding:.55rem;border-radius:.4rem;background:#433421;border:1px solid #947443;color:#ffe2a6}
.result.destroy {background:#40272a;border-color:#9a5d66;color:#ffd1d1}
.example-explain {font-size:.87rem;color:#eadac3;margin:0!important}
.day-flow {display:grid;gap:.5rem;margin:.8rem 0}
.day-flow>div {display:grid;grid-template-columns:minmax(8.2rem,38%) 1fr;gap:.6rem;align-items:center;border-radius:.5rem;background:#30271e;padding:.65rem}
.day-flow strong {color:#f6d294}
.day-flow span {line-height:1.5}
.last-notes ul {padding-left:1.25rem;line-height:1.6;margin:.4rem 0}
.last-notes li+li {margin-top:.42rem}
.timer-note {border-top:1px solid #6a543a;padding-top:.75rem;margin-top:1rem!important;color:#e3caa8}
@media (max-width:560px) {
  .rules-body {padding:.85rem;gap:1.1rem}
  .rules-head {padding:.75rem .85rem}
  .example-grid {grid-template-columns:1fr}
  .goal-grid {gap:.45rem}
  .goal {padding:.65rem}
  .goal-symbol {font-size:1.2rem}
  .day-flow>div {grid-template-columns:1fr;gap:.16rem}
}
@media (max-width:350px) {.goal-grid {grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce) {.rules * {scroll-behavior:auto}}
</style>
