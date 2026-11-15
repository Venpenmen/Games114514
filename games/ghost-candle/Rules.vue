<script setup lang="ts">
import { ref, useId } from 'vue'

const dialog = ref<HTMLDialogElement>()
const title = useId()
</script>

<template>
  <button type="button" @click="dialog?.showModal()">游戏规则</button>
  <dialog ref="dialog" class="rules" :aria-labelledby="title">
    <header>
      <h2 :id="title">《诡吹灯》游戏规则</h2>
      <form method="dialog"><button autofocus>关闭</button></form>
    </header>
    <div class="rules-body">
      <section>
        <h3>三个人如何获胜</h3>
        <p>三人准备后由房主开局。每局随机分配两名人类和一名诡异，每个人只看得到自己的身份。</p>
        <p><strong>人类</strong>点亮五根蜡烛，或正确指认诡异，即获胜。<strong>诡异</strong>摧毁五根蜡烛，或让大家错指一名人类，即获胜。</p>
      </section>
      <section>
        <h3>夜晚 · 选一根蜡烛</h3>
        <p>从九宫格选一根完好的蜡烛。人类只能点亮，诡异可选点亮或摧毁。秘密确认后不能修改，三人确认即结算。超时未确认时，系统替人类随机点亮、替诡异随机摧毁一根完好的蜡烛，再按下列顺序裁决：</p>
        <ol>
          <li>两名人类选中同一根 → 点亮该蜡烛，即使诡异选择摧毁它。</li>
          <li>两名人类选不同蜡烛，诡异选择摧毁且命中其中一名人类的目标 → 定向摧毁该蜡烛。</li>
          <li>两名人类选不同蜡烛，诡异选择点亮且命中其中一名人类的目标 → 点亮该蜡烛。</li>
          <li>以上均未命中 → 从所有完好蜡烛中等概率随机摧毁一根。随机抽中诡异的目标也属于随机摧毁。</li>
        </ol>
        <p>按顺序只执行第一条命中的规则。每晚只改变一根蜡烛，只公布结果。已点亮或摧毁的蜡烛不能再选。</p>
      </section>
      <section>
        <h3>白天 · 聊天、寻找与指认</h3>
        <p>第 1 夜之后是第 2 天。白天可以公聊，三人点「结束讨论」可提前推进。第 2、3 天讨论完直接入夜。</p>
        <p>第 4 天起，讨论后至少两人选择「寻找诡异」才进入指认，否则继续入夜。</p>
        <p>指认时包括诡异在内，每人都能秘密投一票，只能选另外两人之一，确认后不可修改。至少两票指向同一人时指认生效。首轮无有效指认时重投一次，仍无有效指认就入夜。每轮结束后公开票型。</p>
        <p>寻找表决、指认和重投各限 30 秒，全员提交会提前结算，未提交视为弃权。讨论、表决和投票期间可聊天，夜晚和结果展示期间禁发言。</p>
      </section>
      <p class="timer-note">查看规则或断线时，对局倒计时继续。</p>
    </div>
  </dialog>
</template>

<style scoped>
.rules {
  color: #f2e4cb;
  background: #211b14;
  border: 1px solid #8d704c;
  border-radius: .85rem;
  padding: 0;
  width: min(42rem, calc(100% - 2rem));
  max-height: min(46rem, calc(100dvh - 2rem));
  overflow: auto;
  overscroll-behavior: contain;
}
.rules::backdrop { background: #080704bb; }
.rules header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  padding: .8rem 1rem;
  position: sticky;
  top: 0;
  background: #2a2117;
  border-bottom: 1px solid #6a543a;
}
.rules header h2 { font-size: clamp(1.05rem, 4vw, 1.4rem); }
.rules header button { white-space: nowrap; }
.rules-body { display: grid; gap: 1rem; padding: 1rem; }
.rules h3 { color: #f5c887; margin-bottom: .35rem; }
.rules p + p, .rules li + li { margin-top: .4rem; }
.rules ol { padding-left: 1.55rem; }
.timer-note { border-top: 1px solid #6a543a; padding-top: .7rem; color: #e3caa8; }
</style>
