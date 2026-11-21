const images=import.meta.glob('./assets/*.webp',{eager:true,import:'default'}) as Record<string,string>
export const asset = (id:string) => images['./assets/'+id+'.webp']
export const labels = {crane:'鹤派', lotus:'莲派', ronin:'浪人'} as const
