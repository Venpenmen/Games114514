<script setup lang="ts">
import { ref, useId } from 'vue'
import './theme.css'

const dialog = ref<HTMLDialogElement>()
const title = useId()

const outcomes = [
  { title: '有人被处决了', identities: ['甲：1 点','乙：3 点','丙：5 点'], event: '处决 3 点', result: '甲、丙各得 1 分；乙得 0 分', note: '身份是 3 点的乙输了。没被处决的两人都赢。' },
  { title: '两人拿到了相同身份', identities: ['甲：2 点','乙：2 点','丙：5 点'], event: '处决 2 点', result: '丙得 1 分；甲、乙得 0 分', note: '同一个点数可能对应两个人，处决它，两人一起出局。' },
  { title: '只剩两个点数的特殊结局', identities: ['甲：2 点','乙：2 点','丙：5 点'], event: '场上原剩 2、4、5 点，处决无人持有的 4 点，只剩 2、5 点', result: '丙得 1 分；甲、乙得 0 分', note: '普通局中，两人同点、另一人不同点；若没有命中身份，却只剩两个点数，同点的两人输。' },
] as const
</script>

<template>
  <button type="button" @click="dialog?.showModal()">游戏规则</button>
  <dialog ref="dialog" class="dw-dialog dw-howto" :aria-labelledby="title">
    <header class="dw-dialog-header howto-header">
      <div>
        <span class="eyebrow">三人 · 隐藏点数 · 积分赛</span>
        <h2 :id="title">《骰子狼人杀》游戏规则</h2>
      </div>
      <form method="dialog"><button autofocus>关闭</button></form>
    </header>
    <div class="dw-dialog-body howto-body">
      <section class="intro">
        <h3>先搞清楚：谁是玩家，谁是骰子？</h3>
        <p>只有 <strong>3 名玩家</strong>，但桌上有 <strong>1～6 点的六颗骰子</strong>。每局开始时，每人会偷偷拿到一个骰子点数作为自己的身份。</p>
        <div class="identity-demo" aria-label="隐藏身份示例">
          <div><span class="player">玩家甲</span><span class="face">⚀</span><strong>1 点</strong></div>
          <div><span class="player">玩家乙</span><span class="face">⚂</span><strong>3 点</strong></div>
          <div><span class="player">玩家丙</span><span class="face">⚄</span><strong>5 点</strong></div>
        </div>
        <p class="small-note">这里只是教学示例。正式游戏中，你只能看见自己的身份；别人的点数要靠聊天、试探和猜测。</p>
        <p><strong>你的目标很简单：让自己的身份点数活下来，想办法处决其他人的身份。</strong>每局活到获胜的一方得分，累计积分争冠军。</p>
      </section>

      <section>
        <h3>每局怎样进行？</h3>
        <div class="steps">
          <div><span class="step-number">1</span><p>每人秘密获得一个身份点数。普通局允许两人同点，不会三人全同点。</p></div>
          <div><span class="step-number">2</span><p>从 <strong>1 点开始依次报数</strong>，三人一起决定当前点数的生命值增加还是减少。</p></div>
          <div><span class="step-number">3</span><p>所有还在场的点数都报过后，检查谁的生命值太低，再进行投票处决。</p></div>
          <div><span class="step-number">4</span><p>有人身份被处决，或触发特殊结局，本局结束。结算积分后开始下一局。</p></div>
        </div>
      </section>

      <section>
        <h3>报数时，你可以做什么？</h3>
        <p>轮到某个点数时，每个人都要私下选择 <strong>增加 +1</strong> 或 <strong>减少 −1</strong>。三人的选择会相加，变成这个点数本次的生命值变化。</p>
        <div class="sum-demo">
          <div class="sum-picks">
            <div><span>甲</span><strong class="positive">+1</strong></div>
            <div><span>乙</span><strong class="negative">−1</strong></div>
            <div><span>丙</span><strong class="negative">−1</strong></div>
          </div>
          <div class="sum-result"><span aria-hidden="true">↓</span> 这一轮该点数生命值 <strong>−1</strong></div>
        </div>
        <p>例如，3 点原来有 −2 生命，三人这样操作后，就会变成 <strong>−3</strong>。</p>
        <div class="hp-demo">
          <span class="hp-chip">3 点</span>
          <span>生命 −2</span><span aria-hidden="true">→</span><strong>生命 −3</strong>
        </div>
        <p class="small-note">生命值所有人都能看见，但谁按了 +1、谁按了 −1 不会公开。每个点数限时 30 秒；所有人提交后会立刻结算，超时由系统随机代选。</p>
        <p><strong>生命值达到 −5 或更低，就会被处决。</strong>但要等本轮所有现存点数都报完，再统一检查；同一轮可能处决好几个点数。</p>
      </section>

      <section>
        <h3>投票：大家要处决哪个点数？</h3>
        <p>如果这一轮还没分出胜负，三个人就各自选一颗仍在场的骰子投票。<strong>至少两人投给同一个点数</strong>，它就会被处决。</p>
        <div class="vote-demo">
          <div class="vote-picks">
            <div><span>甲投</span><strong>④</strong></div>
            <div><span>乙投</span><strong>④</strong></div>
            <div><span>丙投</span><strong>⑥</strong></div>
          </div>
          <div class="demo-outcome">④ 得到 2 票 → <strong>4 点被处决</strong></div>
        </div>
        <p>如果三个目标都不同，就再投一次；第二次还是没有两票一致，就跳过投票，继续下一轮。</p>
        <p class="small-note">投票各限时 30 秒，超时系统随机代投一个还在场的点数。每轮投票结束后才公开每个人投了什么。</p>
      </section>

      <section>
        <h3>处决后，谁得分？</h3>
        <p>被处决的点数如果是某个人的秘密身份，那个人本局就输了；<strong>没被处决身份的人各得 1 分</strong>。</p>
        <div class="outcome-grid">
          <article v-for="(item,index) in outcomes" :key="index" class="outcome-card">
            <div class="example-heading"><span class="step-number">{{ index + 1 }}</span><h4>{{ item.title }}</h4></div>
            <div class="identity-row"><span v-for="identity in item.identities" :key="identity">{{ identity }}</span></div>
            <div class="event-line">{{ item.event }}</div>
            <div class="winner-line">{{ item.result }}</div>
            <p class="small-note">{{ item.note }}</p>
          </article>
        </div>
        <p class="small-note">如果同一次生命值处决把三人的身份都淘汰了，就没人得分。普通局的“两点数特殊结局”只有在本次处决<strong>没有命中任何玩家身份</strong>时才可能触发。</p>
      </section>

      <section>
        <h3>一直没人被处决怎么办？</h3>
        <p>如果连续 <strong>3 轮</strong>都没有处决任何点数，庄家会从<strong>没人持有身份</strong>、且仍在场的点数里随机处决一个。</p>
        <div class="dealer-demo"><span class="dealer-rounds">第 1 轮 ×　 第 2 轮 ×　 第 3 轮 ×</span><strong>→ 庄家随机清除一个空点数</strong></div>
        <p class="small-note">如果已经没有这样的空点数，庄家就不处决任何点数，继续游戏。庄家不会为了推进游戏强行处决玩家身份。</p>
      </section>

      <section>
        <h3>赢一局还不算冠军</h3>
        <p>这是一场<strong>累计积分赛</strong>。房主在开局前设置目标 <strong>3、5 或 7 分</strong>。每局赢家各拿 1 分，直到有人达到目标分数、并且独占最高分，才成为整场冠军。</p>
        <div class="score-grid">
          <div><span>目标 5 分</span><strong>5 / 4 / 3</strong><em>第一名独占领先 → 夺冠</em></div>
          <div><span>目标 5 分</span><strong>5 / 5 / 3</strong><em>最高分并列 → 进入加赛</em></div>
        </div>
        <p>加赛时，三人的积分保留，<strong>每个人的身份点数都不同</strong>；之后继续比赛，直到出现唯一的最高分玩家。</p>
        <p class="small-note">每局重新抽取秘密身份，已选赌徒形象整场保留。本局结算展示约 8 秒后自动开始下一局，也能查看上一局记录。</p>
      </section>

      <section class="closing-notes">
        <h3>最后记住这几件事</h3>
        <ul>
          <li><strong>可以公聊、讨论、说真话，也可以故意误导别人。</strong>系统不会验证玩家在聊天中自称的身份。</li>
          <li>所有人的操作和投票在提交前保密，确认后不能修改。</li>
          <li>被处决的点数本局不能再行动或被投票，下一局六个点数与生命值重置。</li>
          <li>查看规则时倒计时继续。全员离线时暂停，有玩家重新上线后继续。</li>
        </ul>
      </section>
    </div>
  </dialog>
