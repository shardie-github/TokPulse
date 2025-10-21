import { PrismaClient } from '@tokpulse/db'
import { z } from 'zod'

// Test utilities
export class TestUtils {
  // Create test database
  static async createTestDatabase(): Promise<PrismaClient> {
    const testDb = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'file:./test.db',
        },
      },
    })

    // Clean database before tests
    await testDb.$executeRaw`DELETE FROM usage_records`
    await testDb.$executeRaw`DELETE FROM subscriptions`
    await testDb.$executeRaw`DELETE FROM plans`
    await testDb.$executeRaw`DELETE FROM stores`
    await testDb.$executeRaw`DELETE FROM users`
    await testDb.$executeRaw`DELETE FROM organizations`

    return testDb
  }

  // Create test data
  static async createTestData(db: PrismaClient): Promise<{
    organization: any
    user: any
    store: any
    plan: any
    subscription: any
  }> {
    const organization = await db.organization.create({
      data: {
        name: 'Test Organization',
        email: 'test@example.com',
        domain: 'test.example.com',
      },
    })

    const user = await db.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'OWNER',
        organizationId: organization.id,
      },
    })

    const store = await db.store.create({
      data: {
        shopDomain: 'test-shop.myshopify.com',
        accessToken: 'test-access-token',
        scopes: 'read_products,read_orders',
        organizationId: organization.id,
      },
    })

    const plan = await db.plan.create({
      data: {
        key: 'STARTER',
        name: 'Starter Plan',
        description: 'Basic plan for small stores',
        price: 0,
        currency: 'USD',
        interval: 'month',
        features: JSON.stringify(['basic_analytics', 'product_recommendations']),
        limits: JSON.stringify({ api_calls: 1000, stores: 1 }),
      },
    })

    const subscription = await db.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    })

    return { organization, user, store, plan, subscription }
  }

  // Mock external services
  static createMockShopifyApi() {
    return {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    }
  }

  static createMockStripeApi() {
    return {
      customers: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        list: jest.fn(),
      },
      subscriptions: {
        create: jest.fn(),
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
        list: jest.fn(),
      },
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    }
  }

  // Generate test data
  static generateTestUser(overrides: Partial<any> = {}): any {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ANALYST',
      organizationId: 'test-org-id',
      ...overrides,
    }
  }

  static generateTestOrganization(overrides: Partial<any> = {}): any {
    return {
      id: 'test-org-id',
      name: 'Test Organization',
      email: 'test@example.com',
      domain: 'test.example.com',
      status: 'ACTIVE',
      ...overrides,
    }
  }

  static generateTestStore(overrides: Partial<any> = {}): any {
    return {
      id: 'test-store-id',
      shopDomain: 'test-shop.myshopify.com',
      accessToken: 'test-access-token',
      scopes: 'read_products,read_orders',
      region: 'us',
      status: 'ACTIVE',
      organizationId: 'test-org-id',
      ...overrides,
    }
  }

  static generateTestPlan(overrides: Partial<any> = {}): any {
    return {
      id: 'test-plan-id',
      key: 'STARTER',
      name: 'Starter Plan',
      description: 'Basic plan for small stores',
      price: 0,
      currency: 'USD',
      interval: 'month',
      features: ['basic_analytics', 'product_recommendations'],
      limits: { api_calls: 1000, stores: 1 },
      isActive: true,
      ...overrides,
    }
  }

  static generateTestSubscription(overrides: Partial<any> = {}): any {
    return {
      id: 'test-subscription-id',
      organizationId: 'test-org-id',
      planId: 'test-plan-id',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      ...overrides,
    }
  }

  // Wait for async operations
  static async waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Retry function
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 100
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < maxAttempts) {
          await this.waitFor(delay * attempt)
        }
      }
    }

    throw lastError || new Error('Retry failed')
  }
}

// Test database helper
export class TestDatabase {
  private db: PrismaClient
  private isConnected: boolean = false

  constructor(db: PrismaClient) {
    this.db = db
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.db.$connect()
      this.isConnected = true
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.db.$disconnect()
      this.isConnected = false
    }
  }

  async cleanup(): Promise<void> {
    // Clean up test data
    await this.db.$executeRaw`DELETE FROM usage_records`
    await this.db.$executeRaw`DELETE FROM subscriptions`
    await this.db.$executeRaw`DELETE FROM plans`
    await this.db.$executeRaw`DELETE FROM stores`
    await this.db.$executeRaw`DELETE FROM users`
    await this.db.$executeRaw`DELETE FROM organizations`
  }

  get client(): PrismaClient {
    return this.db
  }
}

