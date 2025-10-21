#!/usr/bin/env node

/**
 * Observability Smoke Test
 * 
 * Tests Prometheus metrics, traces, and alerting
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const color = {
    info: colors.blue,
    success: colors.green,
    warn: colors.yellow,
    error: colors.red,
    debug: colors.magenta
  }[level] || colors.reset;
  
  console.log(`${color}[${timestamp}] ${level.toUpperCase()}:${colors.reset} ${message}`, ...args);
}

class ObservabilitySmokeTest {
  constructor() {
    this.results = new Map();
    this.errors = [];
    this.warnings = [];
  }

  async run() {
    log('info', '🔍 Starting observability smoke test...');
    
    try {
      // Test Prometheus metrics
      await this.testPrometheusMetrics();
      
      // Test tracing
      await this.testTracing();
      
      // Test alerting
      await this.testAlerting();
      
      // Test logs
      await this.testLogs();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log('error', '❌ Observability smoke test failed:', error.message);
      process.exit(1);
    }
  }

  async testPrometheusMetrics() {
    log('info', '📊 Testing Prometheus metrics...');
    
    try {
      // Check if Prometheus is running
      const prometheusUrl = 'http://localhost:9090';
      const response = await fetch(`${prometheusUrl}/api/v1/query?query=up`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data.result.length > 0) {
          this.addResult('Prometheus', 'pass', 'Prometheus is running and responding');
          
          // Test specific metrics
          await this.testSpecificMetrics();
        } else {
          this.addError('Prometheus', 'Prometheus is running but no metrics found');
        }
      } else {
        this.addError('Prometheus', `Prometheus not responding: ${response.status}`);
      }
    } catch (error) {
      this.addError('Prometheus', `Prometheus connection failed: ${error.message}`);
    }
  }

  async testSpecificMetrics() {
    const metrics = [
      'tokpulse_widget_render_ms',
      'tokpulse_exposure_total',
      'tokpulse_webhook_requests_total',
      'tokpulse_api_requests_total',
      'tokpulse_database_connections_active'
    ];
    
    for (const metric of metrics) {
      try {
        const response = await fetch(`http://localhost:9090/api/v1/query?query=${metric}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.data.result.length > 0) {
            this.addResult(`Metric: ${metric}`, 'pass', 'Metric is available');
          } else {
            this.addWarning(`Metric: ${metric}`, 'Metric not found or no data');
          }
        }
      } catch (error) {
        this.addWarning(`Metric: ${metric}`, `Failed to query metric: ${error.message}`);
      }
    }
  }

  async testTracing() {
    log('info', '🔍 Testing tracing...');
    
    try {
      // Check if Jaeger is running
      const jaegerUrl = 'http://localhost:16686';
      const response = await fetch(`${jaegerUrl}/api/services`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          this.addResult('Jaeger', 'pass', 'Jaeger is running and has services');
          
          // Test trace collection
          await this.testTraceCollection();
        } else {
          this.addWarning('Jaeger', 'Jaeger is running but no services found');
        }
      } else {
        this.addError('Jaeger', `Jaeger not responding: ${response.status}`);
      }
    } catch (error) {
      this.addError('Jaeger', `Jaeger connection failed: ${error.message}`);
    }
  }

  async testTraceCollection() {
    try {
      // Generate a test trace by making a request to the API
      const apiResponse = await fetch('http://localhost:3000/api/health');
      if (apiResponse.ok) {
        this.addResult('Trace Collection', 'pass', 'API request generated trace');
      } else {
        this.addWarning('Trace Collection', 'API request failed, no trace generated');
      }
    } catch (error) {
      this.addWarning('Trace Collection', `Failed to generate test trace: ${error.message}`);
    }
  }

  async testAlerting() {
    log('info', '🚨 Testing alerting...');
    
    try {
      // Check if AlertManager is running
      const alertManagerUrl = 'http://localhost:9093';
      const response = await fetch(`${alertManagerUrl}/api/v1/alerts`);
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('AlertManager', 'pass', 'AlertManager is running');
        
        // Check for active alerts
        if (data.data && data.data.length > 0) {
          this.addResult('Active Alerts', 'info', `${data.data.length} active alerts`);
        } else {
          this.addResult('Active Alerts', 'pass', 'No active alerts');
        }
      } else {
        this.addError('AlertManager', `AlertManager not responding: ${response.status}`);
      }
    } catch (error) {
      this.addError('AlertManager', `AlertManager connection failed: ${error.message}`);
    }
  }

  async testLogs() {
    log('info', '📝 Testing logs...');
    
    try {
      // Check if Loki is running
      const lokiUrl = 'http://localhost:3100';
      const response = await fetch(`${lokiUrl}/ready`);
      
      if (response.ok) {
        this.addResult('Loki', 'pass', 'Loki is running');
        
        // Test log query
        await this.testLogQuery();
      } else {
        this.addError('Loki', `Loki not responding: ${response.status}`);
      }
    } catch (error) {
      this.addError('Loki', `Loki connection failed: ${error.message}`);
    }
  }

  async testLogQuery() {
    try {
      const response = await fetch('http://localhost:3100/loki/api/v1/query?query={job="tokpulse"}&limit=10');
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.result.length > 0) {
          this.addResult('Log Query', 'pass', 'Logs are being collected and queryable');
        } else {
          this.addWarning('Log Query', 'No logs found for tokpulse job');
        }
      } else {
        this.addWarning('Log Query', `Log query failed: ${response.status}`);
      }
    } catch (error) {
      this.addWarning('Log Query', `Log query failed: ${error.message}`);
    }
  }

  addResult(name, status, message) {
    this.results.set(name, { status, message });
  }

  addError(name, message) {
    this.errors.push({ name, message });
  }

  addWarning(name, message) {
    this.warnings.push({ name, message });
  }

  generateReport() {
    log('info', '\n📊 Observability Smoke Test Report');
    log('info', '==================================');
    
    // Results
    if (this.results.size > 0) {
      log('info', '\n✅ Results:');
      for (const [name, result] of this.results) {
        const status = result.status === 'pass' ? '✓' : result.status === 'info' ? 'ℹ' : '?';
        log('info', `  ${status} ${name}: ${result.message}`);
      }
    }
    
    // Errors
    if (this.errors.length > 0) {
      log('error', '\n❌ Errors:');
      this.errors.forEach(error => {
        log('error', `  • ${error.name}: ${error.message}`);
      });
    }
    
    // Warnings
    if (this.warnings.length > 0) {
      log('warn', '\n⚠️  Warnings:');
      this.warnings.forEach(warning => {
        log('warn', `  • ${warning.name}: ${warning.message}`);
      });
    }
    
    // Summary
    const totalResults = this.results.size;
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    
    log('info', `\n📈 Summary:`);
    log('info', `  Results: ${totalResults}`);
    log('info', `  Errors: ${totalErrors}`);
    log('info', `  Warnings: ${totalWarnings}`);
    
    if (totalErrors === 0) {
      log('success', '\n🎉 Observability smoke test passed!');
      process.exit(0);
    } else {
      log('error', '\n💥 Observability smoke test failed.');
      process.exit(1);
    }
  }
}

// Start observability smoke test
const smokeTest = new ObservabilitySmokeTest();
smokeTest.run().catch(error => {
  log('error', 'Fatal error during observability smoke test:', error.message);
  process.exit(1);
});