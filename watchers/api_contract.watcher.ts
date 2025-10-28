/**
 * API Contract Watcher
 * Compares OpenAPI spec against deployed endpoints
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

export interface ContractViolation {
  endpoint: string;
  method: string;
  issue: 'missing' | 'extra' | 'schema_mismatch' | 'response_error';
  expected?: unknown;
  actual?: unknown;
  severity: 'low' | 'medium' | 'high';
}

export class APIContractWatcher {
  private specPath: string;
  private baseUrl: string;

  constructor(specPath: string = './schemas/openapi.json', baseUrl?: string) {
    this.specPath = specPath;
    this.baseUrl = baseUrl || process.env.API_BASE_URL || 'http://localhost:3000';
  }

  async check(): Promise<{
    status: 'compliant' | 'violations' | 'critical';
    violations: ContractViolation[];
    timestamp: string;
  }> {
    const spec = await this.loadSpec();
    const violations: ContractViolation[] = [];

    if (!spec.paths) {
      console.warn('No paths defined in OpenAPI spec');
      return {
        status: 'compliant',
        violations: [],
        timestamp: new Date().toISOString(),
      };
    }

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, definition] of Object.entries(methods as Record<string, any>)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
          await this.checkEndpoint(path, method, definition, violations);
        }
      }
    }

    const status = this.determineStatus(violations);

    return {
      status,
      violations,
      timestamp: new Date().toISOString(),
    };
  }

  private async loadSpec(): Promise<any> {
    if (!existsSync(this.specPath)) {
      console.warn(`OpenAPI spec not found at ${this.specPath}`);
      return { paths: {} };
    }

    const content = await readFile(this.specPath, 'utf-8');
    return JSON.parse(content);
  }

  private async checkEndpoint(
    path: string,
    method: string,
    definition: any,
    violations: ContractViolation[]
  ): Promise<void> {
    const url = this.baseUrl + path.replace(/\{([^}]+)\}/g, '1'); // Replace params with dummy values

    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.API_KEY ? { Authorization: `Bearer ${process.env.API_KEY}` } : {}),
        },
      });

      // Check response status
      const expectedStatuses = Object.keys(definition.responses || {});
      const actualStatus = response.status.toString();

      if (!expectedStatuses.includes(actualStatus)) {
        violations.push({
          endpoint: path,
          method: method.toUpperCase(),
          issue: 'response_error',
          expected: expectedStatuses,
          actual: actualStatus,
          severity: response.status >= 500 ? 'high' : 'medium',
        });
      }

      // Check response schema if it's JSON
      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        const expectedSchema = definition.responses?.[actualStatus]?.content?.['application/json']?.schema;

        if (expectedSchema) {
          const schemaViolations = this.validateSchema(data, expectedSchema);
          if (schemaViolations.length > 0) {
            violations.push({
              endpoint: path,
              method: method.toUpperCase(),
              issue: 'schema_mismatch',
              expected: expectedSchema,
              actual: schemaViolations,
              severity: 'medium',
            });
          }
        }
      }
    } catch (error) {
      violations.push({
        endpoint: path,
        method: method.toUpperCase(),
        issue: 'missing',
        severity: 'high',
      });
    }
  }

  private validateSchema(data: any, schema: any): string[] {
    const violations: string[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (schema.required?.includes(prop) && !(prop in data)) {
          violations.push(`Missing required property: ${prop}`);
        }

        if (prop in data) {
          const expected = (propSchema as any).type;
          const actual = typeof data[prop];
          
          if (expected === 'integer' || expected === 'number') {
            if (typeof data[prop] !== 'number') {
              violations.push(`Property ${prop}: expected ${expected}, got ${actual}`);
            }
          } else if (expected !== actual && expected !== 'any') {
            violations.push(`Property ${prop}: expected ${expected}, got ${actual}`);
          }
        }
      }
    }

    return violations;
  }

  private determineStatus(violations: ContractViolation[]): 'compliant' | 'violations' | 'critical' {
    const highCount = violations.filter((v) => v.severity === 'high').length;
    
    if (highCount > 3) return 'critical';
    if (violations.length > 0) return 'violations';
    return 'compliant';
  }

  async createGitHubIssue(violations: ContractViolation[]): Promise<void> {
    if (violations.length === 0) return;

    const title = `[API Contract] ${violations.length} Violation(s) Detected`;
    const body = this.formatIssueBody(violations);

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
          labels: ['api', 'contract', 'watcher'],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create issue: ${response.statusText}`);
    }
  }

  private formatIssueBody(violations: ContractViolation[]): string {
    let body = '## API Contract Violations\n\n';
    body += `Found ${violations.length} contract violation(s) during automated check.\n\n`;

    for (const violation of violations) {
      const emoji = { high: '🔴', medium: '🟡', low: '🟢' }[violation.severity];
      body += `### ${emoji} ${violation.method} ${violation.endpoint}\n\n`;
      body += `**Issue**: ${violation.issue}\n\n`;
      
      if (violation.expected) {
        body += `**Expected**: \`${JSON.stringify(violation.expected)}\`\n`;
      }
      
      if (violation.actual) {
        body += `**Actual**: \`${JSON.stringify(violation.actual)}\`\n`;
      }
      
      body += '\n';
    }

    body += `---\n_Auto-generated by API Contract Watcher on ${new Date().toISOString()}_`;
    return body;
  }
}

export async function main() {
  const watcher = new APIContractWatcher();
  const result = await watcher.check();

  console.log(JSON.stringify(result, null, 2));

  if (result.violations.length > 0 && process.env.GITHUB_TOKEN) {
    await watcher.createGitHubIssue(result.violations);
  }

  if (result.status === 'critical') {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
