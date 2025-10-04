/* TokPulse — © Hardonia. MIT. */
import http from 'node:http'
import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { log } from '../../common/logger.js'
const PORT = process.env.ANALYTICS_PORT || 3005
const ORIGIN = process.env.CORS_ORIGIN || '*'
const FILE = path.join(process.cwd(), 'var', 'analytics', 'events.jsonl')
const RATE = { windowMs: 60_000, max: 1200 }
const bucket = new Map()
function limited(ip){ const now=Date.now(),slot=Math.floor(now/RATE.windowMs),k=ip+':'+slot,n=(bucket.get(k)||0)+1; bucket.set(k,n); return n>RATE.max }
function sec(res){ res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Access-Control-Allow-Origin',ORIGIN); res.setHeader('Access-Control-Allow-Headers','content-type') }
function json(res,c,o){ sec(res); res.writeHead(c,{'Content-Type':'application/json'}); res.end(JSON.stringify(o)) }
const server=http.createServer((req,res)=>{
  const p=url.parse(req.url,true); const ip=(req.headers['x-forwarded-for']||'').toString().split(',')[0]||req.socket.remoteAddress||'ip'
  if(req.method==='OPTIONS'){sec(res); res.writeHead(204); return res.end()}
  if(p.pathname==='/healthz') return json(res,200,{ok:true,service:'analytics'})
  if(req.method==='POST' && p.pathname==='/api/analytics/event'){
    if(limited(ip)) return json(res,429,{error:'rate'})
    let raw=''; req.on('data',c=>raw+=c); req.on('end',()=>{
      try{ const e=JSON.parse(raw||'{}'); fs.mkdirSync(path.dirname(FILE),{recursive:true}); fs.appendFileSync(FILE, JSON.stringify({...e,ip:undefined})+'\n'); log('analytics.log',{event:'ingest-ok'}) ; json(res,200,{ok:true}) }
      catch{ json(res,400,{error:'bad-json'}) }
    }); return
  }
  json(res,404,{error:'nf'})
})
server.listen(PORT, ()=>console.log('Analytics :'+PORT))
