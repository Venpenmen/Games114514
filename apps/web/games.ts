import { defineAsyncComponent } from 'vue'
import ghostCandleArt from '../../games/ghost-candle/key-art.webp'

export const gameRules = new Map([
  ['ghost-candle', defineAsyncComponent(() => import('../../games/ghost-candle/Rules.vue'))],
])

export const gameArtwork = new Map([
  ['ghost-candle', { cover: ghostCandleArt, description: '两名人类，一名诡异。夜里守住烛火，白天从同伴中找出诡异。' }],
])
export const gameViews = new Map([
  ['ghost-candle', defineAsyncComponent(() => import('../../games/ghost-candle/View.vue'))],
])
