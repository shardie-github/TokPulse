import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
const __dirname = path.dirname(new URL(import.meta.url).pathname)

const ROOT = path.join(__dirname, '..', '..')
const DASH_DIST = path.join(ROOT, '..', 'packages', 'dashboard', 'dist')
const REPORT_PATH = process.env.REPORT_PATH || path.join(ROOT, '..', 'packages', 'data', 'last-report.json')
const LICENSE_PATH = process.env.LICENSE_PATH || path.join(ROOT, '..', 'private', 'license.json')
const PORT = process.env.DASHBOARD_PORT || 4173
const ORIGIN = process.env.CORS_ORIGIN || '*'
const RATE = { windowMs: 60_000, max: 600 } // per minute

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
  res.setHeader('X-Frame-Options','DENY')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Permissions-Policy','geolocation=(), microphone=()')
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' *")
}
function send(res, code, body, type='text/plain'){
  secHeaders(res); res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.writeHead(code, {'Content-Type': type}); res.end(body)
}
const server = http.createServer((req,res)=>{
  const parsed = url.parse(req.url, true)
  const ip = (req.headers['x-forwarded-for']||'').toString().split(',')[0] || req.socket.remoteAddress || 'ip'
  if (limited(ip)) return send(res, 429, 'rate limit')

  if (parsed.pathname === '/healthz') return send(res,200,JSON.stringify({ok:true,service:'dashboard'}),'application/json')

  if (parsed.pathname === '/api/license') {
    try{
      const txt = fs.readFileSync(LICENSE_PATH,'utf-8')
      return send(res,200,txt,'application/json')
    }catch{
      return send(res,200,JSON.stringify({license:'free',pro:false,features:['dashboard','support']}),'application/json')
    }
  }

  if (parsed.pathname === '/api/report') {
    try {
      const txt = fs.readFileSync(REPORT_PATH,'utf-8')
      return send(res,200,txt,'application/json')
    } catch {
      return send(res,200,JSON.stringify({schema:'v1',kpis:[],share:{},funnel:[],feed:[],ts:new Date().toISOString()}),'application/json')
    }
  }

  let file = parsed.pathname === '/' ? '/index.html' : parsed.pathname
  const full = path.join(DASH_DIST, decodeURI(file))
  if (full.startsWith(DASH_DIST) && fs.existsSync(full)) {
    const type = file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream'
    return send(res,200,fs.readFileSync(full),type)
  }
  send(res,404,'Not found')
})
server.listen(PORT, ()=> console.log(`Dashboard server :${PORT}`))
