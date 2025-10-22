import { Router } from 'express';
export function createBillingRoutes(config) {
    const router = Router();
    // Get available plans
    router.get('/plans', async (req, res) => {
        try {
            const plans = await config.billingService.getPlans();
            res.json({ plans });
        }
        catch (error) {
            console.error('Get plans error:', error);
            res.status(500).json({ error: 'Failed to get plans' });
        }
    });
    // Get current subscription
    router.get('/subscription', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const subscription = await config.billingService.getSubscription(organizationId);
            if (!subscription) {
                return res.status(404).json({ error: 'No subscription found' });
            }
            res.json({ subscription });
        }
        catch (error) {
            console.error('Get subscription error:', error);
            res.status(500).json({ error: 'Failed to get subscription' });
        }
    });
    // Create subscription
    router.post('/subscription', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const data = {
                organizationId,
                ...req.body
            };
            const subscription = await config.billingService.createSubscription(data);
            res.json({ subscription });
        }
        catch (error) {
            console.error('Create subscription error:', error);
            res.status(500).json({ error: 'Failed to create subscription' });
        }
    });
    // Update subscription
    router.put('/subscription', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const data = req.body;
            const subscription = await config.billingService.updateSubscription(organizationId, data);
            res.json({ subscription });
        }
        catch (error) {
            console.error('Update subscription error:', error);
            res.status(500).json({ error: 'Failed to update subscription' });
        }
    });
    // Cancel subscription
    router.delete('/subscription', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const subscription = await config.billingService.cancelSubscription(organizationId);
            res.json({ subscription });
        }
        catch (error) {
            console.error('Cancel subscription error:', error);
            res.status(500).json({ error: 'Failed to cancel subscription' });
        }
    });
    // Get usage summary
    router.get('/usage', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const subscription = await config.billingService.getSubscription(organizationId);
            if (!subscription) {
                return res.status(404).json({ error: 'No subscription found' });
            }
            const usage = await config.billingService.getUsageSummary(subscription.id);
            res.json({ usage });
        }
        catch (error) {
            console.error('Get usage error:', error);
            res.status(500).json({ error: 'Failed to get usage' });
        }
    });
    // Record usage
    router.post('/usage', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const subscription = await config.billingService.getSubscription(organizationId);
            if (!subscription) {
                return res.status(404).json({ error: 'No subscription found' });
            }
            const data = {
                subscriptionId: subscription.id,
                ...req.body
            };
            const usageRecord = await config.billingService.recordUsage(data);
            res.json({ usageRecord });
        }
        catch (error) {
            console.error('Record usage error:', error);
            res.status(500).json({ error: 'Failed to record usage' });
        }
    });
    // Check entitlement
    router.post('/entitlement', async (req, res) => {
        try {
            const organizationId = config.getOrganizationId(req);
            if (!organizationId) {
                return res.status(401).json({ error: 'Organization not found' });
            }
            const { feature, resource } = req.body;
            const hasAccess = await config.billingService.checkEntitlement({
                organizationId,
                feature,
                resource
            });
            res.json({ hasAccess });
        }
        catch (error) {
            console.error('Check entitlement error:', error);
            res.status(500).json({ error: 'Failed to check entitlement' });
        }
    });
    // Shopify Billing Routes
    router.post('/shopify/checkout', async (req, res) => {
        try {
            const { shopDomain, accessToken, planKey, trialDays } = req.body;
            const plan = await config.billingService.getPlanByKey(planKey);
            if (!plan) {
                return res.status(400).json({ error: 'Plan not found' });
            }
            const { confirmationUrl, chargeId } = await config.shopifyBillingService.createRecurringApplicationCharge(shopDomain, accessToken, plan, trialDays);
            res.json({ confirmationUrl, chargeId });
        }
        catch (error) {
            console.error('Shopify checkout error:', error);
            res.status(500).json({ error: 'Failed to create checkout' });
        }
    });
    router.post('/shopify/activate', async (req, res) => {
        try {
            const { shopDomain, accessToken, chargeId } = req.body;
            await config.shopifyBillingService.activateCharge(shopDomain, accessToken, chargeId);
            res.json({ success: true });
        }
        catch (error) {
            console.error('Shopify activate error:', error);
            res.status(500).json({ error: 'Failed to activate charge' });
        }
    });
    router.get('/shopify/charge/:chargeId', async (req, res) => {
        try {
            const { shopDomain, accessToken } = req.query;
            const { chargeId } = req.params;
            const charge = await config.shopifyBillingService.getCharge(shopDomain, accessToken, chargeId);
            res.json({ charge });
        }
        catch (error) {
            console.error('Get Shopify charge error:', error);
            res.status(500).json({ error: 'Failed to get charge' });
        }
    });
    // Webhook routes
    router.post('/webhooks/shopify', async (req, res) => {
        await config.webhookHandler.handleShopifyWebhook(req, res);
    });
    router.post('/webhooks/stripe', async (req, res) => {
        await config.webhookHandler.handleStripeWebhook(req, res);
    });
    return router;
}
