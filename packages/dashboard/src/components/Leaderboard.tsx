import React from 'react'
import { useStore } from '../state/store'
export const Leaderboard = ()=>{
  const lb = useStore(s=>s.leaderboard)
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">Leaderboard</div>
      <ul className="space-y-2">
        {lb.map((x,i)=>(
          <li key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-sm opacity-60">#{i+1}</span><span>{x.user}</span></div>
            <div className="text-sm font-semibold">{x.xp} XP</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
