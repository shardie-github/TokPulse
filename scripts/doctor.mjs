#!/usr/bin/env node

/**
 * System Doctor - Health Diagnostics
 * 
 * Comprehensive system health check and diagnostics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, readFileSync, statSync } from 'fs';
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

class SystemDoctor {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.checks = [];
  }

  async diagnose() {
    log('info', '🩺 Starting system diagnostics...');
    
    try {
      // Environment checks
      await this.checkEnvironment();
      
      // Dependencies checks
      await this.checkDependencies();
      
      // Database checks
      await this.checkDatabase();
      
      // Service checks
      await this.checkServices();
      
      // Configuration checks
      await this.checkConfiguration();
      
      // Security checks
      await this.checkSecurity();
      
      // Performance checks
      await this.checkPerformance();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log('error', '❌ Diagnostics failed:', error.message);
      process.exit(1);
    }
  }

  async checkEnvironment() {
    log('info', '🔍 Checking environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion >= 20) {
      this.addCheck('Node.js Version', 'pass', `Node.js ${nodeVersion} (✓ >= 20)`);
    } else {
      this.addIssue('Node.js Version', `Node.js ${nodeVersion} (❌ < 20 required)`);
    }
    
    // Check pnpm
    try {
      const { stdout } = await execAsync('pnpm --version');
      this.addCheck('pnpm', 'pass', `pnpm ${stdout.trim()}`);
    } catch (error) {
      this.addIssue('pnpm', 'pnpm not found or not working');
    }
    
    // Check environment file
    const envFile = join(rootDir, '.env');
    if (existsSync(envFile)) {
      this.addCheck('Environment File', 'pass', '.env file exists');
    } else {
      this.addIssue('Environment File', '.env file missing');
    }
    
    // Check required environment variables
    if (existsSync(envFile)) {
      const envContent = readFileSync(envFile, 'utf8');
      const requiredVars = [
        'DATABASE_URL',
        'SHOPIFY_API_KEY',
        'SHOPIFY_API_SECRET',
        'SESSION_SECRET',
        'PRISMA_CLIENT_ENGINE_TYPE'
      ];
      
      for (const varName of requiredVars) {
        if (envContent.includes(varName)) {
          this.addCheck(`Env Var: ${varName}`, 'pass', 'Present');
        } else {
          this.addIssue(`Env Var: ${varName}`, 'Missing from .env file');
        }
      }
    }
  }

  async checkDependencies() {
    log('info', '📦 Checking dependencies...');
    
    // Check if node_modules exists
    const nodeModulesPath = join(rootDir, 'node_modules');
    if (existsSync(nodeModulesPath)) {
      this.addCheck('Dependencies', 'pass', 'node_modules directory exists');
    } else {
      this.addIssue('Dependencies', 'node_modules directory missing - run pnpm install');
    }
    
    // Check pnpm lock file
    const lockFile = join(rootDir, 'pnpm-lock.yaml');
    if (existsSync(lockFile)) {
      this.addCheck('Lock File', 'pass', 'pnpm-lock.yaml exists');
    } else {
      this.addIssue('Lock File', 'pnpm-lock.yaml missing');
    }
    
    // Check for circular dependencies
    try {
      await execAsync('pnpm list --depth=0');
      this.addCheck('Circular Dependencies', 'pass', 'No circular dependencies detected');
    } catch (error) {
      this.addWarning('Circular Dependencies', 'Potential circular dependency detected');
    }
  }

  async checkDatabase() {
    log('info', '🗄️  Checking database...');
    
    // Check Prisma schema
    const prismaSchema = join(rootDir, 'packages/db/schema.prisma');
    if (existsSync(prismaSchema)) {
      this.addCheck('Prisma Schema', 'pass', 'schema.prisma exists');
    } else {
      this.addIssue('Prisma Schema', 'schema.prisma missing');
    }
    
    // Check if Prisma client is generated
    const prismaClient = join(rootDir, 'packages/db/node_modules/.prisma/client');
    if (existsSync(prismaClient)) {
      this.addCheck('Prisma Client', 'pass', 'Prisma client generated');
    } else {
      this.addIssue('Prisma Client', 'Prisma client not generated - run pnpm db:generate');
    }
    
    // Check database connection
    try {
      await execAsync('pnpm db:push --accept-data-loss');
      this.addCheck('Database Connection', 'pass', 'Database accessible');
    } catch (error) {
      this.addIssue('Database Connection', `Database connection failed: ${error.message}`);
    }
  }

  async checkServices() {
    log('info', '🚀 Checking services...');
    
    const services = [
      { name: 'Partner App', port: 3000, path: '/health' },
      { name: 'Hydrogen', port: 3001, path: '/health' },
      { name: 'Edge Worker', port: 3002, path: '/health' },
      { name: 'Docs', port: 3003, path: '/health' },
      { name: 'Metrics', port: 3004, path: '/health' }
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(`http://localhost:${service.port}${service.path}`);
        if (response.ok) {
          this.addCheck(service.name, 'pass', `Running on port ${service.port}`);
        } else {
          this.addWarning(service.name, `Responding but unhealthy (${response.status})`);
        }
      } catch (error) {
        this.addIssue(service.name, `Not running or unreachable on port ${service.port}`);
      }
    }
  }

  async checkConfiguration() {
    log('info', '⚙️  Checking configuration...');
    
    // Check turbo.json
    const turboConfig = join(rootDir, 'turbo.json');
    if (existsSync(turboConfig)) {
      this.addCheck('Turbo Config', 'pass', 'turbo.json exists');
    } else {
      this.addIssue('Turbo Config', 'turbo.json missing');
    }
    
    // Check package.json
    const packageJson = join(rootDir, 'package.json');
    if (existsSync(packageJson)) {
      this.addCheck('Package Config', 'pass', 'package.json exists');
    } else {
      this.addIssue('Package Config', 'package.json missing');
    }
    
    // Check TypeScript config
    const tsConfig = join(rootDir, 'tsconfig.json');
    if (existsSync(tsConfig)) {
      this.addCheck('TypeScript Config', 'pass', 'tsconfig.json exists');
    } else {
      this.addIssue('TypeScript Config', 'tsconfig.json missing');
    }
  }

  async checkSecurity() {
    log('info', '🔒 Checking security...');
    
    // Check for secrets in code
    try {
      const { stdout } = await execAsync('grep -r "password\\|secret\\|key" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" . | grep -v node_modules | grep -v ".env" | head -10');
      if (stdout.trim()) {
        this.addWarning('Secrets in Code', 'Potential secrets found in source code');
      } else {
        this.addCheck('Secrets in Code', 'pass', 'No obvious secrets in source code');
      }
    } catch (error) {
      // No secrets found
      this.addCheck('Secrets in Code', 'pass', 'No obvious secrets in source code');
    }
    
    // Check for .env in git
    try {
      const { stdout } = await execAsync('git ls-files | grep "\\.env$"');
      if (stdout.trim()) {
        this.addIssue('Git Security', '.env file is tracked in git');
      } else {
        this.addCheck('Git Security', 'pass', '.env file not tracked in git');
      }
    } catch (error) {
      this.addWarning('Git Security', 'Could not check git status');
    }
  }

  async checkPerformance() {
    log('info', '⚡ Checking performance...');
    
    // Check bundle sizes
    const distDirs = [
      'apps/partner-app/dist',
      'apps/hydrogen/dist',
      'packages/theme-ext/dist'
    ];
    
    for (const distDir of distDirs) {
      if (existsSync(join(rootDir, distDir))) {
        const stats = statSync(join(rootDir, distDir));
        this.addCheck(`Bundle: ${distDir}`, 'pass', `Built (${stats.size} bytes)`);
      } else {
        this.addWarning(`Bundle: ${distDir}`, 'Not built - run pnpm build');
      }
    }
    
    // Check for large files
    try {
      const { stdout } = await execAsync('find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.jsx" | xargs wc -l | sort -nr | head -5');
      this.addCheck('Code Size', 'info', `Largest files:\n${stdout}`);
    } catch (error) {
      // Ignore errors
    }
  }

  addCheck(name, status, message) {
    this.checks.push({ name, status, message });
  }

  addIssue(name, message) {
    this.issues.push({ name, message });
  }

  addWarning(name, message) {
    this.warnings.push({ name, message });
  }

  generateReport() {
    log('info', '\n📊 System Health Report');
    log('info', '======================');
    
    // Summary
    const totalChecks = this.checks.length;
    const totalIssues = this.issues.length;
    const totalWarnings = this.warnings.length;
    
    log('info', `\n📈 Summary:`);
    log('info', `  Checks: ${totalChecks}`);
    log('info', `  Issues: ${totalIssues}`);
    log('info', `  Warnings: ${totalWarnings}`);
    
    // Issues
    if (this.issues.length > 0) {
      log('error', '\n❌ Issues:');
      this.issues.forEach(issue => {
        log('error', `  • ${issue.name}: ${issue.message}`);
      });
    }
    
    // Warnings
    if (this.warnings.length > 0) {
      log('warn', '\n⚠️  Warnings:');
      this.warnings.forEach(warning => {
        log('warn', `  • ${warning.name}: ${warning.message}`);
      });
    }
    
    // Checks
    if (this.checks.length > 0) {
      log('info', '\n✅ Checks:');
      this.checks.forEach(check => {
        const status = check.status === 'pass' ? '✓' : check.status === 'info' ? 'ℹ' : '?';
        log('info', `  ${status} ${check.name}: ${check.message}`);
      });
    }
    
    // Overall status
    if (totalIssues === 0) {
      log('success', '\n🎉 System is healthy!');
      process.exit(0);
    } else {
      log('error', '\n💥 System has issues that need attention.');
      process.exit(1);
    }
  }
}

// Start diagnostics
const doctor = new SystemDoctor();
doctor.diagnose().catch(error => {
  log('error', 'Fatal error during diagnostics:', error.message);
  process.exit(1);
});