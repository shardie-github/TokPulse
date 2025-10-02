import React from 'react'
export default function MagicLinkModal(){
  const [open,setOpen]=React.useState(false)
  const [email,setEmail]=React.useState('')
  const [sent,setSent]=React.useState<string|undefined>()
  async function send(){
    const token = Math.random().toString(36).slice(2)
    const url = `${location.origin}/?token=${token}`
    const html = `<p>Click to sign in: <a href="${url}">${url}</a></p>`
    try{
      await fetch('/api/mailer/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:email,subject:'Your TokPulse sign-in link',html})})
      setSent(email)
      localStorage.setItem('tp_magic_demo_token', token)
    }catch{}
  }
  // auto-accept token demo
  React.useEffect(()=>{
    const t=new URLSearchParams(location.search).get('token'); if(t && t===localStorage.getItem('tp_magic_demo_token')) localStorage.setItem('tp_authed','1')
  },[])
  return (
    <>
      <button onClick={()=>setOpen(true)} className="fixed right-3 bottom-16 z-40 px-3 py-2 rounded-2xl bg-black text-white dark:bg-white dark:text-black">Sign in</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={()=>setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-4 bg-white dark:bg-[#0f1530]" onClick={e=>e.stopPropagation()}>
            <div className="font-medium mb-2">Magic link</div>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-3 py-2 rounded-xl border dark:border-white/10 bg-transparent"/>
            <div className="mt-3 flex gap-2 justify-end">
              <button onClick={()=>setOpen(false)} className="px-3 py-2 rounded-xl border dark:border-white/10">Close</button>
              <button onClick={send} className="px-3 py-2 rounded-xl bg-brand-600 text-white">Send link</button>
            </div>
            {sent && <div className="mt-2 text-xs opacity-70">Sent to <b>{sent}</b>. Check <code>var/outbox/*.eml</code>.</div>}
          </div>
        </div>
      )}
    </>
  )
}
