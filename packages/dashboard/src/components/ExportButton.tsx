import React from 'react'
export default function ExportButton(){
  async function exportCSV(){
    try{
      const r = await fetch('/api/report'); const j = await r.json()
      const rows = [['Metric','Value','Unit']]
      ;(j.kpis||[]).forEach((k:any)=> rows.push([k.label, k.value, k.unit||'']))
      const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
      const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob)
      const a=document.createElement('a'); a.href=url; a.download='tokpulse-kpis.csv'; a.click(); URL.revokeObjectURL(url)
    }catch{}
  }
  return <button onClick={exportCSV} className="px-3 py-2 rounded-xl border dark:border-white/10">Export CSV</button>
}
