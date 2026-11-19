<script setup lang="ts">
import {ref,onMounted,onUnmounted} from 'vue'
const portrait=ref(false),mobile=ref(false),message=ref('')
function update(){mobile.value=innerWidth<=1000&&innerHeight<=1000;portrait.value=mobile.value&&innerHeight>innerWidth;document.documentElement.style.setProperty('--ninja-viewport-height',(visualViewport?.height??innerHeight)+'px')}
async function immerse(){
 try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen(); const orientation=screen.orientation as ScreenOrientation & {lock?:(mode:string)=>Promise<void>};if(orientation.lock)await orientation.lock('landscape');else message.value='当前浏览器不支持方向锁定，请手动旋转。'}catch{message.value='无法自动全屏或锁定方向，可手动旋转继续游戏。'}finally{update()}
}
onMounted(()=>{update();addEventListener('resize',update);visualViewport?.addEventListener('resize',update)})
onUnmounted(()=>{removeEventListener('resize',update);visualViewport?.removeEventListener('resize',update)})
</script>
<template><section v-if="mobile" class="nn-viewport-controls" :data-orientation="portrait?'portrait':'landscape'" aria-label="横屏显示"><span v-if="portrait">建议旋转手机横屏；竖屏仍可继续操作。</span><button type="button" @click="immerse">全屏横屏</button><span role="status">{{ message }}</span></section></template>
<style scoped>.nn-viewport-controls{display:flex;align-items:center;gap:.4rem;padding:max(.15rem,env(safe-area-inset-top)) max(.3rem,env(safe-area-inset-right)) .15rem max(.3rem,env(safe-area-inset-left));font-size:.75rem}.nn-viewport-controls button{min-height:32px;padding:.2rem .5rem}.nn-viewport-controls span[role=status]:empty{display:none}</style>
