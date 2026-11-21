type Option={value:string;card?:string}
export function commitChoice(options:Option[],picked:string[]):string {
 const wanted=new Set(picked)
 return options.find(o=>o.value!=='pass' && o.value.split(',').length===wanted.size && o.value.split(',').every(id=>wanted.has(id)))?.value??''
}
