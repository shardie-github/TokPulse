import {
  Card,
  Button,
  Badge,
  Spinner,
  ProgressBar,
  Text,
  Stack,
  InlineStack,
  BlockStack,
  Icon,
  Banner,
} from '@shopify/polaris';
import { CheckIcon, StarIcon, AlertTriangleIcon, CreditCardIcon } from '@shopify/polaris-icons';
import React, { useState, useEffect } from 'react';

interface Plan {
  id: string;
  key: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  limits: Record<string, number>;
}

interface Subscription {
  id: string;
  status: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

interface Usage {
  api_calls: number;
  widget_views: number;
  stores: number;
  users: number;
}

export default function PlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showBillingPortal, setShowBillingPortal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansRes, subscriptionRes, usageRes] = await Promise.all([
        fetch('/api/billing/plans'),
        fetch('/api/billing/subscription'),
        fetch('/api/billing/usage'),
      ]);

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(
          plansData.plans.map((p: any) => ({
            ...p,
            features: JSON.parse(p.features),
            limits: JSON.parse(p.limits || '{}'),
          })),
        );
      }

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        setSubscription({
          ...subData.subscription,
          plan: {
            ...subData.subscription.plan,
            features: JSON.parse(subData.subscription.plan.features),
            limits: JSON.parse(subData.subscription.plan.limits || '{}'),
          },
        });
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData.usage);
      }
    } catch (err) {
      setError('Failed to load billing information');
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planKey: string) => {
    try {
      setUpgrading(planKey);
      setError(null);

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start upgrade process');
      }
    } catch (err) {
      setError('Failed to start upgrade process');
      console.error('Upgrade error:', err);
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.',
      )
    ) {
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/billing/subscription', {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadData();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      setError('Failed to cancel subscription');
      console.error('Cancel error:', err);
    }
  };

  const handleManageBilling = async () => {
    try {
      setError(null);
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to open billing portal');
      }
    } catch (err) {
      setError('Failed to open billing portal');
      console.error('Billing portal error:', err);
    }
  };

  const formatPrice = (price: number, currency: string, interval: string) => {
    if (price === 0) return 'Free';
    return `$${price}/${interval}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      TRIAL: { status: 'info', children: 'Trial' },
      ACTIVE: { status: 'success', children: 'Active' },
      PAST_DUE: { status: 'warning', children: 'Past Due' },
      CANCELLED: { status: 'critical', children: 'Cancelled' },
      EXPIRED: { status: 'critical', children: 'Expired' },
    };
    return statusMap[status as keyof typeof statusMap] || { status: 'info', children: status };
  };

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.round((current / limit) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spinner size="large" />
        <p>Loading billing information...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Stack vertical spacing="loose">
        <BlockStack spacing="tight">
          <Text variant="headingXl" as="h1">
            Billing & Plans
          </Text>
          <Text variant="bodyMd" color="subdued">
            Manage your subscription and billing preferences
          </Text>
        </BlockStack>

        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        {/* Current Subscription */}
        {subscription && (
          <Card>
            <BlockStack spacing="loose">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack spacing="tight">
                  <InlineStack spacing="tight" blockAlign="center">
                    <Text variant="headingLg" as="h2">
                      {subscription.plan.name}
                    </Text>
                    <Badge {...getStatusBadge(subscription.status)} />
                  </InlineStack>
                  <Text variant="bodyMd" color="subdued">
                    {subscription.plan.description}
                  </Text>
                </BlockStack>
                <InlineStack spacing="tight">
                  <Button onClick={handleManageBilling} icon={CreditCardIcon}>
                    Manage Billing
                  </Button>
                  <Button onClick={handleCancel} destructive>
                    Cancel Plan
                  </Button>
                </InlineStack>
              </InlineStack>

              {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
                <Banner tone="info" icon={StarIcon}>
                  <Text variant="bodyMd">
                    Your trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}.
                    Upgrade now to continue using premium features.
                  </Text>
                </Banner>
              )}

              {subscription.cancelAtPeriodEnd && (
                <Banner tone="warning" icon={AlertTriangleIcon}>
                  <Text variant="bodyMd">
                    Your subscription will be cancelled at the end of the current billing period on{' '}
                    {subscription.currentPeriodEnd &&
                      new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    .
                  </Text>
                </Banner>
              )}
            </BlockStack>
          </Card>
        )}

        {/* Usage Summary */}
        {usage && subscription && (
          <Card>
            <BlockStack spacing="loose">
              <Text variant="headingMd" as="h3">
                Current Usage
              </Text>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {Object.entries(usage).map(([metric, current]) => {
                  const limit = subscription.plan.limits[metric] || 0;
                  const percentage = getUsagePercentage(current, limit);
                  const isUnlimited = limit === -1;

                  return (
                    <Card key={metric} sectioned>
                      <BlockStack spacing="tight">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="bodyMd" fontWeight="medium">
                            {metric.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Text>
                          <Text variant="bodyMd" color="subdued">
                            {isUnlimited
                              ? `${current.toLocaleString()}`
                              : `${current.toLocaleString()} / ${limit.toLocaleString()}`}
                          </Text>
                        </InlineStack>
                        {!isUnlimited && (
                          <ProgressBar
                            progress={Math.min(percentage, 100)}
                            color={
                              getUsageColor(percentage) === 'critical'
                                ? 'critical'
                                : getUsageColor(percentage) === 'warning'
                                  ? 'warning'
                                  : 'success'
                            }
                          />
                        )}
                        {!isUnlimited && percentage >= 90 && (
                          <Text variant="bodySm" color="critical">
                            Approaching limit
                          </Text>
                        )}
                      </BlockStack>
                    </Card>
                  );
                })}
              </div>
            </BlockStack>
          </Card>
        )}

        {/* Available Plans */}
        <Card>
          <BlockStack spacing="loose">
            <Text variant="headingMd" as="h3">
              Available Plans
            </Text>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {plans.map((plan) => (
                <Card key={plan.id} sectioned>
                  <BlockStack spacing="loose">
                    <BlockStack spacing="tight" align="center">
                      <Text variant="headingMd" as="h4">
                        {plan.name}
                      </Text>
                      <Text variant="heading2xl" as="p" fontWeight="bold">
                        {formatPrice(plan.price, plan.currency, plan.interval)}
                      </Text>
                      <Text variant="bodyMd" color="subdued" alignment="center">
                        {plan.description}
                      </Text>
                    </BlockStack>

                    <BlockStack spacing="tight">
                      {plan.features.map((feature, index) => (
                        <InlineStack key={index} spacing="tight" blockAlign="center">
                          <Icon source={CheckIcon} tone="success" />
                          <Text variant="bodyMd">{feature}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>

                    <div style={{ marginTop: 'auto' }}>
                      {subscription?.plan.key === plan.key ? (
                        <Button fullWidth disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          primary={plan.key !== 'STARTER'}
                          loading={upgrading === plan.key}
                          onClick={() => handleUpgrade(plan.key)}
                        >
                          {plan.key === 'STARTER' ? 'Downgrade' : 'Upgrade to ' + plan.name}
                        </Button>
                      )}
                    </div>
                  </BlockStack>
                </Card>
              ))}
            </div>
          </BlockStack>
        </Card>
      </Stack>
    </div>
  );
}
