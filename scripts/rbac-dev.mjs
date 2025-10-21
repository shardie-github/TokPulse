#!/usr/bin/env node
/* TokPulse — © Hardonia. MIT. */
import { createRBACApi } from '@tokpulse/rbac-api'

const PORT = process.env.RBAC_PORT || 3004

// Mock user and organization ID getters for development
function getCurrentUserId(req) {
  return req.headers['x-user-id'] || 'dev-user-123'
}

function getCurrentOrganizationId(req) {
  return req.headers['x-organization-id'] || 'dev-org-123'
}

async function main() {
  console.log('🚀 Starting TokPulse RBAC Development Server...')
  
  // Initialize RBAC API
  const rbacApi = createRBACApi({
    port: PORT,
    getCurrentUserId,
    getCurrentOrganizationId
  })

  // Start services
  await rbacApi.start(PORT)

  console.log(`✅ RBAC API running on port ${PORT}`)
  console.log('')
  console.log('Available endpoints:')
  console.log(`  GET  http://localhost:${PORT}/healthz`)
  console.log(`  GET  http://localhost:${PORT}/api/rbac/permissions`)
  console.log(`  GET  http://localhost:${PORT}/api/rbac/users`)
  console.log(`  POST http://localhost:${PORT}/api/rbac/users/invite`)
  console.log(`  PUT  http://localhost:${PORT}/api/rbac/users/:userId/role`)
  console.log(`  DELETE http://localhost:${PORT}/api/rbac/users/:userId`)
  console.log(`  GET  http://localhost:${PORT}/api/rbac/stores`)
  console.log(`  POST http://localhost:${PORT}/api/rbac/stores/connect`)
  console.log(`  DELETE http://localhost:${PORT}/api/rbac/stores/:storeId`)
  console.log(`  GET  http://localhost:${PORT}/api/rbac/audit-logs`)
  console.log(`  POST http://localhost:${PORT}/api/rbac/check-permission`)
  console.log('')
  console.log('Development headers:')
  console.log('  x-user-id: dev-user-123')
  console.log('  x-organization-id: dev-org-123')
  console.log('')
  console.log('Press Ctrl+C to stop')

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down RBAC services...')
    await rbacApi.close()
    console.log('✅ Shutdown complete')
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('❌ Failed to start RBAC services:', error)
  process.exit(1)
})