import { record, type Context, type GamePlugin, type Turn } from '../../packages/game-sdk/index.ts'

type Stage = 'ACTION' | 'VOTE' | 'REVOTE' | 'BALLOT' | 'SUMMARY' | 'CHAMPION'
type Cause = 'health' | 'vote' | 'dealer'
type Score = Record<string, number>
type Point = { face: number; hp: number; removed: boolean }
type Execution = { cause: Cause; faces: number[]; round: number }
type Ballot = {
  round: number; attempt: number; votes: { player: string; face: number; automatic: boolean }[];
  totals: Record<number, number>; target: number | null;
}
type Summary = {
  reason: 'identity' | 'duplicate'; game: number; round: number; identities: Score; points: Point[]; executions: Execution[];
  ballots: Ballot[]; winners: string[]; scores: Score; overtime: boolean; champion: string | null;
}
type Config = { target: number }
export type DiceState = Turn & {
  stage: Stage; players: string[]; target: number; portraits: Score; scores: Score; overtime: boolean;
  game: number; round: number; identities: Score; points: Point[]; inputs: Score; face: number;
  last: {face: number; delta: number; hp: number; automatic: number} | null;
  ballots: Ballot[]; executions: Execution[]; dryRounds: number; removedThisRound: boolean;
  afterBallot: 'REVOTE' | 'NEXT' | null; summary: Summary | null;
}
const faces = [1,2,3,4,5,6]
const seconds = { ACTION:30, VOTE:30, REVOTE:30, BALLOT:3, SUMMARY:8, CHAMPION:0 }
const alive = (s: DiceState) => s.points.filter(point => !point.removed)
function enter(s: DiceState, stage: Stage, now: number) {
  s.stage = stage
  s.phase++
  s.deadline = stage === 'CHAMPION' ? null : now + seconds[stage]*1000
  s.inputs = {}
}
function startRound(s: DiceState, now: number) {
  s.round++
  s.removedThisRound = false
  s.face = alive(s)[0].face
  enter(s,'ACTION',now)
}
function startGame(s: DiceState, ctx: Context) {
  let roles: number[]
  if (s.overtime) {
    const remaining = [...faces]
    roles = s.players.map(() => remaining.splice(ctx.random(remaining.length),1)[0])
  } else {
    do { roles = s.players.map(() => faces[ctx.random(faces.length)]) }
    while (new Set(roles).size === 1)
  }
  s.identities = Object.fromEntries(s.players.map((id,i) => [id,roles[i]]))
  s.game++
  s.points = faces.map(face => ({face,hp:0,removed:false}))
  s.round = 0
  s.last = null
  s.dryRounds = 0
  s.executions = []
  s.ballots = []
  s.afterBallot = null
  startRound(s,ctx.now)
}
function finishGame(s: DiceState, winners: string[], reason: Summary['reason'], now: number) {
  for (const id of winners) s.scores[id]++
  const high = Math.max(...Object.values(s.scores))
  const leaders = s.players.filter(id => s.scores[id] === high)
  const champion = high >= s.target && leaders.length === 1 ? leaders[0] : null
  if (high >= s.target && !champion) s.overtime = true
  s.summary = {
    reason, game:s.game, round:s.round, identities:{...s.identities}, points:s.points.map(point=>({...point})),
    executions:s.executions, ballots:s.ballots, winners, scores:{...s.scores}, overtime:s.overtime, champion,
  }
  enter(s,champion ? 'CHAMPION' : 'SUMMARY',now)
}
function execute(s: DiceState, targets: number[], cause: Cause, now: number) {
  for (const point of s.points) if (targets.includes(point.face)) point.removed = true
  s.removedThisRound = true
  s.dryRounds = 0
  s.executions.push({cause,faces:targets,round:s.round})
  const losers = s.players.filter(id => targets.includes(s.identities[id]))
  if (losers.length) {
    finishGame(s,s.players.filter(id=>!losers.includes(id)),'identity',now)
    return true
  }
  const distinct = new Set(Object.values(s.identities))
  if (!s.overtime && alive(s).length === 2 && distinct.size === 2) {
    finishGame(s,s.players.filter(id=>s.players.filter(other=>s.identities[id]===s.identities[other]).length===1),'duplicate',now)
    return true
  }
  return false
}
function endRound(s: DiceState, ctx: Context) {
  if (!s.removedThisRound && ++s.dryRounds === 3) {
    s.dryRounds = 0
    const occupied = Object.values(s.identities)
    const empty = alive(s).filter(point=>!occupied.includes(point.face))
    if (empty.length && execute(s,[empty[ctx.random(empty.length)].face],'dealer',ctx.now)) return
  }
  startRound(s,ctx.now)
}
function settle(s: DiceState, ctx: Context) {
  const { now, random } = ctx
  switch (s.stage) {
    case 'ACTION': {
      const point = s.points[s.face-1]
      const automatic = s.players.filter(id=>!Object.hasOwn(s.inputs,id)).length
      const delta = s.players.reduce((value,id)=>value+(s.inputs[id] ?? (random(2) ? 1 : -1)),0)
      point.hp += delta
      s.last = {face:point.face,delta,hp:point.hp,automatic}
      const following = alive(s).find(candidate=>candidate.face>s.face)
      if (following) {
        s.face = following.face
        enter(s,'ACTION',now)
        return
      }
      const targets = alive(s).filter(candidate=>candidate.hp<=-5).map(candidate=>candidate.face)
      if (targets.length && execute(s,targets,'health',now)) return
      enter(s,'VOTE',now)
      return
    }
    case 'VOTE':
    case 'REVOTE': {
      const candidates = alive(s)
      const votes = s.players.map(player=>({
        player, face:s.inputs[player] ?? candidates[random(candidates.length)].face, automatic:!Object.hasOwn(s.inputs,player),
      }))
      const totals: Record<number,number> = {}
      for (const vote of votes) totals[vote.face] = (totals[vote.face] ?? 0)+1
      const target = candidates.find(point=>totals[point.face]>=2)?.face ?? null
      const attempt = s.stage === 'VOTE' ? 1 : 2
      s.ballots.push({round:s.round,attempt,votes,totals,target})
      if (target !== null && execute(s,[target],'vote',now)) return
      s.afterBallot = target === null && attempt === 1 ? 'REVOTE' : 'NEXT'
      enter(s,'BALLOT',now)
      return
    }
    case 'BALLOT':
      if (s.afterBallot === 'REVOTE') enter(s,'REVOTE',now)
      else endRound(s,ctx)
      return
    case 'SUMMARY':
      startGame(s,ctx)
      return
  }
}
export const diceWerewolf: GamePlugin<Config,DiceState> = {
  id:'dice-werewolf', version:1, name:'骰子狼人杀', minPlayers:3, maxPlayers:3,
  roomPolicy:{capacity:()=>3,allowActiveLeave:true,resumeFromLobby:true},
  defaults:{target:5}, settings:[{key:'target',label:'目标积分',options:[3,5,7]}],
  config(input) {
    const target = record(input).target
    if (target!==3 && target!==5 && target!==7) throw new Error('目标积分仅可设为 3、5 或 7')
    return {target}
  },
  lobby: {
    select(input) {
      const portrait = record(input).portrait
      if (typeof portrait !== 'number' || !Number.isInteger(portrait) || portrait<0 || portrait>5) throw new Error('赌徒形象无效')
      return portrait
    },
    ready(selection) { return typeof selection === 'number' },
  },
  start(players, config, ctx, selections = {}) {
    if (players.length !== 3 || new Set(players).size !== 3) throw new Error('需要三名不同玩家')
    const portraits = Object.fromEntries(players.map(id=>[id,selections[id] as number]))
    const s: DiceState = {
      stage:'ACTION',phase:0,deadline:null,players,target:config.target,portraits,
      scores:Object.fromEntries(players.map(id=>[id,0])),overtime:false,game:0,round:0,
      identities:{},points:[],inputs:{},face:1,last:null,ballots:[],executions:[],dryRounds:0,
      removedThisRound:false,afterBallot:null,summary:null,
    }
    startGame(s,ctx)
    return s
  },
  command(s, player, input, ctx) {
    if (!s.players.includes(player) || s.deadline === null || ctx.now>=s.deadline) throw new Error('阶段已结束')
    if (Object.hasOwn(s.inputs,player)) throw new Error('已提交，不能更改')
    const {kind,value} = record(input)
    if (s.stage === 'ACTION' && kind === 'act' && (value===1 || value===-1)) s.inputs[player]=value
    else if ((s.stage==='VOTE' || s.stage==='REVOTE') && kind==='vote' && alive(s).some(point=>point.face===value)) s.inputs[player]=value as number
    else throw new Error('当前行动无效')
    if (Object.keys(s.inputs).length === 3) settle(s,ctx)
  },
  advance(s,ctx) {
    if (s.deadline !== null && ctx.now>=s.deadline) settle(s,{...ctx,now:s.deadline})
  },
  public(s) {
    return {
      stage:s.stage, game:s.game, round:s.round, target:s.target, portraits:s.portraits, scores:s.scores,
      overtime:s.overtime, points:s.points, face:s.face, last:s.last, ballots:s.ballots,
      executions:s.executions, submitted:Object.keys(s.inputs), dryRounds:s.dryRounds, summary:s.summary,
    }
  },
  private(s,player) { return {identity:s.identities[player]} },
  finished(s) { return s.stage==='CHAMPION' },
  finalResult(s) {
    if(s.stage==='CHAMPION' && s.summary?.champion)
      return {winners:[s.summary.champion],scores:s.scores,details:{games:s.game}}
  },
  canChat(s) { return s.stage!=='CHAMPION' },
}
export type DicePublic = ReturnType<typeof diceWerewolf.public> & Pick<DiceState,'stage'|'game'|'round'|'target'|'portraits'|'scores'|'overtime'|'points'|'face'|'last'|'ballots'|'executions'|'dryRounds'|'summary'> & {submitted:string[]}
