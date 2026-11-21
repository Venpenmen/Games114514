import type { Snapshot } from '../../../packages/protocol/index.ts'

type Message = Snapshot['chat'][number]

export function chatAppend(previous: Message[], current: Message[]) {
  if (previous.length > current.length || previous.some((message,i) => {
    const next = current[i]
    return message.author !== next.author || message.at !== next.at || message.text !== next.text
  })) return null
  return current.slice(previous.length)
}
