import { ValidationSchemas } from '@tokpulse/shared';
import { z } from 'zod';

// API Request/Response schemas
export const ApiSchemas = {
  // Billing schemas
  createSubscription: z.object({
    organizationId: ValidationSchemas.organizationId,
    planKey: ValidationSchemas.planKey,
    trialDays: z.number().min(0).max(365).default(14),
    shopifyBillingId: z.string().optional(),
  }),

  updateSubscription: z.object({
    planKey: ValidationSchemas.planKey.optional(),
    status: ValidationSchemas.subscriptionStatus.optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
  }),

  recordUsage: z.object({
    metric: ValidationSchemas.usageMetric,
    quantity: z.number().min(0).max(1000000),
    metadata: z.record(z.any()).optional(),
  }),

  checkEntitlement: z.object({
    feature: z.string().min(1).max(100),
    resource: z.string().optional(),
  }),

  // Store schemas
  createStore: z.object({
    shopDomain: z.string().min(1).max(255),
    accessToken: z.string().min(1),
    scopes: z.string().min(1),
    region: z.string().length(2).default('us'),
  }),

  updateStore: z.object({
    accessToken: z.string().min(1).optional(),
    scopes: z.string().min(1).optional(),
    region: z.string().length(2).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'UNINSTALLED']).optional(),
  }),

  // User schemas
  createUser: z.object({
    email: ValidationSchemas.email,
    name: z.string().min(1).max(255).optional(),
    role: z.enum(['OWNER', 'ADMIN', 'ANALYST', 'VIEWER']).default('ANALYST'),
    organizationId: ValidationSchemas.organizationId,
  }),

  updateUser: z.object({
    name: z.string().min(1).max(255).optional(),
    role: z.enum(['OWNER', 'ADMIN', 'ANALYST', 'VIEWER']).optional(),
  }),

  // Experiment schemas
  createExperiment: z.object({
    key: z.string().min(1).max(100),
    name: z.string().min(1).max(255),
    description: z.string().max(1000).optional(),
    storeId: ValidationSchemas.storeId.optional(),
    startAt: z.date().optional(),
    stopAt: z.date().optional(),
    allocation: z.number().min(1).max(100).default(100),
    guardrailMetric: z.string().optional(),
  }),

  updateExperiment: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(['DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED']).optional(),
    startAt: z.date().optional(),
    stopAt: z.date().optional(),
    allocation: z.number().min(1).max(100).optional(),
    guardrailMetric: z.string().optional(),
  }),

  // Analytics schemas
  trackEvent: z.object({
    eventType: z.string().min(1).max(100),
    eventData: z.record(z.any()),
    storeId: ValidationSchemas.storeId,
  }),

  getAnalytics: z.object({
    startDate: z.date(),
    endDate: z.date(),
    metrics: z.array(z.string()).optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
  }),

  // Recommendations schemas
  getRecommendations: z.object({
    productId: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    limit: z.number().min(1).max(50).default(10),
    algorithm: z.enum(['collaborative', 'content-based', 'hybrid']).default('hybrid'),
  }),
};

// API Response schemas
export const ApiResponseSchemas = {
  success: z.object({
    success: z.boolean().default(true),
    data: z.any(),
    message: z.string().optional(),
  }),

  error: z.object({
    success: z.boolean().default(false),
    error: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),

  paginated: z.object({
    data: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  }),
};

// Validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

// Query parameter validation
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    try {
      const validatedData = schema.parse(req.query);
      req.validatedQuery = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          code: 'QUERY_VALIDATION_ERROR',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
}

// Response helpers
export function successResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

export function errorResponse(error: string, code?: string, details?: any) {
  return {
    success: false,
    error,
    code,
    details,
  };
}

export function paginatedResponse<T>(data: T[], page: number, limit: number, total: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
