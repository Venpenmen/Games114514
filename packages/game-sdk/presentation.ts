import type { Context, GamePlugin, Turn } from './index.ts'

export const presentationSetting = {key:'presentationSpeed',label:'演出速度（0.8 快速 / 1 标准 / 1.35 舒缓 / 1.7 慢速）',options:[0.8,1,1.35,1.7]}
export function presentationSpeed(input:unknown):number {
  const value=(input as Record<string,unknown>)?.presentationSpeed??1.35
  if(typeof value!=='number'||!presentationSetting.options.includes(value)) throw new Error('演出速度无效')
  return value
}
type Barrier={id:number;startedAt:number;duration:number;endsAt:number;next:any;visible:any;private:Record<string,unknown>}
type State=Turn & {uxSpeed?:number;uxPresentation?:Barrier}

/** Classic plugins retain their own rules; this adapter delays transitions, never client acknowledgements. */
export function withPresentation<C,S extends Turn>(plugin:GamePlugin<C,S>, options:{
  players(s:S):string[]
  duration(before:S,after:S):number
  display?(before:S,after:S,view:any):any
  displayStage?(s:S):boolean
}):GamePlugin<C & {presentationSpeed?:number},S & State> {
  const base=plugin as GamePlugin<any,any>
  function run(s:S & State,ctx:Context,action:()=>void) {
    const before=structuredClone(s)
    action()
    if(s.phase===before.phase || s.uxSpeed===undefined) return
    const at=before.deadline!==null&&ctx.now>=before.deadline?before.deadline:ctx.now
    const duration=Math.round(options.duration(before,s)*s.uxSpeed)
    // Existing result stages already own a server deadline. Scale it in place.
    if(options.displayStage?.(s) && s.deadline!==null) {
      s.deadline=at+(s.deadline-at)*s.uxSpeed
    }
    if(!duration) return
    const next=structuredClone(s)
    next.phase=s.phase+1
    if(next.deadline!==null) next.deadline+=duration
    const visible=options.display?.(before,s,base.public(s))??base.public(s)
    s.uxPresentation={id:s.phase,startedAt:at,duration,endsAt:at+duration,next,visible,
      private:Object.fromEntries(options.players(before).map(id=>[id,base.private(before,id)]))}
    s.deadline=at+duration
  }
  return {...base,
    defaults:{...base.defaults,presentationSpeed:1.35},settings:[...base.settings,presentationSetting],
    config(input:unknown){return {...base.config(input),presentationSpeed:presentationSpeed(input)}},
    start(players,config,ctx,selections){return {...base.start(players,config,ctx,selections),uxSpeed:config.presentationSpeed}},
    command(s,id,input,ctx){
      if(s.uxPresentation) throw new Error('公开演出进行中，请等待')
      run(s,ctx,()=>base.command(s,id,input,ctx))
    },
    advance(s,ctx){
      if(s.uxPresentation) {
        if(s.deadline!==null && ctx.now>=s.deadline) {
          const next=s.uxPresentation.next
          // Pause/resume moves the authoritative outer deadline; shift the pending operation equally.
          if(next.deadline!==null) next.deadline+=s.deadline-s.uxPresentation.endsAt
          delete s.uxPresentation
          Object.assign(s,next)
        }
      } else run(s,ctx,()=>base.advance(s,ctx))
    },
    public(s){return s.uxPresentation?{...s.uxPresentation.visible,presentation:{
      id:s.uxPresentation.id,startedAt:s.deadline!-s.uxPresentation.duration,endsAt:s.deadline,duration:s.uxPresentation.duration,
    },presentationSpeed:s.uxSpeed}: {...base.public(s) as object,presentationSpeed:s.uxSpeed}},
    private(s,id){return s.uxPresentation?s.uxPresentation.private[id]:base.private(s,id)},
    finished(s){return !s.uxPresentation&&base.finished(s)},
    finalResult(s){return s.uxPresentation?undefined:base.finalResult?.(s)},
    canChat(s){return !s.uxPresentation&&base.canChat(s)},
  }
}
