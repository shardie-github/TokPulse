/**
 * AI Performance Watcher
 * Tracks token usage, latency per model, and cost efficiency
 */

import { createClient } from '@supabase/supabase-js';

export interface AIMetric {
  timestamp: Date;
  model: string;
  operation: string;
  tokens_used: number;
  latency_ms: number;
  cost: number;
  success: boolean;
  error?: string;
}

export interface PerformanceReport {
  status: 'optimal' | 'degraded' | 'critical';
  summary: {
    total_requests: number;
    total_tokens: number;
    total_cost: number;
    avg_latency: number;
    success_rate: number;
  };
  by_model: Record<string, ModelStats>;
  anomalies: Anomaly[];
  recommendations: string[];
}

export interface ModelStats {
  requests: number;
  tokens: number;
  cost: number;
  avg_latency: number;
  success_rate: number;
}

export interface Anomaly {
  type: 'high_latency' | 'high_cost' | 'low_success_rate' | 'token_spike';
  model: string;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

export class AIPerformanceWatcher {
  private supabase: ReturnType<typeof createClient>;
  private readonly LATENCY_THRESHOLD = 5000; // 5s
  private readonly SUCCESS_RATE_THRESHOLD = 0.95; // 95%
  private readonly COST_THRESHOLD = 1.0; // $1 per request

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async check(timeWindowMinutes: number = 60): Promise<PerformanceReport> {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const { data: metrics } = await this.supabase
      .from('ai_usage_metrics')
      .select('*')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });

    if (!metrics || metrics.length === 0) {
      return this.emptyReport();
    }

    const aiMetrics: AIMetric[] = metrics.map((m) => ({
      timestamp: new Date(m.timestamp),
      model: m.model,
      operation: m.operation,
      tokens_used: m.tokens_used,
      latency_ms: m.latency_ms,
      cost: m.cost,
      success: m.success,
      error: m.error,
    }));

    const summary = this.calculateSummary(aiMetrics);
    const byModel = this.groupByModel(aiMetrics);
    const anomalies = this.detectAnomalies(aiMetrics, byModel);
    const recommendations = this.generateRecommendations(byModel, anomalies);
    const status = this.determineStatus(anomalies, summary);

