#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

let errors = 0
let warnings = 0

function logError(message) {
  console.error(`❌ ERROR: ${message}`)
  errors++
}

function logWarning(message) {
  console.warn(`⚠️  WARNING: ${message}`)
  warnings++
}

function logSuccess(message) {
  console.log(`✅ ${message}`)
}

// Validate Grafana dashboard JSON files
function validateGrafanaDashboards() {
  console.log('\n📊 Validating Grafana dashboards...')
  
  const dashboardsDir = path.join(rootDir, 'ops', 'dashboards')
  
  if (!fs.existsSync(dashboardsDir)) {
    logError('Dashboards directory not found: ops/dashboards')
    return
  }
  
  const dashboardFiles = fs.readdirSync(dashboardsDir)
    .filter(file => file.endsWith('.json'))
  
  if (dashboardFiles.length === 0) {
    logWarning('No dashboard files found in ops/dashboards')
    return
  }
  
  for (const file of dashboardFiles) {
    const filePath = path.join(dashboardsDir, file)
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const dashboard = JSON.parse(content)
      
      // Validate dashboard structure
      if (!dashboard.dashboard) {
        logError(`${file}: Missing 'dashboard' property`)
        continue
      }
      
      const dash = dashboard.dashboard
      
      // Required properties
      const requiredProps = ['title', 'panels']
      for (const prop of requiredProps) {
        if (!dash[prop]) {
          logError(`${file}: Missing required property '${prop}'`)
        }
      }
      
      // Validate panels
      if (dash.panels && Array.isArray(dash.panels)) {
        for (let i = 0; i < dash.panels.length; i++) {
          const panel = dash.panels[i]
          
          if (!panel.title) {
            logError(`${file}: Panel ${i} missing title`)
          }
          
          if (!panel.type) {
            logError(`${file}: Panel ${i} missing type`)
          }
          
          if (!panel.targets || !Array.isArray(panel.targets)) {
            logError(`${file}: Panel ${i} missing targets array`)
          }
        }
      }
      
      // Check for TokPulse metrics
      const contentStr = JSON.stringify(dashboard)
      const tokpulseMetrics = [
        'tokpulse_webhook_processed_total',
        'tokpulse_widget_render_ms',
        'tokpulse_api_requests_total',
        'tokpulse_job_attempts_total',
        'tokpulse_tenant_events_total'
      ]
      
      let hasTokPulseMetrics = false
      for (const metric of tokpulseMetrics) {
        if (contentStr.includes(metric)) {
          hasTokPulseMetrics = true
          break
        }
      }
      
      if (!hasTokPulseMetrics) {
        logWarning(`${file}: No TokPulse metrics found in dashboard`)
      }
      
      logSuccess(`${file}: Valid dashboard structure`)
      
    } catch (error) {
      logError(`${file}: Invalid JSON - ${error.message}`)
    }
  }
}

// Validate Prometheus configuration
function validatePrometheusConfig() {
  console.log('\n🔍 Validating Prometheus configuration...')
  
  const prometheusFile = path.join(rootDir, 'ops', 'prometheus', 'prometheus.yml.example')
  
  if (!fs.existsSync(prometheusFile)) {
    logError('Prometheus config not found: ops/prometheus/prometheus.yml.example')
    return
  }
  
  try {
    const content = fs.readFileSync(prometheusFile, 'utf8')
    
    // Check for required sections
    const requiredSections = ['global:', 'scrape_configs:']
    for (const section of requiredSections) {
      if (!content.includes(section)) {
        logError(`Prometheus config missing required section: ${section}`)
      }
    }
    
    // Check for TokPulse scrape configs
    if (!content.includes('tokpulse')) {
      logWarning('Prometheus config missing TokPulse scrape configurations')
    }
    
    // Check for metrics path
    if (!content.includes('/internal/metrics')) {
      logError('Prometheus config missing /internal/metrics endpoint')
    }
    
    logSuccess('Prometheus configuration is valid')
    
  } catch (error) {
    logError(`Failed to read Prometheus config: ${error.message}`)
  }
}

// Validate telemetry package
function validateTelemetryPackage() {
  console.log('\n📡 Validating telemetry package...')
  
  const telemetryDir = path.join(rootDir, 'packages', 'telemetry')
  
  if (!fs.existsSync(telemetryDir)) {
    logError('Telemetry package not found: packages/telemetry')
    return
  }
  
  // Check package.json
  const packageJsonPath = path.join(telemetryDir, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    logError('Telemetry package.json not found')
    return
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    // Check required dependencies
    const requiredDeps = ['prom-client', 'pino', '@opentelemetry/api']
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
        logError(`Missing required dependency: ${dep}`)
      }
    }
    
    logSuccess('Telemetry package.json is valid')
    
  } catch (error) {
    logError(`Invalid telemetry package.json: ${error.message}`)
  }
  
  // Check source files
  const srcDir = path.join(telemetryDir, 'src')
  if (!fs.existsSync(srcDir)) {
    logError('Telemetry src directory not found')
    return
  }
  
  const requiredFiles = ['metrics.ts', 'logger.ts', 'tracing.ts', 'index.ts']
  for (const file of requiredFiles) {
    const filePath = path.join(srcDir, file)
    if (!fs.existsSync(filePath)) {
      logError(`Missing required file: packages/telemetry/src/${file}`)
    } else {
      logSuccess(`Found packages/telemetry/src/${file}`)
    }
  }
}

// Validate metrics endpoint
function validateMetricsEndpoint() {
  console.log('\n📈 Validating metrics endpoint...')
  
  // This would typically make an HTTP request to the metrics endpoint
  // For now, we'll just check if the endpoint file exists
  
  const endpointsFile = path.join(rootDir, 'packages', 'telemetry', 'src', 'endpoints.ts')
  
  if (!fs.existsSync(endpointsFile)) {
    logError('Metrics endpoints file not found: packages/telemetry/src/endpoints.ts')
    return
  }
  
  try {
    const content = fs.readFileSync(endpointsFile, 'utf8')
    
    // Check for required functions
    const requiredFunctions = ['metricsEndpoint', 'healthEndpoint']
    for (const func of requiredFunctions) {
      if (!content.includes(`export async function ${func}`)) {
        logError(`Missing required function: ${func}`)
      }
    }
    
    // Check for Prometheus register usage
    if (!content.includes('register.metrics()')) {
      logError('Metrics endpoint not using Prometheus register')
    }
    
    logSuccess('Metrics endpoint implementation is valid')
    
  } catch (error) {
    logError(`Failed to validate metrics endpoint: ${error.message}`)
  }
}

// Main validation function
async function main() {
  console.log('🔍 TokPulse Observability Linting\n')
  
  validateGrafanaDashboards()
  validatePrometheusConfig()
  validateTelemetryPackage()
  validateMetricsEndpoint()
  
  console.log('\n📋 Summary:')
  console.log(`   Errors: ${errors}`)
  console.log(`   Warnings: ${warnings}`)
  
  if (errors > 0) {
    console.log('\n❌ Linting failed with errors')
    process.exit(1)
  } else if (warnings > 0) {
    console.log('\n⚠️  Linting completed with warnings')
    process.exit(0)
  } else {
    console.log('\n✅ All checks passed!')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('💥 Linting failed:', error)
  process.exit(1)
})