import React from 'react'
import { useStore } from '../state/store'
import { motion } from 'framer-motion'
export const XPBar = ()=>{
  const xp = useStore(s=>s.xp)
  const pct = Math.min(100, (xp%1000)/10)
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">XP Progress</div>
      <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
        <motion.div initial={{width:0}} animate={{width: pct+'%'}} transition={{type:'spring', stiffness:60}}
          className="h-full bg-brand-500"/>
      </div>
      <div className="text-xs opacity-70 mt-1">{xp} / next level</div>
    </div>
  )
}
