/**
 * Database Integrity Watcher
 * Validates referential integrity and data consistency
 */

import { createClient } from '@supabase/supabase-js';

export interface IntegrityIssue {
  type: 'orphaned_record' | 'missing_reference' | 'constraint_violation' | 'data_anomaly';
  table: string;
  record_id?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fix_query?: string;
}

export class DBIntegrityWatcher {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    issues: IntegrityIssue[];
    timestamp: string;
  }> {
    const issues: IntegrityIssue[] = [];

    await Promise.all([
      this.checkOrphanedRecords(issues),
      this.checkMissingReferences(issues),
      this.checkDataAnomalies(issues),
      this.checkConstraints(issues),
    ]);

    const status = this.determineStatus(issues);

    return {
      status,
      issues,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkOrphanedRecords(issues: IntegrityIssue[]): Promise<void> {
    // Example: Check for orphaned user sessions
    const { data: orphanedSessions } = await this.supabase.rpc('find_orphaned_sessions', {});

    if (orphanedSessions && orphanedSessions.length > 0) {
      issues.push({
        type: 'orphaned_record',
        table: 'sessions',
        description: `Found ${orphanedSessions.length} orphaned session(s) with no associated user`,
        severity: 'medium',
        fix_query: 'DELETE FROM sessions WHERE user_id NOT IN (SELECT id FROM users)',
      });
    }
  }

  private async checkMissingReferences(issues: IntegrityIssue[]): Promise<void> {
    // Check for common FK issues
    const checks = [
      {
        table: 'orders',
        column: 'customer_id',
        ref_table: 'customers',
        ref_column: 'id',
      },
      {
        table: 'products',
        column: 'category_id',
        ref_table: 'categories',
        ref_column: 'id',
      },
    ];

    for (const check of checks) {
      try {
        const { data } = await this.supabase.rpc('check_missing_references', check);
        if (data && data.count > 0) {
          issues.push({
            type: 'missing_reference',
            table: check.table,
            description: `${data.count} record(s) in ${check.table} reference non-existent ${check.ref_table}`,
            severity: 'high',
          });
        }
      } catch (error) {
        console.warn(`Could not check ${check.table}:`, error);
      }
    }
  }

  private async checkDataAnomalies(issues: IntegrityIssue[]): Promise<void> {
    // Check for suspicious data patterns
    const anomalyChecks = [
      {
        name: 'negative_prices',
        query: 'SELECT COUNT(*) as count FROM products WHERE price < 0',
        severity: 'high' as const,
      },
      {
        name: 'future_dates',
        query: "SELECT COUNT(*) as count FROM orders WHERE created_at > NOW() + INTERVAL '1 day'",
        severity: 'medium' as const,
      },
      {
        name: 'duplicate_emails',
        query: 'SELECT email, COUNT(*) as count FROM users GROUP BY email HAVING COUNT(*) > 1',
        severity: 'high' as const,
      },
    ];

    for (const check of anomalyChecks) {
      try {
        const { data } = await this.supabase.rpc('execute_check', { sql: check.query });
        if (data && data.count > 0) {
          issues.push({
            type: 'data_anomaly',
            table: 'various',
            description: `Anomaly detected: ${check.name} (${data.count} occurrences)`,
            severity: check.severity,
          });
        }
      } catch (error) {
        console.warn(`Could not run check ${check.name}:`, error);
      }
    }
  }

  private async checkConstraints(issues: IntegrityIssue[]): Promise<void> {
    // Verify constraints are in place
    const { data: constraints } = await this.supabase.rpc('get_constraints', {});

    const expectedConstraints = [
      'users_email_unique',
      'orders_customer_id_fkey',
      'products_category_id_fkey',
    ];

    for (const expected of expectedConstraints) {
      if (!constraints?.some((c: any) => c.name === expected)) {
        issues.push({
          type: 'constraint_violation',
          table: expected.split('_')[0] || 'unknown',
          description: `Missing expected constraint: ${expected}`,
          severity: 'high',
        });
      }
    }
  }

  private determineStatus(issues: IntegrityIssue[]): 'healthy' | 'degraded' | 'critical' {
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const highCount = issues.filter((i) => i.severity === 'high').length;

    if (criticalCount > 0 || highCount > 3) return 'critical';
    if (highCount > 0 || issues.length > 5) return 'degraded';
    return 'healthy';
  }

  async createGitHubIssue(issues: IntegrityIssue[]): Promise<void> {
    if (issues.length === 0) return;

    const title = `[DB Integrity] ${issues.length} Issue(s) Detected`;
    const body = this.formatIssueBody(issues);

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
          labels: ['database', 'integrity', 'watcher'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create issue: ${response.statusText}`);
    }
  }

  private formatIssueBody(issues: IntegrityIssue[]): string {
    let body = '## Database Integrity Issues\n\n';
    body += `Found ${issues.length} integrity issue(s) during automated check.\n\n`;

    const grouped = issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || []).concat(issue);
      return acc;
    }, {} as Record<string, IntegrityIssue[]>);

    for (const [severity, severityIssues] of Object.entries(grouped)) {
      const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[severity];
      body += `### ${emoji} ${severity.toUpperCase()}\n\n`;

      for (const issue of severityIssues) {
        body += `- **${issue.type}** in \`${issue.table}\`: ${issue.description}\n`;
        if (issue.fix_query) {
          body += `  \`\`\`sql\n  ${issue.fix_query}\n  \`\`\`\n`;
        }
      }
      body += '\n';
    }

    body += `---\n_Auto-generated by DB Integrity Watcher on ${new Date().toISOString()}_`;
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

  const watcher = new DBIntegrityWatcher(supabaseUrl, supabaseKey);
  const result = await watcher.check();

  console.log(JSON.stringify(result, null, 2));

  if (result.issues.length > 0 && process.env.GITHUB_TOKEN) {
    await watcher.createGitHubIssue(result.issues);
  }

  if (result.status === 'critical') {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
