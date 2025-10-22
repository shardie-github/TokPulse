import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import {
  telemetry,
  HealthMonitor,
  createHealthEndpoints,
  ErrorTracker,
  createErrorTrackingMiddleware,
  PerformanceMonitor,
  createPerformanceMonitoringMiddleware,
  SecurityHardening,
  defaultSecurityHardeningConfig,
} from '@tokpulse/shared';
import dotenv from 'dotenv';
import express from 'express';
import { createApiHandler } from './routes/api.js';
import { createOAuthHandler } from './routes/oauth.js';
import { createWebhookHandler } from './routes/webhooks.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize security hardening
const security = new SecurityHardening(defaultSecurityHardeningConfig);

// Initialize monitoring services
const healthMonitor = new HealthMonitor({} as any); // Will be replaced with actual DB
const errorTracker = new ErrorTracker({} as any, {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
});
const performanceMonitor = new PerformanceMonitor({} as any, {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
});

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
  hostName: process.env.SHOPIFY_APP_URL!.replace(/https?:\/\//, ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// Security middleware
app.use(security.createHelmetMiddleware());
app.use(security.createCorsMiddleware());
app.use(security.createRateLimiter());

// Request validation middleware
app.use((req, res, next) => {
  const validation = security.validateRequest(req);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request',
      details: validation.errors,
    });
  }
  next();
});

// Body parsing with size limits
app.use(
  express.json({
    limit: (security as any).validation?.maxBodySize || '10mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Error tracking middleware
app.use(createErrorTrackingMiddleware(errorTracker));

// Performance monitoring middleware
app.use(createPerformanceMonitoringMiddleware(performanceMonitor));

// Request logging with sanitization
app.use((req, res, next) => {
  const sanitizedData = security.sanitizeLogData({
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    headers: req.headers,
  });

  telemetry.log({
    event: 'http_request',
    properties: sanitizedData,
    timestamp: Date.now(),
    organizationId: 'unknown',
  });
  next();
});

// Routes
app.use('/auth', createOAuthHandler(shopify));
app.use('/webhooks', createWebhookHandler(shopify));
app.use('/api', createApiHandler(shopify));

// Health monitoring endpoints
const healthEndpoints = createHealthEndpoints(healthMonitor);
app.get('/health', healthEndpoints.health);
app.get('/healthz', healthEndpoints.health); // Kubernetes compatibility
app.get('/ready', healthEndpoints.readiness);
app.get('/live', healthEndpoints.liveness);
app.get('/metrics', healthEndpoints.metrics);

// Performance monitoring endpoints
app.get('/performance', (req, res) => {
  const report = performanceMonitor.getPerformanceReport();
  res.json(report);
});

app.get('/performance/status', (req, res) => {
  const status = performanceMonitor.getPerformanceStatus();
  res.json(status);
});

// Error handling with proper tracking
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Capture error with context
  errorTracker.captureError(err, {
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: security.sanitizeLogData(req.body),
    headers: security.sanitizeLogData(req.headers),
  });

  // Log error
  telemetry.error(err, {
    method: req.method,
    path: req.path,
    body: security.sanitizeLogData(req.body),
  });

  // Return sanitized error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: (req as any).requestId || 'unknown',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');

  // Flush error tracking
  await errorTracker.forceFlush();

  // Clear performance metrics
  performanceMonitor.clearOldMetrics(0);

  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');

  // Flush error tracking
  await errorTracker.forceFlush();

  // Clear performance metrics
  performanceMonitor.clearOldMetrics(0);

  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Partner app running on port ${PORT}`);
  console.log(`📊 Health monitoring: http://localhost:${PORT}/health`);
  console.log(`📈 Performance monitoring: http://localhost:${PORT}/performance`);
  console.log(`🔍 Metrics: http://localhost:${PORT}/metrics`);

  telemetry.log({
    event: 'app_started',
    properties: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    },
    timestamp: Date.now(),
    organizationId: 'system',
  });
});
