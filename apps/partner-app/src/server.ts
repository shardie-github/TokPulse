import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api'
import { createOAuthHandler } from './routes/oauth.js'
import { createWebhookHandler } from './routes/webhooks.js'
import { createApiHandler } from './routes/api.js'
import { telemetry } from '@tokpulse/shared'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  telemetry.log({
    event: 'http_request',
    properties: {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
    },
    timestamp: Date.now(),
    organizationId: 'unknown',
  })
  next()
})

// Routes
app.use('/auth', createOAuthHandler(shopify))
app.use('/webhooks', createWebhookHandler(shopify))
app.use('/api', createApiHandler(shopify))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  telemetry.error(err, {
    method: req.method,
    path: req.path,
    body: req.body,
  })
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Partner app running on port ${PORT}`)
  telemetry.log({
    event: 'app_started',
    properties: { port: PORT },
    timestamp: Date.now(),
    organizationId: 'system',
  })
})