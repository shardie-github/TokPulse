import React from 'react'
import { applyTheme, currentTheme } from '../lib/theme'
export default function ThemeToggle(){
  const [t,setT]=React.useState<'light'|'dark'|'system'>(currentTheme())
  React.useEffect(()=>{ applyTheme(t) },[t])
  return (
    <div className="fixed right-3 bottom-3 z-40 flex gap-2 rounded-2xl px-2 py-1 bg-white/80 dark:bg-[#0f1530]/80 backdrop-blur-sm border border-black/10 dark:border-white/10">
      {(['light','system','dark'] as const).map(k=>
        <button key={k} onClick={()=>setT(k)} className={`text-xs px-2 py-1 rounded-xl ${t===k?'bg-brand-600 text-white':'hover:bg-black/5 dark:hover:bg-white/10'}`}>{k}</button>
      )}
    </div>
  )
}
