/**
 * Future Runtime Compatibility Checker
 * Validates code for Edge Runtime, WASM, Workers, and Hydrogen/Oxygen compatibility
 */

import { readFileSync, existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { join, extname } from 'path';

interface CompatibilityIssue {
  file: string;
  line?: number;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  runtime: string[];
  suggestion?: string;
}

interface CompatibilityReport {
  timestamp: string;
  runtimes: Record<string, RuntimeCompatibility>;
  issues: CompatibilityIssue[];
  summary: {
    total_files_scanned: number;
    compatible: string[];
    incompatible: string[];
    warnings: number;
    errors: number;
  };
}

interface RuntimeCompatibility {
  name: string;
  compatible: boolean;
  blocking_issues: number;
  warnings: number;
  recommendations: string[];
}

export class FutureCheck {
  private incompatiblePatterns = {
    edge: [
      { pattern: /require\(['"]fs['"]\)/g, message: 'fs module not available in Edge Runtime' },
      { pattern: /require\(['"]child_process['"]\)/g, message: 'child_process not available in Edge Runtime' },
      { pattern: /new Buffer\(/g, message: 'Buffer constructor deprecated, use Buffer.from() or use Uint8Array' },
      { pattern: /process\.cwd\(\)/g, message: 'process.cwd() not available in Edge Runtime' },
      { pattern: /__dirname/g, message: '__dirname not available in Edge Runtime' },
      { pattern: /__filename/g, message: '__filename not available in Edge Runtime' },
    ],
    wasm: [
      { pattern: /eval\(/g, message: 'eval() not safe in WASM/Workers' },
      { pattern: /new Function\(/g, message: 'Function constructor not safe in WASM/Workers' },
      { pattern: /require\(['"].*\.node['"]\)/g, message: 'Native modules not supported in WASM' },
    ],
    workers: [
      { pattern: /localStorage/g, message: 'localStorage not available in Workers' },
      { pattern: /sessionStorage/g, message: 'sessionStorage not available in Workers' },
      { pattern: /document\./g, message: 'DOM APIs not available in Workers' },
      { pattern: /window\./g, message: 'window object not available in Workers' },
    ],
  };

  private nodeOnlyModules = [
    'fs', 'path', 'os', 'child_process', 'cluster', 'dgram', 'dns',
    'http2', 'net', 'perf_hooks', 'readline', 'repl', 'tls', 'tty',
    'v8', 'vm', 'worker_threads', 'zlib'
  ];

  async check(directory: string = process.cwd()): Promise<CompatibilityReport> {
    const files = await this.scanDirectory(directory);
    const issues: CompatibilityIssue[] = [];

    for (const file of files) {
      const fileIssues = await this.checkFile(file);
      issues.push(...fileIssues);
    }

    // Check package.json dependencies
    const packageIssues = this.checkDependencies(directory);
    issues.push(...packageIssues);

    // Check Next.js config if exists
    const nextConfigIssues = this.checkNextConfig(directory);
    issues.push(...nextConfigIssues);

    const runtimes = this.evaluateRuntimes(issues);
    const summary = this.generateSummary(files, issues, runtimes);

    return {
      timestamp: new Date().toISOString(),
      runtimes,
      issues,
      summary,
    };
  }

  private async scanDirectory(dir: string, files: string[] = []): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip node_modules, .git, dist, etc.
      if (entry.name.match(/^(node_modules|\.git|dist|build|\.next)$/)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private async checkFile(filepath: string): Promise<CompatibilityIssue[]> {
    const issues: CompatibilityIssue[] = [];
    
    try {
      const content = readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');

      // Check for incompatible patterns
      for (const [runtime, patterns] of Object.entries(this.incompatiblePatterns)) {
        for (const { pattern, message } of patterns) {
          pattern.lastIndex = 0; // Reset regex
          const matches = content.match(pattern);
          
          if (matches) {
            // Find line number
            let lineNum = 0;
            for (let i = 0; i < lines.length; i++) {
              if (lines[i]?.match(pattern)) {
                lineNum = i + 1;
                break;
              }
            }

            issues.push({
              file: filepath,
              line: lineNum,
              issue: message,
              severity: runtime === 'edge' ? 'error' : 'warning',
              runtime: [runtime],
            });
          }
        }
      }

      // Check for Node-only module imports
      const importPattern = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
      let match;
      
      while ((match = importPattern.exec(content)) !== null) {
        const moduleName = match[1]?.split('/')[0];
        if (moduleName && this.nodeOnlyModules.includes(moduleName)) {
          issues.push({
            file: filepath,
            issue: `Node-only module "${moduleName}" may not work in Edge/WASM/Workers`,
            severity: 'warning',
            runtime: ['edge', 'wasm', 'workers'],
            suggestion: `Consider using runtime-agnostic alternatives or dynamic imports with runtime detection`,
          });
        }
      }

    } catch (error) {
      console.warn(`Could not check file ${filepath}:`, error);
    }

    return issues;
  }

  private checkDependencies(directory: string): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const packageJsonPath = join(directory, 'package.json');

    if (!existsSync(packageJsonPath)) return issues;

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Known incompatible packages
      const incompatible = {
        'node-fetch': 'Use native fetch() API available in modern runtimes',
        'express': 'Not compatible with Edge Runtime - use framework-native handlers',
        'axios': 'Consider using native fetch() for Edge compatibility',
      };

      for (const [pkg, suggestion] of Object.entries(incompatible)) {
        if (pkg in allDeps) {
          issues.push({
            file: packageJsonPath,
            issue: `Dependency "${pkg}" may not be Edge/WASM compatible`,
            severity: 'warning',
            runtime: ['edge', 'wasm'],
            suggestion,
          });
        }
      }

    } catch (error) {
      console.warn(`Could not read package.json:`, error);
    }

    return issues;
  }

  private checkNextConfig(directory: string): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const configPaths = [
      join(directory, 'next.config.js'),
      join(directory, 'next.config.mjs'),
      join(directory, 'next.config.ts'),
    ];

    for (const configPath of configPaths) {
      if (existsSync(configPath)) {
        try {
          const content = readFileSync(configPath, 'utf-8');

          // Check if edge runtime is configured
          if (!content.includes("runtime: 'edge'") && !content.includes('runtime: "edge"')) {
            issues.push({
              file: configPath,
              issue: 'No edge runtime configuration found',
              severity: 'info',
              runtime: ['edge'],
              suggestion: "Add runtime: 'edge' to API routes or pages that should run on Edge Runtime",
            });
          }

          // Check for experimental features
          if (!content.includes('serverComponentsExternalPackages')) {
            issues.push({
              file: configPath,
              issue: 'Consider adding serverComponentsExternalPackages for better compatibility',
              severity: 'info',
              runtime: ['edge'],
              suggestion: 'Configure external packages that should not be bundled',
            });
          }

        } catch (error) {
          console.warn(`Could not read config file:`, error);
        }
        break;
      }
    }

    return issues;
  }

  private evaluateRuntimes(issues: CompatibilityIssue[]): Record<string, RuntimeCompatibility> {
    const runtimes = ['edge', 'wasm', 'workers', 'hydrogen-oxygen'];
    const result: Record<string, RuntimeCompatibility> = {};

    for (const runtime of runtimes) {
      const runtimeIssues = issues.filter((i) => i.runtime.includes(runtime) || i.runtime.includes(runtime.split('-')[0] || ''));
      const errors = runtimeIssues.filter((i) => i.severity === 'error').length;
      const warnings = runtimeIssues.filter((i) => i.severity === 'warning').length;

      const recommendations: string[] = [];
      
      if (runtime === 'edge') {
        recommendations.push('Use environment variable detection for runtime-specific code');
        recommendations.push('Leverage native Web APIs (fetch, crypto, etc.)');
        if (errors === 0) {
          recommendations.push('Consider adding runtime: "edge" to API routes');
        }
      }

      if (runtime === 'wasm') {
        recommendations.push('Ensure all dependencies are WASM-compatible');
        recommendations.push('Use Prisma WASM engine for database access');
      }

      if (runtime === 'workers') {
        recommendations.push('Use Cloudflare Workers KV for state management');
        recommendations.push('Implement request/response patterns, avoid long-running processes');
      }

      if (runtime === 'hydrogen-oxygen') {
        recommendations.push('Use Shopify Hydrogen React hooks');
        recommendations.push('Leverage Oxygen runtime with Remix');
      }

      result[runtime] = {
        name: runtime,
        compatible: errors === 0,
        blocking_issues: errors,
        warnings,
        recommendations,
      };
    }

    return result;
  }

  private generateSummary(
    files: string[],
    issues: CompatibilityIssue[],
    runtimes: Record<string, RuntimeCompatibility>
  ) {
    const compatible = Object.entries(runtimes)
      .filter(([_, r]) => r.compatible)
      .map(([name]) => name);
    
    const incompatible = Object.entries(runtimes)
      .filter(([_, r]) => !r.compatible)
      .map(([name]) => name);

    return {
      total_files_scanned: files.length,
      compatible,
      incompatible,
      warnings: issues.filter((i) => i.severity === 'warning').length,
      errors: issues.filter((i) => i.severity === 'error').length,
    };
  }

  /**
   * Generate human-readable report
   */
  formatReport(report: CompatibilityReport): string {
    let output = '# 🌍 Future Runtime Compatibility Report\n\n';
    output += `Generated: ${report.timestamp}\n\n`;

    output += '## Summary\n\n';
    output += `- Files Scanned: ${report.summary.total_files_scanned}\n`;
    output += `- Errors: ${report.summary.errors}\n`;
    output += `- Warnings: ${report.summary.warnings}\n\n`;

    output += '## Runtime Compatibility\n\n';
    for (const [name, runtime] of Object.entries(report.runtimes)) {
      const status = runtime.compatible ? '✅' : '❌';
      output += `### ${status} ${name.toUpperCase()}\n`;
      output += `- Compatible: ${runtime.compatible ? 'Yes' : 'No'}\n`;
      output += `- Blocking Issues: ${runtime.blocking_issues}\n`;
      output += `- Warnings: ${runtime.warnings}\n`;
      
      if (runtime.recommendations.length > 0) {
        output += '\n**Recommendations:**\n';
        for (const rec of runtime.recommendations) {
          output += `- ${rec}\n`;
        }
      }
      output += '\n';
    }

    if (report.issues.length > 0) {
      output += '## Issues Detected\n\n';
      const byFile = report.issues.reduce((acc, issue) => {
        acc[issue.file] = (acc[issue.file] || []).concat(issue);
        return acc;
      }, {} as Record<string, CompatibilityIssue[]>);

      for (const [file, issues] of Object.entries(byFile)) {
        output += `### ${file}\n\n`;
        for (const issue of issues) {
          const emoji = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
          output += `${emoji} **[${issue.runtime.join(', ')}]** ${issue.issue}\n`;
          if (issue.line) {
            output += `   Line ${issue.line}\n`;
          }
          if (issue.suggestion) {
            output += `   💡 ${issue.suggestion}\n`;
          }
          output += '\n';
        }
      }
    }

    return output;
  }
}

/**
 * CLI entrypoint
 */
export async function main() {
  const checker = new FutureCheck();
  const directory = process.argv[2] || process.cwd();

  console.log('🔍 Checking future runtime compatibility...\n');
  
  const report = await checker.check(directory);
  
  // Output JSON for CI
  if (process.env.CI || process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Human-readable format
    console.log(checker.formatReport(report));
  }

  // Exit with error if there are blocking issues
  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
