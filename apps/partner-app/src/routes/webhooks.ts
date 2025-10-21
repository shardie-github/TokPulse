import { Router } from 'express'
import { Request, Response } from 'express'
import { Shopify } from '@shopify/shopify-api'
import { prisma } from '@tokpulse/db'
import { telemetry } from '@tokpulse/shared'

export function createWebhookHandler(shopify: Shopify) {
  const router = Router()

  // Webhook verification middleware
  router.use((req: Request, res: Response, next) => {
    try {
      const hmac = req.get('X-Shopify-Hmac-Sha256')
      const body = JSON.stringify(req.body)
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET!

      if (!shopify.webhooks.validate({ rawBody: body, rawRequest: req, rawResponse: res })) {
        return res.status(401).json({ error: 'Invalid webhook signature' })
      }

      next()
    } catch (error) {
      telemetry.error(error as Error, { path: req.path })
      res.status(401).json({ error: 'Webhook verification failed' })
    }
  })

  // Orders webhook
  router.post('/orders/create', async (req: Request, res: Response) => {
    try {
      const { id, order_number, total_price, customer, line_items } = req.body
      const shop = req.get('X-Shopify-Shop-Domain')

      if (!shop) {
        return res.status(400).json({ error: 'Missing shop domain' })
      }

      const store = await prisma.store.findUnique({
        where: { shopDomain: shop },
      })

      if (!store) {
        return res.status(404).json({ error: 'Store not found' })
      }

      // Store webhook event
      await prisma.webhookEvent.create({
        data: {
          topic: 'orders/create',
          payload: req.body,
          storeId: store.id,
        },
      })

      // Create attribution record
      if (customer?.id) {
        await prisma.attribution.create({
          data: {
            orderId: id.toString(),
            revenue: parseFloat(total_price),
            storeId: store.id,
          },
        })
      }

      telemetry.log({
        event: 'order_created',
        properties: {
          orderId: id,
          orderNumber: order_number,
          totalPrice: total_price,
          lineItemsCount: line_items?.length || 0,
        },
        timestamp: Date.now(),
        organizationId: store.organizationId,
        storeId: store.id,
      })

      res.json({ success: true })
    } catch (error) {
      telemetry.error(error as Error, { webhook: 'orders/create' })
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  })

  // Products webhook
  router.post('/products/create', async (req: Request, res: Response) => {
    try {
      const { id, title, handle, vendor, product_type, tags, variants, images } = req.body
      const shop = req.get('X-Shopify-Shop-Domain')

      if (!shop) {
        return res.status(400).json({ error: 'Missing shop domain' })
      }

      const store = await prisma.store.findUnique({
        where: { shopDomain: shop },
      })

      if (!store) {
        return res.status(404).json({ error: 'Store not found' })
      }

      // Store webhook event
      await prisma.webhookEvent.create({
        data: {
          topic: 'products/create',
          payload: req.body,
          storeId: store.id,
        },
      })

      // Sync product to catalog
      for (const variant of variants || []) {
        await prisma.catalogItem.upsert({
          where: {
            storeId_productId_variantId: {
              storeId: store.id,
              productId: id.toString(),
              variantId: variant.id.toString(),
            },
          },
          update: {
            title,
            handle,
            vendor,
            productType: product_type,
            tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
            images: images?.map((img: any) => img.src) || [],
            price: parseFloat(variant.price),
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            inventory: variant.inventory_quantity || 0,
          },
          create: {
            productId: id.toString(),
            variantId: variant.id.toString(),
            title,
            handle,
            vendor,
            productType: product_type,
            tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
            images: images?.map((img: any) => img.src) || [],
            price: parseFloat(variant.price),
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            inventory: variant.inventory_quantity || 0,
            storeId: store.id,
          },
        })
      }

      telemetry.log({
        event: 'product_created',
        properties: {
          productId: id,
          title,
          handle,
          variantsCount: variants?.length || 0,
        },
        timestamp: Date.now(),
        organizationId: store.organizationId,
        storeId: store.id,
      })

      res.json({ success: true })
    } catch (error) {
      telemetry.error(error as Error, { webhook: 'products/create' })
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  })

  // App uninstalled webhook
  router.post('/app/uninstalled', async (req: Request, res: Response) => {
    try {
      const { id, name, domain } = req.body
      const shop = req.get('X-Shopify-Shop-Domain')

      if (!shop) {
        return res.status(400).json({ error: 'Missing shop domain' })
      }

      const store = await prisma.store.findUnique({
        where: { shopDomain: shop },
      })

      if (!store) {
        return res.status(404).json({ error: 'Store not found' })
      }

      // Mark store as uninstalled
      await prisma.store.update({
        where: { id: store.id },
        data: { status: 'UNINSTALLED' },
      })

      // Clean up personal data (GDPR compliance)
      await prisma.pixelEvent.deleteMany({
        where: { storeId: store.id },
      })

      await prisma.attribution.deleteMany({
        where: { storeId: store.id },
      })

      telemetry.log({
        event: 'app_uninstalled',
        properties: {
          appId: id,
          appName: name,
          domain,
        },
        timestamp: Date.now(),
        organizationId: store.organizationId,
        storeId: store.id,
      })

      res.json({ success: true })
    } catch (error) {
      telemetry.error(error as Error, { webhook: 'app/uninstalled' })
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  })

  return router
}