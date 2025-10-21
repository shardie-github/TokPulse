import { z } from 'zod'
import { createHash, randomBytes, createCipher, createDecipher } from 'crypto'

// Security configuration schema
export const SecurityHardeningSchema = z.object({
  // Authentication & Authorization
  auth: z.object({
    enabled: z.boolean().default(true),
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('24h'),
    refreshTokenExpiresIn: z.string().default('7d'),
    bcryptRounds: z.number().min(10).max(15).default(12),
    maxLoginAttempts: z.number().default(5),
    lockoutDuration: z.number().default(15 * 60 * 1000), // 15 minutes
    passwordPolicy: z.object({
      minLength: z.number().default(12),
      requireUppercase: z.boolean().default(true),
      requireLowercase: z.boolean().default(true),
      requireNumbers: z.boolean().default(true),
      requireSymbols: z.boolean().default(true),
      maxAge: z.number().default(90 * 24 * 60 * 60 * 1000), // 90 days
    }),
  }),

  // Rate Limiting
  rateLimit: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100), // requests per window
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false),
    keyGenerator: z.function().optional(),
    skip: z.function().optional(),
  }),

  // Input Validation
  validation: z.object({
    enabled: z.boolean().default(true),
    maxBodySize: z.number().default(10 * 1024 * 1024), // 10MB
    maxUrlLength: z.number().default(2048),
    maxHeaderSize: z.number().default(8192),
    sanitizeInput: z.boolean().default(true),
    validateContentType: z.boolean().default(true),
    allowedContentTypes: z.array(z.string()).default([
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ]),
  }),

  // Security Headers
  headers: z.object({
    hsts: z.object({
      enabled: z.boolean().default(true),
      maxAge: z.number().default(31536000), // 1 year
      includeSubDomains: z.boolean().default(true),
      preload: z.boolean().default(true),
    }),
    csp: z.object({
      enabled: z.boolean().default(true),
      directives: z.record(z.union([z.string(), z.array(z.string())])).default({
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "https://api.stripe.com", "https://m.stripe.com"],
        'frame-src': ["https://js.stripe.com", "https://hooks.stripe.com"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
      }),
      reportOnly: z.boolean().default(false),
    }),
    xss: z.boolean().default(true),
    noSniff: z.boolean().default(true),
    frameOptions: z.enum(['DENY', 'SAMEORIGIN']).default('DENY'),
    referrerPolicy: z.enum(['no-referrer', 'strict-origin-when-cross-origin']).default('no-referrer'),
    permissionsPolicy: z.object({
      enabled: z.boolean().default(true),
      features: z.record(z.array(z.string())).default({
        'geolocation': [],
        'microphone': [],
        'camera': [],
        'payment': [],
        'usb': [],
        'magnetometer': [],
        'gyroscope': [],
        'accelerometer': [],
      }),
    }),
  }),

  // Encryption
  encryption: z.object({
    algorithm: z.string().default('aes-256-gcm'),
    keyLength: z.number().default(32),
    ivLength: z.number().default(16),
    tagLength: z.number().default(16),
  }),

  // Session Security
  session: z.object({
    secret: z.string().min(32),
    secure: z.boolean().default(true),
    httpOnly: z.boolean().default(true),
    sameSite: z.enum(['strict', 'lax', 'none']).default('strict'),
    maxAge: z.number().default(24 * 60 * 60 * 1000), // 24 hours
    rolling: z.boolean().default(true),
    resave: z.boolean().default(false),
    saveUninitialized: z.boolean().default(false),
  }),

  // CORS
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.union([z.string(), z.array(z.string()), z.boolean(), z.function()]).default(true),
    credentials: z.boolean().default(true),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default([
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
    ]),
    exposedHeaders: z.array(z.string()).default([]),
    maxAge: z.number().default(86400), // 24 hours
  }),

  // Webhook Security
  webhooks: z.object({
    enabled: z.boolean().default(true),
    signatureVerification: z.boolean().default(true),
    allowedOrigins: z.array(z.string()).default([]),
    maxPayloadSize: z.number().default(1024 * 1024), // 1MB
    timeout: z.number().default(30000), // 30 seconds
  }),

  // Logging & Monitoring
  logging: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'text']).default('json'),
    sanitize: z.boolean().default(true),
    excludeFields: z.array(z.string()).default([
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
    ]),
  }),

  // Database Security
  database: z.object({
    ssl: z.boolean().default(true),
    connectionLimit: z.number().default(10),
    queryTimeout: z.number().default(30000), // 30 seconds
    preparedStatements: z.boolean().default(true),
    parameterizedQueries: z.boolean().default(true),
  }),
})

