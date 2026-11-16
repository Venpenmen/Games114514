export const phases = ['spy','mystic','trickster','blind','shinobi'] as const
export type Phase = typeof phases[number]
export const phaseNames = {spy:'密探',mystic:'隐士',trickster:'骗徒',blind:'盲眼刺客',shinobi:'上忍'} as const

export const skills = {
  spy:['密探','查看另一名存活玩家的流派。'],
  mystic:['隐士','查看另一名存活玩家的流派与其随机一张未打出的牌。'],
  shift:['变形者','查看两名玩家的流派，可以互换。被交换者不能自行查看新身份。'],
  dig:['掘墓人','查看两张弃牌并获得其中一张，可立即合法使用或保留。'],
  trouble:['捣乱者','查看另一名玩家的流派，可以公开。'],
  merchant:['灵媒商人','查看另一名玩家的流派或一枚荣誉，然后可互换各一枚。'],
  thief:['窃贼','公开自身流派，从荣誉枚数更多的一人处随机取得一枚。'],
  judge:['审判者','公开自身流派并处决一人。不能使用反应牌。'],
  blind:['盲眼刺客','刺杀另一名存活玩家，先处理反应。'],
  shinobi:['上忍','查看另一名玩家的流派，随后决定是否刺杀。'],
  mirror:['镜僧','受到盲眼刺客或上忍攻击时可反杀攻击者并免死。'],
  martyr:['殉道者','受到盲眼刺客或上忍攻击时可先获一枚荣誉，仍死亡。'],
  master:['首脑','存活至揭示时让所属派获胜；浪人首脑阻止两派获奖。'],
} as const
export type Skill = keyof typeof skills
export type Card = { id:string; phase:Phase|'special'; number:number; skill:Skill }
const tricks = ['shift','dig','trouble','merchant','thief','judge'] as const
export const deck: Card[] = [
  ...phases.flatMap(phase => Array.from({length:6},(_,i):Card => ({
    id:phase+'-'+(i+1), phase, number:i+1, skill:phase==='trickster'?tricks[i]:phase,
  }))),
  ...(['mirror','martyr','master'] as const).map((skill,i):Card=>({id:skill,phase:'special',number:i+1,skill})),
]
export const cards = Object.fromEntries(deck.map(card=>[card.id,card])) as Record<string,Card>
