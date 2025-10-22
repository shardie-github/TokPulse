# Build & Test Guide

This guide covers how to run the development, testing, and build processes for the TokPulse project.

## Prerequisites

- Node.js >= 20
- pnpm >= 8
- Git

## Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

This will start the development server on `http://localhost:5173` (dashboard) and other services in parallel.

### 3. TypeScript Type Checking

```bash
pnpm typecheck
```

Runs strict TypeScript checking across the entire project.

### 4. Linting & Formatting

```bash
# Fix linting issues
pnpm lint

# Format code
pnpm format
```

### 5. Unit Testing

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### 6. E2E Testing (Local)

```bash
# Install Playwright browsers
pnpm e2e:install

# Run E2E tests against local dev server
PREVIEW_URL=http://localhost:5173 pnpm e2e

# Run E2E tests with UI
pnpm e2e:ui
```

### 7. Production Build

```bash
pnpm build
```

### 8. Preview Production Build

```bash
pnpm preview
```

## Testing & CI

### Unit Tests (Vitest)

- **Framework**: Vitest with jsdom environment
- **Coverage**: V8 provider with text and lcov reports
- **Location**: `packages/dashboard/src/__tests__/`
- **Setup**: `vitest.setup.ts` with testing-library/jest-dom

### E2E Tests (Playwright)

- **Framework**: Playwright
- **Browsers**: Chromium, WebKit, Firefox
- **Location**: `e2e/` directory
- **Configuration**: `playwright.config.ts`

### CI Pipeline

1. **Type Check**: `pnpm typecheck`
2. **Lint**: `pnpm lint`
3. **Unit Tests**: `pnpm test`
4. **Build**: `pnpm build`

## Troubleshooting

### Node.js Version Issues

Ensure you're using Node.js 20 or higher:

```bash
node --version  # Should be >= 20
```

### pnpm Issues

If you encounter pnpm issues, try:

```bash
# Clear pnpm cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Playwright Browser Issues

If Playwright browsers aren't installed:

```bash
pnpm e2e:install
```

### TypeScript Errors

For strict TypeScript errors:

1. Check `tsconfig.json` configuration
2. Ensure all imports use proper type imports
3. Fix any `any` types (warnings in ESLint)

### Vite Build Issues

If Vite build fails:

1. Check for circular dependencies
2. Ensure all imports are properly typed
3. Verify environment variables are prefixed with `VITE_`

## Environment Variables

### Development

Create `.env.local` for local development:

```bash
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=TokPulse
```

### Vercel Deployment

Set environment variables in Vercel dashboard:

- Go to Project Settings → Environment Variables
- Add variables with `VITE_` prefix for client-side access

## Project Structure

```
packages/dashboard/     # Main Vite + React app
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── lib/           # Utility functions
│   ├── state/         # State management
│   └── __tests__/     # Unit tests
e2e/                   # E2E tests
├── smoke.spec.ts      # Basic smoke tests
.github/workflows/     # CI/CD workflows
├── ci.yml            # Unit tests & build
└── preview-e2e.yml   # E2E tests on preview
```

## Performance

### Bundle Analysis

```bash
# Analyze bundle size
pnpm build --mode analyze
```

### Performance Budgets

The project includes performance budget checks in the dashboard package.

## Quality Gates

All code must pass:

1. ✅ TypeScript strict mode
2. ✅ ESLint rules (no errors)
3. ✅ Prettier formatting
4. ✅ Unit test coverage
5. ✅ E2E test suite
6. ✅ Production build success

## Getting Help

- Check the [Vercel CI E2E Guide](./VERCEL_CI_E2E_GUIDE.md) for deployment issues
- Review GitHub Actions logs for CI failures
- Check Playwright reports in `playwright-report/` for E2E failures
