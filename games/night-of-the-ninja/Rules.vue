<script setup lang="ts">
import GameHistory from '../../apps/web/components/GameHistory.vue'
import { skills } from './cards.ts'
</script>
<template>
  <GameHistory title="游戏规则">
    <p>4–11 人。鹤派与莲派人数相等，奇数人数加一名浪人。每轮重发身份，等级 1 最高。</p>
    <h3>轮抽与夜晚</h3>
    <p>从三张牌中留一，向左传两张，再从收到的两张中留一。密探、隐士、骗徒、盲眼刺客、上忍依次行动。先秘密选择是否出牌，再同时亮牌，依号结算。目标须确认。</p>
    <h3>技能</h3>
    <dl><template v-for="[name,description] in skills" :key="name"><dt>{{ name }}</dt><dd>{{ description }}</dd></template></dl>
    <h3>荣誉与胜负</h3>
    <p>比较两派存活者的等级，依次比较同等级之后的成员。胜派生死成员各获一枚，存活浪人也获一枚。两派完全打平时所有存活者获奖。轮末结算完毕才判冠军，达到 10 分者中最高分获胜，同分并列。</p>
    <p>荣誉面值只有持有者能看。旁观只能看公开局面。所有玩家离线时比赛暂停。</p>
  </GameHistory>
</template>
