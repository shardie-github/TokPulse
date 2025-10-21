# TokPulse API Documentation

## Overview

The TokPulse API provides comprehensive endpoints for managing multi-store Shopify applications, billing, analytics, and experiments. All API endpoints are RESTful and return JSON responses.

## Base URL

```
https://api.tokpulse.com/v1
```

## Authentication

All API requests require authentication using a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-access-token>
```

### Getting an Access Token

1. **OAuth Flow**: Use the Shopify OAuth flow to get an access token
2. **API Key**: Generate an API key from your dashboard settings
3. **JWT Token**: Use JWT tokens for service-to-service communication

## Rate Limiting

API requests are rate limited to:
- **Free Plan**: 100 requests per 15 minutes
- **Growth Plan**: 1,000 requests per 15 minutes
- **Enterprise Plan**: 10,000 requests per 15 minutes

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `QUOTA_EXCEEDED` | 429 | Rate limit exceeded |
| `SUBSCRIPTION_REQUIRED` | 402 | Subscription required |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Endpoints

### Organizations

#### Get Organization
```http
GET /organizations/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "org_123",
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "domain": "acme.com",
    "status": "ACTIVE",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update Organization
```http
PUT /organizations/{id}
```

**Request Body:**
```json
{
  "name": "New Company Name",
  "email": "new@company.com"
}
```

### Stores

#### List Stores
```http
GET /stores
```

**Query Parameters:**
- `limit` (optional): Number of stores to return (default: 20, max: 100)
- `offset` (optional): Number of stores to skip (default: 0)
- `status` (optional): Filter by status (ACTIVE, SUSPENDED, UNINSTALLED)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "store_123",
      "shopDomain": "acme.myshopify.com",
      "status": "ACTIVE",
      "region": "us",
      "lastSyncAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Get Store
```http
GET /stores/{id}
```

#### Create Store
```http
POST /stores
```

**Request Body:**
```json
{
  "shopDomain": "new-store.myshopify.com",
  "accessToken": "shpat_...",
  "scopes": "read_products,read_orders",
  "region": "us"
}
```

#### Update Store
```http
PUT /stores/{id}
```

#### Delete Store
```http
DELETE /stores/{id}
```

### Billing

#### Get Plans
```http
GET /billing/plans
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_123",
      "key": "STARTER",
      "name": "Starter Plan",
      "description": "Perfect for small stores",
      "price": 0,
      "currency": "USD",
      "interval": "month",
      "features": ["basic_analytics", "product_recommendations"],
      "limits": {
        "api_calls": 1000,
        "stores": 1
      }
    }
  ]
}
```

#### Get Subscription
```http
GET /billing/subscription
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sub_123",
    "status": "ACTIVE",
    "plan": {
      "id": "plan_123",
      "name": "Growth Plan",
      "price": 29.99
    },
    "trialEndsAt": null,
    "currentPeriodEnd": "2024-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  }
}
```

#### Create Subscription
```http
POST /billing/subscription
```

**Request Body:**
```json
{
  "planKey": "GROWTH",
  "trialDays": 14
}
```

#### Update Subscription
```http
PUT /billing/subscription
```

**Request Body:**
```json
{
  "planKey": "ENTERPRISE",
  "cancelAtPeriodEnd": false
}
```

#### Cancel Subscription
```http
DELETE /billing/subscription
```

#### Get Usage
```http
GET /billing/usage
```

**Response:**
```json
{
  "success": true,
  "data": {
    "API_CALLS": 150,
    "WIDGET_VIEWS": 2500,
    "STORES": 1,
    "USERS": 3
  }
}
```

#### Record Usage
```http
POST /billing/usage
```

**Request Body:**
```json
{
  "metric": "API_CALLS",
  "quantity": 1,
  "metadata": {
    "endpoint": "/api/products",
    "responseTime": 150
  }
}
```

#### Check Entitlement
```http
POST /billing/entitlement
```

**Request Body:**
```json
{
  "feature": "advanced_analytics",
  "resource": "dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasAccess": true
  }
}
```

### Analytics

#### Track Event
```http
POST /analytics/track
```

**Request Body:**
```json
{
  "eventType": "product_view",
  "eventData": {
    "productId": "prod_123",
    "category": "electronics",
    "price": 99.99
  },
  "storeId": "store_123"
}
```