</template>

<style scoped>
.dw-howto {width:min(49rem,calc(100% - 1rem));max-height:calc(100dvh - 1rem);overflow:auto}
.howto-header {padding:1rem 1.15rem;gap:1rem}
.howto-header h2 {font-size:clamp(1.12rem,3.8vw,1.48rem);margin:.15rem 0 0}
.howto-header button {white-space:nowrap}
.eyebrow {font-size:.76rem;letter-spacing:.07em;color:#d5b484}
.howto-body {display:grid;gap:1.25rem;padding:1.1rem 1.25rem}
.howto-body :deep(div) {border-bottom:0}
.howto-body section {min-width:0}
.howto-body h3 {color:#f8cb88;font-size:1.15rem;margin:0 0 .55rem}
.howto-body p {line-height:1.65;margin:.4rem 0}
.howto-body .small-note {font-size:.88rem;color:#dbc6a6}
.identity-demo,.sum-picks,.vote-picks {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.55rem}
.identity-demo {margin:.8rem 0}
.identity-demo>div {display:grid;justify-items:center;gap:.1rem;background:#35251c;border:1px solid #86603b;border-radius:.65rem;padding:.7rem .4rem}
.identity-demo .face {font-size:2.2rem;line-height:1.2;color:#ffdd9d}
.identity-demo .player {font-size:.82rem;color:#dbc19c}
.identity-demo strong {color:#ffe6b5}
.steps {display:grid;gap:.48rem;margin:.85rem 0}
.steps>div {display:flex;align-items:flex-start;gap:.6rem}
.steps p {margin:0}
.step-number {display:grid;place-items:center;width:1.5rem;height:1.5rem;flex:none;border-radius:50%;background:#805a35;color:#fff1d4;font-weight:700;font-size:.82rem}
.sum-demo,.vote-demo,.dealer-demo {margin:.75rem 0;padding:.8rem;background:#32241e;border:1px solid #765336;border-radius:.7rem}
.sum-picks>div,.vote-picks>div {text-align:center;display:grid;gap:.25rem;justify-items:center;padding:.4rem;background:#241a15;border-radius:.45rem}
.sum-picks span,.vote-picks span {color:#dbc4a3;font-size:.82rem}
.sum-picks strong {font-size:1.5rem}
.positive {color:#a6e7b5}.negative {color:#f6ac9d}
.sum-result,.demo-outcome {text-align:center;padding-top:.55rem;color:#ffdfa9}
.hp-demo {display:flex;flex-wrap:wrap;gap:.55rem;align-items:center;padding:.6rem .7rem;margin:.65rem 0;background:#3c2c22;border-radius:.5rem}
.hp-chip {background:#895e36;color:#ffefd4;padding:.15rem .5rem;border-radius:.35rem;font-weight:700}
.vote-picks strong {font-size:1.8rem;color:#ffdfa7}
.outcome-grid {display:grid;gap:.7rem;margin:.8rem 0}
.outcome-card {background:#31241d;border:1px solid #765438;border-radius:.7rem;padding:.85rem;min-width:0}
.example-heading {display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem}
.example-heading h4 {margin:0;color:#f7dab0;font-size:1rem}
.identity-row {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.35rem}
.identity-row span {text-align:center;border:1px solid #73563c;border-radius:.4rem;background:#241a15;padding:.45rem .2rem;font-size:.86rem}
.event-line {margin:.6rem 0 .3rem;padding:.5rem;border-radius:.4rem;background:#493020;color:#fbd49c;line-height:1.5}
.winner-line {padding:.5rem;border-radius:.4rem;background:#2d452e;color:#d8f3cc;font-weight:700;line-height:1.5}
.dealer-demo {display:grid;justify-items:center;gap:.35rem;line-height:1.5}
.dealer-rounds {color:#e1b8a8}
.score-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;margin:.8rem 0}
.score-grid>div {display:grid;gap:.2rem;padding:.8rem;background:#32241e;border:1px solid #805b39;border-radius:.6rem}
.score-grid span {font-size:.82rem;color:#e6ca9d}
.score-grid strong {font-size:1.5rem;color:#ffdf9b;letter-spacing:.04em}
.score-grid em {font-size:.86rem;font-style:normal;line-height:1.5;color:#e5d3b4}
.closing-notes ul {padding-left:1.25rem;margin:.5rem 0;line-height:1.65}
.closing-notes li+li {margin-top:.35rem}
@media(max-width:540px) {
  .howto-body {padding:.85rem;gap:1.05rem}
  .howto-header {padding:.8rem}
  .score-grid {grid-template-columns:1fr}
  .identity-demo,.sum-picks,.vote-picks {gap:.3rem}
  .identity-demo>div {padding:.55rem .2rem}
}
</style>
