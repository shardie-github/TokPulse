import React from 'react'
export default function PayButton({ buyUrl, onStripe, price=49 }){
  const click = async () => {
    const url = buyUrl && buyUrl.startsWith('http') ? buyUrl : null
    if (url) { window.location.href = url; return }
    if (onStripe) await onStripe()
  }
  return <button onClick={click} style={{padding:'12px 16px',borderRadius:10,border:'1px solid #333',background:'#111',color:'#fff'}}>Buy — ${price}/mo</button>
}
