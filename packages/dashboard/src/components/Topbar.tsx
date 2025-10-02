import React from 'react'
import { useStore } from '../state/store'
import { Sun, Moon, Bell } from 'lucide-react'
export const Topbar = () => {
  const theme = useStore(s=>s.theme)
  const setTheme = useStore(s=>s.setTheme)
  React.useEffect(()=>{
    document.documentElement.classList.toggle('dark', theme==='dark')
  },[theme])
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl md:text-3xl font-semibold">Overview</h1>
      <div className="flex items-center gap-2">
        <button onClick={()=>setTheme(theme==='dark'?'light':'dark')}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
          {theme==='dark'? <Sun size={16}/> : <Moon size={16}/> }
        </button>
        <button className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
          <Bell size={16}/>
        </button>
      </div>
    </div>
  )
}
