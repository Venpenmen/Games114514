<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{face:number;rolling?:boolean}>()
const pips = [[],[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]]
const orientation = [
  ['0deg','0deg'], ['0deg','0deg'], ['0deg','-90deg'], ['90deg','0deg'],
  ['-90deg','0deg'], ['0deg','90deg'], ['0deg','180deg'],
]
const angle = computed(()=>({'--die-x':orientation[props.face][0],'--die-y':orientation[props.face][1]}))
</script>
<template>
  <span class="dw-die" aria-hidden="true">
    <span class="dw-die-motion" :class="{'dw-roll':rolling}">
      <span class="dw-die-angle"><span class="dw-cube" :style="angle">
        <span v-for="faceNumber in 6" :key="faceNumber" class="dw-face" :class="'dw-face-'+faceNumber">
          <i v-for="pip in pips[faceNumber]" :key="pip" :style="{gridArea:Math.ceil(pip/3)+' / '+((pip-1)%3+1)}"></i>
        </span>
      </span></span>
    </span>
  </span>
</template>
