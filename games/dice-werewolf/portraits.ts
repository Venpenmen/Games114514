const images = import.meta.glob('./gambler-*.webp',{eager:true,import:'default'}) as Record<string,string>
export const portraits = ['黑帽赌徒','荒野枪手','老牌赌客','蒙面亡命徒','神秘牌手','流浪旅人'].map((name,index)=>({
  name, image:images['./gambler-'+index+'.webp'],
}))
