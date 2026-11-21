import {ref,watch} from 'vue'
type Effects='full'|'light'|'reduced'
const key='games.ninja.preferences.v1'
function load():Effects {
  try {const value=JSON.parse(localStorage.getItem(key)??'{}').effects;if(['full','light','reduced'].includes(value))return value} catch {}
  return matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':innerWidth<620?'light':'full'
}
export const effects=ref<Effects>(load())
watch(effects,value=>{try {localStorage.setItem(key,JSON.stringify({...JSON.parse(localStorage.getItem(key)??'{}'),effects:value}))}catch{}})
