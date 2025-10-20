# TokPulse Technical Inventory

## Project Overview
**TokPulse** - A multi-platform analytics dashboard for e-commerce with Shopify and Wix integrations, built with React/TypeScript and microservices architecture.

## Tech Surface

### Frontend Stack
- **Framework**: React 18.3.1 + TypeScript 5.6.3
- **Build Tool**: Vite 5.4.8
- **Styling**: Tailwind CSS 3.4.14 + PostCSS + Autoprefixer
- **State Management**: Zustand 4.5.4
- **Charts**: Recharts 2.12.7
- **Animations**: Framer Motion 11.3.31
- **Icons**: Lucide React 0.454.0
- **HTTP Client**: Axios 1.7.7
- **Utilities**: clsx 2.1.1, dayjs 1.11.13

### Backend Services (Microservices)
- **Runtime**: Node.js 20+ (Alpine Linux containers)
- **Architecture**: Docker Compose with Caddy reverse proxy
- **Services**:
  - `dashboard-server` (Port 4173) - Serves static dashboard
  - `support` (Port 3002) - Support/help desk service
  - `billing` (Port 3003) - Stripe integration for payments
  - `shopify` (Port 3004) - Shopify app integration
  - `meta` (Port 3001) - Meta/Facebook webhook handler
  - `analytics` - Analytics data processing
  - `flags` - Feature flag management
  - `mailer` - Email service

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (with security headers)
- **Deployment**: Netlify (configured), Vercel (hooks ready)
- **CI/CD**: GitHub Actions (13 workflows)
- **Security**: CodeQL, Trivy, npm audit

### Data Layer
- **File-based**: JSON files for reports (`packages/data/last-report.json`)
- **Encryption**: Custom KMS key system (`TOKPULSE_KMS_KEY`)
- **Caching**: In-memory (no Redis/Memcached detected)

### Third-Party Integrations
- **Payments**: Stripe (Checkout, Customer Portal, Webhooks)
- **E-commerce**: Shopify (API, Theme, Snippets)
- **Platform**: Wix (Velo app)
- **Analytics**: Meta/Facebook (Webhooks, Business API)
- **Social**: TikTok, Meta, LinkedIn pixels (planned)

## Build Graph

### Entry Points
- **Dashboard**: `packages/dashboard/src/main.tsx` → `index.html`
- **API Routes**: 
  - `/api/report` (dashboard-server)
  - `/api/support/*` (support service)
  - `/api/billing/*` (billing service)
  - `/api/shopify/*` (shopify service)
  - `/webhook` (meta service)

### Build Process
1. **Dashboard**: `vite build` → `dist/` folder
2. **Services**: Docker build → Alpine containers
3. **Deployment**: Netlify/Vercel hooks for static, Docker for services

### Dependencies
- **Production**: 7 packages (React ecosystem + charts)
- **Development**: 8 packages (TypeScript, Vite, Tailwind, PostCSS)
- **Root**: 4 packages (ESLint, Prettier, cspell, markdownlint)

## API Surface

### Public APIs
- `GET /api/report` - Dashboard data (ReportV1 schema)
- `GET /healthz` - Health check
- `POST /webhook` - Meta webhook handler

### Internal APIs
- Support service endpoints
- Billing service (Stripe integration)
- Shopify app endpoints

### Webhooks
- **Stripe**: `checkout.session.completed`, `customer.subscription.updated`
- **Meta**: Business webhook verification
- **Shopify**: App installation/updates

## Security Surface

### Authentication
- **Current**: None (public dashboard)
- **Planned**: License-based access (`private/license.json`)

### Authorization
- **Feature Flags**: `private/flags.json` (welcome_nux, referrals, xp_quests, pro_panel)
- **License System**: Pro features gated by license file

### Security Headers (Caddy)
- `Strict-Transport-Security`: 1 year + preload
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `Referrer-Policy`: no-referrer
- `Permissions-Policy`: Geolocation, microphone, camera disabled
- `Content-Security-Policy`: Restrictive with Stripe allowlist

### Input Validation
- **Current**: Basic (needs enhancement)
- **Planned**: Zod schemas for API validation

### Secrets Management
- **Environment Variables**: `.env.example` templates
- **Encryption**: Custom KMS key system
- **Storage**: File-based (needs improvement)

## Observability Surface

### Logging
- **Format**: JSONL (`var/log/meta.jsonl`)
- **Levels**: info, debug (configurable)
- **Storage**: File-based (no centralized logging)

### Monitoring
- **Health Checks**: `/healthz` endpoint
- **Uptime**: GitHub Actions uptime workflow
- **Security**: CodeQL, Trivy scans

### Metrics
- **Current**: None (needs implementation)
- **Planned**: Performance budgets, error tracking

## Growth/Monetization Surface

### Pricing
- **Model**: Freemium (trial → pro)
- **Integration**: Stripe Checkout + Customer Portal
- **Features**: Gated by license file

### Lead Capture
- **Current**: None (needs implementation)
- **Planned**: Newsletter, gated downloads, CRM sync

### Analytics
- **Current**: Basic dashboard metrics
- **Planned**: GA4, TikTok, Meta, LinkedIn pixels

### Conversion Tracking
- **UTM Handling**: Planned
- **Attribution**: Not implemented
- **A/B Testing**: Feature flags ready

## Performance Surface

### Bundle Analysis
- **Chunking**: Manual chunks for React, charts, motion, state, icons
- **Size Limit**: 1024KB warning threshold
- **Optimization**: Lazy loading for heavy components

### Caching
- **Static Assets**: Caddy compression (zstd, gzip)
- **API**: No caching strategy
- **CDN**: Not configured

### Performance Budgets
- **Current**: None (needs implementation)
- **Target**: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms, TTFB ≤ 0.8s

## Accessibility Surface

### Current State
- **WCAG Compliance**: Not assessed
- **Keyboard Navigation**: Basic (needs audit)
- **Screen Readers**: Not tested
- **Color Contrast**: Not verified

### Planned Improvements
- WCAG 2.2 AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast validation

## Internationalization Surface

### Current State
- **i18n**: Not implemented
- **Locale**: English only
- **RTL**: Not supported

### Planned
- i18n scaffolding
- Multi-locale support
- RTL language support

## SEO Surface

### Current State
- **Meta Tags**: Basic (title only)
- **Structured Data**: Not implemented
- **Sitemap**: Static (`docs/site/sitemap.xml`)
- **Robots**: Basic (`docs/site/robots.txt`)

### Planned
- Open Graph tags
- Twitter cards
- JSON-LD structured data
- Dynamic sitemap generation