/**
 * AI Insights Agent
 * Uses GPT-4 to analyze logs and recommend optimizations
 * Posts results as PR comments
 */

import { readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class InsightsAgent {
  constructor(openaiApiKey, githubToken) {
    this.openaiApiKey = openaiApiKey;
    this.githubToken = githubToken;
    this.model = 'gpt-4-turbo-preview';
  }

  /**
   * Main analysis pipeline
   */
  async analyze(options = {}) {
    const logs = await this.collectLogs(options);
    const metrics = await this.collectMetrics(options);
    const codeContext = await this.getCodeContext(options);

    const insights = await this.analyzeWithGPT({
      logs,
      metrics,
      codeContext,
    });

    return {
      timestamp: new Date().toISOString(),
      insights,
      recommendations: insights.recommendations || [],
      priority: this.calculatePriority(insights),
    };
  }

  /**
   * Collect recent logs from various sources
   */
  async collectLogs(options) {
    const sources = [];

    // CI logs
    try {
      const { stdout: ciLogs } = await execAsync(
        'gh run list --limit 10 --json conclusion,name,startedAt,url'
      );
      sources.push({
        type: 'ci',
        data: JSON.parse(ciLogs),
      });
    } catch (error) {
      console.warn('Could not fetch CI logs:', error.message);
    }

    // Application logs (if available)
    try {
      const appLogs = await readFile('var/app.log', 'utf-8');
      sources.push({
        type: 'application',
        data: appLogs.split('\n').slice(-100), // Last 100 lines
      });
    } catch {
      // App logs may not exist
    }

    return sources;
  }

  /**
   * Collect performance metrics
   */
  async collectMetrics(options) {
    const metrics = {
      deployment: {},
      performance: {},
      errors: {},
    };

    // Get deployment stats
    try {
      const { stdout: deployStats } = await execAsync(
        'gh run list --limit 50 --json conclusion'
      );
      const runs = JSON.parse(deployStats);
      metrics.deployment = {
        total: runs.length,
        failed: runs.filter((r) => r.conclusion === 'failure').length,
        success_rate:
          (runs.filter((r) => r.conclusion === 'success').length / runs.length) * 100,
      };
    } catch (error) {
      console.warn('Could not collect deployment metrics:', error.message);
    }

    // Get bundle size (if build exists)
    try {
      const { stdout: duOutput } = await execAsync(
        'du -sh dist 2>/dev/null || du -sh .next 2>/dev/null || echo "N/A"'
      );
      metrics.performance.bundle_size = duOutput.trim();
    } catch {
      // Build may not exist
    }

    return metrics;
  }

  /**
   * Get code context for analysis
   */
  async getCodeContext(options) {
    const context = {
      structure: {},
      dependencies: {},
      config: {},
    };

    try {
      const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
      context.dependencies = {
        production: Object.keys(packageJson.dependencies || {}),
        dev: Object.keys(packageJson.devDependencies || {}).slice(0, 10),
      };
    } catch (error) {
      console.warn('Could not read package.json:', error.message);
    }

    // Get file structure
    try {
      const { stdout: structure } = await execAsync(
        'find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" | head -50'
      );
      context.structure.files = structure.split('\n').filter(Boolean).slice(0, 20);
    } catch {
      // May fail in some environments
    }

    return context;
  }

  /**
   * Analyze with GPT-4
   */
  async analyzeWithGPT(data) {
    const prompt = this.buildAnalysisPrompt(data);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert DevOps and software architecture analyst. Analyze system metrics, logs, and code structure to provide actionable optimization recommendations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      const analysis = result.choices[0].message.content;

      return this.parseGPTResponse(analysis);
    } catch (error) {
      console.error('GPT analysis failed:', error);
      return {
        error: error.message,
        fallback: this.generateFallbackAnalysis(data),
      };
    }
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(data) {
    return `
# System Analysis Request

## Deployment Metrics
${JSON.stringify(data.metrics, null, 2)}

## Recent Logs
${data.logs.map((l) => `### ${l.type}\n${JSON.stringify(l.data, null, 2)}`).join('\n\n')}

## Code Context
${JSON.stringify(data.codeContext, null, 2)}

---

**Task**: Analyze the above data and provide:

1. **Key Issues**: What problems or inefficiencies do you see?
2. **Performance Bottlenecks**: Any slow components or architectural concerns?
3. **Optimization Opportunities**: Specific, actionable recommendations
4. **Risk Assessment**: What could break or cause issues soon?

Format your response as JSON:
{
  "summary": "Brief overview",
  "issues": [{"title": "...", "severity": "low|medium|high|critical", "description": "..."}],
  "recommendations": [{"category": "caching|schema|api|deployment", "action": "...", "impact": "low|medium|high"}],
  "risk_score": 1-10
}
`;
  }

  /**
   * Parse GPT response
   */
  parseGPTResponse(response) {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      return JSON.parse(jsonStr);
    } catch {
      // Fallback to text parsing
      return {
        summary: response,
        recommendations: this.extractRecommendations(response),
        raw: response,
      };
    }
  }

  /**
   * Extract recommendations from free text
   */
  extractRecommendations(text) {
    const recommendations = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\d+\.|^[-*]/)) {
        recommendations.push({
          action: line.replace(/^\d+\.|^[-*]\s*/, '').trim(),
          impact: 'medium',
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate fallback analysis when GPT fails
   */
  generateFallbackAnalysis(data) {
    const recommendations = [];

    if (data.metrics.deployment?.success_rate < 80) {
      recommendations.push({
        category: 'deployment',
        action: 'Investigate CI failures - success rate below 80%',
        impact: 'high',
      });
    }

    if (data.codeContext.dependencies?.production?.length > 50) {
      recommendations.push({
        category: 'dependencies',
        action: 'Large dependency tree - consider bundle analysis and tree-shaking',
        impact: 'medium',
      });
    }

    return {
      summary: 'Fallback analysis (GPT unavailable)',
      recommendations,
      risk_score: 5,
    };
  }

  /**
   * Calculate priority based on insights
   */
  calculatePriority(insights) {
    if (insights.risk_score >= 8) return 'critical';
    if (insights.risk_score >= 6) return 'high';
    if (insights.risk_score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Post insights as PR comment
   */
  async postToPR(prNumber, insights) {
    if (!this.githubToken) {
      console.warn('No GitHub token, skipping PR comment');
      return;
    }

    const body = this.formatPRComment(insights);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues/${prNumber}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `token ${this.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ body }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to post comment: ${response.statusText}`);
      }

      console.log(`✅ Posted insights to PR #${prNumber}`);
    } catch (error) {
      console.error('Failed to post PR comment:', error);
    }
  }

  /**
   * Format insights for PR comment
   */
  formatPRComment(insights) {
    let comment = '## 🤖 AI Post-Deploy Analysis\n\n';

    if (insights.summary) {
      comment += `### Summary\n${insights.summary}\n\n`;
    }

    if (insights.issues?.length > 0) {
      comment += '### 🔍 Issues Detected\n\n';
      for (const issue of insights.issues) {
        const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
        comment += `${emoji} **${issue.title}** (${issue.severity})\n${issue.description}\n\n`;
      }
    }

    if (insights.recommendations?.length > 0) {
      comment += '### 💡 Recommendations\n\n';
      for (const rec of insights.recommendations) {
        comment += `- **[${rec.category}]** ${rec.action} _(impact: ${rec.impact})_\n`;
      }
      comment += '\n';
    }

    if (insights.risk_score) {
      const riskEmoji = insights.risk_score >= 7 ? '⚠️' : insights.risk_score >= 4 ? '⚡' : '✅';
      comment += `### Risk Assessment\n${riskEmoji} Risk Score: **${insights.risk_score}/10**\n\n`;
    }

    comment += `\n---\n_Generated by AI Insights Agent on ${new Date().toISOString()}_`;

    return comment;
  }
}

/**
 * CLI entrypoint
 */
async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;

  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY required');
    process.exit(1);
  }

  const agent = new InsightsAgent(openaiApiKey, githubToken);
  const insights = await agent.analyze();

  console.log(JSON.stringify(insights, null, 2));

  if (prNumber && githubToken) {
    await agent.postToPR(parseInt(prNumber), insights);
  }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}
