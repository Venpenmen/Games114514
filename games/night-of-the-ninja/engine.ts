import { record, type Context, type GamePlugin, type Turn } from '../../packages/game-sdk/index.ts'
import { cards, deck, phases, type Phase, type Skill } from './cards.ts'

type House = 'crane'|'lotus'|'ronin'
export type Identity = {house:House; rank:number}
type Honor = {id:number; value:number}
type Config = {playerCount:number; draft:number; play:number; target:number; reaction:number}
type Mode = 'draft1'|'draft2'|'commit'|'play'|'target'|'second'|'choice'|'recover'|'reaction'|'reveal'|'awards'|'ready'|'champion'|'presentation'
type Play = {player:string; card:string; executionId?:number}
type TableTarget = {round:number; after:number; executionId?:number; player:string; card:string; target:string; ordinal:1|2}
type Option = {value:string; label:string; target?:string; card?:string}
export type PublicEvent = {
  seq:number; at:number; round:number; kind:string; actors:string[]; text:string;
  card?:string; identities?:Record<string,Identity>; group?:string; presentationAt?:number; duration?:number;
  executionId?:number;
}
type IntelEvent = {seq:number; at:number; round:number; phase?:Phase; source?:Skill; target?:string; viewedBy?:string; actor?:string; actingCard?:string; text:string; identity?:Identity; card?:string; honor?:number}
export type Seat = {id:string; portrait:number; alive:boolean; identity:Identity; known:Identity|null; hand:string[]; honor:Honor[]; intel:IntelEvent[] }
export type ReplayEntry = {
  round:number; phase:Phase|null; step:string; player?:string; card?:string;
  choice?:string; affected?:string; intel?:IntelEvent; result?:PublicEvent;
  seats?:{id:string; identity?:Identity; hand?:string[]; honor?:Honor[]; score?:number; alive?:boolean}[];
  honorChanges?:{id:string;before:number;after:number;gained:Honor[];lost:Honor[]}[];
  draft?:{id:string; kept:string; received?:string[]; passed?:string[]; discarded?:string}[];
}
type Observation = {seats:Seat[]; tableTargets:TableTarget[]}
type PresentationStep = {events:number[];duration:number;visible:Observation}
type Presentation = {events:number[]; duration:number; next:'card'|{mode:Mode;seconds:number};steps?:PresentationStep[];cursor?:number}
const observations=new WeakMap<NinjaState,Map<number,Observation>>()
function observe(s:NinjaState):Observation {
  return structuredClone({seats:s.seats,tableTargets:s.tableTargets??[]})
}
function visibleStep(s:NinjaState) {
  return s.mode==='presentation'?s.presentation?.steps?.[s.presentation.cursor??0]:undefined
}
export type NinjaState = Turn & {
  config:Config; round:number; mode:Mode; night:number; seats:Seat[]; discard:string[];
  pool:Honor[]; nextHonor:number; events:PublicEvent[]; seq:number; submissions:Record<string,string>;
  queue:Play[]; current?:Play; target?:string; second?:string; offered:string[];
  presentation?:Presentation; presentedThrough?:number; replay?:ReplayEntry[]; replayFrom?:number; tableTargets?:TableTarget[];
  awardees:string[]; champions:string[]; finalScores?:Record<string,number>;
}
const settings = [
  {key:'playerCount',label:'正式玩家数',options:[4,5,6,7,8,9,10,11]},
  {key:'draft',label:'轮抽秒数',options:[30,45,60,90]},
  {key:'play',label:'出牌秒数',options:[20,30,45,60]},
  {key:'target',label:'技能目标秒数',options:[15,30,45,60]},
  {key:'reaction',label:'刺杀反应秒数',options:[10,15,20,30]},
]
export const defaults: Config = {playerCount:4,draft:45,play:30,target:30,reaction:15}
const opt = (value:string,label:string,target?:string,card?:string):Option => ({value,label,target,card})
const pass = opt('pass','跳过')
const durations:Record<string,number>={play:1500,identity:4000,swap:4000,death:4000,mirror:3500,martyr:3500,houses:2800,reveal:2600,honor:5000,champion:6000}
const seat = (s:NinjaState,id:string) => s.seats.find(value=>value.id===id)!
const skill = (s:NinjaState) => cards[s.current!.card].skill
const sum = (p:Seat) => p.honor.reduce((n,h)=>n+h.value,0)

