import type { PrismaClient } from '@tokpulse/db';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  labels: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface PerformanceBudget {
  name: string;
  threshold: number;
  unit: string;
  severity: 'warning' | 'error';
  description: string;
}

export interface PerformanceReport {
  timestamp: string;
  environment: string;
  version: string;
  metrics: PerformanceMetric[];
  budgets: PerformanceBudget[];
  violations: Array<{
    budget: PerformanceBudget;
    actual: number;
    violation: number;
  }>;
  recommendations: string[];
}

export class PerformanceMonitor {
  private db: PrismaClient;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private budgets: PerformanceBudget[] = [];
  private startTime: number;
  private environment: string;
  private version: string;

  constructor(
    db: PrismaClient,
    options: {
      environment?: string;
      version?: string;
    } = {},
  ) {
    this.db = db;
    this.startTime = Date.now();
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.version = options.version || process.env.npm_package_version || '1.0.0';
    this.initializeBudgets();
  }

  private initializeBudgets() {
    this.budgets = [
      // Web Vitals
      {
        name: 'lcp',
        threshold: 2500,
        unit: 'ms',
        severity: 'error',
        description: 'Largest Contentful Paint should be under 2.5s',
      },
      {
        name: 'fid',
        threshold: 100,
        unit: 'ms',
        severity: 'error',
        description: 'First Input Delay should be under 100ms',
      },
      {
        name: 'cls',
        threshold: 0.1,
        unit: 'score',
        severity: 'error',
        description: 'Cumulative Layout Shift should be under 0.1',
      },
      {
        name: 'inp',
        threshold: 200,
        unit: 'ms',
        severity: 'error',
        description: 'Interaction to Next Paint should be under 200ms',
      },
      {
        name: 'ttfb',
        threshold: 800,
        unit: 'ms',
        severity: 'warning',
        description: 'Time to First Byte should be under 800ms',
      },

      // Bundle Size
      {
        name: 'bundle_size',
        threshold: 1024 * 1024, // 1MB
        unit: 'bytes',
        severity: 'warning',
        description: 'Bundle size should be under 1MB',
      },
      {
        name: 'bundle_size_gzipped',
        threshold: 256 * 1024, // 256KB
        unit: 'bytes',
        severity: 'warning',
        description: 'Gzipped bundle size should be under 256KB',
      },

      // API Performance
      {
        name: 'api_response_time',
        threshold: 200,
        unit: 'ms',
        severity: 'warning',
        description: 'API response time should be under 200ms',
      },
      {
        name: 'api_response_time_p95',
        threshold: 500,
        unit: 'ms',
        severity: 'error',
        description: '95th percentile API response time should be under 500ms',
      },

      // Database Performance
      {
        name: 'db_query_time',
        threshold: 100,
        unit: 'ms',
        severity: 'warning',
        description: 'Database query time should be under 100ms',
      },
      {
        name: 'db_query_time_p95',
        threshold: 200,
        unit: 'ms',
        severity: 'error',
        description: '95th percentile database query time should be under 200ms',
      },

      // Memory Usage
      {
        name: 'memory_usage',
        threshold: 512 * 1024 * 1024, // 512MB
        unit: 'bytes',
        severity: 'warning',
        description: 'Memory usage should be under 512MB',
      },
      {
        name: 'memory_usage_p95',
        threshold: 1024 * 1024 * 1024, // 1GB
        unit: 'bytes',
        severity: 'error',
        description: '95th percentile memory usage should be under 1GB',
      },

      // CPU Usage
      {
        name: 'cpu_usage',
        threshold: 80,
        unit: 'percent',
        severity: 'warning',
        description: 'CPU usage should be under 80%',
      },
      {
        name: 'cpu_usage_p95',
        threshold: 95,
        unit: 'percent',
        severity: 'error',
        description: '95th percentile CPU usage should be under 95%',
      },
    ];
  }

  // Record a performance metric
  recordMetric(
    name: string,
    value: number,
    unit: string,
    labels: Record<string, string> = {},
    metadata?: Record<string, any>,
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      labels,
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Keep only last 1000 metrics per name
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  // Measure execution time
  async measureExecutionTime<T>(
    name: string,
    fn: () => Promise<T>,
    labels: Record<string, string> = {},
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.recordMetric(name, duration, 'ms', labels);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.recordMetric(name, duration, 'ms', { ...labels, status: 'error' });

      throw error;
    }
  }

