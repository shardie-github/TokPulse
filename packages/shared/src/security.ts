import { z } from 'zod'

// Security configuration schema
export const SecurityConfigSchema = z.object({
  // CORS configuration
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string()), z.boolean()]).default(true),
    credentials: z.boolean().default(true),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization', 'X-Requested-With']),
    maxAge: z.number().default(86400), // 24 hours
  }),
  
  // Rate limiting
  rateLimit: z.object({
    windowMs: z.number().default(15 * 60 * 1000), // 15 minutes
    max: z.number().default(100), // requests per window
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false),
  }),
  
  // Security headers
  headers: z.object({
    hsts: z.object({
      maxAge: z.number().default(31536000), // 1 year
      includeSubDomains: z.boolean().default(true),
      preload: z.boolean().default(true),
    }),
    csp: z.object({
      directives: z.record(z.union([z.string(), z.array(z.string())])).default({
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "https://api.stripe.com", "https://m.stripe.com"],
        'frame-src': ["https://js.stripe.com", "https://hooks.stripe.com"],
      }),
    }),
    xss: z.boolean().default(true),
    noSniff: z.boolean().default(true),
    frameOptions: z.enum(['DENY', 'SAMEORIGIN']).default('DENY'),
    referrerPolicy: z.enum(['no-referrer', 'strict-origin-when-cross-origin']).default('no-referrer'),
  }),
  
  // Authentication
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('24h'),
    refreshTokenExpiresIn: z.string().default('7d'),
    bcryptRounds: z.number().min(10).max(15).default(12),
  }),
  
  // Encryption
  encryption: z.object({
    algorithm: z.string().default('aes-256-gcm'),
    keyLength: z.number().default(32),
  }),
  
  // Session security
  session: z.object({
    secret: z.string().min(32),
    secure: z.boolean().default(true),
    httpOnly: z.boolean().default(true),
    sameSite: z.enum(['strict', 'lax', 'none']).default('strict'),
    maxAge: z.number().default(24 * 60 * 60 * 1000), // 24 hours
  }),
})

export type SecurityConfig = z.infer<typeof SecurityConfigSchema>

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  headers: {
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'", "https://api.stripe.com", "https://m.stripe.com"],
        'frame-src': ["https://js.stripe.com", "https://hooks.stripe.com"],
      },
    },
    xss: true,
    noSniff: true,
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key-in-production',
    jwtExpiresIn: '24h',
    refreshTokenExpiresIn: '7d',
    bcryptRounds: 12,
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-this-session-secret-in-production',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  },
}

// Security utilities
export class SecurityUtils {
  static generateSecureToken(length: number = 32): string {
    const crypto = require('crypto')
    return crypto.randomBytes(length).toString('hex')
  }

  static hashPassword(password: string, rounds: number = 12): Promise<string> {
    const bcrypt = require('bcrypt')
    return bcrypt.hash(password, rounds)
  }

  static verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = require('bcrypt')
    return bcrypt.compare(password, hash)
  }

  static generateJWT(payload: any, secret: string, expiresIn: string): string {
    const jwt = require('jsonwebtoken')
    return jwt.sign(payload, secret, { expiresIn })
  }

  static verifyJWT(token: string, secret: string): any {
    const jwt = require('jsonwebtoken')
    return jwt.verify(token, secret)
  }

  static encrypt(text: string, key: string): string {
    const crypto = require('crypto')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher('aes-256-gcm', key)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  static decrypt(encryptedText: string, key: string): string {
    const crypto = require('crypto')
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipher('aes-256-gcm', key)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;]/g, '') // Remove semicolons
      .trim()
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static generateCSRFToken(): string {
    return this.generateSecureToken(32)
  }

  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken
  }
}

// Input validation schemas
export const ValidationSchemas = {
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  organizationId: z.string().cuid(),
  storeId: z.string().cuid(),
  userId: z.string().cuid(),
  planKey: z.enum(['STARTER', 'GROWTH', 'ENTERPRISE']),
  subscriptionStatus: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']),
  usageMetric: z.enum(['API_CALLS', 'WIDGET_VIEWS', 'STORES', 'USERS']),
}

// Security middleware factory
export function createSecurityMiddleware(config: SecurityConfig) {
  return {
    cors: require('cors')(config.cors),
    rateLimit: require('express-rate-limit')(config.rateLimit),
    helmet: require('helmet')({
      hsts: config.headers.hsts,
      contentSecurityPolicy: config.headers.csp,
      xssFilter: config.headers.xss,
      noSniff: config.headers.noSniff,
      frameguard: { action: config.headers.frameOptions },
      referrerPolicy: { policy: config.headers.referrerPolicy },
    }),
  }
}