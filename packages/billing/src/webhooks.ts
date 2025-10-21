import { Request, Response } from 'express'
import crypto from 'crypto'
import { BillingService } from './service'

export interface WebhookConfig {
  shopifyWebhookSecret: string
  stripeWebhookSecret: string
}

export class BillingWebhookHandler {
  constructor(
    private billingService: BillingService,
    private config: WebhookConfig
  ) {}

  async handleShopifyWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-shopify-hmac-sha256'] as string
      const body = JSON.stringify(req.body)

      if (!this.verifyShopifySignature(body, signature)) {
        res.status(401).json({ error: 'Invalid signature' })
        return
      }

      const { eventType, payload } = req.body
      await this.billingService.processWebhook('shopify', eventType, payload)

      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Shopify webhook error:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string
      const body = req.body

      if (!this.verifyStripeSignature(body, signature)) {
        res.status(401).json({ error: 'Invalid signature' })
        return
      }

      const { type, data } = req.body
      await this.billingService.processWebhook('stripe', type, data.object)

      res.status(200).json({ success: true })
    } catch (error) {
      console.error('Stripe webhook error:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }

  private verifyShopifySignature(body: string, signature: string): boolean {
    const hmac = crypto.createHmac('sha256', this.config.shopifyWebhookSecret)
    hmac.update(body, 'utf8')
    const hash = hmac.digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(hash, 'base64')
    )
  }

  private verifyStripeSignature(body: string, signature: string): boolean {
    const elements = signature.split(',')
    const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1]
    const v1 = elements.find(el => el.startsWith('v1='))?.split('=')[1]

    if (!timestamp || !v1) {
      return false
    }

    const payload = `${timestamp}.${body}`
    const expectedSignature = crypto
      .createHmac('sha256', this.config.stripeWebhookSecret)
      .update(payload, 'utf8')
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }
}