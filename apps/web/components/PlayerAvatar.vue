<script setup lang="ts">
defineProps<{ name:string; online:boolean; src?:string; glyph?:string; compact?:boolean; imageClass?:Record<string,boolean> }>()
</script>

<template>
  <span class="player-avatar" :data-offline="!online" role="img"
    :aria-label="name + (online ? '，在线' : '，离线')" :title="online ? name : name + '（离线）'">
    <img v-if="src" :src="src" alt="" :class="imageClass">
    <span v-else class="player-avatar-glyph" aria-hidden="true">{{ glyph }}</span>
    <span v-if="!online" class="player-avatar-badge" aria-hidden="true">{{ compact ? '○' : '离线' }}</span>
  </span>
</template>

<style scoped>
.player-avatar {position:relative;display:inline-grid;place-items:center;flex:none;width:2.1rem;aspect-ratio:1;vertical-align:middle}
.player-avatar > img,.player-avatar-glyph {width:100%;height:100%;aspect-ratio:1;object-fit:cover;border-radius:.3rem}
.player-avatar-glyph {display:grid;place-items:center;background:#354336}
.player-avatar[data-offline=true] > :first-child {filter:brightness(.6) saturate(.65)}
.player-avatar-badge {position:absolute;right:-.15rem;bottom:-.12rem;padding:.04rem .18rem;border-radius:.25rem;background:#42474d;color:#fff;font-size:.58rem;line-height:1.3;white-space:nowrap}
</style>
