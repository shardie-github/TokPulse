import React, { useEffect, useState } from 'react'

function Card({title,children}){
  return <div style={{border:'1px solid #ddd', padding:16, borderRadius:12, margin:'8px 0'}}>
    <h3>{title}</h3>
    <div>{children}</div>
  </div>
}

export default function Admin(){
  const [pass,setPass] = useState('')
  const [ok,setOk] = useState(false)
  const [metrics,setMetrics] = useState({mrr:0, active:0, refTop:[], ingests:0})

  const login = async()=>{
    const r = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pass})})
    if(r.ok) setOk(true); else alert('bad password')
  }

  useEffect(()=>{
    if(!ok) return
    fetch('/api/admin/metrics').then(r=>r.json()).then(setMetrics)
  },[ok])

  if(!ok){
    return <div style={{maxWidth:480, margin:'60px auto'}}>
      <h1>Admin</h1>
      <input type="password" placeholder="Admin password" value={pass} onChange={e=>setPass(e.target.value)} style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ccc'}}/>
      <button onClick={login} style={{padding:'10px 16px',marginTop:10,borderRadius:8}}>Enter</button>
    </div>
  }

  return <div style={{maxWidth:960, margin:'20px auto'}}>
    <h1>Admin Dashboard</h1>
    <Card title="Key Metrics">
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
        <div><strong>MRR</strong><div>${metrics.mrr.toFixed(2)}</div></div>
        <div><strong>Active Users</strong><div>{metrics.active}</div></div>
        <div><strong>Ingests</strong><div>{metrics.ingests}</div></div>
      </div>
    </Card>
    <Card title="Top Referrers">
      <ol>{metrics.refTop.map((r,i)=>(<li key={i}>{r.ref}: {r.count}</li>))}</ol>
    </Card>
  </div>
}