  // Measure API request
  measureApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    labels: Record<string, string> = {},
  ): void {
    this.recordMetric('api_response_time', duration, 'ms', {
      ...labels,
      method,
      path: this.sanitizePath(path),
      status_code: statusCode.toString(),
    });

    // Record status code distribution
    this.recordMetric('api_requests_total', 1, 'count', {
      method,
      path: this.sanitizePath(path),
      status_code: statusCode.toString(),
    });
  }

  // Measure database query
  measureDatabaseQuery(query: string, duration: number, labels: Record<string, string> = {}): void {
    this.recordMetric('db_query_time', duration, 'ms', {
      ...labels,
      query: this.sanitizeQuery(query),
    });

    this.recordMetric('db_queries_total', 1, 'count', {
      query: this.sanitizeQuery(query),
    });
  }

  // Measure memory usage
  measureMemoryUsage(): void {
    const memUsage = process.memoryUsage();

    this.recordMetric('memory_usage', memUsage.heapUsed, 'bytes', {
      type: 'heap_used',
    });

    this.recordMetric('memory_usage', memUsage.heapTotal, 'bytes', {
      type: 'heap_total',
    });

    this.recordMetric('memory_usage', memUsage.rss, 'bytes', {
      type: 'rss',
    });

    this.recordMetric('memory_usage', memUsage.external, 'bytes', {
      type: 'external',
    });
  }

  // Measure CPU usage
  measureCpuUsage(): void {
    const cpuUsage = process.cpuUsage();
    const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    this.recordMetric('cpu_usage', totalUsage, 'seconds', {
      type: 'total',
    });

    this.recordMetric('cpu_usage', cpuUsage.user / 1000000, 'seconds', {
      type: 'user',
    });

    this.recordMetric('cpu_usage', cpuUsage.system / 1000000, 'seconds', {
      type: 'system',
    });
  }

  // Measure bundle size
  measureBundleSize(bundlePath: string): void {
    try {
      const fs = require('fs');
      const stats = fs.statSync(bundlePath);

      this.recordMetric('bundle_size', stats.size, 'bytes', {
        bundle: bundlePath,
      });

      // Measure gzipped size
      const zlib = require('zlib');
      const content = fs.readFileSync(bundlePath);
      const gzipped = zlib.gzipSync(content);

      this.recordMetric('bundle_size_gzipped', gzipped.length, 'bytes', {
        bundle: bundlePath,
      });
    } catch (error) {
      console.error('Failed to measure bundle size:', error);
    }
  }

  // Measure Web Vitals
  measureWebVitals(vitals: {
    lcp?: number;
    fid?: number;
    cls?: number;
    inp?: number;
    ttfb?: number;
  }): void {
    if (vitals.lcp !== undefined) {
      this.recordMetric('lcp', vitals.lcp, 'ms');
    }
    if (vitals.fid !== undefined) {
      this.recordMetric('fid', vitals.fid, 'ms');
    }
    if (vitals.cls !== undefined) {
      this.recordMetric('cls', vitals.cls, 'score');
    }
    if (vitals.inp !== undefined) {
      this.recordMetric('inp', vitals.inp, 'ms');
    }
    if (vitals.ttfb !== undefined) {
      this.recordMetric('ttfb', vitals.ttfb, 'ms');
    }
  }

  // Get performance report
  getPerformanceReport(): PerformanceReport {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const violations: Array<{
      budget: PerformanceBudget;
      actual: number;
      violation: number;
    }> = [];
    const recommendations: string[] = [];

    // Check budget violations
    for (const budget of this.budgets) {
      const metrics = allMetrics.filter((m) => m.name === budget.name);
      if (metrics.length === 0) continue;

      // Calculate percentiles
      const values = metrics.map((m) => m.value).sort((a, b) => a - b);
      const p50 = this.percentile(values, 0.5);
      const p95 = this.percentile(values, 0.95);
      const p99 = this.percentile(values, 0.99);

      // Check for violations
      const checkValue = budget.name.includes('p95') ? p95 : p50;
      if (checkValue > budget.threshold) {
        violations.push({
          budget,
          actual: checkValue,
          violation: checkValue - budget.threshold,
        });
      }
    }

    // Generate recommendations
    this.generateRecommendations(allMetrics, violations, recommendations);

    return {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      version: this.version,
      metrics: allMetrics,
      budgets: this.budgets,
      violations,
      recommendations,
    };
  }

  // Generate recommendations
  private generateRecommendations(
    metrics: PerformanceMetric[],
    violations: Array<{ budget: PerformanceBudget; actual: number; violation: number }>,
    recommendations: string[],
  ): void {
    // LCP recommendations
    const lcpMetrics = metrics.filter((m) => m.name === 'lcp');
    if (lcpMetrics.length > 0) {
      const avgLcp = lcpMetrics.reduce((sum, m) => sum + m.value, 0) / lcpMetrics.length;
      if (avgLcp > 2500) {
        recommendations.push(
          'Optimize Largest Contentful Paint: Consider image optimization, lazy loading, and critical CSS inlining',
        );
      }
    }

    // Bundle size recommendations
    const bundleMetrics = metrics.filter((m) => m.name === 'bundle_size');
    if (bundleMetrics.length > 0) {
      const avgBundleSize =
        bundleMetrics.reduce((sum, m) => sum + m.value, 0) / bundleMetrics.length;
      if (avgBundleSize > 1024 * 1024) {
        recommendations.push(
          'Reduce bundle size: Consider code splitting, tree shaking, and removing unused dependencies',
        );
      }
    }

    // API performance recommendations
    const apiMetrics = metrics.filter((m) => m.name === 'api_response_time');
    if (apiMetrics.length > 0) {
      const avgApiTime = apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length;
      if (avgApiTime > 200) {
        recommendations.push(
          'Optimize API performance: Consider caching, database query optimization, and connection pooling',
        );
      }
    }

    // Memory usage recommendations
    const memoryMetrics = metrics.filter(
      (m) => m.name === 'memory_usage' && m.labels.type === 'heap_used',
    );
    if (memoryMetrics.length > 0) {
      const avgMemory = memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length;
      if (avgMemory > 512 * 1024 * 1024) {
        recommendations.push(
          'Optimize memory usage: Consider memory leaks, garbage collection tuning, and object pooling',
        );
      }
    }

    // Database performance recommendations
    const dbMetrics = metrics.filter((m) => m.name === 'db_query_time');
    if (dbMetrics.length > 0) {
      const avgDbTime = dbMetrics.reduce((sum, m) => sum + m.value, 0) / dbMetrics.length;
      if (avgDbTime > 100) {
        recommendations.push(
          'Optimize database queries: Consider indexing, query optimization, and connection pooling',
        );
      }
    }
  }

  // Calculate percentile
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  // Get metrics for Prometheus
  getPrometheusMetrics(): string {
    const allMetrics = Array.from(this.metrics.values()).flat();
    const lines: string[] = [];

    // Group metrics by name
    const groupedMetrics = new Map<string, PerformanceMetric[]>();
    for (const metric of allMetrics) {
      if (!groupedMetrics.has(metric.name)) {
        groupedMetrics.set(metric.name, []);
      }
      groupedMetrics.get(metric.name)!.push(metric);
    }

    for (const [name, metrics] of groupedMetrics) {
      // Add help and type comments
      lines.push(`# HELP ${name} ${name} metric`);
      lines.push(`# TYPE ${name} gauge`);

      // Add metric values
      for (const metric of metrics) {
        const labels = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');

        const labelStr = labels ? `{${labels}}` : '';
        lines.push(`${name}${labelStr} ${metric.value}`);
      }
    }

    return lines.join('\n');
  }

  // Clear old metrics
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;

    for (const [name, metrics] of this.metrics) {
      const filtered = metrics.filter((m) => new Date(m.timestamp).getTime() > cutoff);
      this.metrics.set(name, filtered);
    }
  }

  // Get current performance status
  getPerformanceStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    violations: number;
    recommendations: number;
  } {
    const report = this.getPerformanceReport();
    const violations = report.violations.length;
    const recommendations = report.recommendations.length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (violations > 0) {
      const criticalViolations = report.violations.filter(
        (v) => v.budget.severity === 'error',
      ).length;
      status = criticalViolations > 0 ? 'critical' : 'warning';
    }

    // Calculate performance score (0-100)
    const totalBudgets = this.budgets.length;
    const violatedBudgets = violations;
    const score = Math.max(0, Math.round(((totalBudgets - violatedBudgets) / totalBudgets) * 100));

    return {
      status,
      score,
      violations,
      recommendations,
    };
  }

  // Sanitize path for metrics
  private sanitizePath(path: string): string {
    return path
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-f0-9-]{24}/g, '/:objectid');
  }

  // Sanitize query for metrics
  private sanitizeQuery(query: string): string {
    return query.replace(/\s+/g, ' ').trim().substring(0, 100).replace(/\$\d+/g, '$?');
  }
}

// Express middleware for automatic performance monitoring
export function createPerformanceMonitoringMiddleware(monitor: PerformanceMonitor) {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Override res.json to capture response details
    const originalJson = res.json;
    res.json = function (data: any) {
      const duration = Date.now() - startTime;

      // Measure API request
      monitor.measureApiRequest(req.method, req.path, res.statusCode, duration, {
        user_agent: req.get('User-Agent') || 'unknown',
        ip: req.ip || 'unknown',
      });

      return originalJson.call(this, data);
    };

    next();
  };
}

// Default performance monitor instance
export const performanceMonitor = new PerformanceMonitor(
  {} as PrismaClient, // Will be replaced with actual DB instance
  {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  },
);
