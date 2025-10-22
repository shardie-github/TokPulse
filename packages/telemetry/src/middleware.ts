import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import {
  apiRequestsTotal,
  apiRequestDuration,
  apiActiveConnections,
  webhookProcessedTotal,
  webhookProcessingDuration,
  widgetRenderDuration,
  widgetErrorRate,
  jobAttemptsTotal,
  jobProcessingDuration,
} from './metrics';
import { tracing } from './tracing';

export interface TelemetryRequest extends Request {
  requestId?: string;
  storeId?: string;
  orgId?: string;
  startTime?: number;
}

// Express middleware for API request telemetry
export function apiTelemetryMiddleware(req: TelemetryRequest, res: Response, next: NextFunction) {
  req.requestId =
    (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
  req.storeId = req.headers['x-store-id'] as string;
  req.orgId = req.headers['x-org-id'] as string;
  req.startTime = Date.now();

  // Increment active connections
  apiActiveConnections.inc();

  // Create tracing span
  const span = tracing.createApiSpan(req.method, (req as any).route?.path || req.path, req.storeId);

  // Add request context to span
  tracing.addSpanContext('http.url', req.url);
  tracing.addSpanContext('http.user_agent', req.get('User-Agent') || '');
  tracing.addSpanContext('http.request_id', req.requestId);

  // Override res.end to capture response metrics
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - (req.startTime || 0);

    // Record metrics
    apiRequestsTotal.inc({
      route: (req as any).route?.path || req.path,
      method: req.method,
      code: res.statusCode.toString(),
      storeId: req.storeId || 'unknown',
    });

    apiRequestDuration.observe(
      {
        route: (req as any).route?.path || req.path,
        method: req.method,
        storeId: req.storeId || 'unknown',
      },
      duration / 1000,
    );

    // Decrement active connections
    apiActiveConnections.dec();

    // Log request
    logger.apiRequest(
      req.method,
      (req as any).route?.path || req.path,
      res.statusCode,
      duration,
      req.storeId,
      {
        requestId: req.requestId,
        orgId: req.orgId,
      },
    );

    // Finish tracing span
    tracing.finishSpan(span, res.statusCode < 400);

    // Call original end
    return originalEnd(chunk, encoding, cb);
  };

  next();
}

// Webhook processing telemetry
export function webhookTelemetry(topic: string, storeId: string) {
  const startTime = Date.now();
  const span = tracing.createWebhookSpan(topic, storeId, 'process');

  return {
    recordSuccess: () => {
      const duration = Date.now() - startTime;
      webhookProcessedTotal.inc({ topic, storeId, status: 'success' });
      webhookProcessingDuration.observe({ topic, storeId }, duration / 1000);

      logger.webhookProcessed(topic, storeId, 'success', duration, { storeId });
      tracing.finishSpan(span, true);
    },
    recordError: (error: Error) => {
      const duration = Date.now() - startTime;
      webhookProcessedTotal.inc({ topic, storeId, status: 'error' });
      webhookProcessingDuration.observe({ topic, storeId }, duration / 1000);

      logger.webhookError(topic, storeId, error, { storeId });
      tracing.finishSpan(span, false, error);
    },
  };
}

// Widget rendering telemetry
export function widgetTelemetry(surface: string, storeId: string) {
  const startTime = Date.now();
  const span = tracing.createWidgetSpan(surface, storeId, 'render');

  return {
    recordSuccess: () => {
      const duration = Date.now() - startTime;
      widgetRenderDuration.observe({ surface, storeId }, duration);

      logger.widgetRendered(surface, storeId, duration, { storeId });
      tracing.finishSpan(span, true);
    },
    recordError: (error: Error, errorType: string) => {
      const duration = Date.now() - startTime;
      widgetErrorRate.inc({ surface, storeId, errorType });

      logger.widgetError(surface, storeId, error, { storeId });
      tracing.finishSpan(span, false, error);
    },
  };
}

// Job processing telemetry
export function jobTelemetry(jobType: string, storeId: string) {
  const startTime = Date.now();
  const span = tracing.createJobSpan(jobType, storeId, 'process');

  return {
    recordStart: () => {
      jobAttemptsTotal.inc({ job: jobType, status: 'started', storeId });
      logger.jobStarted(jobType, storeId, { storeId });
    },
    recordSuccess: () => {
      const duration = Date.now() - startTime;
      jobAttemptsTotal.inc({ job: jobType, status: 'completed', storeId });
      jobProcessingDuration.observe({ job: jobType, storeId }, duration / 1000);

      logger.jobCompleted(jobType, storeId, duration, { storeId });
      tracing.finishSpan(span, true);
    },
    recordError: (error: Error) => {
      const duration = Date.now() - startTime;
      jobAttemptsTotal.inc({ job: jobType, status: 'failed', storeId });
      jobProcessingDuration.observe({ job: jobType, storeId }, duration / 1000);

      logger.jobFailed(jobType, storeId, error, { storeId });
      tracing.finishSpan(span, false, error);
    },
  };
}

// System metrics collection
export function collectSystemMetrics() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  // Update system metrics (these would need to be imported from metrics.ts)
  // systemMemoryUsage.set(memUsage.heapUsed)
  // systemCpuUsage.set(cpuUsage.user / 1000000) // Convert to percentage
}

// Start system metrics collection
if (process.env.NODE_ENV === 'production') {
  setInterval(collectSystemMetrics, 30000); // Every 30 seconds
}
