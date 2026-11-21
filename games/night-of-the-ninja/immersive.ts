export async function enterImmersive(){
 if(!document.fullscreenElement)await document.documentElement.requestFullscreen()
 const orientation=screen.orientation as ScreenOrientation & {lock?:(mode:string)=>Promise<void>}
 if(orientation.lock)await orientation.lock('landscape')
}
