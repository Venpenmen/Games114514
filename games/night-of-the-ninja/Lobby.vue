<script setup lang="ts">
import type {Snapshot} from '../../packages/protocol/index.ts'
import {asset} from './art.ts'
import './theme.css'
defineProps<{room:Snapshot;player:string;send:(type:string,data:unknown)=>Promise<boolean>}>()
</script>
<template>
  <section class="nn-lobby">
    <h2>选择中立忍者外观</h2>
    <div class="nn-portraits">
      <button v-for="i in 11" :key="i" :aria-label="'肖像 '+i" :aria-pressed="room.lobby?.[player]===i-1" @click="send('lobby',{portrait:i-1})">
        <img :src="asset('portrait-'+(i-1))" alt=""><span>{{ i }}</span>
      </button>
    </div>
  </section>
</template>
