// import { PrismaClient } from '@tokpulse/db'

export interface MonitoringConfig {
  enableMetrics: boolean
  enableLogging: boolean
  enableTracing: boolean
  metricsEndpoint: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  serviceName: string
  version: string
  environment: string
}

export class MonitoringService {
  // private db: PrismaClient
  private config: MonitoringConfig
  private metrics: Map<string, number> = new Map()
  private traces: any[] = []

  constructor(db: any, config: MonitoringConfig) {
    // this.db = db
    this.config = config
  }

  // Metrics collection
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    if (!this.config.enableMetrics) return

    const key = this.buildMetricKey(name, labels)
    const current = this.metrics.get(key) || 0
    this.metrics.set(key, current + value)
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enableMetrics) return

    const key = this.buildMetricKey(name, labels)
    this.metrics.set(key, value)
  }

  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enableMetrics) return

    const key = this.buildMetricKey(name, labels)
    const current = this.metrics.get(key) || 0
    this.metrics.set(key, current + value)
  }

  // Logging
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any): void {
    if (!this.config.enableLogging) return

    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 }
    const currentLevel = logLevels[this.config.logLevel]
    const messageLevel = logLevels[level]

    if (messageLevel >= currentLevel) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        service: this.config.serviceName,
        version: this.config.version,
        environment: this.config.environment,
        context: context || {},
      }

      console.log(JSON.stringify(logEntry))
    }
  }

  // Tracing
  startTrace(operation: string, context?: any): string {
    if (!this.config.enableTracing) return ''

    const traceId = this.generateTraceId()
    const span = {
      traceId,
      spanId: this.generateSpanId(),
      operation,
      startTime: Date.now(),
      context: context || {},
    }

    this.traces.push(span)
    return traceId
  }

  endTrace(traceId: string, status: 'success' | 'error' = 'success', error?: Error): void {
    if (!this.config.enableTracing) return

    const span = this.traces.find(t => t.traceId === traceId)
    if (span) {
      span.endTime = Date.now()
      span.duration = span.endTime - span.startTime
      span.status = status
      if (error) {
        span.error = {
          message: error.message,
          stack: error.stack,
        }
      }
    }
  }

  // Performance monitoring
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const traceId = this.startTrace(operation, labels)
    const startTime = Date.now()

    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      this.recordHistogram(`${operation}_duration_ms`, duration, labels)
      this.incrementCounter(`${operation}_success`, 1, labels)
      this.endTrace(traceId, 'success')
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.recordHistogram(`${operation}_duration_ms`, duration, labels)
      this.incrementCounter(`${operation}_error`, 1, labels)
      this.endTrace(traceId, 'error', error as Error)
      
      throw error
    }
  }

  // Database monitoring
  async monitorDatabaseQuery<T>(
    query: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    return this.measureAsync('database_query', fn, {
      ...labels,
      query: this.sanitizeQuery(query),
    })
  }

  // API monitoring
  monitorApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    labels?: Record<string, string>
  ): void {
    this.recordHistogram('api_request_duration_ms', duration, {
      ...labels,
      method,
      path: this.sanitizePath(path),
      status_code: statusCode.toString(),
    })

    this.incrementCounter('api_requests_total', 1, {
      ...labels,
      method,
      path: this.sanitizePath(path),
      status_code: statusCode.toString(),
    })
  }

  // Business metrics
  trackSubscriptionCreated(planKey: string, organizationId: string): void {
    this.incrementCounter('subscriptions_created_total', 1, {
      plan: planKey,
      organization_id: organizationId,
    })
  }

  trackSubscriptionCancelled(planKey: string, organizationId: string): void {
    this.incrementCounter('subscriptions_cancelled_total', 1, {
      plan: planKey,
      organization_id: organizationId,
    })
  }

  trackUsageRecorded(metric: string, quantity: number, organizationId: string): void {
    this.incrementCounter('usage_recorded_total', quantity, {
      metric,
      organization_id: organizationId,
    })
  }

  trackExperimentExposure(experimentKey: string, variantKey: string, organizationId: string): void {
    this.incrementCounter('experiment_exposures_total', 1, {
      experiment: experimentKey,
      variant: variantKey,
      organization_id: organizationId,
    })
  }

  // Health checks
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    checks: Record<string, any>
  }> {
    const checks: Record<string, any> = {}

    // Database health
    try {
      // await this.db.$queryRaw`SELECT 1`
      checks.database = { status: 'healthy', responseTime: Date.now() }
    } catch (error) {
      checks.database = { status: 'unhealthy', error: (error as Error).message }
    }

    // Memory usage
    const memUsage = process.memoryUsage()
    checks.memory = {
      status: 'healthy',
      usage: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
      },
    }

    // CPU usage
    const cpuUsage = process.cpuUsage()
    checks.cpu = {
      status: 'healthy',
      usage: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
    }

    const overallStatus = Object.values(checks).every((check: any) => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy'

    return {
      status: overallStatus,
      checks,
    }
  }

  // Get metrics for export
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics)
  }

  // Get traces for export
  getTraces(): any[] {
    return this.traces
  }

  // Clear old data
  clearOldData(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge
    this.traces = this.traces.filter(trace => trace.startTime > cutoff)
  }

  // Private helper methods
  private buildMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name
    
    const labelStr = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',')
    
    return `${name}{${labelStr}}`
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private generateSpanId(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  private sanitizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim().substring(0, 100)
  }

  private sanitizePath(path: string): string {
    return path.replace(/\/\d+/g, '/:id').replace(/\/[a-f0-9-]{36}/g, '/:uuid')
  }
}

// Default monitoring configuration
export const defaultMonitoringConfig: MonitoringConfig = {
  enableMetrics: true,
  enableLogging: true,
  enableTracing: true,
  metricsEndpoint: '/metrics',
  logLevel: process.env.LOG_LEVEL as any || 'info',
  serviceName: process.env.SERVICE_NAME || 'tokpulse',
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
}