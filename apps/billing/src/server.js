import http from 'node:http'
import url from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Stripe from 'stripe'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.BILLING_PORT || 3003
const SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const PRICE_ID   = process.env.STRIPE_PRICE_ID   || ''
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''
const ORIGIN = process.env.CORS_ORIGIN || '*'
const ROOT = path.join(__dirname, '..', '..', '..')
const LICENSE = process.env.LICENSE_PATH || path.join(ROOT, 'private', 'license.json')
const stripe = SECRET_KEY ? new Stripe(SECRET_KEY) : null

function sec(res){
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','no-referrer')
  res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.setHeader('Access-Control-Allow-Headers','content-type, stripe-signature')
}
function json(res, code, obj){ sec(res); res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)) }

function okLicense(expires=null){
  const lic = { license:'pro', pro:true, features:['dashboard','support','insights','export'], expires }
  fs.mkdirSync(path.dirname(LICENSE),{recursive:true})
  fs.writeFileSync(LICENSE, JSON.stringify(lic,null,2))
  return lic
}

const server = http.createServer(async (req,res)=>{
  const parsed = url.parse(req.url, true)
  if (req.method==='OPTIONS'){ sec(res); res.writeHead(204); return res.end() }
  if (req.method==='GET' && parsed.pathname==='/healthz') return json(res,200,{ok:true,service:'billing'})

  // Checkout session (server-side)
  if (req.method==='POST' && parsed.pathname==='/api/billing/checkout'){
    if (!stripe || !PRICE_ID) return json(res,400,{error:'billing-not-configured'})
    let raw=''; req.on('data',c=>raw+=c); req.on('end', async ()=>{
      try{
        const body = JSON.parse(raw||'{}')
        const base = body.base_url || process.env.PUBLIC_BASE_URL || 'http://localhost:4173'
        const success = `${base}/?upgrade=success`
        const cancel  = `${base}/?upgrade=cancel`
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          success_url: success,
          cancel_url: cancel,
          line_items: [{ price: PRICE_ID, quantity: 1 }],
          automatic_tax: { enabled: true }
        })
        json(res,200,{url: session.url})
      }catch(e){ json(res,500,{error:'checkout-failed', detail:String(e?.message||e)}) }
    }); return
  }

  // Stripe webhook -> set license
  if (req.method==='POST' && parsed.pathname==='/api/billing/webhook'){
    if (!stripe || !WEBHOOK_SECRET) return json(res,400,{error:'webhook-not-configured'})
    const chunks=[]; req.on('data',c=>chunks.push(c)); req.on('end', ()=>{
      const buf = Buffer.concat(chunks)
      const sig = req.headers['stripe-signature'] || ''
      let event
      try{
        event = stripe.webhooks.constructEvent(buf, sig, WEBHOOK_SECRET)
      }catch(e){ return json(res,400,{error:'invalid-signature'}) }
      const type = event.type
      if (type==='checkout.session.completed' || type==='customer.subscription.created' || type==='customer.subscription.updated'){
        let expires=null
        try{
          const sub = event.data.object?.subscription
          if (sub && typeof sub === 'string'){
            stripe.subscriptions.retrieve(sub).then(s=>{
              if (s?.current_period_end) okLicense(new Date(s.current_period_end*1000).toISOString())
            }).catch(()=> okLicense(null))
          }else{
            const s = event.data.object
            if (s?.current_period_end) expires = new Date(s.current_period_end*1000).toISOString()
            okLicense(expires)
          }
        }catch{ okLicense(null) }
      }
      json(res,200,{ok:true})
    }); return
  }

  json(res,404,{error:'not-found'})
})
server.listen(PORT, ()=> console.log(`Billing :${PORT}`))
