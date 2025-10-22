import { ValidationSchemas } from '@tokpulse/shared';
import { z } from 'zod';
export class BillingService {
    db;
    constructor(db) {
        this.db = db;
    }
    // Input validation
    validateInput(schema, data) {
        try {
            return schema.parse(data);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
            }
            throw error;
        }
    }
    // Audit logging
    async logAuditEvent(action, resource, resourceId, userId, changes) {
        try {
            await this.db.auditLog.create({
                data: {
                    action,
                    resource,
                    resourceId,
                    userId,
                    changes: changes ? JSON.stringify(changes) : null,
                },
            });
        }
        catch (error) {
            console.error('Failed to log audit event:', error);
        }
    }
    // Plan Management
    async getPlans() {
        try {
            const plans = await this.db.plan.findMany({
                where: { isActive: true },
                orderBy: { price: 'asc' }
            });
            return plans.map(plan => ({
                ...plan,
                features: JSON.parse(plan.features),
                limits: plan.limits ? JSON.parse(plan.limits) : {},
            }));
        }
        catch (error) {
            console.error('Failed to get plans:', error);
            throw new Error('Failed to retrieve plans');
        }
    }
    async getPlanByKey(key) {
        return this.db.plan.findUnique({
            where: { key }
        });
    }
    async createPlan(data) {
        try {
            // Validate input
            const validatedData = this.validateInput(z.object({
                key: z.string().min(1).max(50),
                name: z.string().min(1).max(100),
                description: z.string().max(500).optional(),
                price: z.number().min(0),
                currency: z.string().length(3).optional(),
                interval: z.enum(['month', 'year']).optional(),
                features: z.array(z.string()),
                limits: z.record(z.number()).optional(),
            }), data);
            const plan = await this.db.plan.create({
                data: {
                    ...validatedData,
                    features: JSON.stringify(validatedData.features),
                    limits: validatedData.limits ? JSON.stringify(validatedData.limits) : null
                }
            });
            await this.logAuditEvent('CREATE', 'plan', plan.id, undefined, validatedData);
            return {
                ...plan,
                features: JSON.parse(plan.features),
                limits: plan.limits ? JSON.parse(plan.limits) : {},
            };
        }
        catch (error) {
            console.error('Failed to create plan:', error);
            throw new Error('Failed to create plan');
        }
    }
    // Subscription Management
    async getSubscription(organizationId) {
        try {
            const subscription = await this.db.subscription.findUnique({
                where: { organizationId },
                include: { plan: true }
            });
            if (!subscription) {
                return null;
            }
            return {
                ...subscription,
                plan: {
                    ...subscription.plan,
                    features: JSON.parse(subscription.plan.features),
                    limits: subscription.plan.limits ? JSON.parse(subscription.plan.limits) : {},
                }
            };
        }
        catch (error) {
            console.error('Failed to get subscription:', error);
            throw new Error('Failed to retrieve subscription');
        }
    }
    async createSubscription(data) {
        try {
            // Validate input
            const validatedData = this.validateInput(ValidationSchemas.planKey, data.planKey);
            const organizationId = this.validateInput(ValidationSchemas.organizationId, data.organizationId);
            const plan = await this.getPlanByKey(validatedData);
            if (!plan) {
                throw new Error(`Plan ${validatedData} not found`);
            }
            // Check if organization already has a subscription
            const existingSubscription = await this.db.subscription.findUnique({
                where: { organizationId }
            });
            if (existingSubscription) {
                throw new Error('Organization already has a subscription');
            }
            const trialEndsAt = new Date();
            trialEndsAt.setDate(trialEndsAt.getDate() + (data.trialDays || 14));
            const subscription = await this.db.subscription.create({
                data: {
                    organizationId,
                    planId: plan.id,
                    shopifyBillingId: data.shopifyBillingId,
                    status: 'TRIAL',
                    trialEndsAt,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: trialEndsAt
                },
                include: { plan: true }
            });
            await this.logAuditEvent('CREATE', 'subscription', subscription.id, undefined, {
                organizationId,
                planKey: validatedData,
                trialDays: data.trialDays || 14
            });
            return {
                ...subscription,
                plan: {
                    ...subscription.plan,
                    features: JSON.parse(subscription.plan.features),
                    limits: subscription.plan.limits ? JSON.parse(subscription.plan.limits) : {},
                }
            };
        }
        catch (error) {
            console.error('Failed to create subscription:', error);
            throw error instanceof Error ? error : new Error('Failed to create subscription');
        }
    }
    async updateSubscription(organizationId, data) {
        const updateData = { ...data };
        if (data.planKey) {
            const plan = await this.getPlanByKey(data.planKey);
            if (!plan) {
                throw new Error(`Plan ${data.planKey} not found`);
            }
            updateData.planId = plan.id;
        }
        return this.db.subscription.update({
            where: { organizationId },
            data: updateData,
            include: { plan: true }
        });
    }
    async cancelSubscription(organizationId) {
        return this.db.subscription.update({
            where: { organizationId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelAtPeriodEnd: true
            },
            include: { plan: true }
        });
    }
    // Usage Tracking
    async recordUsage(data) {
        return this.db.usageRecord.create({
            data: {
                ...data,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null
            }
        });
    }
    async getUsage(subscriptionId, metric, startDate, endDate) {
        const where = {
            subscriptionId,
            metric
        };
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                where.timestamp.gte = startDate;
            if (endDate)
                where.timestamp.lte = endDate;
        }
        return this.db.usageRecord.findMany({
            where,
            orderBy: { timestamp: 'desc' }
        });
    }
    async getUsageSummary(subscriptionId, period = 'current') {
        const subscription = await this.db.subscription.findUnique({
            where: { id: subscriptionId }
        });
        if (!subscription) {
            throw new Error('Subscription not found');
        }
        const now = new Date();
        let startDate;
        let endDate;
        if (period === 'current') {
            startDate = subscription.currentPeriodStart || now;
            endDate = subscription.currentPeriodEnd || now;
        }
        else {
            // Last period - approximate 30 days back
            endDate = subscription.currentPeriodStart || now;
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
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
        });
        const summary = {
            API_CALLS: 0,
            WIDGET_VIEWS: 0,
            STORES: 0,
            USERS: 0
        };
        usage.forEach(record => {
            summary[record.metric] = record._sum.quantity || 0;
        });
        return summary;
    }
    // Entitlement Checking
    async checkEntitlement(request) {
        const subscription = await this.getSubscription(request.organizationId);
        if (!subscription) {
            return false;
        }
        // Check if subscription is active
        if (subscription.status !== 'ACTIVE' && subscription.status !== 'TRIAL') {
            return false;
        }
        // Check trial expiration
        if (subscription.status === 'TRIAL' && subscription.trialEndsAt) {
            if (new Date() > subscription.trialEndsAt) {
                return false;
            }
        }
        // Check plan features
        const plan = await this.db.plan.findUnique({
            where: { id: subscription.planId }
        });
        if (!plan) {
            return false;
        }
        const features = JSON.parse(plan.features);
        return features.includes(request.feature);
    }
    async checkUsageLimit(organizationId, metric, limit) {
        const subscription = await this.getSubscription(organizationId);
        if (!subscription) {
            return { withinLimit: false, currentUsage: 0, limit };
        }
        const usage = await this.getUsageSummary(subscription.id);
        const currentUsage = usage[metric] || 0;
        return {
            withinLimit: currentUsage < limit,
            currentUsage,
            limit
        };
    }
    // Billing Webhooks
    async processWebhook(source, eventType, payload) {
        // Store webhook for processing
        await this.db.billingWebhook.create({
            data: {
                source,
                eventType,
                payload: JSON.stringify(payload)
            }
        });
        // Process based on event type
        switch (source) {
            case 'shopify':
                await this.processShopifyWebhook(eventType, payload);
                break;
            case 'stripe':
                await this.processStripeWebhook(eventType, payload);
                break;
        }
    }
    async processShopifyWebhook(eventType, payload) {
        switch (eventType) {
            case 'app_subscriptions/create':
                await this.handleShopifySubscriptionCreated(payload);
                break;
            case 'app_subscriptions/update':
                await this.handleShopifySubscriptionUpdated(payload);
                break;
            case 'app_subscriptions/cancel':
                await this.handleShopifySubscriptionCancelled(payload);
                break;
        }
    }
    async processStripeWebhook(eventType, payload) {
        switch (eventType) {
            case 'customer.subscription.created':
                await this.handleStripeSubscriptionCreated(payload);
                break;
            case 'customer.subscription.updated':
                await this.handleStripeSubscriptionUpdated(payload);
                break;
            case 'customer.subscription.deleted':
                await this.handleStripeSubscriptionCancelled(payload);
                break;
        }
    }
    async handleShopifySubscriptionCreated(payload) {
        const { id, name, price, status, trial_ends_on, created_at, shop_domain } = payload;
        // Find organization by shop domain
        const store = await this.db.store.findUnique({
            where: { shopDomain: shop_domain },
            include: { organization: true }
        });
        if (!store) {
            console.error('Store not found for shop domain:', shop_domain);
            return;
        }
        // Create subscription
        const plan = await this.getPlanByKey(this.getPlanKeyFromName(name));
        if (!plan) {
            console.error('Plan not found for name:', name);
            return;
        }
        const trialEndsAt = trial_ends_on ? new Date(trial_ends_on) : null;
        const currentPeriodStart = new Date(created_at);
        const currentPeriodEnd = trialEndsAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        await this.db.subscription.upsert({
            where: { organizationId: store.organizationId },
            update: {
                planId: plan.id,
                shopifyBillingId: id.toString(),
                status: status === 'active' ? 'ACTIVE' : 'TRIAL',
                trialEndsAt,
                currentPeriodStart,
                currentPeriodEnd
            },
            create: {
                organizationId: store.organizationId,
                planId: plan.id,
                shopifyBillingId: id.toString(),
                status: status === 'active' ? 'ACTIVE' : 'TRIAL',
                trialEndsAt,
                currentPeriodStart,
                currentPeriodEnd
            }
        });
        console.log('Shopify subscription created:', { id, organizationId: store.organizationId });
    }
    async handleShopifySubscriptionUpdated(payload) {
        const { id, status, trial_ends_on } = payload;
        const subscription = await this.db.subscription.findFirst({
            where: { shopifyBillingId: id.toString() }
        });
        if (!subscription) {
            console.error('Subscription not found for Shopify billing ID:', id);
            return;
        }
        const updateData = {};
        if (status === 'active') {
            updateData.status = 'ACTIVE';
        }
        else if (status === 'cancelled') {
            updateData.status = 'CANCELLED';
            updateData.cancelledAt = new Date();
        }
        if (trial_ends_on) {
            updateData.trialEndsAt = new Date(trial_ends_on);
        }
        await this.db.subscription.update({
            where: { id: subscription.id },
            data: updateData
        });
        console.log('Shopify subscription updated:', { id, status });
    }
    async handleShopifySubscriptionCancelled(payload) {
        const { id } = payload;
        const subscription = await this.db.subscription.findFirst({
            where: { shopifyBillingId: id.toString() }
        });
        if (!subscription) {
            console.error('Subscription not found for Shopify billing ID:', id);
            return;
        }
        await this.db.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelAtPeriodEnd: true
            }
        });
        console.log('Shopify subscription cancelled:', { id });
    }
    async handleStripeSubscriptionCreated(payload) {
        const { id, customer, status, trial_end, current_period_start, current_period_end } = payload;
        // Find organization by Stripe customer ID
        const subscription = await this.db.subscription.findFirst({
            where: { stripeCustomerId: customer }
        });
        if (!subscription) {
            console.error('Subscription not found for Stripe customer ID:', customer);
            return;
        }
        const updateData = {
            stripeCustomerId: customer
        };
        if (status === 'active') {
            updateData.status = 'ACTIVE';
        }
        else if (status === 'trialing') {
            updateData.status = 'TRIAL';
        }
        if (trial_end) {
            updateData.trialEndsAt = new Date(trial_end * 1000);
        }
        if (current_period_start) {
            updateData.currentPeriodStart = new Date(current_period_start * 1000);
        }
        if (current_period_end) {
            updateData.currentPeriodEnd = new Date(current_period_end * 1000);
        }
        await this.db.subscription.update({
            where: { id: subscription.id },
            data: updateData
        });
        console.log('Stripe subscription created:', { id, customer });
    }
    async handleStripeSubscriptionUpdated(payload) {
        const { id, status, trial_end, current_period_start, current_period_end } = payload;
        const subscription = await this.db.subscription.findFirst({
            where: { stripeCustomerId: payload.customer }
        });
        if (!subscription) {
            console.error('Subscription not found for Stripe customer ID:', payload.customer);
            return;
        }
        const updateData = {};
        if (status === 'active') {
            updateData.status = 'ACTIVE';
        }
        else if (status === 'past_due') {
            updateData.status = 'PAST_DUE';
        }
        else if (status === 'cancelled' || status === 'unpaid') {
            updateData.status = 'CANCELLED';
            updateData.cancelledAt = new Date();
        }
        if (trial_end) {
            updateData.trialEndsAt = new Date(trial_end * 1000);
        }
        if (current_period_start) {
            updateData.currentPeriodStart = new Date(current_period_start * 1000);
        }
        if (current_period_end) {
            updateData.currentPeriodEnd = new Date(current_period_end * 1000);
        }
        await this.db.subscription.update({
            where: { id: subscription.id },
            data: updateData
        });
        console.log('Stripe subscription updated:', { id, status });
    }
    async handleStripeSubscriptionCancelled(payload) {
        const { id, customer } = payload;
        const subscription = await this.db.subscription.findFirst({
            where: { stripeCustomerId: customer }
        });
        if (!subscription) {
            console.error('Subscription not found for Stripe customer ID:', customer);
            return;
        }
        await this.db.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelAtPeriodEnd: true
            }
        });
        console.log('Stripe subscription cancelled:', { id, customer });
    }
    getPlanKeyFromName(name) {
        const planMapping = {
            'Starter Plan': 'STARTER',
            'Growth Plan': 'GROWTH',
            'Enterprise Plan': 'ENTERPRISE'
        };
        return planMapping[name] || 'STARTER';
    }
}
