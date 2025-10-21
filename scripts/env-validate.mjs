#!/usr/bin/env node

/**
 * Environment Validator
 * 
 * Validates .env vs .env.example, required keys present, no unknown vars, Prisma WASM set
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  async validate() {
    log('info', '🔧 Validating environment configuration...');
    
    try {
      // Check if .env.example exists
      await this.checkEnvExample();
      
      // Check if .env exists
      await this.checkEnvFile();
      
      // Parse environment files
      const envExample = this.parseEnvFile(join(rootDir, '.env.example'));
      const env = this.parseEnvFile(join(rootDir, '.env'));
      
      // Validate required variables
      await this.validateRequiredVariables(envExample, env);
      
      // Check for unknown variables
      await this.checkUnknownVariables(envExample, env);
      
      // Validate Prisma WASM setting
      await this.validatePrismaWasm(env);
      
      // Validate variable formats
      await this.validateVariableFormats(env);
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log('error', '❌ Environment validation failed:', error.message);
      process.exit(1);
    }
  }

  async checkEnvExample() {
    const envExamplePath = join(rootDir, '.env.example');
    if (!existsSync(envExamplePath)) {
      this.addError('Missing .env.example', 'Template environment file not found');
      return;
    }
    
    log('success', '✓ .env.example found');
  }

  async checkEnvFile() {
    const envPath = join(rootDir, '.env');
    if (!existsSync(envPath)) {
      this.addError('Missing .env', '.env file not found - copy from .env.example');
      return;
    }
    
    log('success', '✓ .env file found');
  }

  parseEnvFile(filePath) {
    if (!existsSync(filePath)) {
      return {};
    }
    
    const content = readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach((line, index) => {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        return;
      }
      
      // Parse KEY=VALUE format
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key.trim()] = value.trim();
      } else {
        this.addWarning(`Invalid line format in ${filePath}:${index + 1}`, line);
      }
    });
    
    return env;
  }

  async validateRequiredVariables(envExample, env) {
    log('info', '🔍 Checking required variables...');
    
    const requiredVars = [
      'NODE_ENV',
      'APP_URL',
      'SESSION_SECRET',
      'DATABASE_URL',
      'SHOPIFY_API_KEY',
      'SHOPIFY_API_SECRET',
      'SHOPIFY_SCOPES',
      'SHOPIFY_APP_URL',
      'SHOPIFY_WEBHOOK_SECRET'
    ];
    
    for (const varName of requiredVars) {
      if (!env[varName]) {
        if (envExample[varName]) {
          this.addError(`Missing required variable: ${varName}`, `Add ${varName}=${envExample[varName]} to .env`);
        } else {
          this.addError(`Missing required variable: ${varName}`, `Variable ${varName} is required but not in .env.example`);
        }
      } else if (env[varName] === envExample[varName] && envExample[varName].includes('change_me')) {
        this.addWarning(`Default value for ${varName}`, `Consider changing default value: ${env[varName]}`);
      } else {
        log('success', `✓ ${varName} is set`);
      }
    }
  }

  async checkUnknownVariables(envExample, env) {
    log('info', '🔍 Checking for unknown variables...');
    
    const exampleKeys = new Set(Object.keys(envExample));
    const envKeys = new Set(Object.keys(env));
    
    // Find variables in .env that are not in .env.example
    const unknownVars = [...envKeys].filter(key => !exampleKeys.has(key));
    
    if (unknownVars.length > 0) {
      this.addWarning('Unknown variables in .env', `Variables not in .env.example: ${unknownVars.join(', ')}`);
    } else {
      log('success', '✓ No unknown variables found');
    }
  }

  async validatePrismaWasm(env) {
    log('info', '🔍 Validating Prisma WASM setting...');
    
    if (env.PRISMA_CLIENT_ENGINE_TYPE !== 'wasm') {
      this.addError('Prisma WASM not set', 'PRISMA_CLIENT_ENGINE_TYPE must be set to "wasm"');
      this.addFix('Set Prisma WASM', 'Add PRISMA_CLIENT_ENGINE_TYPE=wasm to .env');
    } else {
      log('success', '✓ PRISMA_CLIENT_ENGINE_TYPE is set to wasm');
    }
  }

  async validateVariableFormats(env) {
    log('info', '🔍 Validating variable formats...');
    
    // Validate URLs
    const urlVars = ['APP_URL', 'SHOPIFY_APP_URL', 'DATABASE_URL'];
    for (const varName of urlVars) {
      if (env[varName]) {
        try {
          new URL(env[varName]);
          log('success', `✓ ${varName} is a valid URL`);
        } catch (error) {
          this.addError(`Invalid URL format: ${varName}`, `Value "${env[varName]}" is not a valid URL`);
        }
      }
    }
    
    // Validate Node environment
    if (env.NODE_ENV && !['development', 'production', 'test'].includes(env.NODE_ENV)) {
      this.addWarning('Invalid NODE_ENV', `NODE_ENV should be development, production, or test, got: ${env.NODE_ENV}`);
    }
    
    // Validate Shopify scopes
    if (env.SHOPIFY_SCOPES) {
      const requiredScopes = ['read_products', 'write_products', 'read_orders', 'read_themes', 'write_themes', 'read_customers'];
      const scopes = env.SHOPIFY_SCOPES.split(',').map(s => s.trim());
      const missingScopes = requiredScopes.filter(scope => !scopes.includes(scope));
      
      if (missingScopes.length > 0) {
        this.addWarning('Missing Shopify scopes', `Consider adding: ${missingScopes.join(', ')}`);
      } else {
        log('success', '✓ All required Shopify scopes present');
      }
    }
  }

  addError(name, message) {
    this.errors.push({ name, message });
  }

  addWarning(name, message) {
    this.warnings.push({ name, message });
  }

  addFix(name, message) {
    this.fixes.push({ name, message });
  }

  generateReport() {
    log('info', '\n📊 Environment Validation Report');
    log('info', '================================');
    
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
    
    // Fixes
    if (this.fixes.length > 0) {
      log('info', '\n🔧 Suggested Fixes:');
      this.fixes.forEach(fix => {
        log('info', `  • ${fix.name}: ${fix.message}`);
      });
    }
    
    // Summary
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    
    log('info', `\n📈 Summary:`);
    log('info', `  Errors: ${totalErrors}`);
    log('info', `  Warnings: ${totalWarnings}`);
    
    if (totalErrors === 0) {
      log('success', '\n🎉 Environment validation passed!');
      process.exit(0);
    } else {
      log('error', '\n💥 Environment validation failed.');
      process.exit(1);
    }
  }
}

// Start validation
const validator = new EnvironmentValidator();
validator.validate().catch(error => {
  log('error', 'Fatal error during validation:', error.message);
  process.exit(1);
});