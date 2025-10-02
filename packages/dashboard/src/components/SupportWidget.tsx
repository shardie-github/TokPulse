import React from 'react'
type Msg = { role:'user'|'assistant'|'system', content:string, ts:string }
function supportBase() {
  try {
    const u = new URL(window.location.href)
    // if on 4173 (dashboard), point to 3002 (support)
    if (u.port === '4173') { u.port = '3002'; return u.origin }
    return u.origin
  } catch { return '' }
}
export const SupportWidget = ()=>{
  const [open, setOpen] = React.useState(false)
  const [msgs, setMsgs] = React.useState<Msg[]>([{role:'assistant', content:'Hi! How can I help today?', ts:new Date().toISOString()}])
  const [input, setInput] = React.useState('')
  async function send() {
    if (!input.trim()) return
    const userMsg: Msg = {role:'user', content: input.trim(), ts:new Date().toISOString()}
    setMsgs(m=>[...m, userMsg]); setInput('')
    try{
      const base = supportBase()
      const res = await fetch(`${base}/api/support/chat`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message:userMsg.content})})
      const j = await res.json().catch(()=>null)
      const text = j?.reply ?? 'Thanks! I have logged your request.'
      setMsgs(m=>[...m, {role:'assistant', content:text, ts:new Date().toISOString()}])
    }catch{
      setMsgs(m=>[...m, {role:'assistant', content:'(temporary issue reaching support)', ts:new Date().toISOString()}])
    }
  }
  return (
    <>
      <button onClick={()=>setOpen(v=>!v)} className="fixed bottom-5 right-5 rounded-full px-4 py-3 bg-brand-600 text-white shadow-soft">
        {open? 'Close Support' : 'Support'}
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 w-[360px] max-h-[70vh] card p-3 flex flex-col">
          <div className="font-medium mb-2">TokPulse Support</div>
          <div className="flex-1 overflow-auto space-y-2 text-sm">
            {msgs.map((m,i)=>(
              <div key={i} className={m.role==='user'?'text-right':''}>
                <div className={'inline-block px-3 py-2 rounded-2xl ' + (m.role==='user'?'bg-brand-600 text-white':'bg-gray-100 dark:bg-white/10')}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question..."
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0f1530]"/>
            <button onClick={send} className="px-3 py-2 rounded-xl bg-brand-600 text-white">Send</button>
          </div>
        </div>
      )}
    </>
  )
}
