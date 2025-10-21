# TokPulse - Enterprise Multi-Store Shopify App

TokPulse is an enterprise, multi-store Shopify app that supports two first-class surfaces:

1. **Headless storefront** (Hydrogen/Remix) for larger merchants
2. **Shopify Online Store 2.0** via Theme App Extensions for Shopify Basic merchants

## Architecture

This is a monorepo built with:

- **pnpm** for package management
- **Turborepo** for build orchestration
- **TypeScript** with strict mode
- **Prisma** with WASM engine for database operations
- **Supabase** PostgreSQL for data storage
- **Shopify API** for store integration

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Supabase account (or PostgreSQL database)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tokpulse
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
pnpm db:push
pnpm db:seed
```

5. Start development:
```bash
pnpm dev
```

## Project Structure

```
tokpulse/
├── apps/
│   ├── partner-app/          # Shopify app (OAuth, billing, Admin API)
│   ├── web-hydrogen/         # Hydrogen headless storefront
│   └── edge-worker/          # Edge functions
├── packages/
│   ├── theme-ext/            # Theme App Extension (blocks/sections)
│   ├── shared/               # Shared types, validation, utilities
│   ├── db/                   # Prisma schema and client
│   ├── api/                  # API handlers and business logic
│   ├── jobs/                 # Background jobs and webhooks
│   └── ui/                   # React components and design system
└── docs/                     # Documentation
```

## Development

### Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Run ESLint on all packages
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run all tests
- `pnpm db:push` - Push Prisma schema to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with test data
- `pnpm db:studio` - Open Prisma Studio

### Environment Variables

See `.env.example` for required environment variables:

- `SHOPIFY_API_KEY` - Your Shopify app API key
- `SHOPIFY_API_SECRET` - Your Shopify app secret
- `SHOPIFY_SCOPES` - Required Shopify scopes
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string (for queues)

## Features

### Multi-Store Support

- Single control plane for multiple Shopify stores
- Organization-level user management
- Store-specific configurations and data isolation

### Headless Integration

- Hydrogen/Remix routes for product recommendations
- Server-side rendering with streaming
- Edge caching and optimization

### Theme App Extensions

- Native Shopify 2.0 app blocks
- No theme file modifications required
- Progressive enhancement with JavaScript

### Data Pipeline

- Product catalog synchronization
- Order and customer data ingestion
- Attribution tracking and analytics
- A/B testing framework

### Webhooks

- Idempotent webhook processing
- Retry logic with exponential backoff
- Dead letter queue for failed events
- GDPR compliance with data deletion

## API Endpoints

### Partner App (`/auth`, `/webhooks`, `/api`)

- `GET /auth/callback` - OAuth callback
- `POST /webhooks/*` - Shopify webhooks
- `GET /api/stores/:shopDomain` - Store information
- `GET /api/stores/:shopDomain/catalog` - Product catalog

### Widget API (`/api/widgets`)

- `GET /api/widgets/recommendations` - Product recommendations
- `POST /api/analytics/track` - Event tracking

## Theme App Extension

The extension provides several app blocks:

1. **Product Recommendations** - Shows related products
2. **Collection Badges** - Displays ratings and promo flags
3. **Sticky CTA** - Utility block for sticky call-to-actions
4. **Global Bootstrap** - Lightweight JavaScript loader

### Installation

1. Package the extension:
```bash
cd packages/theme-ext
zip -r tokpulse-extension.zip .
```

2. Upload to Shopify Partners dashboard
3. Install on merchant stores

## Database Schema

### Core Models

- `Organization` - Customer/tenant
- `User` - User accounts with roles
- `Store` - Shopify store connections
- `CatalogItem` - Normalized product data
- `PixelEvent` - Analytics events
- `Attribution` - Order attribution data
- `Experiment` - A/B test configurations
- `Job` - Background job queue
- `WebhookEvent` - Webhook processing log

### Multi-Tenancy

All queries are scoped by organization. Row-level security policies ensure data isolation between tenants.

## Deployment

### Partner App

Deploy to your preferred platform (Railway, Heroku, etc.):

```bash
pnpm build
# Deploy apps/partner-app/dist
```

### Hydrogen App

Deploy to Shopify Oxygen or Vercel:

```bash
pnpm build
# Deploy apps/web-hydrogen/dist
```

### Theme Extension

Package and upload to Shopify Partners:

```bash
cd packages/theme-ext
zip -r tokpulse-extension.zip .
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @tokpulse/db test

# Run e2e tests
pnpm test:e2e
```

## Quality Gates

- TypeScript coverage ≥ 95%
- ESLint with zero warnings
- All tests passing
- Lighthouse performance budgets met
- Bundle size limits enforced

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run quality checks: `pnpm quality:check`
6. Submit a pull request

## License

Private - All rights reserved

## Support

For support, please contact the development team or create an issue in the repository.