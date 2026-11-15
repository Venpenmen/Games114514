import { defineAsyncComponent } from 'vue'
export const gameViews = new Map([
  ['ghost-candle', defineAsyncComponent(() => import('../../games/ghost-candle/View.vue'))],
])
