<script setup lang="ts">
import { ref, useId } from 'vue'
import './theme.css'
const dialog=ref<HTMLDialogElement>()
const title=useId()
</script>
<template>
  <button @click="dialog?.showModal()">游戏规则</button>
  <dialog ref="dialog" class="dw-dialog" :aria-labelledby="title">
    <div class="dw-dialog-header"><h2 :id="title">骰子狼人杀 · 玩法</h2><form method="dialog"><button autofocus>关闭</button></form></div>
    <div class="dw-dialog-body">
      <h3>三人积分赛</h3>
      <p>选一位赌徒，准备后由房主开局。每局每人随机获得一个隐藏点数，普通局可两人同点。加赛身份各不相同，形象整场保留。</p>
      <h3>报数与生命值</h3>
      <p>六个点数从 0 生命值开始，每轮按点数从小到大报数。每次三人秘密选 +1 或 −1，30 秒内提交，全员提交立即结算。超时随机代选。整轮结束时，生命值不高于 −5 的点数同时处决。</p>
      <h3>投票与庄家清场</h3>
      <p>若本局尚未结束，每人有 30 秒投票，超时从现存点数随机代投。至少两票一致则处决；否则重投一次。每轮投完才公开票型。连续三轮无处决时，庄家随机清除一个空点数，没有空点数则跳过。</p>
      <h3>本局胜负</h3>
      <p>处决命中身份时，本局结束，身份未被处决的人各得 1 分。若处决未命中身份，且只剩两个点数、两人同点，则同点两人落败，另一人得 1 分。</p>
      <h3>加赛与冠军</h3>
      <p>达到房主设定的 3、5 或 7 分且独占第一，即赢得比赛。若最高分并列，三人保留积分进入加赛，直到出现唯一第一。每局结算 8 秒后续局，可随时查看上一局记录。查看规则和掉线期间倒计时继续。</p>
    </div>
  </dialog>
</template>
