import { PrismaClient } from '@tokpulse/db'
import { 
  Plan, 
  Subscription, 
  UsageRecord, 
  CreateSubscriptionRequest, 
  UpdateSubscriptionRequest, 
  RecordUsageRequest,
  CheckEntitlementRequest,
  PlanTier,
  SubscriptionStatus,
  UsageMetric
} from './types'

export class BillingService {
  constructor(private db: PrismaClient) {}

  // Plan Management
  async getPlans(): Promise<Plan[]> {
    return this.db.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    })
  }

  async getPlanByKey(key: string): Promise<Plan | null> {
    return this.db.plan.findUnique({
      where: { key }
    })
  }

  async createPlan(data: {
    key: string
    name: string
    description?: string
    price: number
    currency?: string
    interval?: 'month' | 'year'
    features: string[]
    limits?: Record<string, number>
  }): Promise<Plan> {
    return this.db.plan.create({
      data: {
        ...data,
        features: JSON.stringify(data.features),
        limits: data.limits ? JSON.stringify(data.limits) : null
      }
    })
  }

  // Subscription Management
  async getSubscription(organizationId: string): Promise<Subscription | null> {
    return this.db.subscription.findUnique({
      where: { organizationId },
      include: { plan: true }
    })
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<Subscription> {
    const plan = await this.getPlanByKey(data.planKey)
    if (!plan) {
      throw new Error(`Plan ${data.planKey} not found`)
    }

    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + data.trialDays)

    return this.db.subscription.create({
      data: {
        organizationId: data.organizationId,
        planId: plan.id,
        shopifyBillingId: data.shopifyBillingId,
        status: 'TRIAL',
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt
      },
      include: { plan: true }
    })
  }

  async updateSubscription(
    organizationId: string, 
    data: UpdateSubscriptionRequest
  ): Promise<Subscription> {
    const updateData: any = { ...data }
    
    if (data.planKey) {
      const plan = await this.getPlanByKey(data.planKey)
      if (!plan) {
        throw new Error(`Plan ${data.planKey} not found`)
      }
      updateData.planId = plan.id
    }

    return this.db.subscription.update({
      where: { organizationId },
      data: updateData,
      include: { plan: true }
    })
  }

  async cancelSubscription(organizationId: string): Promise<Subscription> {
    return this.db.subscription.update({
      where: { organizationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelAtPeriodEnd: true
      },
      include: { plan: true }
    })
  }

  // Usage Tracking
  async recordUsage(data: RecordUsageRequest): Promise<UsageRecord> {
    return this.db.usageRecord.create({
      data: {
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }
    })
  }

  async getUsage(
    subscriptionId: string, 
    metric: UsageMetric,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageRecord[]> {
    const where: any = {
      subscriptionId,
      metric
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    return this.db.usageRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' }
    })
  }

  async getUsageSummary(subscriptionId: string, period: 'current' | 'last' = 'current'): Promise<Record<UsageMetric, number>> {
    const subscription = await this.db.subscription.findUnique({
      where: { id: subscriptionId }
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    const now = new Date()
    let startDate: Date
    let endDate: Date

    if (period === 'current') {
      startDate = subscription.currentPeriodStart || now
      endDate = subscription.currentPeriodEnd || now
    } else {
      // Last period - approximate 30 days back
      endDate = subscription.currentPeriodStart || now
      startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const usage = await this.db.usageRecord.groupBy({
      by: ['metric'],
      where: {
        subscriptionId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        quantity: true
      }
    })

    const summary: Record<UsageMetric, number> = {
      API_CALLS: 0,
      WIDGET_VIEWS: 0,
      STORES: 0,
      USERS: 0
    }

    usage.forEach(record => {
      summary[record.metric as UsageMetric] = record._sum.quantity || 0
    })

    return summary
  }

  // Entitlement Checking
  async checkEntitlement(request: CheckEntitlementRequest): Promise<boolean> {
    const subscription = await this.getSubscription(request.organizationId)
    
    if (!subscription) {
      return false
    }

    // Check if subscription is active
    if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
      return false
    }

    // Check trial expiration
    if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
      if (new Date() > subscription.trialEndsAt) {
        return false
      }
    }

    // Check plan features
    const plan = await this.db.plan.findUnique({
      where: { id: subscription.planId }
    })

    if (!plan) {
      return false
    }

    const features = JSON.parse(plan.features) as string[]
    return features.includes(request.feature)
  }

  async checkUsageLimit(
    organizationId: string, 
    metric: UsageMetric, 
    limit: number
  ): Promise<{ withinLimit: boolean; currentUsage: number; limit: number }> {
    const subscription = await this.getSubscription(organizationId)
    
    if (!subscription) {
      return { withinLimit: false, currentUsage: 0, limit }
    }

    const usage = await this.getUsageSummary(subscription.id)
    const currentUsage = usage[metric] || 0

    return {
      withinLimit: currentUsage < limit,
      currentUsage,
      limit
    }
  }

  // Billing Webhooks
  async processWebhook(
    source: 'shopify' | 'stripe',
    eventType: string,
    payload: any
  ): Promise<void> {
    // Store webhook for processing
    await this.db.billingWebhook.create({
      data: {
        source,
        eventType,
        payload: JSON.stringify(payload)
      }
    })

    // Process based on event type
    switch (source) {
      case 'shopify':
        await this.processShopifyWebhook(eventType, payload)
        break
      case 'stripe':
        await this.processStripeWebhook(eventType, payload)
        break
    }
  }

  private async processShopifyWebhook(eventType: string, payload: any): Promise<void> {
    switch (eventType) {
      case 'app_subscriptions/create':
        await this.handleShopifySubscriptionCreated(payload)
        break
      case 'app_subscriptions/update':
        await this.handleShopifySubscriptionUpdated(payload)
        break
      case 'app_subscriptions/cancel':
        await this.handleShopifySubscriptionCancelled(payload)
        break
    }
  }

  private async processStripeWebhook(eventType: string, payload: any): Promise<void> {
    switch (eventType) {
      case 'customer.subscription.created':
        await this.handleStripeSubscriptionCreated(payload)
        break
      case 'customer.subscription.updated':
        await this.handleStripeSubscriptionUpdated(payload)
        break
      case 'customer.subscription.deleted':
        await this.handleStripeSubscriptionCancelled(payload)
        break
    }
  }

  private async handleShopifySubscriptionCreated(payload: any): Promise<void> {
    // Implementation for Shopify subscription created
    console.log('Shopify subscription created:', payload)
  }

  private async handleShopifySubscriptionUpdated(payload: any): Promise<void> {
    // Implementation for Shopify subscription updated
    console.log('Shopify subscription updated:', payload)
  }

  private async handleShopifySubscriptionCancelled(payload: any): Promise<void> {
    // Implementation for Shopify subscription cancelled
    console.log('Shopify subscription cancelled:', payload)
  }

  private async handleStripeSubscriptionCreated(payload: any): Promise<void> {
    // Implementation for Stripe subscription created
    console.log('Stripe subscription created:', payload)
  }

  private async handleStripeSubscriptionUpdated(payload: any): Promise<void> {
    // Implementation for Stripe subscription updated
    console.log('Stripe subscription updated:', payload)
  }

  private async handleStripeSubscriptionCancelled(payload: any): Promise<void> {
    // Implementation for Stripe subscription cancelled
    console.log('Stripe subscription cancelled:', payload)
  }
}