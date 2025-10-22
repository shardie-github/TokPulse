import { PrismaClient } from '@tokpulse/db'

export interface ErrorContext {
  userId?: string
  organizationId?: string
  sessionId?: string
  requestId?: string
  userAgent?: string
  ip?: string
  url?: string
  method?: string
  body?: any
  headers?: Record<string, string>
  stack?: string
  timestamp: string
  environment: string
  version: string
  duration?: number
  operation?: string
}

export interface ErrorEvent {
  id: string
  type: 'error' | 'warning' | 'info'
  level: 'critical' | 'high' | 'medium' | 'low'
  message: string
  error: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  context: ErrorContext
  tags: Record<string, string>
  fingerprint: string
  count: number
  firstSeen: string
  lastSeen: string
  resolved: boolean
  assignedTo?: string
  notes?: string
}

export class ErrorTracker {
  private db: PrismaClient
  private errorBuffer: ErrorEvent[] = []
  private flushInterval: number
  private maxBufferSize: number
  private environment: string
  private version: string

  constructor(
    db: PrismaClient,
    options: {
      flushInterval?: number
      maxBufferSize?: number
      environment?: string
      version?: string
    } = {}
  ) {
    this.db = db
    this.flushInterval = options.flushInterval || 30000 // 30 seconds
    this.maxBufferSize = options.maxBufferSize || 100
    this.environment = options.environment || process.env.NODE_ENV || 'development'
    this.version = options.version || process.env.npm_package_version || '1.0.0'

    // Start periodic flush
    setInterval(() => this.flush(), this.flushInterval)
  }

  private generateFingerprint(error: Error, context: Partial<ErrorContext>): string {
    const crypto = require('crypto')
    const content = `${error.name}:${error.message}:${context.url}:${context.method}`
    return crypto.createHash('md5').update(content).digest('hex')
  }

  private generateErrorId(): string {
    const crypto = require('crypto')
    return crypto.randomUUID()
  }

  private sanitizeError(error: Error): { name: string; message: string; stack?: string; code?: string } {
    return {
      name: error.name || 'UnknownError',
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      code: (error as any).code,
    }
  }

  async captureError(
    error: Error,
    context: Partial<ErrorContext> = {},
    tags: Record<string, string> = {}
  ): Promise<string> {
    const errorId = this.generateErrorId()
    const fingerprint = this.generateFingerprint(error, context)
    const timestamp = new Date().toISOString()

    const errorEvent: ErrorEvent = {
      id: errorId,
      type: 'error',
      level: this.determineErrorLevel(error),
      message: error.message,
      error: this.sanitizeError(error),
      context: {
        ...context,
        timestamp,
        environment: this.environment,
        version: this.version,
      },
      tags,
      fingerprint,
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      resolved: false,
    }

    // Add to buffer
    this.errorBuffer.push(errorEvent)

    // Flush if buffer is full
    if (this.errorBuffer.length >= this.maxBufferSize) {
      await this.flush()
    }

    // Log to console in development
    if (this.environment === 'development') {
      console.error('Error captured:', {
        id: errorId,
        message: error.message,
        stack: error.stack,
        context,
        tags,
      })
    }

    return errorId
  }

  async captureWarning(
    message: string,
    context: Partial<ErrorContext> = {},
    tags: Record<string, string> = {}
  ): Promise<string> {
    const errorId = this.generateErrorId()
    const timestamp = new Date().toISOString()

    const errorEvent: ErrorEvent = {
      id: errorId,
      type: 'warning',
      level: 'medium',
      message,
      error: {
        name: 'Warning',
        message,
      },
      context: {
        ...context,
        timestamp,
        environment: this.environment,
        version: this.version,
      },
      tags,
      fingerprint: this.generateFingerprint(new Error(message), context),
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      resolved: false,
    }

    this.errorBuffer.push(errorEvent)

    if (this.environment === 'development') {
      console.warn('Warning captured:', { id: errorId, message, context, tags })
    }

    return errorId
  }

  async captureInfo(
    message: string,
    context: Partial<ErrorContext> = {},
    tags: Record<string, string> = {}
  ): Promise<string> {
    const errorId = this.generateErrorId()
    const timestamp = new Date().toISOString()

    const errorEvent: ErrorEvent = {
      id: errorId,
      type: 'info',
      level: 'low',
      message,
      error: {
        name: 'Info',
        message,
      },
      context: {
        ...context,
        timestamp,
        environment: this.environment,
        version: this.version,
      },
      tags,
      fingerprint: this.generateFingerprint(new Error(message), context),
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      resolved: false,
    }

    this.errorBuffer.push(errorEvent)

    return errorId
  }

