# Vercel CI E2E Guide

This guide explains how the GitHub Actions workflows operate for continuous integration and end-to-end testing with Vercel preview deployments.

## Overview

The project uses two main GitHub Actions workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on every push and PR
2. **Preview E2E Workflow** (`.github/workflows/preview-e2e.yml`) - Runs on PRs only

## Required Secrets

Before the workflows can run, you need to set up the following secrets in your GitHub repository:

### 1. VERCEL_TOKEN

- **Type**: Personal Access Token or Team Token
- **How to get**:
  1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
  2. Go to Settings → Tokens
  3. Create a new token with appropriate permissions
- **Permissions needed**: Deploy, read project info

### 2. VERCEL_ORG_ID

- **Type**: Organization/Team ID
- **How to get**:
  1. Go to your Vercel project settings
  2. Look for "Project ID" or "Team ID" in the general settings
  3. Or use: `npx vercel teams list` to find your team ID

### 3. VERCEL_PROJECT_ID

- **Type**: Project ID
- **How to get**:
  1. Go to your Vercel project settings
  2. Find "Project ID" in the general settings
  3. Or use: `npx vercel project ls` to list projects

### Setting Up Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with the exact names above

## Workflow Details

### CI Workflow (ci.yml)

**Triggers:**

- Push to `main` branch
- Pull requests

**Steps:**

1. Checkout code
2. Setup pnpm (version 9)
3. Setup Node.js (version 20)
4. Install dependencies with frozen lockfile
5. Run quality checks: `pnpm ci:unit`
   - TypeScript type checking
   - ESLint linting
   - Vitest unit tests
   - Vite production build

**Duration:** ~2-3 minutes

### Preview E2E Workflow (preview-e2e.yml)

**Triggers:**

- Pull requests only

**Steps:**

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Build the application
5. Pull Vercel environment variables
6. Deploy to Vercel preview
7. Install Playwright browsers
8. Run E2E tests against preview URL
9. Comment preview URL on PR

**Duration:** ~5-8 minutes

## How Preview Deployments Work

### 1. Prebuilt Deployment

The workflow uses `--prebuilt` flag for faster deployments:

- Build happens once in CI
- Vercel just serves the pre-built files
- Reduces deployment time significantly

### 2. Environment Variables

The workflow pulls preview environment variables:

```bash
npx vercel pull --yes --environment=preview --token=$VERCEL_TOKEN
```

This creates `.vercel/.env.preview.local` with your preview environment variables.

### 3. Preview URL

The deployed URL is automatically set as `PREVIEW_URL` environment variable for Playwright tests.

## E2E Test Execution

### Test Configuration

- **Timeout**: 60 seconds per test
- **Retries**: 2 retries in CI, 0 locally
- **Browsers**: Chromium, WebKit, Firefox
- **Reports**: HTML report generated in `playwright-report/`

### Test Artifacts

On test failure, the workflow captures:

- Screenshots (only on failure)
- Video recordings (only on failure)
- Trace files (only on failure)

### Viewing Test Results

1. **Success**: Check the PR comment for preview URL
2. **Failure**:
   - Check GitHub Actions logs
   - Download artifacts from the workflow run
   - Look for `playwright-report` artifact

## Troubleshooting

### Common Issues

#### 1. Vercel Authentication Failed

**Error**: `Error: Authentication failed`

**Solution**:

- Verify `VERCEL_TOKEN` is correct and not expired
- Check token has proper permissions
- Ensure token is for the correct team/organization

#### 2. Project Not Found

**Error**: `Project not found`

**Solution**:

- Verify `VERCEL_PROJECT_ID` is correct
- Check `VERCEL_ORG_ID` matches the project's organization
- Ensure the project exists in Vercel

#### 3. Environment Variables Missing

**Error**: Build fails due to missing environment variables

**Solution**:

- Set environment variables in Vercel dashboard
- Ensure variables are prefixed with `VITE_` for client-side access
- Check preview environment specifically

#### 4. Playwright Tests Fail

**Error**: E2E tests fail

**Solution**:

- Check if preview URL is accessible
- Verify test selectors are correct
- Look at screenshots/videos in artifacts
- Run tests locally first: `PREVIEW_URL=<url> pnpm e2e`

#### 5. Build Failures

**Error**: Vite build fails

**Solution**:

- Check TypeScript errors: `pnpm typecheck`
- Fix linting issues: `pnpm lint`
- Verify all imports are correct
- Check for circular dependencies

### Debugging Steps

1. **Check Workflow Logs**:
   - Go to Actions tab in GitHub
   - Click on the failed workflow
   - Expand each step to see detailed logs

2. **Test Locally**:

   ```bash
   # Test the build
   pnpm build

   # Test E2E against local server
   pnpm dev &
   PREVIEW_URL=http://localhost:5173 pnpm e2e
   ```

3. **Verify Vercel Setup**:
   ```bash
   # Test Vercel CLI locally
   npx vercel login
   npx vercel project ls
   npx vercel env ls
   ```

## Performance Optimization

### Reducing Workflow Time

1. **Use pnpm**: Already configured for faster installs
2. **Cache dependencies**: Node.js cache is enabled
3. **Prebuilt deployments**: Faster than building on Vercel
4. **Parallel jobs**: Consider splitting into parallel jobs for large projects

### Cost Optimization

1. **Preview cleanup**: Vercel automatically cleans old previews
2. **Selective E2E**: Only run E2E on important changes
3. **Test timeouts**: Reasonable timeouts prevent hanging tests

## Monitoring

### Success Metrics

- ✅ All PRs have green CI status
- ✅ E2E tests pass on preview deployments
- ✅ Build artifacts are generated successfully
- ✅ Preview URLs are accessible

### Failure Alerts

Set up notifications for:

- Workflow failures
- E2E test failures
- Build failures
- Vercel deployment issues

## Advanced Configuration

### Custom Test Commands

You can modify the test commands in `package.json`:

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:smoke": "playwright test --grep @smoke",
    "e2e:critical": "playwright test --grep @critical"
  }
}
```

### Environment-Specific Tests

Use different test suites for different environments:

```typescript
// playwright.config.ts
const baseURL = process.env.PREVIEW_URL || process.env.STAGING_URL || 'http://localhost:5173';
```

### Parallel E2E Tests

For faster E2E execution:

```yaml
# In preview-e2e.yml
- name: Run E2E on Preview
  run: pnpm e2e --workers=4
```

## Best Practices

1. **Keep tests fast**: Aim for < 5 minutes total E2E time
2. **Use meaningful test names**: Easy to identify failing tests
3. **Clean up resources**: Vercel handles this automatically
4. **Monitor costs**: Track Vercel usage and GitHub Actions minutes
5. **Regular updates**: Keep dependencies and workflows updated

## Support

- **GitHub Issues**: Report workflow problems
- **Vercel Support**: For deployment issues
- **Playwright Docs**: For test-related questions
- **Team Chat**: For urgent production issues