export type SecurityHardeningConfig = z.infer<typeof SecurityHardeningSchema>

// Security utilities
export class SecurityHardening {
  private config: SecurityHardeningConfig

  constructor(config: SecurityHardeningConfig) {
    this.config = config
  }

  // Password validation
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const policy = this.config.auth.passwordPolicy

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ]
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a more secure password')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Generate secure password
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    let password = ''
    
    // Ensure at least one character from each required category
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += symbols[Math.floor(Math.random() * symbols.length)]
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    const bcrypt = require('bcrypt')
    return bcrypt.hash(password, this.config.auth.bcryptRounds)
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt')
    return bcrypt.compare(password, hash)
  }

  // Generate JWT token
  generateJWT(payload: any): string {
    const jwt = require('jsonwebtoken')
    return jwt.sign(payload, this.config.auth.jwtSecret, {
      expiresIn: this.config.auth.jwtExpiresIn,
      issuer: 'tokpulse',
      audience: 'tokpulse-users',
    })
  }

  // Verify JWT token
  verifyJWT(token: string): any {
    const jwt = require('jsonwebtoken')
    return jwt.verify(token, this.config.auth.jwtSecret, {
      issuer: 'tokpulse',
      audience: 'tokpulse-users',
    })
  }

  // Generate refresh token
  generateRefreshToken(): string {
    return randomBytes(32).toString('hex')
  }

  // Encrypt data
  encrypt(data: string, key?: string): string {
    const encryptionKey = key || this.config.auth.jwtSecret
    const iv = randomBytes(this.config.encryption.ivLength)
    const cipher = createCipher(this.config.encryption.algorithm, encryptionKey)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  // Decrypt data
  decrypt(encryptedData: string, key?: string): string {
    const encryptionKey = key || this.config.auth.jwtSecret
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = createDecipher(this.config.encryption.algorithm, encryptionKey)
    
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  // Sanitize input
  sanitizeInput(input: string): string {
    if (!this.config.validation.sanitizeInput) return input

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .replace(/[&]/g, '&amp;') // Escape ampersands
      .trim()
  }

  // Validate email
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Generate CSRF token
  generateCSRFToken(): string {
    return randomBytes(32).toString('hex')
  }

  // Validate CSRF token
  validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken
  }

  // Generate secure random string
  generateSecureString(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }

  // Create security headers
  createSecurityHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    // HSTS
    if (this.config.headers.hsts.enabled) {
      let hstsValue = `max-age=${this.config.headers.hsts.maxAge}`
      if (this.config.headers.hsts.includeSubDomains) {
        hstsValue += '; includeSubDomains'
      }
      if (this.config.headers.hsts.preload) {
        hstsValue += '; preload'
      }
      headers['Strict-Transport-Security'] = hstsValue
    }

    // Content Security Policy
    if (this.config.headers.csp.enabled) {
      const cspDirectives = Object.entries(this.config.headers.csp.directives)
        .map(([directive, values]) => {
          const valueList = Array.isArray(values) ? values.join(' ') : values
          return `${directive} ${valueList}`
        })
        .join('; ')
      
      const cspHeader = this.config.headers.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
      headers[cspHeader] = cspDirectives
    }

    // XSS Protection
    if (this.config.headers.xss) {
      headers['X-XSS-Protection'] = '1; mode=block'
    }

    // Content Type Options
    if (this.config.headers.noSniff) {
      headers['X-Content-Type-Options'] = 'nosniff'
    }

    // Frame Options
    headers['X-Frame-Options'] = this.config.headers.frameOptions

    // Referrer Policy
    headers['Referrer-Policy'] = this.config.headers.referrerPolicy

    // Permissions Policy
    if (this.config.headers.permissionsPolicy.enabled) {
      const permissions = Object.entries(this.config.headers.permissionsPolicy.features)
        .map(([feature, allowlist]) => {
          if (allowlist.length === 0) {
            return `${feature}=()`
          }
          return `${feature}=(${allowlist.join(' ')})`
        })
        .join(', ')
      headers['Permissions-Policy'] = permissions
    }

    return headers
  }

  // Validate request
  validateRequest(req: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check body size
    if (req.body && JSON.stringify(req.body).length > this.config.validation.maxBodySize) {
      errors.push('Request body too large')
    }

    // Check URL length
    if (req.url && req.url.length > this.config.validation.maxUrlLength) {
      errors.push('URL too long')
    }

    // Check content type
    if (this.config.validation.validateContentType) {
      const contentType = req.get('Content-Type')
      if (contentType && !this.config.validation.allowedContentTypes.includes(contentType.split(';')[0])) {
        errors.push('Invalid content type')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Sanitize log data
  sanitizeLogData(data: any): any {
    if (!this.config.logging.sanitize) return data

    const sanitized = { ...data }
    
    for (const field of this.config.logging.excludeFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeLogData(sanitized[key])
      }
    }

    return sanitized
  }

  // Create rate limiter
  createRateLimiter() {
    const rateLimit = require('express-rate-limit')
    
    return rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      skipSuccessfulRequests: this.config.rateLimit.skipSuccessfulRequests,
      skipFailedRequests: this.config.rateLimit.skipFailedRequests,
      keyGenerator: this.config.rateLimit.keyGenerator,
      skip: this.config.rateLimit.skip,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000),
      },
    })
  }

  // Create CORS middleware
  createCorsMiddleware() {
    const cors = require('cors')
    
    return cors({
      origin: this.config.cors.origin,
      credentials: this.config.cors.credentials,
      methods: this.config.cors.methods,
      allowedHeaders: this.config.cors.allowedHeaders,
      exposedHeaders: this.config.cors.exposedHeaders,
      maxAge: this.config.cors.maxAge,
    })
  }

  // Create helmet middleware
  createHelmetMiddleware() {
    const helmet = require('helmet')
    
    return helmet({
      hsts: this.config.headers.hsts.enabled ? this.config.headers.hsts : false,
      contentSecurityPolicy: this.config.headers.csp.enabled ? {
        directives: this.config.headers.csp.directives,
        reportOnly: this.config.headers.csp.reportOnly,
      } : false,
      xssFilter: this.config.headers.xss,
      noSniff: this.config.headers.noSniff,
      frameguard: { action: this.config.headers.frameOptions },
      referrerPolicy: { policy: this.config.headers.referrerPolicy },
      permissionsPolicy: this.config.headers.permissionsPolicy.enabled ? {
        features: this.config.headers.permissionsPolicy.features,
      } : false,
    })
  }

  // Validate webhook signature
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!this.config.webhooks.signatureVerification) return true

    const expectedSignature = createHash('sha256')
      .update(payload)
      .update(secret)
      .digest('hex')

    return signature === expectedSignature
  }

  // Create session middleware
  createSessionMiddleware() {
    const session = require('express-session')
    const RedisStore = require('connect-redis').default
    
    return session({
      secret: this.config.session.secret,
      resave: this.config.session.resave,
      saveUninitialized: this.config.session.saveUninitialized,
      rolling: this.config.session.rolling,
      cookie: {
        secure: this.config.session.secure,
        httpOnly: this.config.session.httpOnly,
        sameSite: this.config.session.sameSite,
        maxAge: this.config.session.maxAge,
      },
      store: new RedisStore({
        url: process.env.REDIS_URL,
        ttl: this.config.session.maxAge / 1000,
      }),
    })
  }
}

