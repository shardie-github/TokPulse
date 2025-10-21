#!/usr/bin/env node
/* TokPulse — © Hardonia. MIT. */
import { performance } from 'perf_hooks'

async function simulateTraffic() {
  const args = process.argv.slice(2)
  const rps = parseInt(args.find(arg => arg.startsWith('--rps='))?.split('=')[1] || '10')
  const duration = parseInt(args.find(arg => arg.startsWith('--duration='))?.split('=')[1] || '60')

  console.log(`🚀 Simulating traffic: ${rps} RPS for ${duration} seconds`)

  const startTime = performance.now()
  const endTime = startTime + (duration * 1000)
  let requestCount = 0
  let successCount = 0
  let errorCount = 0
  const responseTimes = []

  const makeRequest = async () => {
    const requestStart = performance.now()
    
    try {
      const response = await fetch('http://localhost:3003/api/billing/plans', {
        method: 'GET',
        headers: {
          'x-organization-id': 'dev-org-123'
        }
      })
      
      const requestEnd = performance.now()
      const responseTime = requestEnd - requestStart
      responseTimes.push(responseTime)
      
      if (response.ok) {
        successCount++
      } else {
        errorCount++
      }
      
      requestCount++
    } catch (error) {
      errorCount++
      requestCount++
    }
  }

  // Start the simulation
  const interval = setInterval(async () => {
    if (performance.now() >= endTime) {
      clearInterval(interval)
      await printResults()
      return
    }

    // Send rps requests
    for (let i = 0; i < rps; i++) {
      makeRequest()
    }
  }, 1000) // Every second

  const printResults = async () => {
    const totalTime = (performance.now() - startTime) / 1000
    const actualRps = requestCount / totalTime
    
    responseTimes.sort((a, b) => a - b)
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)]
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]
    
    console.log('\n📊 Traffic Simulation Results:')
    console.log(`  Total requests: ${requestCount}`)
    console.log(`  Successful: ${successCount}`)
    console.log(`  Failed: ${errorCount}`)
    console.log(`  Success rate: ${((successCount / requestCount) * 100).toFixed(2)}%`)
    console.log(`  Actual RPS: ${actualRps.toFixed(2)}`)
    console.log(`  Response times:`)
    console.log(`    P50: ${p50.toFixed(2)}ms`)
    console.log(`    P95: ${p95.toFixed(2)}ms`)
    console.log(`    P99: ${p99.toFixed(2)}ms`)
    
    if (p95 > 250) {
      console.log('  ⚠️  P95 response time exceeds 250ms threshold')
    } else {
      console.log('  ✅ P95 response time within 250ms threshold')
    }
  }
}

simulateTraffic()