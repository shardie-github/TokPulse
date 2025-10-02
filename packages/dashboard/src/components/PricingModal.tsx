import React from 'react'
export default function PricingModal(){
  const [open,setOpen]=React.useState(false)
  async function upgrade(){
    try{
      const r=await fetch('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:location.origin})})
      const j=await r.json(); if (j.url) location.href=j.url
    }catch{}
  }
  return (
    <>
      <button onClick={()=>setOpen(true)} className="fixed left-3 bottom-16 z-40 px-3 py-2 rounded-2xl bg-brand-600 text-white">Pricing</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={()=>setOpen(false)}>
          <div className="w-full max-w-3xl rounded-2xl p-4 bg-white dark:bg-[#0f1530]" onClick={e=>e.stopPropagation()}>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                {t:'Starter',p:'Free',f:['Core dashboard','Email support (48h)']},
                {t:'Pro',p:'$29/mo',f:['Advanced analytics','Priority support','Exports']},
                {t:'Scale',p:'$99/mo',f:['Teams & roles','SLA support','Webhooks/API']}
              ].map(card=>(
                <div key={card.t} className="rounded-2xl border p-3 dark:border-white/10">
                  <div className="font-medium">{card.t}</div>
                  <div className="text-2xl my-1">{card.p}</div>
                  <ul className="text-sm opacity-80">{card.f.map(x=><li key={x}>• {x}</li>)}</ul>
                  {card.t!=='Starter' && <button onClick={upgrade} className="mt-3 w-full px-3 py-2 rounded-xl bg-brand-600 text-white">Choose {card.t}</button>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
