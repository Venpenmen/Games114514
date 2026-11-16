<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId, watch } from 'vue'

const props=defineProps<{resultKey?: string; title: string; victory: boolean; theme: 'ghost' | 'dice'}>()
const dialog=ref<HTMLDialogElement>()
const titleId=useId()
const seen=new Set<string>()
let presented:string | undefined

function present() {
  const el=dialog.value
  const key=props.resultKey
  if (!el) return
  if (el.open && presented!==key) el.close()
  if (!key || el.open || seen.has(key)) return
  const storageKey='games-result:'+key
  try { if (sessionStorage.getItem(storageKey)) return } catch {}
  if (document.querySelector('dialog[open]')) return
  el.showModal()
  presented=key
  seen.add(key)
  try { sessionStorage.setItem(storageKey,'1') } catch {}
}
watch(()=>props.resultKey,present,{flush:'post'})
onMounted(()=>{
  document.addEventListener('close',present,true)
  present()
})
onUnmounted(()=>document.removeEventListener('close',present,true))
</script>

<template>
  <dialog ref="dialog" class="game-result" :data-theme="theme" :data-victory="victory" :aria-labelledby="titleId">
    <h2 :id="titleId">{{ title }}</h2>
    <div class="game-result-body"><slot/></div>
    <form method="dialog"><button autofocus>关闭结果</button></form>
  </dialog>
</template>

<style scoped>
.game-result {
  --border: #80624b;
  --headline: #ffdb92;
  color: #f5ead6;
  background: radial-gradient(ellipse at top,#493728,#211a15 72%);
  border: 2px solid var(--border);
  box-shadow: 0 18px 65px #000a;
  border-radius: .9rem;
  width: min(30rem, calc(100% - 1.5rem));
  max-height: calc(100dvh - 1.5rem);
  padding: clamp(.85rem, 5vw, 1.6rem);
  overflow: auto;
}
.game-result[data-theme=ghost] {
  background: radial-gradient(ellipse at top,#35303e,#191820 75%);
  --border:#8d779a;
}
.game-result[data-victory=false] { --headline: #ffbbae; }
.game-result::backdrop { background: #080609bd; }
.game-result h2 {
  color: var(--headline);
  font: 700 clamp(1.55rem, 6vw, 2.4rem)/1.2 'Songti SC', SimSun, serif;
  margin: 0 0 .8rem;
}
.game-result-body { overflow-wrap: anywhere; }
.game-result form { margin-top: 1rem; }
.game-result button { min-width: 7rem; }
</style>
