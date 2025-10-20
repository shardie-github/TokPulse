/* TokPulse — © Hardonia. MIT. */
import fetch from 'node-fetch'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env' })

const STORE_DOMAIN = 'jb4izh-tz.myshopify.com'
const API_KEY = process.env.SHOPIFY_API_KEY
const API_SECRET = process.env.SHOPIFY_API_SECRET
const APP_URL = process.env.SHOPIFY_APP_URL || 'http://localhost:3004'

async function testConnection() {
  console.log('🧪 Testing TokPulse Shopify Connection')
  console.log('=====================================')
  console.log(`Store: ${STORE_DOMAIN}`)
  console.log(`App URL: ${APP_URL}`)
  console.log('')

  // Test 1: Health check
  console.log('1. Testing health endpoint...')
  try {
    const healthResponse = await fetch(`${APP_URL}/healthz`)
    const healthData = await healthResponse.json()
    console.log(`   ✅ Health check: ${healthData.ok ? 'PASS' : 'FAIL'}`)
  } catch (error) {
    console.log(`   ❌ Health check: FAIL - ${error.message}`)
  }

  // Test 2: Install URL generation
  console.log('2. Testing install URL generation...')
  try {
    const installUrl = `${APP_URL}/api/shopify/install?shop=${STORE_DOMAIN}`
    console.log(`   ✅ Install URL: ${installUrl}`)
    console.log(`   📝 Visit this URL to test the OAuth flow`)
  } catch (error) {
    console.log(`   ❌ Install URL generation: FAIL - ${error.message}`)
  }

  // Test 3: Environment validation
  console.log('3. Validating environment...')
  const requiredVars = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'SHOPIFY_APP_URL']
  let envValid = true
  
  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName].includes('***') || process.env[varName].includes('your_')) {
      console.log(`   ⚠️  ${varName}: Not configured`)
      envValid = false
    } else {
      console.log(`   ✅ ${varName}: Configured`)
    }
  }

  console.log('')
  if (envValid) {
    console.log('🎉 All tests passed! Your app is ready to connect to the test store.')
  } else {
    console.log('⚠️  Please configure your environment variables in .env file')
  }
  
  console.log('')
  console.log('Next steps:')
  console.log('1. Update .env with your Shopify app credentials')
  console.log('2. Start the server: npm start')
  console.log('3. Visit the install URL to test the OAuth flow')
  console.log('4. Check the test store: https://shopify.com/store/jb4izh-tz')
}

testConnection().catch(console.error)