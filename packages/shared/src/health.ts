import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as os from 'os';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message: string;
  details?: Record<string, unknown>;
  lastChecked: string;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  degraded: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  checks: HealthCheckResult[];
  summary: HealthSummary;
}

export type HealthCheckFunction = () => Promise<HealthCheckResult>;

export class HealthMonitor {
  private db: PrismaClient;
  private startTime: number;
  private checks = new Map<string, HealthCheckFunction>();

  constructor(db: PrismaClient) {
    this.db = db;
    this.startTime = Date.now();
    this.registerDefaultChecks();
  }
  private registerDefaultChecks(): void {
    // Database health check
    this.registerCheck('database', async () => {
      const start = Date.now();
      try {
        await this.db.$queryRaw`SELECT 1`;
        const responseTime = Date.now() - start;
        return {
          name: 'database',
          status: responseTime < 1000 ? 'healthy' : 'degraded',
          responseTime,
          message: 'Database connection successful',
          lastChecked: new Date().toISOString(),
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime: Date.now() - start,
          message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: new Date().toISOString(),
        };
      }
    });
    // Memory health check
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usagePercent > 90) status = 'unhealthy';
      else if (usagePercent > 75) status = 'degraded';
      
      return {
        name: 'memory',
        status,
        message: `Memory usage: ${usagePercent.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB)`,
        details: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
          external: memUsage.external,
          usagePercent,
        },
        lastChecked: new Date().toISOString(),
      };
    });
    // CPU health check
    this.registerCheck('cpu', async () => {
      const cpuUsage = process.cpuUsage();
      const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      return {
        name: 'cpu',
        status: 'healthy' as const,
        message: `CPU usage: ${totalUsage.toFixed(2)}s`,
        details: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          total: totalUsage,
        },
        lastChecked: new Date().toISOString(),
      };
    });
    // Disk space check
    this.registerCheck('disk', async () => {
      try {
        fs.statSync('.');
        const freeSpace = os.freemem();
        const totalSpace = os.totalmem();
        const usagePercent = ((totalSpace - freeSpace) / totalSpace) * 100;
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (usagePercent > 90) status = 'unhealthy';
        else if (usagePercent > 80) status = 'degraded';
        
        return {
          name: 'disk',
          status,
          message: `Disk usage: ${usagePercent.toFixed(1)}%`,
          details: {
            freeSpace,
            totalSpace,
            usagePercent,
          },
          lastChecked: new Date().toISOString(),
        };
      } catch (error) {
        return {
          name: 'disk',
          status: 'unhealthy',
          message: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: new Date().toISOString(),
        };
      }
    });
    // External dependencies check
    this.registerCheck('external_deps', async () => {
      const dependencies = [
        { name: 'Shopify API', url: 'https://api.shopify.com' },
        { name: 'Stripe API', url: 'https://api.stripe.com' },
      ];
      
      const results = await Promise.allSettled(
        dependencies.map(async (dep) => {
          const start = Date.now();
          try {
            const response = await fetch(dep.url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000),
            });
            return {
              name: dep.name,
              status: response.ok ? ('healthy' as const) : ('degraded' as const),
              responseTime: Date.now() - start,
            };
          } catch (error) {
            return {
              name: dep.name,
              status: 'unhealthy' as const,
              responseTime: Date.now() - start,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );
      
      const healthyCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 'healthy'
      ).length;
      const totalCount = results.length;
      const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
        healthyCount === totalCount ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy';
      
      return {
        name: 'external_deps',
        status: overallStatus,
        message: `${healthyCount}/${totalCount} external dependencies healthy`,
        details: {
          dependencies: results.map((r, i) => ({
            name: dependencies[i].name,
            status: r.status === 'fulfilled' ? r.value.status : 'unhealthy',
            responseTime: r.status === 'fulfilled' ? r.value.responseTime : 0,
            error: r.status === 'rejected' ? (r.reason instanceof Error ? r.reason.message : 'Unknown error') : undefined,
          })),
        },
        lastChecked: new Date().toISOString(),
      };
    });
    }
  registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.checks.set(name, checkFn);
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const checkResults: HealthCheckResult[] = [];
    
    // Run all registered checks
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        checkResults.push(result);
      } catch (error) {
        checkResults.push({
          name,
          status: 'unhealthy',
          message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: new Date().toISOString(),
        });
      }
    }
    
    // Calculate summary
    const summary: HealthSummary = {
      total: checkResults.length,
      healthy: checkResults.filter((c) => c.status === 'healthy').length,
      unhealthy: checkResults.filter((c) => c.status === 'unhealthy').length,
      degraded: checkResults.filter((c) => c.status === 'degraded').length,
    };
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - this.startTime,
      checks: checkResults,
      summary,
    };
  }
  // Liveness probe - basic check if app is running
  async livenessCheck(): Promise<{ status: 'alive' | 'dead'; timestamp: string }> {
    try {
      // Simple check - if we can execute this, app is alive
      return {
        status: 'alive',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'dead',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Readiness probe - check if app is ready to serve traffic
  async readinessCheck(): Promise<{
    status: 'ready' | 'not_ready';
    timestamp: string;
    checks: string[];
  }> {
    const healthStatus = await this.performHealthCheck();
    const criticalChecks = ['database', 'memory'];
    const criticalCheckResults = healthStatus.checks.filter((c) =>
      criticalChecks.includes(c.name)
    );
    const failedChecks = criticalCheckResults.filter((c) => c.status === 'unhealthy');
    
    return {
      status: failedChecks.length === 0 ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: failedChecks.map((c) => c.name),
    };
  }
}
// Health check endpoints factory
export function createHealthEndpoints(healthMonitor: HealthMonitor) {
  return {
    // Basic health check
    health: async (req: Request, res: Response): Promise<void> => {
      try {
        const healthStatus = await healthMonitor.performHealthCheck();
        const statusCode = healthStatus.status === 'healthy' ? 200 :
          healthStatus.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    // Liveness probe for Kubernetes
    liveness: async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await healthMonitor.livenessCheck();
        const statusCode = result.status === 'alive' ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(503).json({
          status: 'dead',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    // Readiness probe for Kubernetes
    readiness: async (req: Request, res: Response): Promise<void> => {
      try {
        const result = await healthMonitor.readinessCheck();
        const statusCode = result.status === 'ready' ? 200 : 503;
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(503).json({
          status: 'not_ready',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    // Metrics endpoint for Prometheus
    metrics: async (req: Request, res: Response): Promise<void> => {
      try {
        const healthStatus = await healthMonitor.performHealthCheck();
        // Convert to Prometheus format
        const metrics = [
          `# HELP tokpulse_health_status Overall health status (1=healthy, 0.5=degraded, 0=unhealthy)`,
          `# TYPE tokpulse_health_status gauge`,
          `tokpulse_health_status{environment="${healthStatus.environment}"} ${
            healthStatus.status === 'healthy' ? 1 :
            healthStatus.status === 'degraded' ? 0.5 : 0
          }`,
          `# HELP tokpulse_uptime_seconds Application uptime in seconds`,
          `# TYPE tokpulse_uptime_seconds counter`,
          `tokpulse_uptime_seconds{environment="${healthStatus.environment}"} ${healthStatus.uptime / 1000}`,
          `# HELP tokpulse_health_checks_total Total number of health checks`,
          `# TYPE tokpulse_health_checks_total gauge`,
          `tokpulse_health_checks_total{status="healthy"} ${healthStatus.summary.healthy}`,
          `tokpulse_health_checks_total{status="unhealthy"} ${healthStatus.summary.unhealthy}`,
          `tokpulse_health_checks_total{status="degraded"} ${healthStatus.summary.degraded}`,
        ];
        
        // Add individual check metrics
        for (const check of healthStatus.checks) {
          metrics.push(
            `# HELP tokpulse_health_check_status Individual health check status`,
            `# TYPE tokpulse_health_check_status gauge`,
            `tokpulse_health_check_status{check="${check.name}",status="${check.status}"} ${
              check.status === 'healthy' ? 1 :
              check.status === 'degraded' ? 0.5 : 0
            }`
          );
          if (check.responseTime) {
            metrics.push(
              `# HELP tokpulse_health_check_duration_seconds Health check response time`,
              `# TYPE tokpulse_health_check_duration_seconds gauge`,
              `tokpulse_health_check_duration_seconds{check="${check.name}"} ${check.responseTime / 1000}`
            );
          }
        }
        
        res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(metrics.join('\n'));
      } catch (error) {
        res.status(500).send(`# ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  };
}
