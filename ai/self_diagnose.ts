/**
 * AI Self-Diagnosis System
 * Monitors CI logs, error frequency, cold starts, and latency metrics
 * Emits JSON summaries to Supabase and triggers alerts on anomalies
 */

import { createClient } from '@supabase/supabase-js';

export interface HealthMetric {
  id?: string;
  timestamp: Date;
  metric_type: 'deploy_failure' | 'latency_spike' | 'cold_start' | 'error_rate';
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, unknown>;
  recommendation?: string;
}

export interface DiagnosisResult {
  status: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetric[];
  patterns: Pattern[];
  actions: Action[];
}

export interface Pattern {
  type: string;
  occurrences: number;
  description: string;
  first_seen: Date;
  last_seen: Date;
}

export interface Action {
  type: 'github_issue' | 'slack_alert' | 'auto_rollback' | 'scale_up';
  priority: 'low' | 'medium' | 'high';
  payload: Record<string, unknown>;
}

export class SelfDiagnose {
  private supabase: ReturnType<typeof createClient>;
  private readonly DEPLOY_FAILURE_THRESHOLD = 3;
  private readonly LATENCY_SPIKE_THRESHOLD = 0.2; // 20% increase
  private readonly ERROR_RATE_THRESHOLD = 0.05; // 5%

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Analyzes system health from multiple data sources
   */
  async diagnose(options: {
    timeWindow?: number; // minutes
    sources?: string[];
  } = {}): Promise<DiagnosisResult> {
    const timeWindow = options.timeWindow || 60;
    const since = new Date(Date.now() - timeWindow * 60 * 1000);

    const [deployMetrics, latencyMetrics, errorMetrics] = await Promise.all([
      this.analyzeDeployFailures(since),
      this.analyzeLatency(since),
      this.analyzeErrorRate(since),
    ]);

    const allMetrics = [...deployMetrics, ...latencyMetrics, ...errorMetrics];
    const patterns = this.detectPatterns(allMetrics);
    const actions = this.generateActions(patterns);

    // Store metrics in Supabase
    await this.storeMetrics(allMetrics);

    const status = this.determineOverallStatus(allMetrics, patterns);

    return {
      status,
      metrics: allMetrics,
      patterns,
      actions,
    };
  }

  /**
   * Analyzes deploy failures from CI logs
   */
  private async analyzeDeployFailures(since: Date): Promise<HealthMetric[]> {
    const { data: recentDeploys } = await this.supabase
      .from('ci_deploys')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    if (!recentDeploys) return [];

    const failures = recentDeploys.filter((d) => d.status === 'failed');
    const failureRate = failures.length / recentDeploys.length;

    if (failures.length >= this.DEPLOY_FAILURE_THRESHOLD) {
      return [
        {
          timestamp: new Date(),
          metric_type: 'deploy_failure',
          value: failures.length,
          threshold: this.DEPLOY_FAILURE_THRESHOLD,
          severity: failures.length >= 5 ? 'critical' : 'high',
          context: {
            total_deploys: recentDeploys.length,
            failure_rate: failureRate,
            recent_failures: failures.slice(0, 5).map((f) => ({
              id: f.id,
              error: f.error_message,
              branch: f.branch,
            })),
          },
          recommendation:
            'Multiple deploy failures detected. Check for breaking changes in recent commits.',
        },
      ];
    }

    return [];
  }

