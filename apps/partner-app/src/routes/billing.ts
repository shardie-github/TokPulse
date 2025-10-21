import { Router, Request, Response } from 'express'
import { PrismaClient } from '@tokpulse/db'
import { BillingService } from '@tokpulse/billing'
import { ShopifyBillingService } from '@tokpulse/billing'
import { BillingWebhookHandler } from '@tokpulse/billing'

const router = Router()
const db = new PrismaClient()

// Initialize billing services
const billingService = new BillingService(db)
const shopifyBillingService = new ShopifyBillingService(billingService, {
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecret: process.env.SHOPIFY_API_SECRET || '',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || ''
})

const webhookHandler = new BillingWebhookHandler(billingService, {
  shopifyWebhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
})

// Helper function to get organization ID from request
function getOrganizationId(req: Request): string | null {
  // This would typically come from authentication middleware
  // For now, we'll use a header or query parameter
  return req.headers['x-org-id'] as string || req.query.orgId as string || null
}

// Get available plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await billingService.getPlans()
    res.json({ plans })
  } catch (error) {
    console.error('Get plans error:', error)
    res.status(500).json({ error: 'Failed to get plans' })
  }
})

// Get current subscription
router.get('/subscription', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const subscription = await billingService.getSubscription(organizationId)
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' })
    }

    res.json({ subscription })
  } catch (error) {
    console.error('Get subscription error:', error)
    res.status(500).json({ error: 'Failed to get subscription' })
  }
})

// Create subscription
router.post('/subscription', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const { planKey, trialDays = 14, shopifyBillingId } = req.body

    const subscription = await billingService.createSubscription({
      organizationId,
      planKey,
      trialDays,
      shopifyBillingId
    })

    res.json({ subscription })
  } catch (error) {
    console.error('Create subscription error:', error)
    res.status(500).json({ error: 'Failed to create subscription' })
  }
})

// Update subscription
router.put('/subscription', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const { planKey, status, cancelAtPeriodEnd } = req.body

    const subscription = await billingService.updateSubscription(organizationId, {
      planKey,
      status,
      cancelAtPeriodEnd
    })

    res.json({ subscription })
  } catch (error) {
    console.error('Update subscription error:', error)
    res.status(500).json({ error: 'Failed to update subscription' })
  }
})

// Cancel subscription
router.delete('/subscription', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const subscription = await billingService.cancelSubscription(organizationId)
    res.json({ subscription })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})

// Get usage summary
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const subscription = await billingService.getSubscription(organizationId)
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' })
    }

    const usage = await billingService.getUsageSummary(subscription.id)
    res.json({ usage })
  } catch (error) {
    console.error('Get usage error:', error)
    res.status(500).json({ error: 'Failed to get usage' })
  }
})

// Record usage
router.post('/usage', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const subscription = await billingService.getSubscription(organizationId)
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' })
    }

    const { metric, quantity, metadata } = req.body

    const usageRecord = await billingService.recordUsage({
      subscriptionId: subscription.id,
      metric,
      quantity,
      metadata
    })

    res.json({ usageRecord })
  } catch (error) {
    console.error('Record usage error:', error)
    res.status(500).json({ error: 'Failed to record usage' })
  }
})

// Check entitlement
router.post('/entitlement', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrganizationId(req)
    
    if (!organizationId) {
      return res.status(401).json({ error: 'Organization not found' })
    }

    const { feature, resource } = req.body
    const hasAccess = await billingService.checkEntitlement({
      organizationId,
      feature,
      resource
    })

    res.json({ hasAccess })
  } catch (error) {
    console.error('Check entitlement error:', error)
    res.status(500).json({ error: 'Failed to check entitlement' })
  }
})

// Shopify Billing Routes
router.post('/shopify/checkout', async (req: Request, res: Response) => {
  try {
    const { shopDomain, accessToken, planKey, trialDays } = req.body
    
    const plan = await billingService.getPlanByKey(planKey)
    if (!plan) {
      return res.status(400).json({ error: 'Plan not found' })
    }

    const { confirmationUrl, chargeId } = await shopifyBillingService.createRecurringApplicationCharge(
      shopDomain,
      accessToken,
      plan,
      trialDays
    )

    res.json({ confirmationUrl, chargeId })
  } catch (error) {
    console.error('Shopify checkout error:', error)
    res.status(500).json({ error: 'Failed to create checkout' })
  }
})

router.post('/shopify/activate', async (req: Request, res: Response) => {
  try {
    const { shopDomain, accessToken, chargeId } = req.body
    
    await shopifyBillingService.activateCharge(shopDomain, accessToken, chargeId)
    
    res.json({ success: true })
  } catch (error) {
    console.error('Shopify activate error:', error)
    res.status(500).json({ error: 'Failed to activate charge' })
  }
})

router.get('/shopify/charge/:chargeId', async (req: Request, res: Response) => {
  try {
    const { shopDomain, accessToken } = req.query
    const { chargeId } = req.params
    
    const charge = await shopifyBillingService.getCharge(
      shopDomain as string,
      accessToken as string,
      chargeId
    )
    
    res.json({ charge })
  } catch (error) {
    console.error('Get Shopify charge error:', error)
    res.status(500).json({ error: 'Failed to get charge' })
  }
})

// Webhook routes
router.post('/webhooks/shopify', async (req: Request, res: Response) => {
  await webhookHandler.handleShopifyWebhook(req, res)
})

router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  await webhookHandler.handleStripeWebhook(req, res)
})

export default router