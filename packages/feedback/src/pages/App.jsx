import React, { useEffect, useState } from 'react'
import PayButton from '../ui/PayButton'

export default function App() {
  const [health, setHealth] = useState('checking...')
  const [queue, setQueue] = useState([])
  const [comment, setComment] = useState('')
  const [email, setEmail] = useState('')
  const [buyUrl, setBuyUrl] = useState(localStorage.getItem('BUY_URL') || '')

  useEffect(() => {
    fetch('/api/health').then(r=>r.json()).then(d=>setHealth(d.status)).catch(()=>setHealth('offline'))
    const ref = new URLSearchParams(location.search).get('ref')
    if (ref) localStorage.setItem('ref', ref)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ source: 'tiktok', type: 'comment', text: comment, email })
    })
    const data = await res.json()
    setQueue(prev => [data, ...prev])
    setComment('')
  }

  const stripeCheckout = async () => {
    const ref = localStorage.getItem('ref') || undefined
    const res = await fetch('/api/checkout/stripe', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, ref })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else alert('Checkout unavailable. Configure Stripe or set BUY_URL.')
  }

  return (
    <div style={{maxWidth: 900, margin: '40px auto'}}>
      <h1>Feedback TikTok App</h1>
      <p>Status: <strong>{health}</strong></p>

      <div style={{display:'flex', gap:8, margin:'16px 0'}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (for receipt / access)" style={{flex:1,padding:10,borderRadius:8,border:'1px solid #ccc'}} />
        <PayButton buyUrl={buyUrl} onStripe={stripeCheckout} price={49}/>
      </div>

      <form onSubmit={submit} style={{display:'flex', gap:8}}>
        <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Paste a TikTok comment..." style={{flex:1,padding:10,borderRadius:8,border:'1px solid #ccc'}} />
        <button style={{padding:'10px 16px', borderRadius:8, border:'1px solid #333', background:'#111', color:'#fff'}}>Ingest</button>
      </form>

      <h3 style={{marginTop:24}}>Queue</h3>
      {queue.length === 0 && <p>No items yet.</p>}
      <ul>
        {queue.map((q,i)=>(
          <li key={i} style={{margin:'8px 0', padding:12, border:'1px solid #eee', borderRadius:8}}>
            <code>{q.type}</code> — {q.text} <small style={{opacity:.6}}>({q.id})</small>
          </li>
        ))}
      </ul>
    </div>
  )
}
