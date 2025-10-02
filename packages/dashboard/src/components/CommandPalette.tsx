import React from 'react'
import { onHotkey, initHotkeys } from '../lib/hotkeys'
export default function CommandPalette(){
  const [open,setOpen] = React.useState(false)
  const [q,setQ] = React.useState('')
  React.useEffect(()=>{ initHotkeys(); return onHotkey('cmdk', ()=>setOpen(v=>!v)) },[])
  const actions = [
    { id:'export', label:'Export KPIs (CSV)', run: async ()=>{
      try{ const r=await fetch('/api/report'); const j=await r.json()
        const rows=[['Metric','Value','Unit']]; (j.kpis||[]).forEach((k:any)=>rows.push([k.label,k.value,k.unit||'']))
        const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
        const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob)
        const a=document.createElement('a'); a.href=url; a.download='tokpulse-kpis.csv'; a.click(); URL.revokeObjectURL(url)
      }catch{} setOpen(false)
    }},
    { id:'upgrade', label:'Upgrade (Start trial/subscribe)', run: async ()=>{
      try{
        const r=await fetch('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:location.origin})})
        const j=await r.json(); if (j.url) location.href=j.url
      }catch{} setOpen(false)
    }},
    { id:'settings', label:'Open Settings', run: ()=>{
      const el=document.querySelector('[data-open-settings]') as HTMLElement|null
      el?.click(); setOpen(false)
    }},
  ]
  const filtered = actions.filter(a=>a.label.toLowerCase().includes(q.toLowerCase()))
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24" onClick={()=>setOpen(false)}>
      <div className="w-full max-w-xl rounded-2xl p-2 bg-white dark:bg-[#0f1530]" onClick={e=>e.stopPropagation()}>
        <input autoFocus placeholder="Type a command…" value={q} onChange={e=>setQ(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-transparent outline-none"/>
        <div className="mt-2 max-h-72 overflow-auto">
          {filtered.map(a=>(
            <button key={a.id} onClick={a.run}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10">{a.label}</button>
          ))}
          {filtered.length===0 && <div className="px-3 py-6 text-sm opacity-60">No commands</div>}
        </div>
      </div>
    </div>
  )
}