// Default security configuration
export const defaultSecurityHardeningConfig: SecurityHardeningConfig = {
  auth: {
    enabled: true,
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key-in-production',
    jwtExpiresIn: '24h',
    refreshTokenExpiresIn: '7d',
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000,
    passwordPolicy: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      maxAge: 90 * 24 * 60 * 60 * 1000,
    },
  },
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000,
    max: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  validation: {
    enabled: true,
    maxBodySize: 10 * 1024 * 1024,
    maxUrlLength: 2048,
    maxHeaderSize: 8192,
    sanitizeInput: true,
    validateContentType: true,
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ],
  },
  headers: {
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "https://api.stripe.com", "https://m.stripe.com"],
        'frame-src': ["https://js.stripe.com", "https://hooks.stripe.com"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
      },
      reportOnly: false,
    },
    xss: true,
    noSniff: true,
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
    permissionsPolicy: {
      enabled: true,
      features: {
        'geolocation': [],
        'microphone': [],
        'camera': [],
        'payment': [],
        'usb': [],
        'magnetometer': [],
        'gyroscope': [],
        'accelerometer': [],
      },
    },
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-session-secret-in-production',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    rolling: true,
    resave: false,
    saveUninitialized: false,
  },
  cors: {
    enabled: true,
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
    exposedHeaders: [],
    maxAge: 86400,
  },
  webhooks: {
    enabled: true,
    signatureVerification: true,
    allowedOrigins: [],
    maxPayloadSize: 1024 * 1024,
    timeout: 30000,
  },
  logging: {
    enabled: true,
    level: 'info',
    format: 'json',
    sanitize: true,
    excludeFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
    ],
  },
  database: {
    ssl: true,
    connectionLimit: 10,
    queryTimeout: 30000,
    preparedStatements: true,
    parameterizedQueries: true,
  },
}