  private determineErrorLevel(error: Error): 'critical' | 'high' | 'medium' | 'low' {
    const criticalErrors = [
      'DatabaseConnectionError',
      'AuthenticationError',
      'AuthorizationError',
      'ValidationError',
      'RateLimitError',
    ]

    const highErrors = [
      'NetworkError',
      'TimeoutError',
      'ServiceUnavailableError',
    ]

    const mediumErrors = [
      'NotFoundError',
      'BadRequestError',
      'ConflictError',
    ]

    if (criticalErrors.includes(error.name)) return 'critical'
    if (highErrors.includes(error.name)) return 'high'
    if (mediumErrors.includes(error.name)) return 'medium'
    return 'low'
  }

  private async flush(): Promise<void> {
    if (this.errorBuffer.length === 0) return

    const errorsToFlush = [...this.errorBuffer]
    this.errorBuffer = []

    try {
      // In a real implementation, you would save to database
      // For now, we'll just log them
      console.log(`Flushing ${errorsToFlush.length} error events`)
      
      // Group by fingerprint to deduplicate
      const groupedErrors = new Map<string, ErrorEvent>()
      
      for (const error of errorsToFlush) {
        const existing = groupedErrors.get(error.fingerprint)
        if (existing) {
          existing.count += error.count
          existing.lastSeen = error.lastSeen
        } else {
          groupedErrors.set(error.fingerprint, error)
        }
      }

      // Log grouped errors
      for (const [fingerprint, error] of groupedErrors) {
        console.log(`Error group ${fingerprint}:`, {
          message: error.message,
          count: error.count,
          level: error.level,
          firstSeen: error.firstSeen,
          lastSeen: error.lastSeen,
        })
      }

      // In production, you would:
      // 1. Save to database
      // 2. Send to external service (Sentry, DataDog, etc.)
      // 3. Send alerts for critical errors
      // 4. Update metrics

    } catch (flushError) {
      console.error('Failed to flush error buffer:', flushError)
      // Re-add errors to buffer for retry
      this.errorBuffer.unshift(...errorsToFlush)
    }
  }

  async getErrors(filters: {
    level?: string
    type?: string
    resolved?: boolean
    limit?: number
    offset?: number
  } = {}): Promise<ErrorEvent[]> {
    // In a real implementation, this would query the database
    // For now, return empty array
    return []
  }

  async resolveError(errorId: string, notes?: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Resolving error ${errorId}`, notes ? `with notes: ${notes}` : '')
  }

  async assignError(errorId: string, assignedTo: string): Promise<void> {
    // In a real implementation, this would update the database
    console.log(`Assigning error ${errorId} to ${assignedTo}`)
  }

  // Performance monitoring
  async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context: Partial<ErrorContext> = {}
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      
      // Log performance metrics
      await this.captureInfo(`Performance: ${operation}`, {
        ...context,
        duration,
        operation,
      }, {
        operation,
        duration: duration.toString(),
        status: 'success',
      })
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      await this.captureError(error as Error, {
        ...context,
        duration,
        operation,
      }, {
        operation,
        duration: duration.toString(),
        status: 'error',
      })
      
      throw error
    }
  }

  // API request monitoring
  async monitorApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context: Partial<ErrorContext> = {}
  ): Promise<void> {
    const level = statusCode >= 500 ? 'critical' : 
                  statusCode >= 400 ? 'high' : 
                  statusCode >= 300 ? 'medium' : 'low'

    const message = `API Request: ${method} ${path} - ${statusCode}`
    
    if (level === 'critical' || level === 'high') {
      await this.captureError(new Error(message), {
        ...context,
        method,
        url: path,
        duration,
      }, {
        method,
        path,
        statusCode: statusCode.toString(),
        duration: duration.toString(),
      })
    } else {
      await this.captureInfo(message, {
        ...context,
        method,
        url: path,
        duration,
      }, {
        method,
        path,
        statusCode: statusCode.toString(),
        duration: duration.toString(),
      })
    }
  }

  // Force flush (useful for graceful shutdown)
  async forceFlush(): Promise<void> {
    await this.flush()
  }
}

// Express middleware for automatic error tracking
export function createErrorTrackingMiddleware(errorTracker: ErrorTracker) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    const requestId = require('crypto').randomUUID()

    // Add request ID to context
    req.requestId = requestId

    // Override res.json to capture response details
    const originalJson = res.json
    res.json = function(data: any) {
      const duration = Date.now() - startTime
      
      // Track API request
      errorTracker.monitorApiRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
        {
          requestId,
          method: req.method,
          url: req.url,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          headers: req.headers,
        }
      )

      return originalJson.call(this, data)
    }

    // Global error handler
    const originalErrorHandler = (error: Error) => {
      errorTracker.captureError(error, {
        requestId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        body: req.body,
        headers: req.headers,
      })
    }

    // Override process error handlers
    process.on('uncaughtException', originalErrorHandler)
    process.on('unhandledRejection', (reason) => {
      originalErrorHandler(new Error(`Unhandled Promise Rejection: ${reason}`))
    })

    next()
  }
}

// Default error tracker instance
export const errorTracker = new ErrorTracker(
  {} as PrismaClient, // Will be replaced with actual DB instance
  {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  }
)