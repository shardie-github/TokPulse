import type { Request, Response } from 'express';
import { logger } from './logger';
import { register } from './metrics';

// Prometheus metrics endpoint
export async function metricsEndpoint(req: Request, res: Response) {
  try {
    const metrics = await register.metrics();

    res.set('Content-Type', register.contentType);
    res.send(metrics);

    logger.debug('Metrics endpoint accessed', {
      requestId: req.headers['x-request-id'] as string,
      userAgent: req.get('User-Agent'),
    });
  } catch (error) {
    logger.error('Failed to generate metrics', error as Error, {
      requestId: req.headers['x-request-id'] as string,
    });

    res.status(500).json({ error: 'Failed to generate metrics' });
  }
}

// Health check endpoint with basic metrics
export async function healthEndpoint(req: Request, res: Response) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.SERVICE_VERSION || '1.0.0',
    };

    res.json(health);

    logger.debug('Health check accessed', {
      requestId: req.headers['x-request-id'] as string,
    });
  } catch (error) {
    logger.error('Health check failed', error as Error, {
      requestId: req.headers['x-request-id'] as string,
    });

    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
    });
  }
}

// OTLP trace export endpoint (for testing)
export async function tracesEndpoint(req: Request, res: Response) {
  try {
    // This would typically be handled by the OTLP exporter
    // but we can provide a simple endpoint for testing
    res.json({
      message: 'Traces are exported via OTLP HTTP exporter',
      endpoint: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });
  } catch (error) {
    logger.error('Traces endpoint error', error as Error);
    res.status(500).json({ error: 'Traces endpoint failed' });
  }
}
