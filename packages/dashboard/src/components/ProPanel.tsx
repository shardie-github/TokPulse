import React from 'react'
import { fetchLicense } from '../lib/license.ts'
export default function ProPanel(){
  const [pro,setPro] = React.useState(false)
  React.useEffect(()=>{(async()=>{ const L=await fetchLicense(); setPro(!!L?.pro) })()},[])
  if (!pro) return null
  return (
    <div className="card p-4">
      <div className="font-semibold mb-1">Pro Insights</div>
      <div className="text-sm opacity-80">Export, deeper creative insights, and premium automation.</div>
    </div>
  )
}