function shuffle<T>(values:T[],random:Context['random']) {
  const result=[...values]
  for(let i=result.length-1;i>0;i--) {
    const j=random(i+1)
    ;[result[i],result[j]]=[result[j],result[i]]
  }
  return result
}
function recordReplay(s:NinjaState,entry:Omit<ReplayEntry,'round'|'phase'>) {
  s.replay??=[]
  s.replay.push({round:s.round,phase:phases[s.night]??null,...entry})
}
function replaySeats(s:NinjaState,kind:'deal'|'identity'|'score') {
  return s.seats.map(p=>({
    id:p.id,
    ...(kind!=='score'?{identity:{...p.identity},alive:p.alive}:{}),
    ...(kind==='deal'?{hand:[...p.hand]}:{}),
    ...(kind==='score'?{honor:p.honor.map(token=>({...token})),score:sum(p)}:{}),
  }))
}
function event(s:NinjaState,ctx:Context,kind:string,text:string,actors:string[]=[],extra:Pick<PublicEvent,'card'|'identities'|'group'>={}) {
  const executionId=['identity','swap','attack','death','mirror','martyr','honor'].includes(kind)?s.current?.executionId:undefined
  const result={seq:++s.seq,at:ctx.now,round:s.round,kind,text,actors,...extra,...(executionId===undefined?{}:{executionId})}
  s.events.push(result)
  observations.get(s)?.set(result.seq,observe(s))
  const before=observations.get(s)?.get(0)
  const honorChanges=kind==='honor'&&before?s.seats.flatMap(p=>{
    const old=before.seats.find(seat=>seat.id===p.id)!
    const gained=p.honor.filter(token=>!old.honor.some(item=>item.id===token.id))
    const lost=old.honor.filter(token=>!p.honor.some(item=>item.id===token.id))
    return gained.length||lost.length?[{id:p.id,before:sum(old),after:sum(p),gained,lost}]:[]
  }):undefined
  recordReplay(s,{step:kind,result,honorChanges,
    ...(['honor','champion'].includes(kind)?{seats:replaySeats(s,'score')}:{}),
    ...(['swap','reveal'].includes(kind)?{seats:replaySeats(s,'identity')}:{}),
  })
}
function confirmTarget(s:NinjaState,ctx:Context,id:string,ordinal:1|2) {
  const play=s.current!
  play.executionId??=s.events.findLast(item=>item.round===s.round && item.kind==='play' &&
    item.card===play.card && item.actors[0]===play.player)?.seq
  ;(s.tableTargets??=[]).push({round:s.round,after:s.seq,executionId:play.executionId,
    player:play.player,card:play.card,target:id,ordinal})
  if(skill(s)!=='mystic') notifyTarget(s,ctx,id,play.player,play.card)
}
function intel(s:NinjaState,ctx:Context,player:string,data:Omit<IntelEvent,'seq'|'at'|'round'>) {
  const source=s.current?.player===player && (data.target || data.card || skill(s)==='dig') ? skill(s) : undefined
  const entry={seq:seat(s,player).intel.length+1,at:ctx.now,round:s.round,phase:phases[s.night],...data,source}
  seat(s,player).intel.push(entry)
  recordReplay(s,{step:'intel',player,intel:entry})
}
function notifyTarget(s:NinjaState,ctx:Context,target:string,actor:string,actingCard:string,card?:string) {
  intel(s,ctx,target,{actor,actingCard,card,viewedBy:card?actor:undefined,
    text:card?'你的手牌被查看。':'你被选为技能目标。'})
}
function changeMode(s:NinjaState,ctx:Context,mode:Mode,seconds:number) {
  s.mode=mode
  s.phase++
  s.deadline=mode==='champion'?null:ctx.now+seconds*1000
  s.submissions={}
}
function hold(s:NinjaState,ctx:Context,next:Presentation['next']) {
  const after=s.presentedThrough??0
  const events=s.events.filter(item=>item.seq>after&&item.at===ctx.now&&durations[item.kind])
  s.presentedThrough=s.seq
  if(!events.length) return false
  const duration=Math.max(...events.map(item=>durations[item.kind]))
  const context=s.events.filter(item=>item.seq>after&&item.at===ctx.now&&(durations[item.kind]||item.kind==='attack'||item.kind==='pool'))
  const frames=observations.get(s)
  if(frames) {
    const steps:PresentationStep[]=context.map(item=>({
      events:[item.seq],duration:durations[item.kind]??1100,visible:frames.get(item.seq)!,
    }))
    s.presentation={events:context.map(item=>item.seq),duration:steps[0].duration,next,steps,cursor:0}
  } else s.presentation={events:context.map(item=>item.seq),duration,next}
  changeMode(s,ctx,'presentation',s.presentation.duration/1000)
  return true
}
function enter(s:NinjaState,ctx:Context,mode:Mode,seconds:number) {
  if(!hold(s,ctx,{mode,seconds})) changeMode(s,ctx,mode,seconds)
}
function replenish(s:NinjaState) {
  for(const [value,count] of [[2,14],[3,14],[4,7]]) {
    for(let i=0;i<count;i++) s.pool.push({id:++s.nextHonor,value})
  }
}
function award(s:NinjaState,ctx:Context,ids:string[]) {
  if(s.pool.length<ids.length) {
    replenish(s)
    event(s,ctx,'pool','荣誉池已补充。')
  }
  for(const id of ids) seat(s,id).honor.push(s.pool.splice(ctx.random(s.pool.length),1)[0])
  if(ids.length) event(s,ctx,'honor','获奖者各得到一枚荣誉。',ids)
}
export function identities(count:number):Identity[] {
  const result:Identity[]=[]
  for(let rank=1;rank<=Math.floor(count/2);rank++) result.push({house:'crane',rank},{house:'lotus',rank})
  if(count%2) result.push({house:'ronin',rank:0})
  return result
}
function newRound(s:NinjaState,ctx:Context) {
  s.round++
  s.night=0
  s.discard=[]
  s.queue=[]
  s.current=undefined
  s.target=undefined
  s.second=undefined
  s.offered=[]
  const hands=shuffle(deck.map(card=>card.id),ctx.random)
  s.tableTargets=[]
  const deals=shuffle(identities(s.seats.length),ctx.random)
  s.seats.forEach((p,i)=>{
    p.alive=true
    p.identity=deals[i]
    p.known={...p.identity}
    p.hand=hands.slice(i*3,i*3+3)
    p.intel=[]
  })
  recordReplay(s,{step:'deal',seats:replaySeats(s,'deal')})
  event(s,ctx,'round','新一轮已发牌。')
  enter(s,ctx,'draft1',s.config.draft)
}
function targets(s:NinjaState):Seat[] {
  const player=seat(s,s.current!.player)
  return s.seats.filter(p=>p.alive && (p.id!==player.id || skill(s)==='shift') &&
    (s.mode!=='second' || p.id!==s.target) &&
    (skill(s)!=='thief' || p.honor.length>player.honor.length))
}
function tokenOptions(s:NinjaState,owner:string,prefix:string) {
  return seat(s,owner).honor.map((h,i)=>opt(prefix+h.id,'第 '+(i+1)+' 枚荣誉'))
}
export function options(s:NinjaState,id:string):Option[] {
  const p=s.seats.find(value=>value.id===id)
  if(!p || Object.hasOwn(s.submissions,id)) return []
  if(s.mode==='draft1'||s.mode==='draft2') return p.hand.map(card=>opt(card,'保留',undefined,card))
  if(s.mode==='ready') return [opt('ready','下一轮准备')]
  if(s.mode==='commit' && p.alive) {
    const held=p.hand.filter(card=>cards[card].phase===phases[s.night])
    return [pass,...held.map(card=>opt(card,'打出',undefined,card)),
      ...(held.length===2?[opt(held.join(','),'两张都打出')]:[])]
  }
  if(s.mode==='reaction' && id===s.target) {
    return [pass,...p.hand.filter(card=>card==='mirror'||card==='martyr').map(card=>opt(card,'发动',undefined,card))]
  }
  if(s.current?.player!==id) return []
  if(s.mode==='target'||s.mode==='second') return targets(s).map(target=>opt(target.id,'选择目标',target.id))
  if(s.mode==='recover') return s.offered.map(card=>opt(card,'取得',undefined,card))
  if(s.mode!=='choice') return []
  switch(skill(s)) {
    case 'shift': return [pass,opt('yes','交换')]
    case 'trouble': return [pass,opt('yes','公开')]
    case 'shinobi': return [pass,opt('yes','刺杀')]
    case 'dig': return [pass,...(canPlayImmediately(s.offered[0])?[opt('yes','立即使用',undefined,s.offered[0])]:[])]
    case 'merchant':
      if(!s.second) return [pass,opt('house','查看流派'),...tokenOptions(s,s.target!,'view:')]
      if(s.second==='viewed') return [pass,...tokenOptions(s,id,'give:')]
      return [pass,...tokenOptions(s,s.target!,'take:')]
    default: return []
  }
}
function canPlayImmediately(card:string) { return !!card && cards[card].phase!=='special' }
function removeHand(p:Seat,card:string) { p.hand=p.hand.filter(value=>value!==card) }
function showIdentity(s:NinjaState,ctx:Context,id:string) {
  event(s,ctx,'identity','公开了当时的流派。',[id],{identities:{[id]:{...seat(s,id).identity}}})
}
function inspect(s:NinjaState,ctx:Context,id:string,target:string,withCard=false) {
  const p=seat(s,target)
  const card=withCard && p.hand.length ? p.hand[ctx.random(p.hand.length)] : undefined
  intel(s,ctx,id,{text:'查阅了目标的当时身份。',target,identity:{...p.identity},card})
  if(withCard) notifyTarget(s,ctx,target,id,s.current!.card,card)
}
function nextCard(s:NinjaState,ctx:Context) {
  if(hold(s,ctx,'card')) return
  s.target=undefined
  s.second=undefined
  s.offered=[]
  while(s.queue.length) {
    s.current=s.queue.shift()!
    if(!seat(s,s.current.player).alive) continue
    event(s,ctx,'play','开始结算公开牌。',[s.current.player],{card:s.current.card})
    s.current.executionId=s.seq
    enter(s,ctx,'play',0.001)
    return
  }
  s.current=undefined
  s.night++
  if(s.night<phases.length) enter(s,ctx,'commit',s.config.play)
  else reveal(s,ctx)
}
function commit(s:NinjaState,ctx:Context) {
  for (const [player,choice] of Object.entries(s.submissions)) {
    recordReplay(s,{step:'commit',player,choice})
    if(choice==='pass') continue
    for(const card of choice.split(',')) {
      removeHand(seat(s,player),card)
      s.queue.push({player,card})
    }
  }
  s.queue.sort((a,b)=>cards[a.card].number-cards[b.card].number)
  for (const play of s.queue) event(s,ctx,'reveal-card','同时亮牌。',[play.player],{card:play.card,group:s.round+':'+s.night+':reveal'})
  nextCard(s,ctx)
}
function kill(s:NinjaState,ctx:Context,id:string) {
  const p=seat(s,id)
  if(!p.alive) return
  p.alive=false
  event(s,ctx,'death','刺杀已结算，目标死亡。',[id])
}
function attack(s:NinjaState,ctx:Context) {
  const target=s.target!
  event(s,ctx,'attack','目标受到攻击，等待裁决。',[s.current!.player,target])
  if(seat(s,target).hand.some(card=>card==='mirror'||card==='martyr')) enter(s,ctx,'reaction',s.config.reaction)
  else {
    kill(s,ctx,target)
    nextCard(s,ctx)
  }
}
function beginCard(s:NinjaState,ctx:Context) {
  const id=s.current!.player
  if(skill(s)==='dig') {
    s.offered=shuffle(s.discard,ctx.random).slice(0,2)
    intel(s,ctx,id,{text:'掘墓人查阅了两张弃牌。'})
    s.offered.forEach(card=>intel(s,ctx,id,{text:'可选弃牌',card}))
    if(s.offered.length) enter(s,ctx,'recover',s.config.target)
    else nextCard(s,ctx)
    return
  }
  if(skill(s)==='thief'||skill(s)==='judge') showIdentity(s,ctx,id)
  if(targets(s).length<(skill(s)==='shift'?2:1)) nextCard(s,ctx)
  else enter(s,ctx,'target',s.config.target)
}
function onTarget(s:NinjaState,ctx:Context,value:string) {
  const id=s.current!.player
  const p=seat(s,value)
  s.target=value
  confirmTarget(s,ctx,value,1)
  switch(skill(s)) {
    case 'shift':
      inspect(s,ctx,id,value)
      enter(s,ctx,'second',s.config.target)
      return
    case 'spy':
    case 'mystic':
      inspect(s,ctx,id,value,skill(s)==='mystic')
      break
    case 'trouble':
    case 'shinobi':
      inspect(s,ctx,id,value)
      enter(s,ctx,'choice',s.config.target)
      return
    case 'merchant':
      enter(s,ctx,'choice',s.config.target)
      return
    case 'thief':
      seat(s,id).honor.push(p.honor.splice(ctx.random(p.honor.length),1)[0])
      event(s,ctx,'honor','一枚荣誉被夺取。',[value,id])
      break
    case 'judge':
      event(s,ctx,'attack','审判者公开指定了处决目标。',[id,value])
      kill(s,ctx,value)
      break
    case 'blind':
      attack(s,ctx)
      return
  }
  nextCard(s,ctx)
}
function choice(s:NinjaState,ctx:Context,value:string) {
  const id=s.current!.player
  if(value==='pass') { nextCard(s,ctx); return }
  switch(skill(s)) {
    case 'shift': {
      const a=seat(s,s.target!), b=seat(s,s.second!)
      ;[a.identity,b.identity]=[b.identity,a.identity]
      a.known=null
      b.known=null
      for(const p of [a,b]) intel(s,ctx,p.id,{text:'你的流派卡可能发生变化。'})
      event(s,ctx,'swap','两名玩家的流派符印发生互换。',[a.id,b.id])
      break
    }
    case 'trouble': showIdentity(s,ctx,s.target!); break
    case 'shinobi': attack(s,ctx); return
    case 'dig': {
      const card=s.offered[0]
      removeHand(seat(s,id),card)
      s.queue.unshift({player:id,card})
      event(s,ctx,'reveal-card','掘墓人亮出取得的牌。',[id],{card})
      break
    }
    case 'merchant': {
      const target=seat(s,s.target!)
      const player=seat(s,id)
      if(!s.second) {
        if(value==='house') inspect(s,ctx,id,target.id)
        else {
          const h=target.honor.find(token=>token.id===Number(value.slice(5)))!
          intel(s,ctx,id,{text:'查阅了目标的一枚荣誉。',target:target.id,honor:h.value})
        }
        if(!player.honor.length||!target.honor.length) { nextCard(s,ctx); return }
        s.second='viewed'
        enter(s,ctx,'choice',s.config.target)
        return
      }
      if(s.second==='viewed') {
        s.second=value
        enter(s,ctx,'choice',s.config.target)
        return
      }
      const a=player.honor.findIndex(h=>h.id===Number(s.second!.slice(5)))
      const b=target.honor.findIndex(h=>h.id===Number(value.slice(5)))
      ;[player.honor[a],target.honor[b]]=[target.honor[b],player.honor[a]]
      event(s,ctx,'honor','双方各交换一枚荣誉。',[id,target.id])
      break
    }
  }
  nextCard(s,ctx)
}
function reveal(s:NinjaState,ctx:Context) {
  const alive=s.seats.filter(p=>p.alive)
  const mastermind=alive.find(p=>p.hand.includes('master'))
  const ranks=(house:House)=>alive.filter(p=>p.identity.house===house).map(p=>p.identity.rank).sort((a,b)=>a-b)
  const crane=ranks('crane'), lotus=ranks('lotus')
  let winner: House|null=null
  if(mastermind) {
    winner=mastermind.identity.house
  } else {
    for(let i=0;i<Math.max(crane.length,lotus.length);i++) {
      const a=crane[i]??Infinity,b=lotus[i]??Infinity
      if(a!==b) {winner=a<b?'crane':'lotus';break}
    }
  }
  s.awardees=(winner?s.seats.filter(p=>p.identity.house===winner && winner!=='ronin'||p.alive&&p.identity.house==='ronin'):alive).map(p=>p.id)
  event(s,ctx,'houses','存活者公开流派。',alive.map(p=>p.id),
    {identities:Object.fromEntries(alive.map(p=>[p.id,{...p.identity}]))})
  if(mastermind) event(s,ctx,'master','首脑改变了流派结算。',[mastermind.id],{card:'master'})
  event(s,ctx,'reveal',winner==='crane'?'鹤派胜出。':winner==='lotus'?'莲派胜出。':winner==='ronin'?'浪人首脑阻止流派奖励。':alive.length?'双方未分胜负，存活者获奖。':'无人存活。',alive.map(p=>p.id),
    {identities:Object.fromEntries(alive.map(p=>[p.id,{...p.identity}]))})
  enter(s,ctx,'reveal',0.001)
}
function finishAwards(s:NinjaState,ctx:Context) {
  award(s,ctx,s.awardees)
  recordReplay(s,{step:'round-score',seats:replaySeats(s,'score')})
  const high=Math.max(...s.seats.map(sum))
  if(high>=10) {
    s.champions=s.seats.filter(p=>sum(p)===high).map(p=>p.id)
    s.finalScores=Object.fromEntries(s.seats.map(p=>[p.id,sum(p)]))
    event(s,ctx,'champion','本场比赛已产生冠军。',s.champions)
    enter(s,ctx,'champion',0)
  } else enter(s,ctx,'ready',30)
}
function settle(s:NinjaState,ctx:Context) {
  observations.set(s,new Map([[0,observe(s)]]))
  try { settleStep(s,ctx) }
  finally { observations.delete(s) }
}
function settleStep(s:NinjaState,ctx:Context) {
  const required=requiredPlayers(s)
  const read=(id:string,random=false)=> {
    const legal=options(s,id)
    return s.submissions[id] ?? (random && legal.length ? legal[ctx.random(legal.length)].value : 'pass')
  }
  const value=required.length===1 ? read(required[0],['target','second','recover'].includes(s.mode)) : ''
  if(s.mode==='commit') {
    for(const player of required) if(!Object.hasOwn(s.submissions,player)) recordReplay(s,{step:'commit',player,choice:'pass'})
  } else if(['target','second','choice','recover','reaction'].includes(s.mode)&&required.length===1) {
    recordReplay(s,{step:s.mode,player:required[0],card:s.current?.card,choice:value,affected:s.target})
  }
  switch(s.mode) {
    case 'presentation': {
      const presentation=s.presentation
      const index=(presentation?.cursor??0)+1
      const step=presentation?.steps?.[index]
      if(presentation && step) {
        presentation.cursor=index
        presentation.duration=step.duration
        changeMode(s,ctx,'presentation',step.duration/1000)
        return
      }
      const next=presentation?.next
      delete s.presentation
      if(next==='card') nextCard(s,ctx)
      else if(next?.mode==='play') beginCard(s,ctx)
      else if(next?.mode==='reveal') changeMode(s,ctx,'awards',.15)
      else if(next) changeMode(s,ctx,next.mode,next.seconds)
      break
    }
    case 'draft1': {
      const kept=s.seats.map(p=>read(p.id,true))
      const passed=s.seats.map((p,i)=>p.hand.filter(card=>card!==kept[i]))
      recordReplay(s,{step:'draft1',draft:s.seats.map((p,i)=>({
        id:p.id,kept:kept[i],passed:[...passed[i]],received:[...passed[(i+s.seats.length-1)%s.seats.length]],
      }))})
      s.seats.forEach((p,i)=>{p.hand=[kept[i],...passed[(i+s.seats.length-1)%s.seats.length]]})
      enter(s,ctx,'draft2',s.config.draft)
      return
    }
    case 'draft2':
      for(const p of s.seats) {
        const first=p.hand[0]
        const kept=s.submissions[p.id]??p.hand[1+ctx.random(2)]
        const discarded=p.hand.find(card=>card!==first&&card!==kept)!
        recordReplay(s,{step:'draft2',draft:[{id:p.id,kept,discarded,received:p.hand.slice(1)}]})
        s.discard.push(discarded)
        p.hand=[first,kept]
      }
      enter(s,ctx,'commit',s.config.play)
      return
    case 'commit': commit(s,ctx); return
    case 'play': beginCard(s,ctx); return
    case 'target':
      if(value!=='pass') onTarget(s,ctx,value)
      else nextCard(s,ctx)
      return
    case 'second':
      if(value==='pass') {nextCard(s,ctx);return}
      s.second=value
      confirmTarget(s,ctx,value,2)
      inspect(s,ctx,s.current!.player,value)
      enter(s,ctx,'choice',s.config.target)
      return
    case 'choice': choice(s,ctx,value);return
    case 'recover':
      if(value==='pass') {nextCard(s,ctx);return}
      s.discard=s.discard.filter(card=>card!==value)
      seat(s,s.current!.player).hand.push(value)
      s.offered=[value]
      enter(s,ctx,'choice',s.config.target)
      return
    case 'reaction':
      if(value==='mirror'||value==='martyr') {
        removeHand(seat(s,s.target!),value)
        event(s,ctx,value,'反应牌已发动。',[s.target!],{card:value})
      }
      if(value==='mirror') {
        notifyTarget(s,ctx,s.current!.player,s.target!,'mirror')
        kill(s,ctx,s.current!.player)
      }
      else {
        if(value==='martyr') award(s,ctx,[s.target!])
        kill(s,ctx,s.target!)
      }
      nextCard(s,ctx)
      return
    case 'reveal': enter(s,ctx,'awards',.8);return
    case 'awards': finishAwards(s,ctx);return
    case 'ready': newRound(s,ctx);return
  }
}
function requiredPlayers(s:NinjaState):string[] {
  if(['draft1','draft2','ready'].includes(s.mode)) return s.seats.map(p=>p.id)
  if(s.mode==='commit') return s.seats.filter(p=>p.alive).map(p=>p.id)
  if(s.mode==='reaction') return [s.target!]
  return s.current && ['target','second','choice','recover'].includes(s.mode) ? [s.current.player] : []
}
export function publicView(s:NinjaState) {
  const step=visibleStep(s)
  const through=step?.events.at(-1)
  return {
    round:s.round, mode:['target','second','choice','recover'].includes(s.mode)?'resolve':s.mode,
    night:['commit','play','target','second','choice','recover','reaction'].includes(s.mode)?phases[s.night]:null, submitted:Object.keys(s.submissions).length,
    seats:(step?.visible.seats??s.seats).map(({id,portrait,alive,honor,hand})=>({id,portrait,alive,honorCount:honor.length,handCount:hand.length})),
    current:s.current, events:through===undefined?s.events:s.events.filter(item=>item.seq<=through),
    ...(s.mode==='presentation' && s.presentation ? {presentation:{
      id:(step?.events??s.presentation.events)[0],events:s.events.filter(item=>(step?.events??s.presentation!.events).includes(item.seq)),
      startedAt:s.deadline===null?null:s.deadline-s.presentation.duration,endsAt:s.deadline,duration:s.presentation.duration,
    }}:{}),
    champions:s.mode==='champion'?s.champions:[], finalScores:s.mode==='champion'?s.finalScores:undefined,
    ...(s.mode==='champion'?{replay:s.replay??[],replayComplete:s.replayFrom===1,finalIdentities:replaySeats(s,'identity')}:{}),
  }
}
export function privateView(s:NinjaState,id:string) {
  const visible=visibleStep(s)?.visible
  const p=visible?.seats.find(seat=>seat.id===id)??seat(s,id)
  if(!p) return undefined
  const legal=s.mode==='draft2'?options(s,id).filter(choice=>choice.value!==p.hand[0]):options(s,id)
  const action=legal.length?{
    step:s.mode,
    targets:s.current?.player===id
      ? [s.target,skill(s)==='shift'?s.second:undefined].filter((target):target is string=>!!target)
      : [],
  }:undefined
  return {hand:p.hand, known:p.known, honor:p.honor, score:sum(p), intel:p.intel.filter(entry=>entry.round===s.round), submitted:Object.hasOwn(s.submissions,id),
    options:legal,action,tableTargets:(visible?.tableTargets??s.tableTargets??[]).filter(entry=>entry.round===s.round)}
}
export const nightOfTheNinja: GamePlugin<Config,NinjaState> = {
  id:'night-of-the-ninja',version:1,name:'忍者之夜',minPlayers:4,maxPlayers:11,defaults,settings,
  roomPolicy:{capacity:config=>config.playerCount, spectators:true, resumeFromLobby:true, allowActiveLeave:true, hostTransferMs:120_000},
  config(input) {
    const config=record(input)
    const result={...defaults}
    for(const setting of settings) {
      const key=setting.key as keyof Config
      const value=config[key] ?? defaults[key]
      if(typeof value!=='number'||!setting.options.includes(value)) throw new Error('房间参数无效')
      result[key]=value
    }
    return result
  },
  canStart(players,config) {return players.length===config.playerCount},
  lobby:{
    select(input) {
      const portrait=record(input).portrait
      if(typeof portrait!=='number'||!Number.isInteger(portrait)||portrait<0||portrait>10) throw new Error('选择合法的忍者肖像')
      return portrait
    },
    ready(value) {return typeof value==='number'},
  },
  start(players,config,ctx,selections={}) {
    if(players.length!==config.playerCount||new Set(players).size!==players.length) throw new Error('请凑齐设定人数')
    const s:NinjaState={
      config, round:0, mode:'draft1', night:0, phase:0, deadline:null, discard:[],pool:[],nextHonor:0,events:[],seq:0,
      seats:players.map((id,i)=>({id,portrait:typeof selections[id]==='number'?selections[id] as number:i,alive:true,
        identity:{house:'ronin',rank:0},known:null,hand:[],honor:[],intel:[]})),
      submissions:{},queue:[],offered:[],awardees:[],champions:[],replay:[],replayFrom:1,presentedThrough:0,
    }
    replenish(s)
    newRound(s,ctx)
    return s
  },
  command(s,id,input,ctx) {
    if(s.deadline===null||ctx.now>=s.deadline) throw new Error('操作阶段已结束')
    const value=record(input).value
    if(typeof value!=='string'||!privateView(s,id)?.options.some(item=>item.value===value)) throw new Error('当前操作无效')
    s.submissions[id]=value
    if(requiredPlayers(s).every(player=>Object.hasOwn(s.submissions,player))) settle(s,ctx)
  },
  advance(s,ctx) {
    if(s.deadline!==null&&ctx.now>=s.deadline) settle(s,{...ctx,now:s.deadline})
  },
  public:publicView,private:privateView,
  finished:s=>s.mode==='champion',
  canChat:s=>s.mode!=='champion',
}
