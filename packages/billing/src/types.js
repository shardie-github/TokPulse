import { z } from 'zod';
export const PlanTier = z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']);
export const SubscriptionStatus = z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']);
export const BillingProvider = z.enum(['SHOPIFY', 'STRIPE']);
export const UsageMetric = z.enum(['API_CALLS', 'WIDGET_VIEWS', 'STORES', 'USERS']);
export const PlanSchema = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number(),
    currency: z.string().default('USD'),
    interval: z.enum(['month', 'year']).default('month'),
    features: z.array(z.string()),
    limits: z.record(z.number()).optional(),
    isActive: z.boolean().default(true),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const SubscriptionSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    planId: z.string(),
    shopifyBillingId: z.string().optional(),
    stripeCustomerId: z.string().optional(),
    status: SubscriptionStatus,
    trialEndsAt: z.date().optional(),
    currentPeriodStart: z.date().optional(),
    currentPeriodEnd: z.date().optional(),
    cancelAtPeriodEnd: z.boolean().default(false),
    cancelledAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const UsageRecordSchema = z.object({
    id: z.string(),
    subscriptionId: z.string(),
    metric: UsageMetric,
    quantity: z.number(),
    timestamp: z.date(),
    metadata: z.record(z.any()).optional(),
});
export const CreateSubscriptionRequest = z.object({
    organizationId: z.string(),
    planKey: z.string(),
    trialDays: z.number().default(14),
    shopifyBillingId: z.string().optional(),
});
export const UpdateSubscriptionRequest = z.object({
    planKey: z.string().optional(),
    status: SubscriptionStatus.optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
});
export const RecordUsageRequest = z.object({
    subscriptionId: z.string(),
    metric: UsageMetric,
    quantity: z.number(),
    metadata: z.record(z.any()).optional(),
});
export const CheckEntitlementRequest = z.object({
    organizationId: z.string(),
    feature: z.string(),
    resource: z.string().optional(),
});
