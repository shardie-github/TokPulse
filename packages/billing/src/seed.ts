import type { PrismaClient } from '@tokpulse/db';

export async function seedBillingData(db: PrismaClient) {
  // Create default plans
  const plans = [
    {
      key: 'STARTER',
      name: 'Starter',
      description: 'Perfect for small stores getting started',
      price: 0,
      currency: 'USD',
      interval: 'month',
      features: [
        'Core dashboard',
        'Basic analytics',
        'Email support (48h)',
        '1 store',
        '1,000 API calls/month',
        '10,000 widget views/month',
      ],
      limits: {
        stores: 1,
        api_calls: 1000,
        widget_views: 10000,
        users: 1,
      },
    },
    {
      key: 'GROWTH',
      name: 'Growth',
      description: 'For growing businesses that need more power',
      price: 29,
      currency: 'USD',
      interval: 'month',
      features: [
        'Advanced analytics',
        'A/B testing',
        'Priority support (24h)',
        'Export data',
        '3 stores',
        '10,000 API calls/month',
        '100,000 widget views/month',
        'Team collaboration',
      ],
      limits: {
        stores: 3,
        api_calls: 10000,
        widget_views: 100000,
        users: 5,
      },
    },
    {
      key: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'For large organizations with complex needs',
      price: 99,
      currency: 'USD',
      interval: 'month',
      features: [
        'Everything in Growth',
        'Unlimited stores',
        'Unlimited API calls',
        'Unlimited widget views',
        'SLA support (4h)',
        'Webhooks & API access',
        'Custom integrations',
        'Dedicated account manager',
      ],
      limits: {
        stores: -1, // -1 means unlimited
        api_calls: -1,
        widget_views: -1,
        users: -1,
      },
    },
  ];

  for (const planData of plans) {
    await db.plan.upsert({
      where: { key: planData.key },
      update: planData,
      create: {
        ...planData,
        features: JSON.stringify(planData.features),
        limits: JSON.stringify(planData.limits),
      },
    });
  }

  console.log('✅ Billing plans seeded');
}
