#!/usr/bin/env node
/* TokPulse — © Hardonia. MIT. */
import fs from 'fs'
import path from 'path'

async function replayWebhooks() {
  const args = process.argv.slice(2)
  const webhookFiles = args.filter(arg => arg.endsWith('.json'))

  if (webhookFiles.length === 0) {
    console.log('Usage: pnpm ops:replay *.json')
    console.log('Example: pnpm ops:replay ./samples/webhooks/*.json')
    process.exit(1)
  }

  console.log('🔄 Replaying webhooks...')

  for (const file of webhookFiles) {
    try {
      console.log(`Processing: ${file}`)
      
      if (!fs.existsSync(file)) {
        console.log(`  ❌ File not found: ${file}`)
        continue
      }

      const webhookData = JSON.parse(fs.readFileSync(file, 'utf8'))
      
      // Send webhook to billing API
      const response = await fetch('http://localhost:3003/api/billing/webhooks/shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-shopify-hmac-sha256': 'test-signature' // Mock signature for development
        },
        body: JSON.stringify(webhookData)
      })

      if (response.ok) {
        console.log(`  ✅ Webhook processed successfully`)
      } else {
        console.log(`  ❌ Webhook failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.log(`  ❌ Error processing ${file}:`, error.message)
    }
  }

  console.log('✅ Webhook replay completed')
}

replayWebhooks()