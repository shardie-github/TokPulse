import { z } from 'zod'

export const FeedType = z.enum(['GOOGLE', 'META', 'TIKTOK'])
export type FeedType = z.infer<typeof FeedType>

export const FeedStatus = z.enum(['ACTIVE', 'INACTIVE', 'PROCESSING', 'ERROR'])
export type FeedStatus = z.infer<typeof FeedStatus>

export const FeedConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: FeedType,
  storeId: z.string(),
  status: FeedStatus,
  config: z.record(z.any()),
  lastGenerated: z.date().optional(),
  nextGeneration: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateFeedConfigSchema = z.object({
  name: z.string(),
  type: FeedType,
  storeId: z.string(),
  config: z.record(z.any())
})

export const UpdateFeedConfigSchema = z.object({
  name: z.string().optional(),
  status: FeedStatus.optional(),
  config: z.record(z.any()).optional()
})

export const ProductMappingSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  handle: z.string(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  price: z.number(),
  compareAtPrice: z.number().optional(),
  inventory: z.number(),
  availability: z.enum(['in_stock', 'out_of_stock', 'preorder']),
  condition: z.enum(['new', 'used', 'refurbished']).default('new'),
  brand: z.string().optional(),
  gtin: z.string().optional(),
  mpn: z.string().optional(),
  customAttributes: z.record(z.string()).optional()
})

export const FeedGenerationRequestSchema = z.object({
  storeId: z.string(),
  feedType: FeedType.optional(),
  forceRegenerate: z.boolean().default(false)
})

export const FeedUrlSchema = z.object({
  url: z.string(),
  expiresAt: z.date(),
  feedType: FeedType,
  storeId: z.string()
})

export type FeedConfig = z.infer<typeof FeedConfigSchema>
export type CreateFeedConfig = z.infer<typeof CreateFeedConfigSchema>
export type UpdateFeedConfig = z.infer<typeof UpdateFeedConfigSchema>
export type ProductMapping = z.infer<typeof ProductMappingSchema>
export type FeedGenerationRequest = z.infer<typeof FeedGenerationRequestSchema>
export type FeedUrl = z.infer<typeof FeedUrlSchema>

// Feed-specific configuration schemas
export const GoogleFeedConfigSchema = z.object({
  title: z.string().default('Google Merchant Center Feed'),
  description: z.string().optional(),
  language: z.string().default('en-us'),
  currency: z.string().default('USD'),
  country: z.string().default('US'),
  customLabel0: z.string().optional(),
  customLabel1: z.string().optional(),
  customLabel2: z.string().optional(),
  customLabel3: z.string().optional(),
  customLabel4: z.string().optional(),
  excludeOutOfStock: z.boolean().default(false),
  priceIncludesTax: z.boolean().default(false),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional()
})

export const MetaFeedConfigSchema = z.object({
  title: z.string().default('Meta Product Feed'),
  description: z.string().optional(),
  currency: z.string().default('USD'),
  country: z.string().default('US'),
  excludeOutOfStock: z.boolean().default(false),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional()
})

export const TikTokFeedConfigSchema = z.object({
  title: z.string().default('TikTok Product Feed'),
  description: z.string().optional(),
  currency: z.string().default('USD'),
  country: z.string().default('US'),
  excludeOutOfStock: z.boolean().default(false),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional()
})

export type GoogleFeedConfig = z.infer<typeof GoogleFeedConfigSchema>
export type MetaFeedConfig = z.infer<typeof MetaFeedConfigSchema>
export type TikTokFeedConfig = z.infer<typeof TikTokFeedConfigSchema>