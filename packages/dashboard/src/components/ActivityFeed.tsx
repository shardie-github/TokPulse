import React from 'react'
import { useStore } from '../state/store'
function fmt(ts:string){ try{ return new Date(ts).toLocaleString() }catch{ return ts } }
export const ActivityFeed = ()=>{
  const feed = useStore(s=>s.feed)
  return (
    <div className="card p-4">
      <div className="font-medium mb-3">Activity</div>
      <ul className="space-y-3">
        {feed.slice(0,8).map((a,i)=>(
          <li key={i} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{a.title}</div>
              <div className="text-xs text-gray-500">{a.channel} • {fmt(a.ts)}</div>
            </div>
            {a.details && <div className="text-sm opacity-80">{a.details}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
