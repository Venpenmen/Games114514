import { defineAsyncComponent, type Component } from 'vue'
import ghostCandleArt from '../../games/ghost-candle/key-art.webp'

import diceWerewolfArt from '../../games/dice-werewolf/saloon.webp'

import ninjaArt from '../../games/night-of-the-ninja/assets/castle.webp'

export const gameLobbies = new Map([
  ['night-of-the-ninja', defineAsyncComponent(() => import('../../games/night-of-the-ninja/Lobby.vue'))],
  ['dice-werewolf', defineAsyncComponent(() => import('../../games/dice-werewolf/Lobby.vue'))],
])

export const gameRules = new Map([
  ['night-of-the-ninja', defineAsyncComponent(() => import('../../games/night-of-the-ninja/Rules.vue'))],
  ['dice-werewolf', defineAsyncComponent(() => import('../../games/dice-werewolf/Rules.vue'))],
  ['ghost-candle', defineAsyncComponent(() => import('../../games/ghost-candle/Rules.vue'))],
])

export const gameArtwork = new Map([
  ['night-of-the-ninja', {cover:ninjaArt, description:'月下城郭的 4–11 人秘密轮抽与身份博弈。'}],
  ['dice-werewolf', { cover: diceWerewolfArt, description: '三名赌徒，六枚骰子。藏住身份，在地下赌场赢下积分赛。' }],
  ['ghost-candle', { cover: ghostCandleArt, description: '两名人类，一名诡异。夜里守住烛火，白天从同伴中找出诡异。' }],
])
export const gameViews = new Map<string, Component>([
  ['night-of-the-ninja', defineAsyncComponent(() => import('../../games/night-of-the-ninja/View.vue'))],
  ['dice-werewolf', defineAsyncComponent(() => import('../../games/dice-werewolf/View.vue'))],
  ['ghost-candle', defineAsyncComponent(() => import('../../games/ghost-candle/View.vue'))],
])
