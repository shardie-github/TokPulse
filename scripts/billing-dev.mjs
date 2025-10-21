#!/usr/bin/env node
/* TokPulse — © Hardonia. MIT. */
import { createBillingApi } from '@tokpulse/billing-api'
import { EmailService } from '@tokpulse/email'
import { BillingCronService } from '@tokpulse/billing'
import { PrismaClient } from '@tokpulse/db'

const PORT = process.env.BILLING_PORT || 3003
const MAILER_URL = process.env.MAILER_URL || 'http://localhost:3007'
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || 'test-secret'
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'test-secret'

// Mock organization ID getter for development
function getOrganizationId(req) {
  // In development, use a mock organization ID
  return req.headers['x-organization-id'] || 'dev-org-123'
}

async function main() {
  console.log('🚀 Starting TokPulse Billing Development Server...')
  
  const db = new PrismaClient()
  
  // Initialize email service
  const emailService = new EmailService(db, {
    fromEmail: 'noreply@tokpulse.com',
    fromName: 'TokPulse',
    mailerUrl: MAILER_URL
  })

  // Initialize billing API
  const billingApi = createBillingApi({
    port: PORT,
    shopifyWebhookSecret: SHOPIFY_WEBHOOK_SECRET,
    stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
    getOrganizationId
  })

  // Initialize billing cron service
  const billingCron = new BillingCronService(db, {
    emailService,
    runIntervalMs: 5 * 60 * 1000 // Run every 5 minutes in development
  })

  // Start services
  await billingApi.start(PORT)
  billingCron.start()

  console.log(`✅ Billing API running on port ${PORT}`)
  console.log(`✅ Billing cron service started`)
  console.log(`✅ Email service connected to ${MAILER_URL}`)
  console.log('')
  console.log('Available endpoints:')
  console.log(`  GET  http://localhost:${PORT}/healthz`)
  console.log(`  GET  http://localhost:${PORT}/api/billing/plans`)
  console.log(`  GET  http://localhost:${PORT}/api/billing/subscription`)
  console.log(`  POST http://localhost:${PORT}/api/billing/subscription`)
  console.log(`  PUT  http://localhost:${PORT}/api/billing/subscription`)
  console.log(`  DELETE http://localhost:${PORT}/api/billing/subscription`)
  console.log(`  GET  http://localhost:${PORT}/api/billing/usage`)
  console.log(`  POST http://localhost:${PORT}/api/billing/usage`)
  console.log(`  POST http://localhost:${PORT}/api/billing/entitlement`)
  console.log(`  POST http://localhost:${PORT}/api/billing/shopify/checkout`)
  console.log(`  POST http://localhost:${PORT}/api/billing/shopify/activate`)
  console.log(`  GET  http://localhost:${PORT}/api/billing/shopify/charge/:chargeId`)
  console.log(`  POST http://localhost:${PORT}/api/billing/webhooks/shopify`)
  console.log(`  POST http://localhost:${PORT}/api/billing/webhooks/stripe`)
  console.log('')
  console.log('Development headers:')
  console.log('  x-organization-id: dev-org-123')
  console.log('')
  console.log('Press Ctrl+C to stop')

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down billing services...')
    billingCron.stop()
    await billingApi.close()
    await db.$disconnect()
    console.log('✅ Shutdown complete')
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('❌ Failed to start billing services:', error)
  process.exit(1)
})