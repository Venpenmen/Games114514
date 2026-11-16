<script setup lang="ts">
import {computed} from 'vue'
import {cards,phaseNames,skills} from './cards.ts'
import {asset} from './art.ts'

const props=defineProps<{id:string;compact?:boolean}>()
const card=computed(()=>cards[props.id])
const text=computed(()=>skills[card.value.skill])
</script>

<template>
  <span class="nn-card-face" :class="{'nn-card-compact':compact}" :data-card-phase="card.phase">
    <span class="nn-card-art"><img :src="asset(card.skill)" alt=""><b>{{ card.number }}</b></span>
    <span class="nn-card-copy">
      <small>{{ card.phase==='special' ? card.skill==='master'?'揭示牌':'反应牌' : phaseNames[card.phase] }}</small>
      <strong>{{ text[0] }}</strong>
      <span v-if="!compact">{{ text[1] }}</span>
    </span>
  </span>
</template>
