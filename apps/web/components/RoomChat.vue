<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import type { Snapshot } from '../../../packages/protocol/index.ts'
import { chatAppend } from './chat-history.ts'

const props = defineProps<{
  messages: Snapshot['chat']; members: Snapshot['members']; scope: string; player: string;
  canChat: boolean; disabledText?: string; send: (text: string) => Promise<boolean>;
}>()
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
  if (list.value && nearBottom(list.value)) unread.value = 0
}
onMounted(jump)

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
  let follow = !el || nearBottom(el)
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
  <div class="room-chat">
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
  </div>
</template>

<style scoped>
.room-chat { min-width: 0; }
.room-chat-list {
  list-style: none; margin: .45rem 0; padding: 0;
  max-height: var(--room-chat-height, 12rem); overflow: auto; overflow-anchor: none;
  overflow-wrap: anywhere; font-weight: 400;
}
.room-chat-list li + li { margin-top: .3rem; }
.room-chat-list strong { font-weight: 700; }
.room-chat input { flex: 1 1 7rem; min-width: 0; }
</style>
