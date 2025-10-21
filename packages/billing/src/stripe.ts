import Stripe from 'stripe'
import { Plan, Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest } from './types'
import { SecurityUtils } from '@tokpulse/shared'

export interface StripeConfig {
  secretKey: string
  webhookSecret: string
  priceIds: {
    starter: string
    growth: string
    enterprise: string
  }
  successUrl: string
  cancelUrl: string
}

export class StripeService {
  private stripe: Stripe
  private config: StripeConfig

  constructor(config: StripeConfig) {
    this.config = config
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  }

  // Create a Stripe customer
  async createCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        created_by: 'tokpulse',
      },
    })
  }

  // Create a subscription
  async createSubscription(
    customerId: string,
    planKey: string,
    trialDays?: number
  ): Promise<{ subscription: Stripe.Subscription; clientSecret: string }> {
    const priceId = this.getPriceId(planKey)
    
    const subscriptionData: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    }

    if (trialDays && trialDays > 0) {
      subscriptionData.trial_period_days = trialDays
    }

    const subscription = await this.stripe.subscriptions.create(subscriptionData)
    
    const clientSecret = (subscription.latest_invoice as Stripe.Invoice)?.payment_intent?.client_secret

    if (!clientSecret) {
      throw new Error('Failed to create payment intent')
    }

    return { subscription, clientSecret }
  }

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    planKey: string
  ): Promise<Stripe.Subscription> {
    const priceId = this.getPriceId(planKey)
    
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
    
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    })
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: atPeriodEnd,
    })
  }

  // Create checkout session
  async createCheckoutSession(
    customerId: string,
    planKey: string,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{ url: string; sessionId: string }> {
    const priceId = this.getPriceId(planKey)
    
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl || this.config.successUrl,
      cancel_url: cancelUrl || this.config.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      subscription_data: {
        metadata: {
          plan_key: planKey,
          created_by: 'tokpulse',
        },
      },
    })

    if (!session.url) {
      throw new Error('Failed to create checkout session')
    }

    return {
      url: session.url,
      sessionId: session.id,
    }
  }

  // Create customer portal session
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return { url: session.url }
  }

  // Get subscription
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice', 'customer'],
    })
  }

  // Get customer
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(customerId) as Stripe.Customer
  }

  // List customer subscriptions
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
    })
    return subscriptions.data
  }

  // Create usage record for metered billing
  async createUsageRecord(
    subscriptionItemId: string,
    quantity: number,
    timestamp?: Date
  ): Promise<Stripe.UsageRecord> {
    return this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
      quantity,
      timestamp: timestamp ? Math.floor(timestamp.getTime() / 1000) : undefined,
    })
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret)
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error.message}`)
    }
  }

  // Handle webhook events
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
  }

  // Webhook event handlers
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('Checkout session completed:', session.id)
    // Implementation would update database with subscription details
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription created:', subscription.id)
    // Implementation would create subscription in database
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription updated:', subscription.id)
    // Implementation would update subscription in database
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id)
    // Implementation would cancel subscription in database
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment succeeded for invoice:', invoice.id)
    // Implementation would update subscription status
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Payment failed for invoice:', invoice.id)
    // Implementation would handle payment failure
  }

  // Helper methods
  private getPriceId(planKey: string): string {
    const priceMap = {
      STARTER: this.config.priceIds.starter,
      GROWTH: this.config.priceIds.growth,
      ENTERPRISE: this.config.priceIds.enterprise,
    }

    const priceId = priceMap[planKey as keyof typeof priceMap]
    if (!priceId) {
      throw new Error(`Invalid plan key: ${planKey}`)
    }

    return priceId
  }

  // Create or retrieve customer by email
  async findOrCreateCustomer(email: string, name?: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    const existingCustomers = await this.stripe.customers.list({
      email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0]
    }

    return this.createCustomer(email, name, metadata)
  }

  // Get subscription with usage
  async getSubscriptionWithUsage(subscriptionId: string): Promise<{
    subscription: Stripe.Subscription
    usage: Record<string, number>
  }> {
    const subscription = await this.getSubscription(subscriptionId)
    
    const usage: Record<string, number> = {}
    
    for (const item of subscription.items.data) {
      if (item.price.recurring?.usage_type === 'metered') {
        const usageRecords = await this.stripe.usageRecords.list({
          subscription_item: item.id,
          limit: 1,
        })
        
        if (usageRecords.data.length > 0) {
          usage[item.price.nickname || item.price.id] = usageRecords.data[0].quantity
        }
      }
    }

    return { subscription, usage }
  }

  // Create setup intent for saving payment method
  async createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    })

    return { clientSecret: setupIntent.client_secret! }
  }

  // Get payment methods for customer
  async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    return paymentMethods.data
  }

  // Update payment method
  async updatePaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      default_payment_method: paymentMethodId,
    })
  }
}