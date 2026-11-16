<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, useId, watch } from 'vue'
import type { Snapshot } from '../../../packages/protocol/index.ts'
import { chatAppend } from './chat-history.ts'

const props = defineProps<{
  messages: Snapshot['chat']; members: Snapshot['members']; scope: string; player: string;
  canChat: boolean; highlight?: boolean; disabledText?: string; send: (text: string) => Promise<boolean>;
}>()
const drawerId = useId()
const drawer = ref(false)
const mobile = ref(false)
const keyboard = ref(0)
const viewportHeight = ref<number>()
const opener = ref<HTMLButtonElement>()
const closeButton = ref<HTMLButtonElement>()
let compact: MediaQueryList
function resize() {
  mobile.value = compact.matches
  const viewport = window.visualViewport
  viewportHeight.value = viewport?.height
  keyboard.value = viewport ? Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop) : 0
}
async function toggle(open: boolean) {
  drawer.value = open
  await nextTick()
  if (open) closeButton.value?.focus({preventScroll:true})
  else opener.value?.focus({preventScroll:true})
}
const list = ref<HTMLElement>()
const unread = ref(0)
const draft = ref('')
const sending = ref(false)
let historyGeneration = 0
const acknowledged = new Set<{ index: number; text: string }>()
const nearBottom = (el: HTMLElement) => el.scrollHeight - el.clientHeight - el.scrollTop <= 40

function jump() {
  if (list.value) list.value.scrollTop = list.value.scrollHeight
  unread.value = 0
}
function onScroll() {
  if ((!mobile.value || drawer.value) && list.value && nearBottom(list.value)) unread.value = 0
}
onMounted(()=>{
  compact=window.matchMedia('(max-width: 800px), (max-height: 520px) and (pointer: coarse)')
  resize()
  compact.addEventListener('change',resize)
  window.visualViewport?.addEventListener('resize',resize)
  window.visualViewport?.addEventListener('scroll',resize)
  jump()
})
onUnmounted(()=>{
  compact?.removeEventListener('change',resize)
  window.visualViewport?.removeEventListener('resize',resize)
  window.visualViewport?.removeEventListener('scroll',resize)
})

watch([() => props.scope, () => props.messages], async ([scope, messages], [previousScope, previous]) => {
  const added = scope === previousScope ? chatAppend(previous,messages) : null
  if (added?.length === 0) return
  if (added === null) {
    historyGeneration++
    acknowledged.clear()
    if (scope !== previousScope) draft.value = ''
    await nextTick()
    jump()
    return
  }

  // Default pre-flush runs against the previous list DOM.
  const el = list.value
  const top = el?.scrollTop ?? 0
  let follow = (!mobile.value || drawer.value) && (!el || nearBottom(el))
  for (const sent of acknowledged) {
    if (messages.slice(sent.index).some(message => message.author === props.player && message.text === sent.text)) {
      acknowledged.delete(sent)
      follow = true
    }
  }
  await nextTick()
  if (follow) jump()
  else {
    if (list.value) list.value.scrollTop = top
    unread.value += added.length
  }
})

async function submit() {
  const text = draft.value.trim()
  if (!props.canChat || !text || sending.value) return
  const generation = historyGeneration
  const scope = props.scope
  const index = props.messages.length
  sending.value = true
  try {
    if (!await props.send(text) || scope !== props.scope) return
    if (draft.value.trim() === text) draft.value = ''
    if (generation === historyGeneration && !props.messages.slice(index).some(message =>
      message.author === props.player && message.text === text)) {
      acknowledged.add({index,text})
    }
    await nextTick()
    jump()
  } finally {
    sending.value = false
  }
}
const name = (id: string) => props.members.find(member => member.id === id)?.name ?? '已离开'
</script>

<template>
  <div class="room-chat" :class="{'is-open':drawer}" :style="{'--chat-keyboard':keyboard+'px','--chat-viewport':viewportHeight ? viewportHeight+'px' : '100dvh'}">
    <div class="room-chat-tools">
      <button ref="opener" class="room-chat-toggle" type="button" :class="{highlight}" :aria-expanded="drawer" :aria-controls="drawerId" @click="toggle(!drawer)">
        聊天<span v-if="unread"> · {{ unread }} 条未读</span>
      </button>
      <slot name="tools"/>
    </div>
    <section :id="drawerId" class="room-chat-drawer" aria-label="房间公聊"
      :inert="mobile && !drawer" @keydown.esc.stop="mobile && toggle(false)">
      <div class="room-chat-heading"><h3>房间公聊</h3><button ref="closeButton" type="button" @click="toggle(false)">关闭聊天</button></div>
    <ul v-show="messages.length" ref="list" class="room-chat-list" role="list" aria-label="公聊记录" tabindex="0" @scroll="onScroll">
      <li v-for="(message,index) in messages" :key="index">【<strong>{{ name(message.author) }}</strong>】<span>{{ message.text }}</span></li>
    </ul>
    <div aria-live="polite">
      <button v-if="unread" type="button" @click="jump">↓ 下方有 {{ unread }} 条新消息</button>
    </div>
    <form v-if="canChat" class="actions" @submit.prevent="submit">
      <input v-model="draft" maxlength="280" aria-label="聊天消息" required><button :disabled="sending">发送</button>
    </form>
    <p v-else-if="disabledText">{{ disabledText }}</p>
    </section>
  </div>
</template>

<style scoped>
.room-chat { min-width: 0; }
.room-chat-tools { display:flex; gap:.5rem; margin-bottom:.4rem; }
.room-chat-heading { display:flex; align-items:center; justify-content:space-between; gap:.5rem; }
.room-chat-toggle, .room-chat-heading button { display:none; }
@media (max-width:800px), (max-height:520px) and (pointer:coarse) {
  .room-chat-tools { position:fixed; z-index:5; inset:auto .55rem calc(env(safe-area-inset-bottom) + .4rem); justify-content:center; margin:0; pointer-events:none; }
  .room-chat-tools > :deep(*) { pointer-events:auto; }
  .room-chat-toggle,.room-chat-heading button { display:inline-block; }
  .room-chat-toggle.highlight { box-shadow:inset 0 0 0 1px #e8b477; }
  .room-chat-drawer {
    position:fixed; z-index:6; inset:auto .5rem calc(var(--chat-keyboard) + env(safe-area-inset-bottom) + .5rem);
    max-height:calc(var(--chat-viewport) - 1rem); padding:.7rem;
    display:flex; flex-direction:column; overflow:auto; overscroll-behavior:contain;
    background:var(--room-chat-surface,#211914); color:#f2e4cc;
    border:1px solid #97714a; border-radius:.7rem; box-shadow:0 10px 36px #000a;
    visibility:hidden;
  }
  .is-open .room-chat-drawer { visibility:visible; }
  :global(body:has(dialog[open])) .room-chat-drawer,
  :global(body:has(dialog[open])) .room-chat-toggle { visibility:hidden; }
  .room-chat-drawer form { flex-shrink:0; }
  .room-chat-drawer input { font-size:16px; }
}
.room-chat-list {
  list-style: none; margin: .45rem 0; padding: 0;
  max-height: min(var(--room-chat-height, 20rem), 37dvh); min-height:0; overflow: auto; overflow-anchor: none;
  overflow-wrap: anywhere; font-weight: 400;
}
.room-chat-list li + li { margin-top: .3rem; }
.room-chat-list strong { font-weight: 700; }
.room-chat input { flex: 1 1 7rem; min-width: 0; }
</style>
