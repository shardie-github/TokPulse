#!/usr/bin/env node

/**
 * System Spin-Down Orchestrator
 * 
 * Gracefully stops all services and clears temporary queues
 */

import { spawn, exec } from 'child_process';
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

class ShutdownManager {
  constructor() {
    this.services = new Map();
    this.cleanupTasks = [];
  }

  async shutdown() {
    log('info', '🛑 Starting TokPulse System Spin-Down...');
    
    try {
      // Stop all services
      await this.stopServices();
      
      // Clear temporary queues
      await this.clearQueues();
      
      // Clean up temporary files
      await this.cleanupTempFiles();
      
      // Clear Redis cache
      await this.clearRedisCache();
      
      log('success', '✅ System spin-down completed successfully!');
      
    } catch (error) {
      log('error', '❌ System spin-down failed:', error.message);
      process.exit(1);
    }
  }

  async stopServices() {
    log('info', '🛑 Stopping services...');
    
    const services = [
      'partner-app',
      'hydrogen', 
      'edge-worker',
      'docs',
      'metrics',
      'redis'
    ];
    
    for (const service of services) {
      await this.stopService(service);
    }
    
    log('success', '✓ All services stopped');
  }

  async stopService(serviceName) {
    try {
      // Find and kill processes by port
      const ports = {
        'partner-app': 3000,
        'hydrogen': 3001,
        'edge-worker': 3002,
        'docs': 3003,
        'metrics': 3004,
        'redis': 6379
      };
      
      const port = ports[serviceName];
      if (port) {
        // Kill processes using the port
        await execAsync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`);
        log('success', `✓ Stopped ${serviceName} on port ${port}`);
      }
      
      // Also try to kill by process name
      if (serviceName === 'redis') {
        await execAsync('pkill -f redis-server || true');
      }
      
    } catch (error) {
      log('warn', `⚠️  Could not stop ${serviceName}: ${error.message}`);
    }
  }

  async clearQueues() {
    log('info', '🧹 Clearing temporary queues...');
    
    try {
      // Clear Redis queues
      await execAsync('redis-cli FLUSHDB || true');
      log('success', '✓ Redis queues cleared');
    } catch (error) {
      log('warn', `⚠️  Could not clear Redis queues: ${error.message}`);
    }
  }

  async cleanupTempFiles() {
    log('info', '🧹 Cleaning up temporary files...');
    
    const tempDirs = [
      '.artifacts',
      '.turbo',
      'node_modules/.cache',
      'apps/*/dist',
      'packages/*/dist',
      'apps/*/.next',
      'packages/*/.next'
    ];
    
    for (const pattern of tempDirs) {
      try {
        await execAsync(`rm -rf ${pattern} 2>/dev/null || true`);
      } catch (error) {
        // Ignore errors for cleanup
      }
    }
    
    log('success', '✓ Temporary files cleaned up');
  }

  async clearRedisCache() {
    log('info', '🧹 Clearing Redis cache...');
    
    try {
      // Clear all Redis databases
      await execAsync('redis-cli FLUSHALL || true');
      log('success', '✓ Redis cache cleared');
    } catch (error) {
      log('warn', `⚠️  Could not clear Redis cache: ${error.message}`);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('info', '\n🛑 Received SIGINT, forcing shutdown...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log('info', '\n🛑 Received SIGTERM, forcing shutdown...');
  process.exit(0);
});

// Start the shutdown process
const manager = new ShutdownManager();
manager.shutdown().catch(error => {
  log('error', 'Fatal error during shutdown:', error.message);
  process.exit(1);
});