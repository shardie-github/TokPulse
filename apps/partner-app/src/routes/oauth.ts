import { Router } from 'express'
import { Request, Response } from 'express'
import { Shopify } from '@shopify/shopify-api'
import { prisma } from '@tokpulse/db'
import { telemetry } from '@tokpulse/shared'

export function createOAuthHandler(shopify: Shopify) {
  const router = Router()

  // OAuth callback
  router.get('/callback', async (req: Request, res: Response) => {
    try {
      const { code, shop, state } = req.query

      if (!code || !shop || !state) {
        return res.status(400).json({ error: 'Missing required parameters' })
      }

      // Verify state parameter (CSRF protection)
      // In production, you'd store this in a secure session
      if (state !== 'tokpulse-oauth-state') {
        return res.status(400).json({ error: 'Invalid state parameter' })
      }

      // Exchange code for access token
      const session = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      })

      if (!session) {
        return res.status(400).json({ error: 'Failed to create session' })
      }

      // Store session in database
      const store = await prisma.store.upsert({
        where: { shopDomain: shop as string },
        update: {
          accessToken: session.accessToken,
          scopes: session.scope?.split(',') || [],
          status: 'ACTIVE',
        },
        create: {
          shopDomain: shop as string,
          accessToken: session.accessToken,
          scopes: session.scope?.split(',') || [],
          region: 'us', // Default region
          status: 'ACTIVE',
          organizationId: 'default-org', // In production, derive from user context
        },
      })

      telemetry.log({
        event: 'store_connected',
        properties: {
          shopDomain: shop,
          scopes: session.scope?.split(',') || [],
        },
        timestamp: Date.now(),
        organizationId: store.organizationId,
        storeId: store.id,
      })

      // Redirect to app
      res.redirect(`${process.env.SHOPIFY_APP_URL}/dashboard?shop=${shop}`)
    } catch (error) {
      telemetry.error(error as Error, {
        shop: req.query.shop,
        code: req.query.code,
      })
      
      res.status(500).json({ error: 'OAuth callback failed' })
    }
  })

  // App uninstall webhook
  router.post('/uninstall', async (req: Request, res: Response) => {
    try {
      const { shop } = req.body

      if (!shop) {
        return res.status(400).json({ error: 'Missing shop parameter' })
      }

      // Mark store as uninstalled
      await prisma.store.updateMany({
        where: { shopDomain: shop },
        data: { status: 'UNINSTALLED' },
      })

      // Clean up related data (GDPR compliance)
      await prisma.pixelEvent.deleteMany({
        where: { store: { shopDomain: shop } },
      })

      await prisma.attribution.deleteMany({
        where: { store: { shopDomain: shop } },
      })

      telemetry.log({
        event: 'app_uninstalled',
        properties: { shopDomain: shop },
        timestamp: Date.now(),
        organizationId: 'system',
      })

      res.json({ success: true })
    } catch (error) {
      telemetry.error(error as Error, { shop: req.body.shop })
      res.status(500).json({ error: 'Uninstall webhook failed' })
    }
  })

  return router
}