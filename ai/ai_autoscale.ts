/**
 * AI Auto-Scaling & Cost Awareness
 * Predicts cost trajectory and triggers alerts on budget deviations
 */

import { createClient } from '@supabase/supabase-js';

export interface UsageMetric {
  timestamp: Date;
  service: string;
  metric_type: 'requests' | 'compute' | 'storage' | 'bandwidth';
  value: number;
  cost: number;
}

export interface CostPrediction {
  current_spend: number;
  projected_monthly: number;
  budget: number;
  deviation_percent: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
}

export interface ScalingAction {
  type: 'scale_up' | 'scale_down' | 'optimize' | 'alert';
  service: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class AIAutoScale {
  private supabase: ReturnType<typeof createClient>;
  private readonly BUDGET_DEVIATION_THRESHOLD = 0.2; // 20%
  private readonly VERCEL_API = 'https://api.vercel.com';

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Analyze usage and predict costs
   */
  async analyze(): Promise<{
    prediction: CostPrediction;
    actions: ScalingAction[];
    metrics: UsageMetric[];
  }> {
    const [vercelMetrics, supabaseMetrics, historicalData] = await Promise.all([
      this.getVercelMetrics(),
      this.getSupabaseMetrics(),
      this.getHistoricalData(),
    ]);

    const allMetrics = [...vercelMetrics, ...supabaseMetrics];
    const prediction = this.predictCosts(allMetrics, historicalData);
    const actions = this.generateActions(prediction, allMetrics);

    // Store analysis
    await this.storeAnalysis(prediction, actions);

    return {
      prediction,
      actions,
      metrics: allMetrics,
    };
  }

  /**
   * Get Vercel usage metrics
   */
  private async getVercelMetrics(): Promise<UsageMetric[]> {
    const vercelToken = process.env.VERCEL_TOKEN;
    if (!vercelToken) {
      console.warn('VERCEL_TOKEN not set, skipping Vercel metrics');
      return [];
    }

    try {
      const teamId = process.env.VERCEL_TEAM_ID;
      const url = teamId 
        ? `${this.VERCEL_API}/v1/teams/${teamId}/usage`
        : `${this.VERCEL_API}/v1/usage`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Vercel API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return this.parseVercelMetrics(data);
    } catch (error) {
      console.error('Failed to fetch Vercel metrics:', error);
      return [];
    }
  }

  /**
   * Get Supabase metrics
   */
  private async getSupabaseMetrics(): Promise<UsageMetric[]> {
    try {
      const { data: metrics } = await this.supabase
        .from('usage_metrics')
        .select('*')
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false });

      if (!metrics) return [];

      return metrics.map((m) => ({
        timestamp: new Date(m.timestamp),
        service: 'supabase',
        metric_type: m.metric_type,
        value: m.value,
        cost: m.cost || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch Supabase metrics:', error);
      return [];
    }
  }

  /**
   * Parse Vercel metrics response
   */
  private parseVercelMetrics(data: any): UsageMetric[] {
    const metrics: UsageMetric[] = [];
    const now = new Date();

    if (data.requests) {
      metrics.push({
        timestamp: now,
        service: 'vercel',
        metric_type: 'requests',
        value: data.requests.total || 0,
        cost: this.calculateVercelCost(data.requests.total || 0, 'requests'),
      });
    }

    if (data.bandwidth) {
      metrics.push({
        timestamp: now,
        service: 'vercel',
        metric_type: 'bandwidth',
        value: data.bandwidth.total || 0,
        cost: this.calculateVercelCost(data.bandwidth.total || 0, 'bandwidth'),
      });
    }

    return metrics;
  }

  /**
   * Calculate Vercel costs (simplified pricing model)
   */
  private calculateVercelCost(value: number, type: string): number {
    const pricing = {
      requests: 0.00000065, // Per request after free tier
      bandwidth: 0.15, // Per GB after free tier
      compute: 0.000024, // Per GB-second
    };

    return value * (pricing[type as keyof typeof pricing] || 0);
  }

  /**
   * Get historical data for trend analysis
   */
  private async getHistoricalData(): Promise<UsageMetric[]> {
    const { data } = await this.supabase
      .from('usage_metrics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    return (data || []).map((m) => ({
      timestamp: new Date(m.timestamp),
      service: m.service,
      metric_type: m.metric_type,
      value: m.value,
      cost: m.cost || 0,
    }));
  }

  /**
   * Predict costs using linear regression
   */
  private predictCosts(current: UsageMetric[], historical: UsageMetric[]): CostPrediction {
    const currentSpend = current.reduce((sum, m) => sum + m.cost, 0);
    
    // Simple linear regression on historical data
    const dailyCosts = this.groupByDay(historical);
    const trend = this.calculateTrend(dailyCosts);
    
    // Project to end of month
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getDate();
    const currentDay = new Date().getDate();
    const daysRemaining = daysInMonth - currentDay;
    
    const avgDailyCost = dailyCosts.length > 0 
      ? dailyCosts.reduce((sum, c) => sum + c, 0) / dailyCosts.length 
      : currentSpend;
    
    const projectedMonthly = (avgDailyCost * currentDay) + (avgDailyCost * daysRemaining * (1 + trend));
    
    // Budget (from env or default)
    const budget = parseFloat(process.env.MONTHLY_BUDGET || '500');
    const deviation = (projectedMonthly - budget) / budget;

    const trendLabel = trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';

    let recommendation = '';
    if (deviation > this.BUDGET_DEVIATION_THRESHOLD) {
      recommendation = `Projected to exceed budget by ${(deviation * 100).toFixed(1)}%. Consider optimizing resources or increasing budget.`;
    } else if (deviation < -0.2) {
      recommendation = 'Well under budget. Current capacity is adequate.';
    } else {
      recommendation = 'On track with budget. Monitor for anomalies.';
    }

    return {
      current_spend: currentSpend,
      projected_monthly: projectedMonthly,
      budget,
      deviation_percent: deviation * 100,
      trend: trendLabel,
      recommendation,
    };
  }

