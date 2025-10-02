import React from 'react'
export function hasConsent(){ return (localStorage.getItem('tp_consent')||'allow')!=='deny' }
export default function CookieConsent(){
  const [visible,setVisible]=React.useState(()=>localStorage.getItem('tp_consent')==null)
  if (!visible) return null
  const set=(v:'allow'|'deny')=>{ localStorage.setItem('tp_consent',v); setVisible(false) }
  return (
    <div className="fixed left-3 right-3 bottom-16 md:left-1/2 md:right-auto md:bottom-6 md:-translate-x-1/2 z-50 max-w-2xl card p-3 border border-black/10 dark:border-white/10">
      <div className="text-sm mb-2">We use basic analytics to improve TokPulse. Choose your preference.</div>
      <div className="flex gap-2">
        <button onClick={()=>set('allow')} className="px-3 py-2 rounded-xl bg-brand-600 text-white">Allow analytics</button>
        <button onClick={()=>set('deny')}  className="px-3 py-2 rounded-xl border dark:border-white/10">Only essential</button>
      </div>
    </div>
  )
}
