<script setup lang="ts">
import {asset,labels} from './art.ts'
import type {Identity} from './engine.ts'
defineProps<{identity:Identity|null;caption:string}>()
</script>

<template>
  <div class="nn-identity-card" :data-house="identity?.house ?? 'unknown'">
    <img :src="asset(identity?.house ?? 'card-back')" alt="">
    <div>
      <small>{{ caption }}</small>
      <strong>{{ identity ? labels[identity.house] : '身份可能变化' }}</strong>
      <span v-if="identity?.rank">等级 {{ identity.rank }} · 1 最高</span>
      <span v-else-if="!identity">当前流派不可查看</span>
    </div>
  </div>
</template>