    return {
      status,
      summary,
      by_model: byModel,
      anomalies,
      recommendations,
    };
  }

  private emptyReport(): PerformanceReport {
    return {
      status: 'optimal',
      summary: {
        total_requests: 0,
        total_tokens: 0,
        total_cost: 0,
        avg_latency: 0,
        success_rate: 1.0,
      },
      by_model: {},
      anomalies: [],
      recommendations: [],
    };
  }

  private calculateSummary(metrics: AIMetric[]) {
    const successful = metrics.filter((m) => m.success).length;
    const totalLatency = metrics.reduce((sum, m) => sum + m.latency_ms, 0);

    return {
      total_requests: metrics.length,
      total_tokens: metrics.reduce((sum, m) => sum + m.tokens_used, 0),
      total_cost: metrics.reduce((sum, m) => sum + m.cost, 0),
      avg_latency: totalLatency / metrics.length,
      success_rate: successful / metrics.length,
    };
  }

  private groupByModel(metrics: AIMetric[]): Record<string, ModelStats> {
    const grouped: Record<string, AIMetric[]> = {};

    for (const metric of metrics) {
      grouped[metric.model] = (grouped[metric.model] || []).concat(metric);
    }

    const result: Record<string, ModelStats> = {};

    for (const [model, modelMetrics] of Object.entries(grouped)) {
      const successful = modelMetrics.filter((m) => m.success).length;
      const totalLatency = modelMetrics.reduce((sum, m) => sum + m.latency_ms, 0);

      result[model] = {
        requests: modelMetrics.length,
        tokens: modelMetrics.reduce((sum, m) => sum + m.tokens_used, 0),
        cost: modelMetrics.reduce((sum, m) => sum + m.cost, 0),
        avg_latency: totalLatency / modelMetrics.length,
        success_rate: successful / modelMetrics.length,
      };
    }

    return result;
  }

  private detectAnomalies(
    metrics: AIMetric[],
    byModel: Record<string, ModelStats>
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Check for high latency
    for (const [model, stats] of Object.entries(byModel)) {
      if (stats.avg_latency > this.LATENCY_THRESHOLD) {
        anomalies.push({
          type: 'high_latency',
          model,
          value: stats.avg_latency,
          threshold: this.LATENCY_THRESHOLD,
          severity: stats.avg_latency > this.LATENCY_THRESHOLD * 2 ? 'high' : 'medium',
        });
      }

      if (stats.success_rate < this.SUCCESS_RATE_THRESHOLD) {
        anomalies.push({
          type: 'low_success_rate',
          model,
          value: stats.success_rate,
          threshold: this.SUCCESS_RATE_THRESHOLD,
          severity: stats.success_rate < 0.8 ? 'high' : 'medium',
        });
      }

      const costPerRequest = stats.cost / stats.requests;
      if (costPerRequest > this.COST_THRESHOLD) {
        anomalies.push({
          type: 'high_cost',
          model,
          value: costPerRequest,
          threshold: this.COST_THRESHOLD,
          severity: 'medium',
        });
      }
    }

    // Check for token spikes
    const avgTokensPerRequest = metrics.reduce((sum, m) => sum + m.tokens_used, 0) / metrics.length;
    for (const metric of metrics) {
      if (metric.tokens_used > avgTokensPerRequest * 5) {
        // 5x average
        anomalies.push({
          type: 'token_spike',
          model: metric.model,
          value: metric.tokens_used,
          threshold: avgTokensPerRequest * 5,
          severity: 'low',
        });
        break; // Report once
      }
    }

    return anomalies;
  }

  private generateRecommendations(
    byModel: Record<string, ModelStats>,
    anomalies: Anomaly[]
  ): string[] {
    const recommendations: string[] = [];

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case 'high_latency':
          recommendations.push(
            `Consider switching from ${anomaly.model} to a faster model or implement request caching`
          );
          break;
        case 'high_cost':
          recommendations.push(
            `${anomaly.model} has high cost per request. Consider using a cheaper model for simpler tasks`
          );
          break;
        case 'low_success_rate':
          recommendations.push(
            `${anomaly.model} has low success rate. Review error logs and implement retry logic`
          );
          break;
        case 'token_spike':
          recommendations.push(
            `Token usage spike detected for ${anomaly.model}. Review prompt engineering and context window usage`
          );
          break;
      }
    }

    // Cost optimization recommendations
    const totalCost = Object.values(byModel).reduce((sum, s) => sum + s.cost, 0);
    if (totalCost > 100) {
      // $100 in the time window
      recommendations.push(
        'High AI costs detected. Implement response caching and use cheaper models where appropriate'
      );
    }

    // Model usage recommendations
    const models = Object.keys(byModel);
    if (models.includes('gpt-4') && models.includes('gpt-3.5-turbo')) {
      const gpt4Stats = byModel['gpt-4'];
      const gpt35Stats = byModel['gpt-3.5-turbo'];
      if (gpt4Stats && gpt35Stats && gpt4Stats.requests < gpt35Stats.requests * 0.1) {
        recommendations.push(
          'GPT-4 usage is low. Consider if GPT-3.5-turbo can handle more workload'
        );
      }
    }

    return recommendations;
  }

  private determineStatus(
    anomalies: Anomaly[],
    summary: PerformanceReport['summary']
  ): 'optimal' | 'degraded' | 'critical' {
    const highAnomalies = anomalies.filter((a) => a.severity === 'high').length;
    
    if (highAnomalies > 0 || summary.success_rate < 0.8) return 'critical';
    if (anomalies.length > 3 || summary.success_rate < 0.95) return 'degraded';
    return 'optimal';
  }

  async createGitHubIssue(report: PerformanceReport): Promise<void> {
    if (report.status === 'optimal') return;

    const title = `[AI Performance] ${report.status.toUpperCase()} - ${report.anomalies.length} Anomalies Detected`;
    const body = this.formatIssueBody(report);

    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          labels: ['ai', 'performance', 'watcher'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create issue: ${response.statusText}`);
    }
  }

  private formatIssueBody(report: PerformanceReport): string {
    let body = '## AI Performance Report\n\n';

    body += '### Summary\n\n';
    body += `- Total Requests: ${report.summary.total_requests}\n`;
    body += `- Total Tokens: ${report.summary.total_tokens.toLocaleString()}\n`;
    body += `- Total Cost: $${report.summary.total_cost.toFixed(2)}\n`;
    body += `- Avg Latency: ${report.summary.avg_latency.toFixed(0)}ms\n`;
    body += `- Success Rate: ${(report.summary.success_rate * 100).toFixed(1)}%\n\n`;

    if (report.anomalies.length > 0) {
      body += '### Anomalies\n\n';
      for (const anomaly of report.anomalies) {
        const emoji = { high: '🔴', medium: '🟡', low: '🟢' }[anomaly.severity];
        body += `${emoji} **${anomaly.type}** (${anomaly.model})\n`;
        body += `- Value: ${anomaly.value.toFixed(2)} / Threshold: ${anomaly.threshold.toFixed(2)}\n\n`;
      }
    }

    if (report.recommendations.length > 0) {
      body += '### Recommendations\n\n';
      for (const rec of report.recommendations) {
        body += `- ${rec}\n`;
      }
      body += '\n';
    }

    body += `---\n_Auto-generated by AI Performance Watcher on ${new Date().toISOString()}_`;
    return body;
  }
}

export async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://ghqyxhbyyirveptgwoqm.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

  if (!supabaseKey) {
    console.error('SUPABASE_SERVICE_KEY required');
    process.exit(1);
  }

  const watcher = new AIPerformanceWatcher(supabaseUrl, supabaseKey);
  const report = await watcher.check(60);

  console.log(JSON.stringify(report, null, 2));

  if (report.status !== 'optimal' && process.env.GITHUB_TOKEN) {
    await watcher.createGitHubIssue(report);
  }

  if (report.status === 'critical') {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
