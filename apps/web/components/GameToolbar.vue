<script setup lang="ts">
import {ref} from 'vue'
import GameUIGuide from './GameUIGuide.vue'
import {effects} from './effects.ts'
defineProps<{code:string;gameId:string;speed?:number}>()
const emit=defineEmits<{lobby:[]}>()
const confirm=ref<HTMLDialogElement>(),settings=ref<HTMLDialogElement>()
</script>
<template>
  <nav class="game-toolbar" :data-theme="gameId" aria-label="对局导航">
    <button @click="confirm?.showModal()">返回大厅</button><span>房间号：{{ code }}</span>
    <span class="toolbar-spacer"></span><GameUIGuide :game-id="gameId"/>
    <button @click="settings?.showModal()">设置</button>
  </nav>
  <dialog ref="confirm" aria-label="返回游戏大厅？"><h2>返回游戏大厅？</h2>
    <p>返回后将保留你在当前房间的席位及对局进度，之后可以从大厅继续进入。</p>
    <div class="actions"><button autofocus @click="confirm?.close()">继续游戏</button><button @click="confirm?.close();emit('lobby')">确认返回</button></div>
  </dialog>
  <dialog ref="settings" aria-label="游戏设置"><header><h2>游戏设置</h2><button autofocus @click="settings?.close()">关闭</button></header>
    <label>个人演出偏好 <select v-model="effects"><option value="full">完整</option><option value="light">轻量</option><option value="reduced">减少动态</option></select></label>
    <p>本房间演出时长倍率：{{ speed??1 }}×（开局后锁定）</p>
    <p>个人偏好只改变表现方式；房间演出速度由房主开局前设定，所有玩家共用服务端进度。</p>
  </dialog>
</template>
<style scoped>
.game-toolbar{display:flex;align-items:center;gap:.6rem;margin:0 0 .45rem;padding:0 .7rem;border:1px solid #7775;border-radius:.65rem;color:inherit}.toolbar-spacer{flex:1}.game-toolbar span{white-space:nowrap}dialog{max-width:min(38rem,94vw);max-height:88dvh;overflow:auto;background:#171e1b;color:#f1e5cc;border:1px solid #ac9259;border-radius:.8rem;padding:1.3rem}dialog::backdrop{background:#000b}header{display:flex;justify-content:space-between;align-items:center}label{display:flex;gap:1rem;align-items:center}@media(max-width:430px){.game-toolbar{gap:.3rem;font-size:.8rem;padding:.35rem}.game-toolbar button{padding:.55rem .5rem}}
</style>