  /**
   * Analyzes latency metrics (p95, p99)
   */
  private async analyzeLatency(since: Date): Promise<HealthMetric[]> {
    const { data: metrics } = await this.supabase
      .from('performance_metrics')
      .select('*')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });

    if (!metrics || metrics.length === 0) return [];

    const currentP95 = this.calculatePercentile(
      metrics.map((m) => m.response_time),
      95
    );
    const baselineP95 = await this.getBaselineLatency('p95');

    const increase = (currentP95 - baselineP95) / baselineP95;

    if (increase > this.LATENCY_SPIKE_THRESHOLD) {
      return [
        {
          timestamp: new Date(),
          metric_type: 'latency_spike',
          value: currentP95,
          threshold: baselineP95 * (1 + this.LATENCY_SPIKE_THRESHOLD),
          severity: increase > 0.5 ? 'critical' : increase > 0.3 ? 'high' : 'medium',
          context: {
            current_p95: currentP95,
            baseline_p95: baselineP95,
            increase_percentage: (increase * 100).toFixed(2),
            slow_endpoints: await this.getSlowestEndpoints(since),
          },
          recommendation:
            'Latency spike detected. Consider adding caching, optimizing queries, or scaling resources.',
        },
      ];
    }

    return [];
  }

  /**
   * Analyzes error rates
   */
  private async analyzeErrorRate(since: Date): Promise<HealthMetric[]> {
    const { data: logs } = await this.supabase
      .from('application_logs')
      .select('level')
      .gte('timestamp', since.toISOString());

    if (!logs || logs.length === 0) return [];

    const errors = logs.filter((l) => l.level === 'error' || l.level === 'fatal');
    const errorRate = errors.length / logs.length;

    if (errorRate > this.ERROR_RATE_THRESHOLD) {
      return [
        {
          timestamp: new Date(),
          metric_type: 'error_rate',
          value: errorRate,
          threshold: this.ERROR_RATE_THRESHOLD,
          severity: errorRate > 0.1 ? 'critical' : 'high',
          context: {
            total_logs: logs.length,
            error_count: errors.length,
            error_rate: (errorRate * 100).toFixed(2) + '%',
          },
          recommendation: 'High error rate detected. Review application logs for root cause.',
        },
      ];
    }

    return [];
  }

  /**
   * Detects patterns in metrics (e.g., recurring failures)
   */
  private detectPatterns(metrics: HealthMetric[]): Pattern[] {
    const patterns: Pattern[] = [];
    const metricsByType = metrics.reduce((acc, m) => {
      acc[m.metric_type] = (acc[m.metric_type] || []).concat(m);
      return acc;
    }, {} as Record<string, HealthMetric[]>);

    for (const [type, typeMetrics] of Object.entries(metricsByType)) {
      if (typeMetrics.length >= 2) {
        patterns.push({
          type: `recurring_${type}`,
          occurrences: typeMetrics.length,
          description: `${type} has occurred ${typeMetrics.length} times in the observation window`,
          first_seen: typeMetrics[typeMetrics.length - 1]!.timestamp,
          last_seen: typeMetrics[0]!.timestamp,
        });
      }
    }

    return patterns;
  }

  /**
   * Generates automated actions based on patterns
   */
  private generateActions(patterns: Pattern[]): Action[] {
    const actions: Action[] = [];

    for (const pattern of patterns) {
      if (pattern.occurrences >= 3) {
        actions.push({
          type: 'github_issue',
          priority: 'high',
          payload: {
            title: `[AI Alert] Pattern Detected: ${pattern.type}`,
            body: `**Pattern**: ${pattern.description}\n\n**Occurrences**: ${pattern.occurrences}\n**First Seen**: ${pattern.first_seen}\n**Last Seen**: ${pattern.last_seen}\n\nAutomatic issue created by AI Self-Diagnosis System.`,
            labels: ['ai-alert', 'automation', pattern.type.split('_')[1] || 'unknown'],
          },
        });
      }

      if (pattern.type.includes('latency_spike')) {
        actions.push({
          type: 'scale_up',
          priority: 'medium',
          payload: {
            target: 'api',
            reason: 'Latency spike pattern detected',
          },
        });
      }
    }

    return actions;
  }

  /**
   * Stores metrics in Supabase
   */
  private async storeMetrics(metrics: HealthMetric[]): Promise<void> {
    if (metrics.length === 0) return;

    await this.supabase.from('ai_health_metrics').insert(
      metrics.map((m) => ({
        timestamp: m.timestamp.toISOString(),
        metric_type: m.metric_type,
        value: m.value,
        threshold: m.threshold,
        severity: m.severity,
        context: m.context,
        recommendation: m.recommendation,
      }))
    );
  }

  /**
   * Determines overall system status
   */
  private determineOverallStatus(
    metrics: HealthMetric[],
    patterns: Pattern[]
  ): 'healthy' | 'warning' | 'critical' {
    const hasCritical = metrics.some((m) => m.severity === 'critical');
    const hasMultipleHigh = metrics.filter((m) => m.severity === 'high').length >= 2;
    const hasRecurringPatterns = patterns.some((p) => p.occurrences >= 3);

    if (hasCritical || hasRecurringPatterns) return 'critical';
    if (hasMultipleHigh) return 'warning';
    return 'healthy';
  }

  /**
   * Helper: Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  /**
   * Helper: Get baseline latency
   */
  private async getBaselineLatency(metric: string): Promise<number> {
    const { data } = await this.supabase
      .from('baseline_metrics')
      .select('value')
      .eq('metric', metric)
      .single();

    return data?.value || 100; // Default to 100ms
  }

  /**
   * Helper: Get slowest endpoints
   */
  private async getSlowestEndpoints(since: Date): Promise<unknown[]> {
    const { data } = await this.supabase
      .from('performance_metrics')
      .select('endpoint, response_time')
      .gte('timestamp', since.toISOString())
      .order('response_time', { ascending: false })
      .limit(5);

    return data || [];
  }

  /**
   * Create GitHub issue via API
   */
  async createGitHubIssue(action: Action): Promise<void> {
    if (!process.env.GITHUB_TOKEN) {
      console.warn('GITHUB_TOKEN not set, skipping issue creation');
      return;
    }

    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action.payload),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create GitHub issue: ${response.statusText}`);
    }
  }
}

/**
 * CLI entrypoint
 */
export async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ghqyxhbyyirveptgwoqm.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

  if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_KEY required');
    process.exit(1);
  }

  const diagnose = new SelfDiagnose(supabaseUrl, supabaseKey);
  const result = await diagnose.diagnose({ timeWindow: 60 });

  console.log(JSON.stringify(result, null, 2));

  // Execute actions
  for (const action of result.actions) {
    if (action.type === 'github_issue') {
      await diagnose.createGitHubIssue(action);
    }
  }

  // Exit with error code if critical
  if (result.status === 'critical') {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
