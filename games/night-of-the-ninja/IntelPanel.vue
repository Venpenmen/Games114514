<script setup lang="ts">
import GameHistory from '../../apps/web/components/GameHistory.vue'
import {phaseNames,skills} from './cards.ts'
import {asset} from './art.ts'
import type {privateView,publicView} from './engine.ts'
import CardFace from './CardFace.vue'
import IdentityCard from './IdentityCard.vue'

type Seat = ReturnType<typeof publicView>['seats'][number]
defineProps<{own:NonNullable<ReturnType<typeof privateView>>; seats:Seat[]; name:(id:string)=>string}>()
</script>

<template>
  <GameHistory title="私人情报">
    <div class="nn-intel">
      <section class="nn-intel-overview">
        <IdentityCard :identity="own.known" caption="本人当前身份"/>
        <div class="nn-intel-tokens">
          <h3>本人荣誉 · {{ own.score }} 分</h3>
          <p v-if="!own.honor.length">尚未获得荣誉</p>
          <span v-for="token in own.honor" :key="token.id" class="nn-honor" :aria-label="token.value+' 分荣誉'">
            <img :src="asset('honor-front')" alt=""><b>{{ token.value }}</b>
          </span>
        </div>
      </section>
      <section>
        <h3>历史情报</h3>
        <p v-if="!own.intel.length">本场尚未收到技能情报。</p>
        <ol v-else class="nn-intel-list">
          <li v-for="entry in [...own.intel].reverse()" :key="entry.seq">
            <header>
              <strong>{{ entry.source ? skills[entry.source][0] : entry.phase ? phaseNames[entry.phase] : '私人提示' }}</strong>
              <span>第 {{ entry.round }} 轮 · <time :datetime="new Date(entry.at).toISOString()">{{ new Date(entry.at).toLocaleTimeString() }}</time></span>
            </header>
            <p>{{ entry.target ? name(entry.target)+' · ' : '' }}{{ entry.text }}</p>
            <div class="nn-intel-evidence">
              <IdentityCard v-if="entry.identity" :identity="entry.identity" caption="取得时的身份"/>
              <CardFace v-if="entry.card" :id="entry.card" compact/>
              <span v-if="entry.honor!==undefined"><span class="nn-honor"><img :src="asset('honor-front')" alt=""><b>{{ entry.honor }}</b></span> 查阅时的分值</span>
            </div>
          </li>
        </ol>
      </section>
      <section>
        <h3>公开席位状态</h3>
        <ul class="nn-intel-roster">
          <li v-for="seat in seats" :key="seat.id">
            <img :src="asset('portrait-'+seat.portrait)" alt="">
            <span>{{ name(seat.id) }} · {{ seat.alive?'存活':'已死亡' }} · {{ seat.honorCount }} 枚荣誉</span>
          </li>
        </ul>
      </section>
    </div>
  </GameHistory>
</template>
