#!/usr/bin/env node

/**
 * Contract Integrity Checker
 * 
 * Build & compare generated OpenAPI from packages/api with published /docs/openapi.json
 * Fail on drift
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

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

class ContractChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.drift = [];
  }

  async check() {
    log('info', '📋 Checking API contract integrity...');
    
    try {
      // Generate OpenAPI spec from source
      await this.generateOpenAPI();
      
      // Load generated and published specs
      const generatedSpec = await this.loadGeneratedSpec();
      const publishedSpec = await this.loadPublishedSpec();
      
      if (!generatedSpec || !publishedSpec) {
        throw new Error('Could not load OpenAPI specifications');
      }
      
      // Compare specifications
      await this.compareSpecs(generatedSpec, publishedSpec);
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log('error', '❌ Contract check failed:', error.message);
      process.exit(1);
    }
  }

  async generateOpenAPI() {
    log('info', '🔨 Generating OpenAPI specification...');
    
    try {
      // Build the API package first
      await execAsync('pnpm --filter api build');
      
      // Generate OpenAPI spec
      await execAsync('pnpm api:openapi');
      
      log('success', '✓ OpenAPI specification generated');
    } catch (error) {
      throw new Error(`Failed to generate OpenAPI spec: ${error.message}`);
    }
  }

  async loadGeneratedSpec() {
    const generatedPath = join(rootDir, 'packages/api/dist/openapi.json');
    
    if (!existsSync(generatedPath)) {
      this.addError('Generated spec missing', 'OpenAPI spec not generated at packages/api/dist/openapi.json');
      return null;
    }
    
    try {
      const content = readFileSync(generatedPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.addError('Generated spec invalid', `Failed to parse generated OpenAPI spec: ${error.message}`);
      return null;
    }
  }

  async loadPublishedSpec() {
    const publishedPath = join(rootDir, 'docs/openapi.json');
    
    if (!existsSync(publishedPath)) {
      this.addWarning('Published spec missing', 'No published OpenAPI spec found at docs/openapi.json');
      return null;
    }
    
    try {
      const content = readFileSync(publishedPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      this.addError('Published spec invalid', `Failed to parse published OpenAPI spec: ${error.message}`);
      return null;
    }
  }

  async compareSpecs(generated, published) {
    log('info', '🔍 Comparing specifications...');
    
    // Compare basic structure
    this.compareBasicStructure(generated, published);
    
    // Compare paths
    this.comparePaths(generated, published);
    
    // Compare components
    this.compareComponents(generated, published);
    
    // Compare info
    this.compareInfo(generated, published);
  }

  compareBasicStructure(generated, published) {
    const requiredFields = ['openapi', 'info', 'paths', 'components'];
    
    for (const field of requiredFields) {
      if (!generated[field]) {
        this.addError('Generated spec incomplete', `Missing required field: ${field}`);
      }
      if (!published[field]) {
        this.addError('Published spec incomplete', `Missing required field: ${field}`);
      }
    }
    
    // Compare OpenAPI version
    if (generated.openapi !== published.openapi) {
      this.addDrift('OpenAPI version', generated.openapi, published.openapi);
    }
  }

  comparePaths(generated, published) {
    const generatedPaths = Object.keys(generated.paths || {});
    const publishedPaths = Object.keys(published.paths || {});
    
    // Find new paths
    const newPaths = generatedPaths.filter(path => !publishedPaths.includes(path));
    if (newPaths.length > 0) {
      this.addDrift('New paths', newPaths.join(', '), 'Not in published spec');
    }
    
    // Find removed paths
    const removedPaths = publishedPaths.filter(path => !generatedPaths.includes(path));
    if (removedPaths.length > 0) {
      this.addDrift('Removed paths', 'Not in generated spec', removedPaths.join(', '));
    }
    
    // Compare existing paths
    const commonPaths = generatedPaths.filter(path => publishedPaths.includes(path));
    for (const path of commonPaths) {
      this.comparePathDetails(generated.paths[path], published.paths[path], path);
    }
  }

  comparePathDetails(generatedPath, publishedPath, pathName) {
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
    
    for (const method of methods) {
      if (generatedPath[method] && publishedPath[method]) {
        this.compareMethodDetails(generatedPath[method], publishedPath[method], pathName, method);
      } else if (generatedPath[method] && !publishedPath[method]) {
        this.addDrift(`New method ${method.toUpperCase()}`, `${pathName}`, 'Not in published spec');
      } else if (!generatedPath[method] && publishedPath[method]) {
        this.addDrift(`Removed method ${method.toUpperCase()}`, 'Not in generated spec', `${pathName}`);
      }
    }
  }

  compareMethodDetails(generatedMethod, publishedMethod, pathName, method) {
    // Compare summary
    if (generatedMethod.summary !== publishedMethod.summary) {
      this.addDrift(`Summary for ${method.toUpperCase()} ${pathName}`, generatedMethod.summary, publishedMethod.summary);
    }
    
    // Compare parameters
    this.compareParameters(generatedMethod.parameters, publishedMethod.parameters, pathName, method);
    
    // Compare responses
    this.compareResponses(generatedMethod.responses, publishedMethod.responses, pathName, method);
  }

  compareParameters(generatedParams, publishedParams, pathName, method) {
    const generatedParamNames = (generatedParams || []).map(p => p.name);
    const publishedParamNames = (publishedParams || []).map(p => p.name);
    
    const newParams = generatedParamNames.filter(name => !publishedParamNames.includes(name));
    const removedParams = publishedParamNames.filter(name => !generatedParamNames.includes(name));
    
    if (newParams.length > 0) {
      this.addDrift(`New parameters for ${method.toUpperCase()} ${pathName}`, newParams.join(', '), 'Not in published spec');
    }
    
    if (removedParams.length > 0) {
      this.addDrift(`Removed parameters for ${method.toUpperCase()} ${pathName}`, 'Not in generated spec', removedParams.join(', '));
    }
  }

  compareResponses(generatedResponses, publishedResponses, pathName, method) {
    const generatedCodes = Object.keys(generatedResponses || {});
    const publishedCodes = Object.keys(publishedResponses || {});
    
    const newCodes = generatedCodes.filter(code => !publishedCodes.includes(code));
    const removedCodes = publishedCodes.filter(code => !generatedCodes.includes(code));
    
    if (newCodes.length > 0) {
      this.addDrift(`New response codes for ${method.toUpperCase()} ${pathName}`, newCodes.join(', '), 'Not in published spec');
    }
    
    if (removedCodes.length > 0) {
      this.addDrift(`Removed response codes for ${method.toUpperCase()} ${pathName}`, 'Not in generated spec', removedCodes.join(', '));
    }
  }

  compareComponents(generated, published) {
    const generatedSchemas = Object.keys(generated.components?.schemas || {});
    const publishedSchemas = Object.keys(published.components?.schemas || {});
    
    const newSchemas = generatedSchemas.filter(schema => !publishedSchemas.includes(schema));
    const removedSchemas = publishedSchemas.filter(schema => !generatedSchemas.includes(schema));
    
    if (newSchemas.length > 0) {
      this.addDrift('New schemas', newSchemas.join(', '), 'Not in published spec');
    }
    
    if (removedSchemas.length > 0) {
      this.addDrift('Removed schemas', 'Not in generated spec', removedSchemas.join(', '));
    }
  }

  compareInfo(generated, published) {
    if (generated.info?.title !== published.info?.title) {
      this.addDrift('API title', generated.info?.title, published.info?.title);
    }
    
    if (generated.info?.version !== published.info?.version) {
      this.addDrift('API version', generated.info?.version, published.info?.version);
    }
    
    if (generated.info?.description !== published.info?.description) {
      this.addDrift('API description', generated.info?.description, published.info?.description);
    }
  }

  addError(name, message) {
    this.errors.push({ name, message });
  }

  addWarning(name, message) {
    this.warnings.push({ name, message });
  }

  addDrift(name, generated, published) {
    this.drift.push({ name, generated, published });
  }

  generateReport() {
    log('info', '\n📊 Contract Integrity Report');
    log('info', '===========================');
    
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
    
    // Drift
    if (this.drift.length > 0) {
      log('error', '\n🔄 API Drift Detected:');
      this.drift.forEach(drift => {
        log('error', `  • ${drift.name}:`);
        log('error', `    Generated: ${drift.generated}`);
        log('error', `    Published: ${drift.published}`);
      });
    }
    
    // Summary
    const totalErrors = this.errors.length;
    const totalWarnings = this.warnings.length;
    const totalDrift = this.drift.length;
    
    log('info', `\n📈 Summary:`);
    log('info', `  Errors: ${totalErrors}`);
    log('info', `  Warnings: ${totalWarnings}`);
    log('info', `  Drift: ${totalDrift}`);
    
    if (totalErrors === 0 && totalDrift === 0) {
      log('success', '\n🎉 Contract integrity check passed!');
      process.exit(0);
    } else {
      log('error', '\n💥 Contract integrity check failed.');
      process.exit(1);
    }
  }
}

// Start contract check
const checker = new ContractChecker();
checker.check().catch(error => {
  log('error', 'Fatal error during contract check:', error.message);
  process.exit(1);
});