  /**
   * Group metrics by day
   */
  private groupByDay(metrics: UsageMetric[]): number[] {
    const byDay: Record<string, number> = {};

    for (const metric of metrics) {
      const day = metric.timestamp.toISOString().split('T')[0];
      if (day) {
        byDay[day] = (byDay[day] || 0) + metric.cost;
      }
    }

    return Object.values(byDay);
  }

  /**
   * Calculate trend coefficient
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;

    return slope / (avgY || 1); // Normalized trend
  }

  /**
   * Generate scaling actions
   */
  private generateActions(
    prediction: CostPrediction,
    metrics: UsageMetric[]
  ): ScalingAction[] {
    const actions: ScalingAction[] = [];

    // Budget deviation alert
    if (Math.abs(prediction.deviation_percent) > this.BUDGET_DEVIATION_THRESHOLD * 100) {
      actions.push({
        type: 'alert',
        service: 'all',
        reason: `Budget deviation: ${prediction.deviation_percent.toFixed(1)}%`,
        priority: prediction.deviation_percent > 50 ? 'critical' : 'high',
      });
    }

    // Analyze per-service metrics
    const byService = metrics.reduce((acc, m) => {
      acc[m.service] = (acc[m.service] || []).concat(m);
      return acc;
    }, {} as Record<string, UsageMetric[]>);

    for (const [service, serviceMetrics] of Object.entries(byService)) {
      const totalCost = serviceMetrics.reduce((sum, m) => sum + m.cost, 0);
      const avgValue = serviceMetrics.reduce((sum, m) => sum + m.value, 0) / serviceMetrics.length;

      // High usage detection
      if (avgValue > 1000000 && totalCost > prediction.budget * 0.3) {
        actions.push({
          type: 'optimize',
          service,
          reason: `High usage detected (${avgValue.toFixed(0)} avg). Consider caching or optimization.`,
          priority: 'medium',
        });
      }
    }

    // Increasing trend alert
    if (prediction.trend === 'increasing' && prediction.deviation_percent > 10) {
      actions.push({
        type: 'alert',
        service: 'all',
        reason: 'Increasing cost trend detected',
        priority: 'medium',
      });
    }

    return actions;
  }

  /**
   * Store analysis results
   */
  private async storeAnalysis(prediction: CostPrediction, actions: ScalingAction[]): Promise<void> {
    await this.supabase.from('cost_predictions').insert({
      timestamp: new Date().toISOString(),
      current_spend: prediction.current_spend,
      projected_monthly: prediction.projected_monthly,
      budget: prediction.budget,
      deviation_percent: prediction.deviation_percent,
      trend: prediction.trend,
      recommendation: prediction.recommendation,
      actions: actions,
    });
  }

  /**
   * Create GitHub Discussion for cost alerts
   */
  async createCostAlert(prediction: CostPrediction): Promise<void> {
    const githubToken = process.env.GITHUB_TOKEN;
    const repository = process.env.GITHUB_REPOSITORY;

    if (!githubToken || !repository) {
      console.warn('GitHub credentials not set, skipping discussion creation');
      return;
    }

    const title = `💰 Cost Alert: ${prediction.deviation_percent > 0 ? 'Over' : 'Under'} Budget by ${Math.abs(prediction.deviation_percent).toFixed(1)}%`;
    
    const body = `
# Cost Analysis Summary

**Current Spend**: $${prediction.current_spend.toFixed(2)}
**Projected Monthly**: $${prediction.projected_monthly.toFixed(2)}
**Budget**: $${prediction.budget.toFixed(2)}
**Deviation**: ${prediction.deviation_percent > 0 ? '+' : ''}${prediction.deviation_percent.toFixed(1)}%
**Trend**: ${prediction.trend}

## Recommendation

${prediction.recommendation}

## Actions Required

${prediction.deviation_percent > 20 ? '🔴 Immediate action required' : prediction.deviation_percent > 10 ? '🟡 Monitor closely' : '🟢 No action needed'}

---
_Auto-generated by AI AutoScale System on ${new Date().toISOString()}_
`;

    // Use GitHub GraphQL API for discussions
    const query = `
      mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {
          repositoryId: $repositoryId,
          categoryId: $categoryId,
          title: $title,
          body: $body
        }) {
          discussion {
            url
          }
        }
      }
    `;

    try {
      // First get repository and category IDs
      const repoResponse = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              repository(owner: "${repository.split('/')[0]}", name: "${repository.split('/')[1]}") {
                id
                discussionCategories(first: 10) {
                  nodes {
                    id
                    name
                  }
                }
              }
            }
          `,
        }),
      });

      const repoData = await repoResponse.json();
      const repositoryId = repoData.data?.repository?.id;
      const categoryId = repoData.data?.repository?.discussionCategories?.nodes?.[0]?.id;

      if (repositoryId && categoryId) {
        await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { repositoryId, categoryId, title, body },
          }),
        });

        console.log('✅ Cost alert discussion created');
      }
    } catch (error) {
      console.error('Failed to create GitHub discussion:', error);
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

  const autoscale = new AIAutoScale(supabaseUrl, supabaseKey);
  const result = await autoscale.analyze();

  console.log(JSON.stringify(result, null, 2));

  // Create alert if needed
  if (Math.abs(result.prediction.deviation_percent) > 20) {
    await autoscale.createCostAlert(result.prediction);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
