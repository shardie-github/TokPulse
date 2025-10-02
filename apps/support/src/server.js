import http from 'node:http'
import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const PORT = process.env.SUPPORT_PORT || 3002
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'var', 'data')
const TICKETS = path.join(DATA_DIR, 'tickets.jsonl')
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_REPO  = process.env.GITHUB_REPO  || ''

const ORIGIN = process.env.CORS_ORIGIN || '*'
const RATE = { windowMs: 60_000, max: 300 }
const bucket = new Map()

function limited(ip){
  const now = Date.now(), w = RATE.windowMs
  const slot = Math.floor(now / w)
  const key = ip + ':' + slot
  const n = (bucket.get(key) || 0) + 1
  bucket.set(key, n); return n > RATE.max
}
function secHeaders(res){
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.setHeader('Access-Control-Allow-Headers','content-type, authorization')
}
function json(res, code, obj){ secHeaders(res); res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)) }

function redact(s=''){
  // mask emails and long digit runs (naive)
  return s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]')
          .replace(/\b\d{12,19}\b/g,'[redacted-number]')
}
async function aiReply(message){
  if (!OPENAI_API_KEY) {
    if (/ticket|issue|bug|problem/i.test(message)) return "I can open a support ticket for you. Share a short title + details; I’ll log it and notify the team."
    if (/billing|invoice|charge/i.test(message)) return "For billing, include order ID / email; I’ll file a secure ticket."
    return "I can help with setup, CI (unbox/run/promote), dashboard, and integrations. Say 'open ticket' to file an issue."
  }
  try{
    const r = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'gpt-4o-mini', temperature:0.2,
        messages:[
          {role:'system',content:'TokPulse Support: concise, safe, helpful. If ticket requested, gather title/details/contact then suggest creating one.'},
          {role:'user',content: message}
        ]
      })
    })
    const j = await r.json()
    return j?.choices?.[0]?.message?.content || "Thanks — I’ll log this and follow up."
  }catch{ return "Thanks — I’ll log this and follow up." }
}
function ensureData(){ fs.mkdirSync(DATA_DIR,{recursive:true}); if(!fs.existsSync(TICKETS)) fs.writeFileSync(TICKETS,'') }

const server = http.createServer(async (req,res)=>{
  const parsed = url.parse(req.url, true)
  const ip = (req.headers['x-forwarded-for']||'').toString().split(',')[0] || req.socket.remoteAddress || 'ip'
  if (limited(ip)) return json(res,429,{error:'rate limit'})

  if (req.method==='OPTIONS'){ secHeaders(res); res.writeHead(204); return res.end() }
  if (req.method==='GET' && parsed.pathname==='/healthz') return json(res,200,{ok:true,service:'support'})

  if (req.method==='POST' && parsed.pathname==='/api/support/chat'){
    let raw=''; req.on('data',c=>raw+=c); req.on('end', async ()=>{
      const {message=''} = JSON.parse(raw||'{}')
      const reply = await aiReply(String(message).slice(0,2000))
      json(res,200,{reply})
    }); return
  }

  if (req.method==='POST' && parsed.pathname==='/api/support/ticket'){
    let raw=''; req.on('data',c=>raw+=c); req.on('end', async ()=>{
      const {title='',details='',contact=''} = JSON.parse(raw||'{}')
      ensureData()
      const rec = { ts:new Date().toISOString(), title:redact(title), details:redact(details), contact:redact(contact) }
      fs.appendFileSync(TICKETS, JSON.stringify(rec)+'\n')
      // optional GH issue
      let issue=null
      if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO){
        try{
          const r = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/issues`,{
            method:'POST',
            headers:{'Authorization':`Bearer ${process.env.GITHUB_TOKEN}`,'Accept':'application/vnd.github+json'},
            body: JSON.stringify({title: rec.title || 'Support ticket', body: `${rec.details}\n\nContact: ${rec.contact}`, labels:['support']})
          })
          if (r.ok) issue = await r.json()
        }catch{}
      }
      json(res,200,{ok:true, issue})
    }); return
  }

  json(res,404,{error:'not found'})
})
server.listen(PORT, ()=> console.log(`Support :${PORT}`))
