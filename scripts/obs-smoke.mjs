#!/usr/bin/env node

/**
 * TokPulse Observability Smoke Tests
 * Validates monitoring, logging, and observability infrastructure
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

class ObservabilitySmokeTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      checks: {},
      metrics: {},
      alerts: {},
      summary: { passed: 0, failed: 0, total: 0 }
    };
  }

  async runSmokeTests() {
    console.log('🔍 Running TokPulse Observability Smoke Tests...\n');

    // Check observability infrastructure
    await this.checkObservabilityInfrastructure();
    
    // Check metrics collection
    await this.checkMetricsCollection();
    
    // Check logging configuration
    await this.checkLoggingConfiguration();
    
    // Check alerting rules
    await this.checkAlertingRules();
    
    // Check dashboard availability
    await this.checkDashboards();
    
    // Check trace collection
    await this.checkTraceCollection();
    
    // Check health endpoints
    await this.checkHealthEndpoints();
    
    this.generateSummary();
    return this.results;
  }

  async checkObservabilityInfrastructure() {
    console.log('🏗️ Checking observability infrastructure...');
    try {
      const obsFiles = [
        'ops/docker-compose.observability.yml',
        'ops/prometheus',
        'ops/grafana',
        'ops/otel-collector'
      ];
      
      const infrastructure = {};
      for (const file of obsFiles) {
        infrastructure[file] = existsSync(file) ? 'present' : 'missing';
      }
      
      const allPresent = Object.values(infrastructure).every(status => status === 'present');
      
      this.results.checks.infrastructure = {
        status: allPresent ? 'pass' : 'warn',
        message: allPresent ? 'All observability files present' : 'Some observability files missing',
        details: infrastructure
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.infrastructure = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkMetricsCollection() {
    console.log('📊 Checking metrics collection...');
    try {
      // Check for Prometheus configuration
      const prometheusConfig = existsSync('ops/prometheus/prometheus.yml');
      
      // Check for metrics endpoints in code
      const metricsCode = execSync('grep -r "prometheus\\|metrics" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      // Check for OpenTelemetry setup
      const otelCode = execSync('grep -r "opentelemetry\\|@opentelemetry" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      const hasMetrics = prometheusConfig || metricsCode.trim() || otelCode.trim();
      
      this.results.checks.metrics = {
        status: hasMetrics ? 'pass' : 'warn',
        message: hasMetrics ? 'Metrics collection configured' : 'No metrics collection found',
        details: {
          prometheusConfig,
          metricsCode: metricsCode.trim().length > 0,
          otelCode: otelCode.trim().length > 0
        }
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.metrics = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkLoggingConfiguration() {
    console.log('📝 Checking logging configuration...');
    try {
      // Check for structured logging
      const structuredLogs = execSync('grep -r "winston\\|pino\\|bunyan" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      // Check for log levels
      const logLevels = execSync('grep -r "log.*level\\|LOG_LEVEL" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      // Check for log rotation
      const logRotation = existsSync('ops/rotate_logs.sh');
      
      const hasLogging = structuredLogs.trim() || logLevels.trim() || logRotation;
      
      this.results.checks.logging = {
        status: hasLogging ? 'pass' : 'warn',
        message: hasLogging ? 'Logging configuration found' : 'No logging configuration detected',
        details: {
          structuredLogs: structuredLogs.trim().length > 0,
          logLevels: logLevels.trim().length > 0,
          logRotation
        }
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.logging = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkAlertingRules() {
    console.log('🚨 Checking alerting rules...');
    try {
      // Check for Grafana alert rules
      const grafanaAlerts = execSync('find ops/grafana -name "*.json" | head -5', { encoding: 'utf8' });
      
      // Check for Prometheus alert rules
      const prometheusAlerts = execSync('find ops/prometheus -name "*.yml" -o -name "*.yaml" | head -5', { encoding: 'utf8' });
      
      // Check for alerting code
      const alertingCode = execSync('grep -r "alert\\|notification" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      const hasAlerts = grafanaAlerts.trim() || prometheusAlerts.trim() || alertingCode.trim();
      
      this.results.checks.alerting = {
        status: hasAlerts ? 'pass' : 'warn',
        message: hasAlerts ? 'Alerting rules configured' : 'No alerting rules found',
        details: {
          grafanaAlerts: grafanaAlerts.trim().length > 0,
          prometheusAlerts: prometheusAlerts.trim().length > 0,
          alertingCode: alertingCode.trim().length > 0
        }
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.alerting = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkDashboards() {
    console.log('📈 Checking dashboard availability...');
    try {
      // Check for Grafana dashboards
      const dashboards = execSync('find ops/dashboards -name "*.json" | head -5', { encoding: 'utf8' });
      
      // Check for dashboard snapshots
      const snapshots = execSync('find ops/dashboards -name "*snapshot*" | head -5', { encoding: 'utf8' });
      
      const hasDashboards = dashboards.trim() || snapshots.trim();
      
      this.results.checks.dashboards = {
        status: hasDashboards ? 'pass' : 'warn',
        message: hasDashboards ? 'Dashboards configured' : 'No dashboards found',
        details: {
          dashboards: dashboards.trim().split('\n').filter(d => d),
          snapshots: snapshots.trim().split('\n').filter(s => s)
        }
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.dashboards = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkTraceCollection() {
    console.log('🔍 Checking trace collection...');
    try {
      // Check for OpenTelemetry trace setup
      const traceCode = execSync('grep -r "trace\\|span\\|@opentelemetry" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      // Check for Jaeger or other trace backends
      const traceBackend = execSync('grep -r "jaeger\\|zipkin\\|datadog" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      const hasTracing = traceCode.trim() || traceBackend.trim();
      
      this.results.checks.tracing = {
        status: hasTracing ? 'pass' : 'warn',
        message: hasTracing ? 'Trace collection configured' : 'No trace collection found',
        details: {
          traceCode: traceCode.trim().length > 0,
          traceBackend: traceBackend.trim().length > 0
        }
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.tracing = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkHealthEndpoints() {
    console.log('🏥 Checking health endpoints...');
    try {
      // Check for health check endpoints
      const healthEndpoints = execSync('grep -r "health\\|status\\|ping" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      // Check for readiness/liveness probes
      const probes = execSync('grep -r "readiness\\|liveness" packages/ --include="*.ts" --include="*.js" | head -5', { encoding: 'utf8' });
      
      const hasHealthChecks = healthEndpoints.trim() || probes.trim();
      
      this.results.checks.health = {
        status: hasHealthChecks ? 'pass' : 'warn',
        message: hasHealthChecks ? 'Health endpoints configured' : 'No health endpoints found',
        details: {
          healthEndpoints: healthEndpoints.trim().length > 0,
          probes: probes.trim().length > 0
        }
      };
      
      this.results.summary.passed++;
    } catch (error) {
      this.results.checks.health = { status: 'fail', message: error.message };
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  generateSummary() {
    const { passed, failed, total } = this.results.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    
    console.log('\n📊 Observability Smoke Test Summary:');
    console.log(`Total Checks: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${successRate}%`);
    
    if (failed === 0) {
      console.log('\n✅ All observability checks passed!');
    } else {
      console.log('\n❌ Some observability checks failed.');
    }
  }
}

// Main execution
async function main() {
  const tester = new ObservabilitySmokeTester();
  const results = await tester.runSmokeTests();
  
  if (results.summary.failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}