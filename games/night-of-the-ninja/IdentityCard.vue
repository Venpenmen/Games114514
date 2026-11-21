<script setup lang="ts">
import {asset,labels} from './art.ts'
import type {Identity} from './engine.ts'
defineProps<{identity:Identity|null;caption:string}>()
</script>

<template>
  <div class="nn-identity-card" :data-house="identity?.house ?? 'unknown'">
    <span class="nn-identity-card-art" :class="{'nn-identity-known':Boolean(identity)}">
      <img :src="asset(identity?.house ?? 'card-back')" alt="">
      <span v-if="identity?.rank" class="nn-identity-rank-badge">{{ identity.rank }}</span>
    </span>
    <div>
      <small>{{ caption }}</small>
      <strong>{{ identity ? labels[identity.house] : '身份可能变化' }}</strong>
      <span v-if="!identity">当前流派不可查看</span>
    </div>
  </div>
</template>
