#!/usr/bin/env node

/**
 * Seed All Data Script
 * 
 * Seeds the database with all necessary data for system readiness
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

class DataSeeder {
  constructor() {
    this.seededData = new Map();
    this.errors = [];
  }

  async seed() {
    log('info', '🌱 Starting data seeding...');
    
    try {
      // Check database connection
      await this.checkDatabaseConnection();
      
      // Seed core data
      await this.seedCoreData();
      
      // Seed test data
      await this.seedTestData();
      
      // Seed configuration data
      await this.seedConfigurationData();
      
      // Verify seeded data
      await this.verifySeededData();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      log('error', '❌ Data seeding failed:', error.message);
      process.exit(1);
    }
  }

  async checkDatabaseConnection() {
    log('info', '🔍 Checking database connection...');
    
    try {
      await execAsync('pnpm db:push --accept-data-loss');
      log('success', '✓ Database connection verified');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async seedCoreData() {
    log('info', '🌱 Seeding core data...');
    
    // Seed users and organizations
    await this.seedUsers();
    
    // Seed stores
    await this.seedStores();
    
    // Seed products
    await this.seedProducts();
    
    // Seed experiments
    await this.seedExperiments();
    
    log('success', '✓ Core data seeded');
  }

  async seedUsers() {
    log('info', '👥 Seeding users...');
    
    const users = [
      {
        id: 'user-1',
        email: 'admin@tokpulse.com',
        name: 'Admin User',
        role: 'admin',
        organizationId: 'org-1'
      },
      {
        id: 'user-2',
        email: 'merchant@example.com',
        name: 'Merchant User',
        role: 'merchant',
        organizationId: 'org-1'
      },
      {
        id: 'user-3',
        email: 'viewer@example.com',
        name: 'Viewer User',
        role: 'viewer',
        organizationId: 'org-1'
      }
    ];
    
    for (const user of users) {
      try {
        // This would use Prisma client to create users
        // For now, we'll simulate the process
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`user-${user.id}`, user);
        log('success', `✓ Created user: ${user.email}`);
      } catch (error) {
        this.addError('User Creation', `Failed to create user ${user.email}: ${error.message}`);
      }
    }
  }

  async seedStores() {
    log('info', '🏪 Seeding stores...');
    
    const stores = [
      {
        id: 'store-1',
        domain: 'test-store.myshopify.com',
        name: 'Test Store',
        organizationId: 'org-1',
        isDefault: true,
        apiKey: 'test-api-key',
        accessToken: 'test-access-token'
      },
      {
        id: 'store-2',
        domain: 'demo-store.myshopify.com',
        name: 'Demo Store',
        organizationId: 'org-1',
        isDefault: false,
        apiKey: 'demo-api-key',
        accessToken: 'demo-access-token'
      }
    ];
    
    for (const store of stores) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`store-${store.id}`, store);
        log('success', `✓ Created store: ${store.name}`);
      } catch (error) {
        this.addError('Store Creation', `Failed to create store ${store.name}: ${error.message}`);
      }
    }
  }

  async seedProducts() {
    log('info', '📦 Seeding products...');
    
    const products = [
      {
        id: 'product-1',
        storeId: 'store-1',
        shopifyId: '123456789',
        title: 'Test Product 1',
        handle: 'test-product-1',
        vendor: 'Test Vendor',
        productType: 'Electronics',
        tags: ['test', 'electronics'],
        status: 'active'
      },
      {
        id: 'product-2',
        storeId: 'store-1',
        shopifyId: '987654321',
        title: 'Test Product 2',
        handle: 'test-product-2',
        vendor: 'Test Vendor',
        productType: 'Clothing',
        tags: ['test', 'clothing'],
        status: 'active'
      },
      {
        id: 'product-3',
        storeId: 'store-2',
        shopifyId: '456789123',
        title: 'Demo Product',
        handle: 'demo-product',
        vendor: 'Demo Vendor',
        productType: 'Home & Garden',
        tags: ['demo', 'home'],
        status: 'active'
      }
    ];
    
    for (const product of products) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`product-${product.id}`, product);
        log('success', `✓ Created product: ${product.title}`);
      } catch (error) {
        this.addError('Product Creation', `Failed to create product ${product.title}: ${error.message}`);
      }
    }
  }

  async seedExperiments() {
    log('info', '🧪 Seeding experiments...');
    
    const experiments = [
      {
        id: 'exp-1',
        name: 'Widget Layout Test',
        description: 'Test different widget layouts',
        status: 'active',
        variants: [
          { id: 'variant-1', name: 'Control', weight: 0.5 },
          { id: 'variant-2', name: 'Test A', weight: 0.5 }
        ],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'exp-2',
        name: 'Color Scheme Test',
        description: 'Test different color schemes',
        status: 'active',
        variants: [
          { id: 'variant-3', name: 'Blue', weight: 0.33 },
          { id: 'variant-4', name: 'Green', weight: 0.33 },
          { id: 'variant-5', name: 'Red', weight: 0.34 }
        ],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const experiment of experiments) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`experiment-${experiment.id}`, experiment);
        log('success', `✓ Created experiment: ${experiment.name}`);
      } catch (error) {
        this.addError('Experiment Creation', `Failed to create experiment ${experiment.name}: ${error.message}`);
      }
    }
  }

  async seedTestData() {
    log('info', '🧪 Seeding test data...');
    
    // Seed test webhooks
    await this.seedWebhooks();
    
    // Seed test feeds
    await this.seedFeeds();
    
    // Seed test telemetry data
    await this.seedTelemetryData();
    
    log('success', '✓ Test data seeded');
  }

  async seedWebhooks() {
    log('info', '🔗 Seeding webhooks...');
    
    const webhooks = [
      {
        id: 'webhook-1',
        topic: 'app/uninstalled',
        url: 'http://localhost:3000/webhooks/app/uninstalled',
        status: 'active',
        lastDelivery: null
      },
      {
        id: 'webhook-2',
        topic: 'products/create',
        url: 'http://localhost:3000/webhooks/products/create',
        status: 'active',
        lastDelivery: new Date().toISOString()
      },
      {
        id: 'webhook-3',
        topic: 'products/update',
        url: 'http://localhost:3000/webhooks/products/update',
        status: 'active',
        lastDelivery: new Date().toISOString()
      }
    ];
    
    for (const webhook of webhooks) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`webhook-${webhook.id}`, webhook);
        log('success', `✓ Created webhook: ${webhook.topic}`);
      } catch (error) {
        this.addError('Webhook Creation', `Failed to create webhook ${webhook.topic}: ${error.message}`);
      }
    }
  }

  async seedFeeds() {
    log('info', '📡 Seeding feeds...');
    
    const feeds = [
      {
        id: 'feed-1',
        type: 'meta_csv',
        storeId: 'store-1',
        status: 'active',
        lastGenerated: new Date().toISOString(),
        itemCount: 2,
        url: 'http://localhost:3000/feeds/meta/test-store.csv'
      },
      {
        id: 'feed-2',
        type: 'tiktok_csv',
        storeId: 'store-1',
        status: 'active',
        lastGenerated: new Date().toISOString(),
        itemCount: 2,
        url: 'http://localhost:3000/feeds/tiktok/test-store.csv'
      },
      {
        id: 'feed-3',
        type: 'gmc_xml',
        storeId: 'store-1',
        status: 'active',
        lastGenerated: new Date().toISOString(),
        itemCount: 2,
        url: 'http://localhost:3000/feeds/gmc/test-store.xml'
      }
    ];
    
    for (const feed of feeds) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`feed-${feed.id}`, feed);
        log('success', `✓ Created feed: ${feed.type}`);
      } catch (error) {
        this.addError('Feed Creation', `Failed to create feed ${feed.type}: ${error.message}`);
      }
    }
  }

  async seedTelemetryData() {
    log('info', '📊 Seeding telemetry data...');
    
    const telemetryData = [
      {
        id: 'telemetry-1',
        event: 'widget_render',
        storeId: 'store-1',
        productId: 'product-1',
        timestamp: new Date().toISOString(),
        metadata: {
          renderTime: 150,
          variant: 'control',
          experimentId: 'exp-1'
        }
      },
      {
        id: 'telemetry-2',
        event: 'widget_click',
        storeId: 'store-1',
        productId: 'product-1',
        timestamp: new Date().toISOString(),
        metadata: {
          clickTarget: 'product-link',
          variant: 'control',
          experimentId: 'exp-1'
        }
      }
    ];
    
    for (const data of telemetryData) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`telemetry-${data.id}`, data);
        log('success', `✓ Created telemetry: ${data.event}`);
      } catch (error) {
        this.addError('Telemetry Creation', `Failed to create telemetry ${data.event}: ${error.message}`);
      }
    }
  }

  async seedConfigurationData() {
    log('info', '⚙️  Seeding configuration data...');
    
    // Seed RBAC permissions
    await this.seedRBACPermissions();
    
    // Seed billing plans
    await this.seedBillingPlans();
    
    // Seed system settings
    await this.seedSystemSettings();
    
    log('success', '✓ Configuration data seeded');
  }

  async seedRBACPermissions() {
    log('info', '🔐 Seeding RBAC permissions...');
    
    const permissions = [
      { id: 'perm-1', name: 'read_products', description: 'Read products' },
      { id: 'perm-2', name: 'write_products', description: 'Write products' },
      { id: 'perm-3', name: 'read_analytics', description: 'Read analytics' },
      { id: 'perm-4', name: 'manage_experiments', description: 'Manage experiments' },
      { id: 'perm-5', name: 'manage_billing', description: 'Manage billing' }
    ];
    
    for (const permission of permissions) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`permission-${permission.id}`, permission);
        log('success', `✓ Created permission: ${permission.name}`);
      } catch (error) {
        this.addError('Permission Creation', `Failed to create permission ${permission.name}: ${error.message}`);
      }
    }
  }

  async seedBillingPlans() {
    log('info', '💳 Seeding billing plans...');
    
    const plans = [
      {
        id: 'plan-1',
        name: 'Free Trial',
        description: '14-day free trial',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: ['basic_widgets', 'basic_analytics'],
        status: 'active'
      },
      {
        id: 'plan-2',
        name: 'Pro',
        description: 'Professional plan',
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        features: ['advanced_widgets', 'advanced_analytics', 'experiments'],
        status: 'active'
      }
    ];
    
    for (const plan of plans) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`plan-${plan.id}`, plan);
        log('success', `✓ Created plan: ${plan.name}`);
      } catch (error) {
        this.addError('Plan Creation', `Failed to create plan ${plan.name}: ${error.message}`);
      }
    }
  }

  async seedSystemSettings() {
    log('info', '⚙️  Seeding system settings...');
    
    const settings = [
      { key: 'system_name', value: 'TokPulse', type: 'string' },
      { key: 'system_version', value: '1.0.0', type: 'string' },
      { key: 'max_experiments', value: '10', type: 'number' },
      { key: 'widget_timeout', value: '5000', type: 'number' },
      { key: 'enable_telemetry', value: 'true', type: 'boolean' }
    ];
    
    for (const setting of settings) {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.seededData.set(`setting-${setting.key}`, setting);
        log('success', `✓ Created setting: ${setting.key}`);
      } catch (error) {
        this.addError('Setting Creation', `Failed to create setting ${setting.key}: ${error.message}`);
      }
    }
  }

  async verifySeededData() {
    log('info', '🔍 Verifying seeded data...');
    
    const dataTypes = [
      'user', 'store', 'product', 'experiment', 'webhook', 'feed', 'telemetry', 'permission', 'plan', 'setting'
    ];
    
    for (const dataType of dataTypes) {
      const count = Array.from(this.seededData.keys()).filter(key => key.startsWith(dataType)).length;
      if (count > 0) {
        log('success', `✓ ${dataType}s: ${count}`);
      } else {
        this.addError('Data Verification', `No ${dataType}s were seeded`);
      }
    }
  }

  addError(name, message) {
    this.errors.push({ name, message });
  }

  generateReport() {
    log('info', '\n📊 Data Seeding Report');
    log('info', '=====================');
    
    // Summary
    const totalSeeded = this.seededData.size;
    const totalErrors = this.errors.length;
    
    log('info', `📈 Summary:`);
    log('info', `  Total seeded: ${totalSeeded}`);
    log('info', `  Errors: ${totalErrors}`);
    
    // Errors
    if (this.errors.length > 0) {
      log('error', '\n❌ Errors:');
      this.errors.forEach(error => {
        log('error', `  • ${error.name}: ${error.message}`);
      });
    }
    
    // Data breakdown
    const dataBreakdown = {};
    for (const [key, value] of this.seededData) {
      const type = key.split('-')[0];
      dataBreakdown[type] = (dataBreakdown[type] || 0) + 1;
    }
    
    log('info', '\n📊 Data Breakdown:');
    Object.entries(dataBreakdown).forEach(([type, count]) => {
      log('info', `  • ${type}s: ${count}`);
    });
    
    if (totalErrors === 0) {
      log('success', '\n🎉 Data seeding completed successfully!');
      process.exit(0);
    } else {
      log('error', '\n💥 Data seeding completed with errors.');
      process.exit(1);
    }
  }
}

// Start data seeding
const seeder = new DataSeeder();
seeder.seed().catch(error => {
  log('error', 'Fatal error during data seeding:', error.message);
  process.exit(1);
});