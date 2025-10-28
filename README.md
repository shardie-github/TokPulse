# TokPulse - Enterprise Multi-Store Shopify App

TokPulse is an enterprise, multi-store Shopify app that supports two first-class surfaces:

1. **Headless storefront** (Hydrogen/Remix) for larger merchants
2. **Shopify Online Store 2.0** via Theme App Extensions for Shopify Basic merchants

## 🤖 AI-Driven Self-Maintenance

**TokPulse now features comprehensive AI automation for self-diagnosis, optimization, and future-runtime readiness.**

### Key AI Features

- ✅ **Self-Diagnosis**: Monitors CI logs, latency, and errors 24/7 → auto-creates GitHub Issues
- ✅ **Cost Tracking**: Predicts monthly spend and alerts on budget deviations (>20%)
- ✅ **Semantic Search**: Vector embeddings for docs/code with hybrid search
- ✅ **Privacy Guard**: Automatic PII redaction (GDPR/CCPA compliant)
- ✅ **Future-Ready**: Validated for Vercel Edge, WASM, Workers, Hydrogen/Oxygen
- ✅ **Autonomous Watchers**: Nightly integrity checks for DB, API contracts, AI performance

### Quick AI Commands

```bash
pnpm ai:diagnose      # System health check
pnpm ai:insights      # GPT-4 powered analysis
pnpm ai:cost          # Cost projection & alerts
pnpm futurecheck      # Runtime compatibility check
pnpm ai:embeddings    # Generate semantic embeddings
pnpm watchers:all     # Run all integrity watchers
```

### Documentation

- 📖 [AI Automation Architecture](docs/AI_AUTOMATION_README.md)
- 🔒 [AI Compliance & Privacy](docs/AI_COMPLIANCE.md)
- 🌱 [Sustainability & Cost](docs/SUSTAINABILITY.md)
- 🚀 [Deployment Summary](AI_DEPLOYMENT_SUMMARY.md)

---

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

## Testing & CI

### Unit Testing (Vitest)

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test --coverage
```

### E2E Testing (Playwright)

```bash
# Install Playwright browsers
pnpm e2e:install

# Run E2E tests locally
pnpm e2e

# Run E2E tests with UI
pnpm e2e:ui

# Run E2E against specific URL
PREVIEW_URL=https://your-preview-url.vercel.app pnpm e2e
```

### Type Checking & Linting

```bash
# TypeScript type checking
pnpm typecheck

# ESLint linting
pnpm lint

# Prettier formatting
pnpm format
```

### CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs on every push and PR
   - TypeScript type checking
   - ESLint linting
   - Vitest unit tests
   - Vite production build

2. **Preview E2E Workflow** (`.github/workflows/preview-e2e.yml`)
   - Runs on PRs only
   - Deploys to Vercel preview
   - Runs Playwright E2E tests
   - Comments preview URL on PR

### Required Secrets

For the E2E workflow to work, set these GitHub secrets:

- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

See [VERCEL_CI_E2E_GUIDE.md](./VERCEL_CI_E2E_GUIDE.md) for detailed setup instructions.

### Quality Gates

- ✅ TypeScript strict mode (no errors)
- ✅ ESLint rules (no errors)
- ✅ Prettier formatting
- ✅ Unit test coverage
- ✅ E2E test suite
- ✅ Production build success

### Documentation

- [Build & Test Guide](./BUILD_TEST_GUIDE.md) - Local development and testing
- [Vercel CI E2E Guide](./VERCEL_CI_E2E_GUIDE.md) - CI/CD and deployment setup

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run quality checks: `pnpm quality:check`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Submit a pull request

### Development Workflow

- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)
- Use conventional commits for commit messages
- Ensure all tests pass before submitting
- Update documentation for new features
- Add appropriate type annotations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: hardoniastore@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/tokpulse/issues)
- 📖 Documentation: [docs/](docs/)
- 🔒 Security: [SECURITY.md](SECURITY.md)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.
