import { record, type Context, type GamePlugin, type Turn } from '../../packages/game-sdk/index.ts'

type Role = 'HUMAN' | 'GHOST'
type Candle = 'INTACT' | 'LIT' | 'DESTROYED'
type Action = { candle: number; action: 'LIGHT' | 'DESTROY' }
type Stage = 'NIGHT' | 'DAY_DISCUSSION' | 'DAY_DECISION' | 'ACCUSATION' | 'REVOTE' | 'RESULT' | 'FINISHED'
type Config = { night: number; day: number }
type Ballot = { day: number; round: number; votes: [string, string | null][] }
export type State = Turn & {
  config: Config; stage: Stage; night: number; candles: Candle[]; players: string[];
  roles: Record<string, Role>; inputs: Record<string, Action | boolean | string>;
  ballots: Ballot[]; winner?: Role; pendingWinner?: Role; next?: 'REVOTE' | 'NIGHT';
  last?: { candle: number; status: Candle };
}
const settings = [
  { key: 'night', label: '夜晚时长（秒）', options: [30,60,120,180] },
  { key: 'day', label: '讨论时长（秒）', options: [60,120,180,300] },
]
function enter(s: State, stage: Stage, now: number, seconds: number) {
  s.stage = stage
  s.phase += 1
  s.deadline = stage === 'FINISHED' ? null : now + seconds * 1000
  s.inputs = {}
}
function finish(s: State, winner: Role, now: number) {
  s.winner = winner
  enter(s, 'FINISHED', now, 0)
}
function night(s: State, now: number) {
  s.night += 1
  enter(s, 'NIGHT', now, s.config.night)
}
function intact(s: State) {
  return s.candles.flatMap((value, i) => value === 'INTACT' ? [i + 1] : [])
}
function settle(s: State, {now, random}: Context) {
  switch (s.stage) {
    case 'NIGHT': {
      const remaining = intact(s)
      const choose = () => remaining[random(remaining.length)]
      const get = (id: string): Action => (s.inputs[id] as Action | undefined) ??
        { candle: choose(), action: s.roles[id] === 'GHOST' ? 'DESTROY' : 'LIGHT' }
      const [a, b] = s.players.filter(id => s.roles[id] === 'HUMAN').map(get)
      const ghost = get(s.players.find(id => s.roles[id] === 'GHOST')!)
      const hits = ghost.candle === a.candle || ghost.candle === b.candle
      let candle: number
      let status: Candle
      if (a.candle === b.candle) {
        candle = a.candle
        status = 'LIT'
      } else if (hits && ghost.action === 'DESTROY') {
        candle = ghost.candle
        status = 'DESTROYED'
      } else if (hits && ghost.action === 'LIGHT') {
        candle = ghost.candle
        status = 'LIT'
      } else {
        candle = choose()
        status = 'DESTROYED'
      }
      s.candles[candle - 1] = status
      s.last = { candle, status }
      if (s.candles.filter(value => value === status).length === 5) finish(s, status === 'LIT' ? 'HUMAN' : 'GHOST', now)
      else enter(s, 'DAY_DISCUSSION', now, s.config.day)
      break
    }
    case 'DAY_DISCUSSION':
      if (s.night >= 3) enter(s, 'DAY_DECISION', now, 30)
      else night(s, now)
      break
    case 'DAY_DECISION':
      if (Object.values(s.inputs).filter(value => value === true).length >= 2) enter(s, 'ACCUSATION', now, 30)
      else night(s, now)
      break
    case 'ACCUSATION':
    case 'REVOTE': {
      const votes: Ballot['votes'] = s.players.map(id => [id, (s.inputs[id] as string | undefined) ?? null])
      const target = s.players.find(id => votes.filter(([, vote]) => vote === id).length >= 2)
      s.ballots.push({ day: s.night + 1, round: s.stage === 'REVOTE' ? 2 : 1, votes })
      s.pendingWinner = target ? (s.roles[target] === 'GHOST' ? 'HUMAN' : 'GHOST') : undefined
      s.next = s.stage === 'REVOTE' ? 'NIGHT' : 'REVOTE'
      enter(s, 'RESULT', now, 3)
      break
    }
    case 'RESULT':
      if (s.pendingWinner) finish(s, s.pendingWinner, now)
      else if (s.next === 'REVOTE') enter(s, 'REVOTE', now, 30)
      else night(s, now)
      break
  }
}
export const ghostCandle: GamePlugin<Config, State> = {
  id: 'ghost-candle', version: 1, name: '诡吹灯', minPlayers: 3, maxPlayers: 3,
  defaults: { night: 60, day: 120 }, settings,
  config(input) {
    const { night, day } = record(input)
    if (!settings[0].options.includes(night as number) || !settings[1].options.includes(day as number)) throw new Error('时长无效')
    return { night: night as number, day: day as number }
  },
  start(players, config, ctx) {
    if (players.length !== 3 || new Set(players).size !== 3) throw new Error('需要三名玩家')
    const ghost = players[ctx.random(players.length)]
    const roles = Object.fromEntries(players.map(id => [id, id === ghost ? 'GHOST' : 'HUMAN'])) as State['roles']
    return { config, players, roles, inputs: {}, stage: 'NIGHT', night: 1, candles: Array(9).fill('INTACT'),
      ballots: [], phase: 1, deadline: ctx.now + config.night * 1000 }
  },
  command(s, player, input, ctx) {
    if (!s.players.includes(player) || s.deadline === null || ctx.now >= s.deadline) throw new Error('阶段已结束')
    if (Object.hasOwn(s.inputs, player)) throw new Error('已确认')
    const data = record(input)
    switch (s.stage) {
      case 'NIGHT':
        if (data.kind !== 'night' || !intact(s).includes(data.candle as number) ||
          !(data.action === 'LIGHT' || data.action === 'DESTROY' && s.roles[player] === 'GHOST')) throw new Error('行动无效')
        s.inputs[player] = { candle: data.candle as number, action: data.action }
        break
      case 'DAY_DISCUSSION':
        if (data.kind !== 'discuss') throw new Error('讨论命令无效')
        s.inputs[player] = true
        break
      case 'DAY_DECISION':
        if (data.kind !== 'decision' || typeof data.yes !== 'boolean') throw new Error('表决无效')
        s.inputs[player] = data.yes
        break
      case 'ACCUSATION':
      case 'REVOTE':
        if (data.kind !== 'vote' || typeof data.target !== 'string' || data.target === player || !s.players.includes(data.target)) throw new Error('指认无效')
        s.inputs[player] = data.target
        break
      default: throw new Error('当前阶段不能提交')
    }
    if (Object.keys(s.inputs).length === s.players.length) settle(s, ctx)
  },
  advance(s, ctx) {
    if (s.deadline !== null && ctx.now >= s.deadline) settle(s, { ...ctx, now: s.deadline })
  },
  public(s) {
    return { stage: s.stage, night: s.night, candles: s.candles, ballots: s.ballots, last: s.last,
      submitted: Object.keys(s.inputs), winner: s.winner, roles: s.winner ? s.roles : undefined }
  },
  private(s, player) { return { role: s.roles[player], confirmed: s.inputs[player] } },
  finished(s) { return s.stage === 'FINISHED' },
  canChat(s) { return ['DAY_DISCUSSION','DAY_DECISION','ACCUSATION','REVOTE'].includes(s.stage) },
}
