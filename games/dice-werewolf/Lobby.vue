<script setup lang="ts">
import type { Snapshot } from '../../packages/protocol/index.ts'
import { portraits } from './portraits.ts'
import './theme.css'
defineProps<{room:Snapshot;player:string;send:(type:string,data:unknown)=>Promise<boolean>}>()
</script>
<template>
  <section class="dw-lobby">
    <h2>选择你的赌徒</h2>
    <p>形象在整场比赛中保留，与秘密身份无关。</p>
    <div class="dw-portraits">
      <button v-for="(portrait,index) in portraits" :key="portrait.name" :aria-pressed="room.lobby?.[player]===index" @click="send('lobby',{portrait:index})">
        <img :src="portrait.image" alt=""><span>{{ portrait.name }}</span>
      </button>
    </div>
    <ul class="dw-selections">
      <li v-for="member in room.members" :key="member.id">{{ member.name }} · {{ portraits[Number(room.lobby?.[member.id])]?.name ?? '待选择' }}</li>
    </ul>
  </section>
</template>
