import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@tokpulse/db'
import { RBACService } from '@tokpulse/rbac'
import { RBACMiddleware } from '@tokpulse/rbac'
import { createRBACRoutes } from '@tokpulse/rbac'

export interface RBACApiConfig {
  port?: number
  getCurrentUserId: (req: express.Request) => string | null
  getCurrentOrganizationId: (req: express.Request) => string | null
}

export function createRBACApi(config: RBACApiConfig) {
  const app = express()
  const db = new PrismaClient()
  
  // Initialize services
  const rbacService = new RBACService(db, {
    getCurrentUserId: config.getCurrentUserId,
    getCurrentOrganizationId: config.getCurrentOrganizationId
  })

  const rbacMiddleware = new RBACMiddleware({
    rbacService,
    getCurrentUserId: config.getCurrentUserId,
    getCurrentOrganizationId: config.getCurrentOrganizationId
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
    res.json({ ok: true, service: 'rbac-api' })
  })

  // RBAC routes
  app.use('/api/rbac', createRBACRoutes({
    rbacService,
    rbacMiddleware
  }))

  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('RBAC API error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  return {
    app,
    start: (port: number = config.port || 3004) => {
      return new Promise<void>((resolve) => {
        app.listen(port, () => {
          console.log(`🚀 RBAC API running on port ${port}`)
          resolve()
        })
      })
    },
    close: async () => {
      await db.$disconnect()
    }
  }
}