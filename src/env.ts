import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Database
  DATABASE_URL: z.string().url().optional(),
  // API
  API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_API_BASE: z.string().url().optional(),
  // Auth
  JWT_SECRET: z.string().min(32).optional(),
  // External services
  STRIPE_SECRET_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SHOPIFY_API_KEY: z.string().optional(),
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  // Feature flags
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').optional(),
  ENABLE_TELEMETRY: z.string().transform(val => val === 'true').optional(),
});

export type Env = z.infer<typeof schema>;

export const env = (() => {
  const rawEnv = typeof process !== 'undefined' ? process.env : import.meta.env;
  const parsed = schema.safeParse(rawEnv);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  
  return parsed.data as Env;
})();

// Export individual env vars for convenience
export const {
  NODE_ENV,
  DATABASE_URL,
  API_BASE_URL,
  NEXT_PUBLIC_API_BASE,
  JWT_SECRET,
  STRIPE_SECRET_KEY,
  SHOPIFY_API_SECRET,
  SHOPIFY_API_KEY,
  SENTRY_DSN,
  ENABLE_ANALYTICS,
  ENABLE_TELEMETRY,
} = env;