export type Random = (limit: number) => number
export type Context = { now: number; random: Random }
export type Turn = { phase: number; deadline: number | null }
export type FinalResult = {
  winners:string[]
  scores?:Record<string,number>
  details?:Record<string,unknown>
}
export interface GamePlugin<C, S extends Turn> {
  id: string
  version: number
  name: string
  minPlayers: number
  maxPlayers: number
  defaults: C
  settings: { key: string; label: string; options: number[] }[]
  config(input: unknown): C
  roomPolicy?: { capacity(config:C):number; spectators?:boolean; resumeFromLobby?:boolean; allowActiveLeave?:boolean; hostTransferMs?:number }
  canStart?(players: string[], config: C): boolean
  lobby?: { select(input: unknown): unknown; ready(selection: unknown): boolean }
  start(players: string[], config: C, ctx: Context, selections?: Record<string, unknown>): S
  command(state: S, player: string, input: unknown, ctx: Context): void
  advance(state: S, ctx: Context): void
  public(state: S): unknown
  private(state: S, player: string): unknown
  finished(state: S): boolean
  canChat(state: S): boolean
  finalResult?(state:S):FinalResult | undefined
}
export function registry<T extends {id:string; version:number}>(plugins: T[]) {
  const entries = new Map<string, T>()
  for (const plugin of plugins) {
    if (entries.has(plugin.id)) throw new Error('重复游戏注册')
    entries.set(plugin.id, plugin)
  }
  return entries
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('参数无效')
  return value as Record<string, unknown>
}
