import React, { useState, useEffect } from 'react'
import { Card, Button, Badge, Alert, Spinner } from '@shopify/polaris'

interface Plan {
  id: string
  key: string
  name: string
  description?: string
  price: number
  currency: string
  interval: string
  features: string[]
  limits: Record<string, number>
}

interface Subscription {
  id: string
  status: string
  trialEndsAt?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd: boolean
  plan: Plan
}

interface Usage {
  api_calls: number
  widget_views: number
  stores: number
  users: number
}

export default function PlanPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [plansRes, subscriptionRes, usageRes] = await Promise.all([
        fetch('/api/billing/plans'),
        fetch('/api/billing/subscription'),
        fetch('/api/billing/usage')
      ])

      if (plansRes.ok) {
        const plansData = await plansRes.json()
        setPlans(plansData.plans.map((p: any) => ({
          ...p,
          features: JSON.parse(p.features),
          limits: JSON.parse(p.limits || '{}')
        })))
      }

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json()
        setSubscription({
          ...subData.subscription,
          plan: {
            ...subData.subscription.plan,
            features: JSON.parse(subData.subscription.plan.features),
            limits: JSON.parse(subData.subscription.plan.limits || '{}')
          }
        })
      }

      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsage(usageData.usage)
      }
    } catch (err) {
      setError('Failed to load billing information')
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planKey: string) => {
    try {
      const response = await fetch('/api/billing/shopify/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          shopDomain: window.location.hostname,
          accessToken: 'your-access-token', // This would come from auth context
          trialDays: 14
        })
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.confirmationUrl
      } else {
        setError('Failed to start upgrade process')
      }
    } catch (err) {
      setError('Failed to start upgrade process')
      console.error('Upgrade error:', err)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return
    }

    try {
      const response = await fetch('/api/billing/subscription', {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData()
      } else {
        setError('Failed to cancel subscription')
      }
    } catch (err) {
      setError('Failed to cancel subscription')
      console.error('Cancel error:', err)
    }
  }

  const formatPrice = (price: number, currency: string, interval: string) => {
    if (price === 0) return 'Free'
    return `$${price}/${interval}`
  }

  const getStatusBadge = (status: string) => {
    const statusMap = {
      TRIAL: { status: 'info', children: 'Trial' },
      ACTIVE: { status: 'success', children: 'Active' },
      PAST_DUE: { status: 'warning', children: 'Past Due' },
      CANCELLED: { status: 'critical', children: 'Cancelled' },
      EXPIRED: { status: 'critical', children: 'Expired' }
    }
    return statusMap[status as keyof typeof statusMap] || { status: 'info', children: status }
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.round((current / limit) * 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'critical'
    if (percentage >= 75) return 'warning'
    return 'success'
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <Spinner size="large" />
        <p>Loading billing information...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Billing & Plans</h1>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Alert tone="critical">{error}</Alert>
        </div>
      )}

      {/* Current Subscription */}
      {subscription && (
        <Card sectioned>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h2>Current Plan: {subscription.plan.name}</h2>
              <p>{subscription.plan.description}</p>
            </div>
            <Badge {...getStatusBadge(subscription.status)} />
          </div>

          {subscription.status === 'TRIAL' && subscription.trialEndsAt && (
            <Alert tone="info">
              Trial ends on {new Date(subscription.trialEndsAt).toLocaleDateString()}
            </Alert>
          )}

          {subscription.cancelAtPeriodEnd && (
            <Alert tone="warning">
              Subscription will be cancelled at the end of the current period
            </Alert>
          )}

          <div style={{ marginTop: '1rem' }}>
            <Button onClick={handleCancel} destructive>
              Cancel Subscription
            </Button>
          </div>
        </Card>
      )}

      {/* Usage Summary */}
      {usage && subscription && (
        <Card sectioned>
          <h3>Current Usage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {Object.entries(usage).map(([metric, current]) => {
              const limit = subscription.plan.limits[metric] || 0
              const percentage = getUsagePercentage(current, limit)
              const isUnlimited = limit === -1

              return (
                <div key={metric}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ textTransform: 'capitalize' }}>
                      {metric.replace('_', ' ')}
                    </span>
                    <span>
                      {isUnlimited ? `${current.toLocaleString()}` : `${current.toLocaleString()} / ${limit.toLocaleString()}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: '#e1e3e5', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(percentage, 100)}%`,
                        height: '100%',
                        backgroundColor: percentage >= 90 ? '#d72c0d' : percentage >= 75 ? '#ffc453' : '#008060',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Available Plans */}
      <Card sectioned>
        <h3>Available Plans</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {plans.map((plan) => (
            <Card key={plan.id} sectioned>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h4>{plan.name}</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                  {formatPrice(plan.price, plan.currency, plan.interval)}
                </div>
                <p style={{ color: '#6d7175' }}>{plan.description}</p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '1rem 0' }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{ padding: '0.25rem 0', display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '0.5rem', color: '#008060' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '1rem' }}>
                {subscription?.plan.key === plan.key ? (
                  <Button fullWidth disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    fullWidth 
                    primary={plan.key !== 'STARTER'}
                    onClick={() => handleUpgrade(plan.key)}
                  >
                    {plan.key === 'STARTER' ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}