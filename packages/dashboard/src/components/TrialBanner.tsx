import React from 'react'
function confetti(){
  const c=document.createElement('canvas'); c.style.position='fixed'; c.style.inset='0'; c.style.pointerEvents='none'; c.width=innerWidth; c.height=innerHeight; document.body.appendChild(c)
  const ctx=c.getContext('2d')!, pieces=Array.from({length:60},()=>({x:Math.random()*c.width,y:-10,r:4+Math.random()*6,vy:2+Math.random()*3,ax:(Math.random()-0.5)*0.4,color:`hsl(${Math.random()*360},90%,60%)`}))
  let t=0; const id=setInterval(()=>{ t++; ctx.clearRect(0,0,c.width,c.height); pieces.forEach(p=>{ p.y+=p.vy; p.x+=p.ax; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill() }); if(t>90){ clearInterval(id); c.remove() }}, 16)
}
export default function TrialBanner(){
  const [daysLeft,setDaysLeft]=React.useState<number>(0)
  React.useEffect(()=>{
    const key='trial_start'; let start=localStorage.getItem(key)
    if(!start){ start=new Date().toISOString(); localStorage.setItem(key,start) }
    const d0=new Date(start); const d1=new Date(); const used=Math.floor((d1.getTime()-d0.getTime())/86400000)
    setDaysLeft(Math.max(0,14-used))
    if (new URLSearchParams(location.search).get('upgrade')==='success'){ confetti() }
  },[])
  async function upgrade(){
    try{
      const r=await fetch('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({base_url:location.origin})})
      const j=await r.json(); if(j.url) location.href=j.url
    }catch{}
  }
  if (daysLeft<=0) return null
  return (
    <div className="card p-3 border border-brand-600/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm"><b>Trial:</b> {daysLeft} days left — unlock Pro analytics & support.</div>
        <div className="flex gap-2">
          <button onClick={upgrade} className="px-3 py-2 rounded-xl bg-brand-600 text-white">Upgrade</button>
        </div>
      </div>
    </div>
  )
}