// Mock utilities
export class MockUtils {
  // Mock fetch
  static mockFetch(responses: Record<string, any> = {}): jest.MockedFunction<typeof fetch> {
    const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
    
    mockFetch.mockImplementation((url: string) => {
      const response = responses[url] || { status: 404, json: () => Promise.resolve({ error: 'Not found' }) }
      
      return Promise.resolve({
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        json: () => Promise.resolve(response.json || {}),
        text: () => Promise.resolve(response.text || ''),
        headers: new Headers(response.headers || {}),
      } as Response)
    })

    return mockFetch
  }

  // Mock console methods
  static mockConsole(): {
    console: jest.SpyInstance
    restore: () => void
  } {
    const originalConsole = { ...console }
    const mockConsole = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }

    Object.assign(console, mockConsole)

    return {
      console: mockConsole as any,
      restore: () => Object.assign(console, originalConsole),
    }
  }

  // Mock environment variables
  static mockEnv(env: Record<string, string>): () => void {
    const originalEnv = { ...process.env }
    Object.assign(process.env, env)

    return () => Object.assign(process.env, originalEnv)
  }
}

// Test data factories
export class TestDataFactory {
  // Create multiple test users
  static createUsers(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, i) => 
      TestUtils.generateTestUser({
        id: `test-user-${i}`,
        email: `test${i}@example.com`,
        ...overrides,
      })
    )
  }

  // Create multiple test stores
  static createStores(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, (_, i) => 
      TestUtils.generateTestStore({
        id: `test-store-${i}`,
        shopDomain: `test-shop-${i}.myshopify.com`,
        ...overrides,
      })
    )
  }

  // Create test usage records
  static createUsageRecords(
    subscriptionId: string,
    count: number,
    overrides: Partial<any> = {}
  ): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `test-usage-${i}`,
      subscriptionId,
      metric: 'API_CALLS',
      quantity: Math.floor(Math.random() * 100),
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over days
      ...overrides,
    }))
  }
}

// Test assertions
export class TestAssertions {
  // Assert API response
  static assertApiResponse(
    response: any,
    expectedStatus: number,
    expectedData?: any
  ): void {
    expect(response.status).toBe(expectedStatus)
    
    if (expectedData) {
      expect(response.data).toEqual(expectedData)
    }
  }

  // Assert error response
  static assertErrorResponse(
    response: any,
    expectedCode: string,
    expectedMessage?: string
  ): void {
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.data.code).toBe(expectedCode)
    
    if (expectedMessage) {
      expect(response.data.message).toContain(expectedMessage)
    }
  }

  // Assert database record
  static assertDatabaseRecord(
    record: any,
    expectedData: any
  ): void {
    Object.entries(expectedData).forEach(([key, value]) => {
      expect(record[key]).toEqual(value)
    })
  }

  // Assert validation error
  static assertValidationError(
    error: any,
    expectedField: string,
    expectedMessage?: string
  ): void {
    expect(error.name).toBe('ValidationError')
    expect(error.code).toBe('VALIDATION_ERROR')
    
    if (expectedMessage) {
      expect(error.message).toContain(expectedMessage)
    }
  }
}

// Test configuration
export const testConfig = {
  database: {
    url: process.env.TEST_DATABASE_URL || 'file:./test.db',
  },
  api: {
    baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000',
    timeout: 10000,
  },
  external: {
    shopify: {
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
    },
    stripe: {
      secretKey: 'sk_test_...',
      webhookSecret: 'whsec_...',
    },
  },
}

// Test setup and teardown
export async function setupTest(): Promise<{
  db: TestDatabase
  cleanup: () => Promise<void>
}> {
  const db = new PrismaClient({
    datasources: {
      db: {
        url: testConfig.database.url,
      },
    },
  })

  const testDb = new TestDatabase(db)
  await testDb.connect()
  await testDb.cleanup()

  return {
    db: testDb,
    cleanup: async () => {
      await testDb.cleanup()
      await testDb.disconnect()
    },
  }
}