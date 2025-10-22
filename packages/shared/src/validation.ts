import { z } from 'zod';

// Common validation schemas
export const shopDomainSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/);
export const productHandleSchema = z.string().min(1).max(255);
export const emailSchema = z.string().email();
export const cuidSchema = z.string().cuid();

// API request/response schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  pagination: paginationSchema.optional(),
});

// Widget API schemas
export const widgetRequestSchema = z.object({
  store: shopDomainSchema,
  productId: z.string().optional(),
  variantId: z.string().optional(),
  experimentId: z.string().optional(),
});

export const recommendationResponseSchema = z.object({
  productId: z.string(),
  title: z.string(),
  handle: z.string(),
  price: z.number(),
  image: z.string().optional(),
  reason: z.string().optional(),
});

// Type exports
export type Pagination = z.infer<typeof paginationSchema>;
export type ApiResponse<T = unknown> = z.infer<typeof apiResponseSchema> & { data?: T };
export type WidgetRequest = z.infer<typeof widgetRequestSchema>;
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