#### Get Analytics
```http
GET /analytics
```

**Query Parameters:**
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `metrics` (optional): Comma-separated list of metrics
- `groupBy` (optional): Group by day, week, or month (default: day)

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "page_views": 1500,
      "conversions": 45,
      "revenue": 4500.00
    },
    "timeSeries": [
      {
        "date": "2024-01-01",
        "page_views": 100,
        "conversions": 3,
        "revenue": 300.00
      }
    ]
  }
}
```

### Recommendations

#### Get Recommendations
```http
GET /recommendations
```

**Query Parameters:**
- `productId` (optional): Product ID to get recommendations for
- `category` (optional): Product category
- `limit` (optional): Number of recommendations (default: 10, max: 50)
- `algorithm` (optional): Recommendation algorithm (collaborative, content-based, hybrid)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "productId": "prod_456",
      "title": "Related Product",
      "price": 79.99,
      "score": 0.85,
      "reason": "Frequently bought together"
    }
  ]
}
```

### Experiments

#### List Experiments
```http
GET /experiments
```

#### Create Experiment
```http
POST /experiments
```

**Request Body:**
```json
{
  "key": "checkout_button_color",
  "name": "Checkout Button Color Test",
  "description": "Test different button colors for checkout",
  "storeId": "store_123",
  "allocation": 50,
  "variants": [
    {
      "key": "blue",
      "name": "Blue Button",
      "weight": 50,
      "config": {
        "buttonColor": "#007bff"
      }
    }
  ]
}
```

#### Get Experiment
```http
GET /experiments/{id}
```

#### Update Experiment
```http
PUT /experiments/{id}
```

#### Delete Experiment
```http
DELETE /experiments/{id}
```

#### Get Experiment Results
```http
GET /experiments/{id}/results
```

**Response:**
```json
{
  "success": true,
  "data": {
    "experimentId": "exp_123",
    "status": "RUNNING",
    "variants": [
      {
        "key": "blue",
        "name": "Blue Button",
        "participants": 1000,
        "conversions": 45,
        "conversionRate": 0.045,
        "confidence": 0.95
      }
    ],
    "winner": "blue",
    "isSignificant": true
  }
}
```

## Webhooks

### Shopify Webhooks

TokPulse automatically handles Shopify webhooks for:
- `app/uninstalled`
- `orders/create`
- `orders/updated`
- `orders/paid`
- `products/create`
- `products/update`
- `products/delete`

### Stripe Webhooks

TokPulse handles Stripe webhooks for:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Webhook Security

All webhooks are verified using signatures:
- **Shopify**: HMAC-SHA256 signature verification
- **Stripe**: Stripe signature verification

## SDKs

### JavaScript/TypeScript
```bash
npm install @tokpulse/sdk
```

```typescript
import { TokPulseClient } from '@tokpulse/sdk'

const client = new TokPulseClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.tokpulse.com/v1'
})

// Get recommendations
const recommendations = await client.recommendations.get({
  productId: 'prod_123',
  limit: 10
})
```

### Python
```bash
pip install tokpulse-sdk
```

```python
from tokpulse import TokPulseClient

client = TokPulseClient(
    api_key='your-api-key',
    base_url='https://api.tokpulse.com/v1'
)

# Track event
client.analytics.track({
    'event_type': 'product_view',
    'event_data': {
        'product_id': 'prod_123',
        'category': 'electronics'
    },
    'store_id': 'store_123'
})
```

## Changelog

### v2.2.0 (2024-01-15)
- Added experiment management endpoints
- Enhanced analytics with time series data
- Improved error handling and validation
- Added webhook signature verification

### v2.1.0 (2024-01-01)
- Added billing and subscription management
- Implemented usage tracking and quotas
- Enhanced security with JWT tokens
- Added comprehensive error codes

### v2.0.0 (2023-12-01)
- Complete API redesign
- Added multi-store support
- Implemented organization-based access control
- Added comprehensive documentation

## Support

For API support and questions:
- **Email**: api-support@tokpulse.com
- **Documentation**: https://docs.tokpulse.com
- **Status Page**: https://status.tokpulse.com