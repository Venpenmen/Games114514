<script setup lang="ts">
import { ref, useId } from 'vue'
defineProps<{title?:string}>()
const dialog=ref<HTMLDialogElement>()
const titleId=useId()
</script>

<template>
  <button type="button" @click="dialog?.showModal()">{{ title ?? '历史记录' }}</button>
  <dialog ref="dialog" class="history-dialog" :aria-labelledby="titleId">
    <header><h2 :id="titleId">{{ title ?? '历史记录' }}</h2><form method="dialog"><button autofocus>关闭</button></form></header>
    <div class="history-content"><slot/></div>
  </dialog>
</template>

<style scoped>
.history-dialog { width:min(36rem,calc(100% - 1rem)); max-height:calc(100dvh - 1rem); padding:0; overflow:auto; overscroll-behavior:contain; color:#f2e4cc; background:var(--room-chat-surface,#211914); border:1px solid #97714a; border-radius:.75rem; }
.history-dialog::backdrop { background:#100b08b8; }
.history-dialog header { position:sticky; top:0; display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:.6rem .8rem; background:var(--room-chat-surface,#211914); }
.history-content { padding:.6rem .8rem 1rem; overflow-wrap:anywhere; }
.history-content :deep(section + section) { margin-top:.7rem; }
</style>
