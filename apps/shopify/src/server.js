import http from 'node:http'
import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { encryptJSON, decryptJSON } from '../../common/crypto.js'
import { log } from '../../common/logger.js'

const PORT = process.env.SHOPIFY_PORT || 3004
const API_KEY    = process.env.SHOPIFY_API_KEY || ''
const API_SECRET = process.env.SHOPIFY_API_SECRET || ''
const SCOPES     = process.env.SHOPIFY_SCOPES || 'read_products,read_orders'
const APP_URL    = process.env.SHOPIFY_APP_URL || 'https://your-domain.example'
const ORIGIN     = process.env.CORS_ORIGIN || '*'
const ROOT       = path.join(process.cwd())
const VAULT_FILE = path.join(ROOT, 'private', 'shops.json.enc')
const REPLAY_DB  = path.join(ROOT, 'var', 'shopify', 'webhook-ids.json')

function sec(res){
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.setHeader('Access-Control-Allow-Headers','content-type, x-shopify-hmac-sha256')
}
function json(res, code, obj){ sec(res); res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)) }
function text(res, code, s){ sec(res); res.writeHead(code, {'Content-Type':'text/plain'}); res.end(s) }

function loadVault(){
  try { const p = JSON.parse(fs.readFileSync(VAULT_FILE,'utf-8')); return decryptJSON(p) } catch{ return { shops:{} } }
}
function saveVault(v){ const enc = encryptJSON(v); fs.mkdirSync(path.dirname(VAULT_FILE),{recursive:true}); fs.writeFileSync(VAULT_FILE, JSON.stringify(enc)) }

function verifyQueryHmac(u){
  const params = new URLSearchParams(u.search || '')
  const hmac = params.get('hmac'); params.delete('hmac')
  const msg = params.toString()
  const gen = crypto.createHmac('sha256', API_SECRET).update(msg).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac,'hex'), Buffer.from(gen,'hex'))
}
function verifyWebhookHmac(raw, headerHmac){
  const digest = crypto.createHmac('sha256', API_SECRET).update(raw).digest('base64')
  try { return crypto.timingSafeEqual(Buffer.from(headerHmac||'', 'base64'), Buffer.from(digest,'base64')) } catch { return false }
}
function rememberWebhook(id){
  const now = Date.now()
  let db = {}
  try { db = JSON.parse(fs.readFileSync(REPLAY_DB,'utf-8')) } catch {}
  if (db[id]) return false
  db[id] = now
  // prune > 48h
  const cutoff = now - 48*3600*1000
  for (const k of Object.keys(db)) if (db[k] < cutoff) delete db[k]
  fs.writeFileSync(REPLAY_DB, JSON.stringify(db))
  return true
}

const server = http.createServer(async (req,res)=>{
  const parsed = url.parse(req.url, true)
  if (req.method==='OPTIONS'){ sec(res); res.writeHead(204); return res.end() }
  if (parsed.pathname==='/healthz') return json(res,200,{ok:true,service:'shopify'})

  // Install: /api/shopify/install?shop=yourshop.myshopify.com
  if (req.method==='GET' && parsed.pathname==='/api/shopify/install'){
    const shop = parsed.query.shop
    if (!shop) return json(res,400,{error:'shop-required'})
    const state = crypto.randomBytes(16).toString('hex')
    const redirect = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(APP_URL+'/api/shopify/callback')}&state=${state}`
    res.setHeader('Set-Cookie', `shopify_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/`)
    res.writeHead(302, { Location: redirect }); return res.end()
  }

  // Callback: verify hmac + state, exchange code
  if (req.method==='GET' && parsed.pathname==='/api/shopify/callback'){
    if (!verifyQueryHmac(parsed)) return text(res,400,'Invalid HMAC')
    const q = parsed.query
    const stateCookie = (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('shopify_state='))?.split('=')[1]
    if (!stateCookie || stateCookie !== q.state) return text(res,400,'Invalid state')
    const shop = q.shop, code = q.code
    try{
      // Exchange code
      const r = await fetch(`https://${shop}/admin/oauth/access_token`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ client_id: API_KEY, client_secret: API_SECRET, code })
      })
      if (!r.ok) throw new Error('token-exchange-failed')
      const j = await r.json()
      const vault = loadVault()
      vault.shops[shop] = { access_token: j.access_token, scope: j.scope, installed_at: new Date().toISOString() }
      saveVault(vault)
      log('shopify.log',{event:'installed', shop})
      res.writeHead(302, { Location: APP_URL+'/?shopify=ok' }); return res.end()
    }catch(e){
      log('shopify.log',{event:'install-error', error:String(e), shop})
      return text(res,500,'Install failed')
    }
  }

  // Webhook: verify HMAC + replay guard, process async
  if (req.method==='POST' && parsed.pathname==='/api/shopify/webhook'){
    const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end', ()=>{
      const raw = Buffer.concat(chunks)
      const ok = verifyWebhookHmac(raw, req.headers['x-shopify-hmac-sha256'])
      const id = req.headers['x-shopify-webhook-id']
      if (!ok || !rememberWebhook(String(id||''))) { log('shopify.log',{event:'webhook-reject', id}); return text(res,401,'bad-signature') }
      // Acknowledge immediately; process out-of-band
      res.writeHead(200); res.end('ok')
      try { const topic = req.headers['x-shopify-topic']; const shop = req.headers['x-shopify-shop-domain']; log('shopify.log',{event:'webhook', topic, shop}) } catch {}
    }); return
  }

  json(res,404,{error:'not-found'})
})
server.listen(PORT, ()=> console.log(`Shopify :${PORT}`))
