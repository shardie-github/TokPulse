import React from 'react'
import { useStore } from '../state/store'
export const StreakWidget = ()=>{
  const streak = useStore(s=>s.streak)
  return (
    <div className="card p-4">
      <div className="font-medium mb-1">Streak</div>
      <div className="text-3xl font-bold">{streak}🔥</div>
      <div className="text-xs opacity-70">Daily wins in a row</div>
    </div>
  )
}
