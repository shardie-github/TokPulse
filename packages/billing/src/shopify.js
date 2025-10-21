export class ShopifyBillingService {
    billingService;
    config;
    constructor(billingService, config) {
        this.billingService = billingService;
        this.config = config;
    }
    async createRecurringApplicationCharge(shopDomain, accessToken, plan, trialDays = 14) {
        const charge = {
            recurring_application_charge: {
                name: plan.name,
                price: plan.price,
                return_url: `${this.config.appUrl}/api/billing/shopify/return`,
                trial_days: trialDays,
                test: process.env.NODE_ENV !== 'production'
            }
        };
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/recurring_application_charges.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(charge)
        });
        if (!response.ok) {
            throw new Error(`Failed to create charge: ${response.statusText}`);
        }
        const data = await response.json();
        const chargeData = data.recurring_application_charge;
        return {
            confirmationUrl: chargeData.confirmation_url,
            chargeId: chargeData.id.toString()
        };
    }
    async activateCharge(shopDomain, accessToken, chargeId) {
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/recurring_application_charges/${chargeId}/activate.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to activate charge: ${response.statusText}`);
        }
    }
    async getCharge(shopDomain, accessToken, chargeId) {
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/recurring_application_charges/${chargeId}.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to get charge: ${response.statusText}`);
        }
        const data = await response.json();
        return data.recurring_application_charge;
    }
    async cancelCharge(shopDomain, accessToken, chargeId) {
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/recurring_application_charges/${chargeId}.json`, {
            method: 'DELETE',
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to cancel charge: ${response.statusText}`);
        }
    }
    async createUsageCharge(shopDomain, accessToken, chargeId, description, price) {
        const usageCharge = {
            usage_charge: {
                description,
                price,
                recurring_application_charge_id: chargeId
            }
        };
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/usage_charges.json`, {
            method: 'POST',
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usageCharge)
        });
        if (!response.ok) {
            throw new Error(`Failed to create usage charge: ${response.statusText}`);
        }
        const data = await response.json();
        return data.usage_charge;
    }
    async getUsageCharges(shopDomain, accessToken, chargeId) {
        const response = await fetch(`https://${shopDomain}/admin/api/2023-10/recurring_application_charges/${chargeId}/usage_charges.json`, {
            headers: {
                'X-Shopify-Access-Token': accessToken
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to get usage charges: ${response.statusText}`);
        }
        const data = await response.json();
        return data.usage_charges;
    }
    async processWebhook(eventType, payload) {
        switch (eventType) {
            case 'app_subscriptions/create':
                await this.handleSubscriptionCreated(payload);
                break;
            case 'app_subscriptions/update':
                await this.handleSubscriptionUpdated(payload);
                break;
            case 'app_subscriptions/cancel':
                await this.handleSubscriptionCancelled(payload);
                break;
        }
    }
    async handleSubscriptionCreated(payload) {
        const { id, name, price, status, trial_ends_on, created_at } = payload;
        // Find organization by shop domain
        // This would need to be implemented based on your store lookup logic
        const organizationId = await this.findOrganizationByShopDomain(payload.shop_domain);
        if (!organizationId) {
            console.error('Organization not found for shop:', payload.shop_domain);
            return;
        }
        // Create subscription
        await this.billingService.createSubscription({
            organizationId,
            planKey: this.getPlanKeyFromName(name),
            trialDays: this.calculateTrialDays(trial_ends_on, created_at),
            shopifyBillingId: id.toString()
        });
    }
    async handleSubscriptionUpdated(payload) {
        const { id, status, trial_ends_on } = payload;
        // Find subscription by Shopify billing ID
        const subscription = await this.billingService.db.subscription.findFirst({
            where: { shopifyBillingId: id.toString() }
        });
        if (!subscription) {
            console.error('Subscription not found for Shopify billing ID:', id);
            return;
        }
        // Update subscription status
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
        await this.billingService.updateSubscription(subscription.organizationId, updateData);
    }
    async handleSubscriptionCancelled(payload) {
        const { id } = payload;
        const subscription = await this.billingService.db.subscription.findFirst({
            where: { shopifyBillingId: id.toString() }
        });
        if (!subscription) {
            console.error('Subscription not found for Shopify billing ID:', id);
            return;
        }
        await this.billingService.cancelSubscription(subscription.organizationId);
    }
    getPlanKeyFromName(name) {
        // Map Shopify plan names to internal plan keys
        const planMapping = {
            'Starter Plan': 'STARTER',
            'Growth Plan': 'GROWTH',
            'Enterprise Plan': 'ENTERPRISE'
        };
        return planMapping[name] || 'STARTER';
    }
    calculateTrialDays(trialEndsOn, createdAt) {
        if (!trialEndsOn)
            return 0;
        const trialEnd = new Date(trialEndsOn);
        const created = new Date(createdAt);
        const diffTime = trialEnd.getTime() - created.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }
    async findOrganizationByShopDomain(shopDomain) {
        // This would need to be implemented based on your store lookup logic
        // For now, return null as a placeholder
        return null;
    }
}
