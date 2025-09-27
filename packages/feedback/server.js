import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import Stripe from 'stripe'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

const app = express()
app.use(helmet())
app.use(cors({ origin: '*'}))
app.use(express.json())

const ENV = {
  BUY_URL: process.env.BUY_URL || '',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'change-me',
  GA4: process.env.GA4_MEASUREMENT_ID || '',
  TIKTOK_PIXEL: process.env.TIKTOK_PIXEL_ID || '',
  PRICING_VARIANTS: process.env.PRICING_VARIANTS || '{"A":49,"B":29}',
}
const stripe = ENV.STRIPE_SECRET_KEY ? new Stripe(ENV.STRIPE_SECRET_KEY) : null

// SQLite database
const dbPath = path.join(process.cwd(), 'data', 'app.db')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
let db
;(async () => {
  db = await open({ filename: dbPath, driver: sqlite3.Database })
  await db.exec(`
    CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY, email TEXT, source TEXT, ref TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, type TEXT, payload TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS licenses (id INTEGER PRIMARY KEY, email TEXT, key TEXT, plan TEXT, created_at TEXT);
  `)
})()

// Helpers
function rateLimit(windowMs=60000, max=120){
  const hits = new Map()
  return (req,res,next)=>{
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
    const now = Date.now()
    const arr = hits.get(ip) || []
    const recent = arr.filter(t=> now - t < windowMs)
    recent.push(now)
    hits.set(ip, recent)
    if (recent.length > max) return res.status(429).json({error:'rate_limited'})
    next()
  }
}
app.use(rateLimit())

// Health
app.get('/api/health', (req,res)=> res.json({status:'ok', buy: !!ENV.BUY_URL, stripe: !!ENV.STRIPE_SECRET_KEY}))

// Ingest comments + lead capture
app.post('/api/ingest', async (req,res)=>{
  const { source='tiktok', type='comment', text='', email='', ref='' } = req.body || {}
  if (email){
    await db.run('INSERT INTO leads (email, source, ref, created_at) VALUES (?, ?, ?, datetime("now"))', [email, source, ref])
  }
  await db.run('INSERT INTO events (type, payload, created_at) VALUES (?, ?, datetime("now"))', [type, JSON.stringify({text, source}),])
  res.json({ id: crypto.randomUUID(), source, type, text, receivedAt: new Date().toISOString() })
})

// Stripe fallback checkout
app.post('/api/checkout/stripe', async (req,res)=>{
  try {
    if (ENV.BUY_URL) return res.json({ url: ENV.BUY_URL }) // Shopify preferred
    if (!stripe || !ENV.STRIPE_PRICE_ID) return res.status(400).json({ error: 'Stripe not configured' })
    const { email, ref } = req.body || {}
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: process.env.SUCCESS_URL || 'https://hardonia.store/success',
      cancel_url: process.env.CANCEL_URL || 'https://hardonia.store/cancel',
      line_items: [{ price: ENV.STRIPE_PRICE_ID, quantity: 1 }],
      customer_email: email || undefined,
      metadata: { ref: ref || '' }
    })
    res.json({ url: session.url })
  } catch (e) { console.error(e); res.status(500).json({ error: 'checkout_failed' }) }
})

// License key generation
app.post('/api/license', async (req,res)=>{
  const { email, plan='pro' } = req.body || {}
  if(!email) return res.status(400).json({error:'email_required'})
  const key = crypto.randomBytes(16).toString('hex')
  await db.run('INSERT INTO licenses (email, key, plan, created_at) VALUES (?, ?, ?, datetime("now"))', [email, key, plan])
  res.json({ key })
})

// Admin auth (simple password -> JWT)
const JWT_SECRET = crypto.randomBytes(32).toString('hex')
app.post('/api/admin/login', (req,res)=>{
  const { password } = req.body || {}
  if (password !== ENV.ADMIN_PASSWORD) return res.status(401).json({error:'unauthorized'})
  const token = jwt.sign({ role:'admin' }, JWT_SECRET, { expiresIn: '2h' })
  res.json({ token })
})
function requireAdmin(req,res,next){
  const h = req.headers.authorization || ''
  const t = h.startsWith('Bearer ') ? h.slice(7) : null
  if(!t) return res.status(401).json({error:'unauthorized'})
  try{ jwt.verify(t, JWT_SECRET); next() } catch { return res.status(401).json({error:'unauthorized'}) }
}
app.get('/api/admin/metrics', requireAdmin, async (req,res)=>{
  const leadCount = (await db.get('SELECT COUNT(*) AS c FROM leads')).c
  const ingestCount = (await db.get('SELECT COUNT(*) AS c FROM events')).c
  const topRef = await db.all('SELECT ref, COUNT(*) as count FROM leads WHERE ref IS NOT NULL AND ref != "" GROUP BY ref ORDER BY count DESC LIMIT 5')
  const mrr = leadCount * 49 // naive proxy until Stripe webhook integration
  res.json({ mrr, active: leadCount, ingests: ingestCount, refTop: topRef })
})

// Static
app.use('/public', express.static(path.join(process.cwd(), 'public')))

const port = process.env.PORT || 8787
app.listen(port, ()=>console.log(`API listening on :${port}`))
