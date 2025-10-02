type FN = ()=>void
const subs = new Map<string,FN[]>()
export function onHotkey(key:string, fn:FN){ const arr=subs.get(key)||[]; arr.push(fn); subs.set(key,arr); return ()=>{ subs.set(key,(subs.get(key)||[]).filter(f=>f!==fn)) } }
export function initHotkeys(){
  window.addEventListener('keydown', (e)=>{
    const mod = e.ctrlKey || e.metaKey
    if (mod && e.key.toLowerCase()==='k'){ e.preventDefault(); (subs.get('cmdk')||[]).forEach(f=>f()) }
  })
}
