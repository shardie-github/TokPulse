import React from 'react'
export default function OfflineBanner(){
  const [o,setO]=React.useState(navigator.onLine)
  React.useEffect(()=>{
    const on=()=>setO(true), off=()=>setO(false)
    window.addEventListener('online',on); window.addEventListener('offline',off)
    return ()=>{ window.removeEventListener('online',on); window.removeEventListener('offline',off) }
  },[])
  if (o) return null
  return <div className="fixed top-0 inset-x-0 z-50 text-center text-sm py-2 bg-yellow-400/90 text-black">You’re offline — data may be stale.</div>
}
