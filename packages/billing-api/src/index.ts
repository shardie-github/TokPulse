import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@tokpulse/db'
import { BillingService } from '@tokpulse/billing'
import { ShopifyBillingService } from '@tokpulse/billing'
import { BillingWebhookHandler } from '@tokpulse/billing'
import { createBillingRoutes } from '@tokpulse/billing'
import { BillingMiddleware } from '@tokpulse/billing'

export interface BillingApiConfig {
  port?: number
  shopifyWebhookSecret: string
  stripeWebhookSecret: string
  getOrganizationId: (req: express.Request) => string | null
}

export function createBillingApi(config: BillingApiConfig) {
  const app = express()
  const db = new PrismaClient()
  
  // Initialize services
  const billingService = new BillingService(db)
  const shopifyBillingService = new ShopifyBillingService(billingService, {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    webhookSecret: config.shopifyWebhookSecret
  })
  
  const webhookHandler = new BillingWebhookHandler(billingService, {
    shopifyWebhookSecret: config.shopifyWebhookSecret,
    stripeWebhookSecret: config.stripeWebhookSecret
  })

  const billingMiddleware = new BillingMiddleware({
    billingService,
    getOrganizationId: config.getOrganizationId
  })

  // Middleware
  app.use(helmet())
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  })
  app.use(limiter)

  // Health check
  app.get('/healthz', (req, res) => {
    res.json({ ok: true, service: 'billing-api' })
  })

  // Billing routes
  app.use('/api/billing', createBillingRoutes({
    billingService,
    shopifyBillingService,
    webhookHandler,
    getOrganizationId: config.getOrganizationId
  }))

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Billing API error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return {
    app,
    start: (port: number = config.port || 3003) => {
      return new Promise<void>((resolve) => {
        app.listen(port, () => {
          console.log(`🚀 Billing API running on port ${port}`)
          resolve()
        })
      })
    },
    close: async () => {
      await db.$disconnect()
    }
  }
}