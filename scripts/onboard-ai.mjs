/**
 * AI Agent Onboarding
 * Trains new agents (Cursor, Perplexity, Claude) on repo context
 * Generates structured knowledge base for future automation
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AIOnboarding {
  constructor(config = {}) {
    this.openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
    this.model = 'gpt-4-turbo-preview';
  }

  /**
   * Generate comprehensive onboarding guide
   */
  async onboard() {
    console.log('🤖 Starting AI agent onboarding...\n');

    const context = await this.gatherContext();
    const guide = await this.generateGuide(context);
    
    await this.saveOutputs(guide);

    return guide;
  }

  /**
   * Gather repository context
   */
  async gatherContext() {
    console.log('📚 Gathering repository context...');

    const [
      structure,
      packageInfo,
      readme,
      architecture,
      workflows,
      envVars,
      apiEndpoints,
    ] = await Promise.all([
      this.getStructure(),
      this.getPackageInfo(),
      this.getReadme(),
      this.getArchitecture(),
      this.getWorkflows(),
      this.getEnvVars(),
      this.getAPIEndpoints(),
    ]);

    return {
      structure,
      packageInfo,
      readme,
      architecture,
      workflows,
      envVars,
      apiEndpoints,
    };
  }

  /**
   * Get repository structure
   */
  async getStructure() {
    try {
      const { stdout } = await execAsync(
        'find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.json" | grep -v node_modules | head -100'
      );
      return stdout.split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Get package.json info
   */
  async getPackageInfo() {
    try {
      const content = await readFile('package.json', 'utf-8');
      const pkg = JSON.parse(content);
      return {
        name: pkg.name,
        version: pkg.version,
        scripts: Object.keys(pkg.scripts || {}),
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
      };
    } catch {
      return {};
    }
  }

  /**
   * Get README content
   */
  async getReadme() {
    try {
      return await readFile('README.md', 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Detect architecture patterns
   */
  async getArchitecture() {
    const patterns = {
      framework: null,
      database: null,
      api: null,
      deployment: null,
    };

    try {
      const pkgContent = await readFile('package.json', 'utf-8');
      const pkg = JSON.parse(pkgContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Framework detection
      if ('next' in allDeps) patterns.framework = 'Next.js';
      else if ('react' in allDeps) patterns.framework = 'React';
      else if ('@remix-run/react' in allDeps) patterns.framework = 'Remix';

      // Database detection
      if ('prisma' in allDeps || '@prisma/client' in allDeps) patterns.database = 'Prisma';
      if ('@supabase/supabase-js' in allDeps) patterns.database = (patterns.database ? patterns.database + ' + ' : '') + 'Supabase';

      // API detection
      if ('trpc' in allDeps || '@trpc/server' in allDeps) patterns.api = 'tRPC';
      else if ('express' in allDeps) patterns.api = 'Express';
      else if ('fastify' in allDeps) patterns.api = 'Fastify';

      // Deployment detection
      if ('vercel' in allDeps) patterns.deployment = 'Vercel';
      
    } catch {
      // Ignore errors
    }

    return patterns;
  }

  /**
   * Get CI/CD workflows
   */
  async getWorkflows() {
    try {
      const workflowDir = '.github/workflows';
      const files = await readdir(workflowDir);
      return files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    } catch {
      return [];
    }
  }

  /**
   * Extract required env vars
   */
  async getEnvVars() {
    const envVars = new Set();

    try {
      // Check .env.example
      try {
        const example = await readFile('.env.example', 'utf-8');
        const matches = example.match(/^[A-Z_][A-Z0-9_]*=/gm);
        if (matches) {
          matches.forEach(m => envVars.add(m.replace('=', '')));
        }
      } catch {}

      // Scan code for process.env usage
      try {
        const { stdout } = await execAsync(
          'grep -roh "process\\.env\\.[A-Z_][A-Z0-9_]*" . --include="*.ts" --include="*.js" | sort -u | head -30'
        );
        const matches = stdout.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
        if (matches) {
          matches.forEach(m => {
            const varName = m.replace('process.env.', '');
            envVars.add(varName);
          });
        }
      } catch {}

    } catch {
      // Ignore errors
    }

    return Array.from(envVars);
  }

  /**
   * Detect API endpoints
   */
  async getAPIEndpoints() {
    const endpoints = [];

    try {
      // Look for API route files
      const { stdout } = await execAsync(
        'find . -path "*/api/*" -name "*.ts" -o -path "*/api/*" -name "*.js" | grep -v node_modules | head -20'
      );
      
      const files = stdout.split('\n').filter(Boolean);
      
      for (const file of files) {
        try {
          const content = await readFile(file, 'utf-8');
          
          // Extract route handlers
          const getMatch = content.match(/export.*async.*get/i);
          const postMatch = content.match(/export.*async.*post/i);
          const putMatch = content.match(/export.*async.*put/i);
          const deleteMatch = content.match(/export.*async.*delete/i);

          const methods = [];
          if (getMatch) methods.push('GET');
          if (postMatch) methods.push('POST');
          if (putMatch) methods.push('PUT');
          if (deleteMatch) methods.push('DELETE');

          if (methods.length > 0) {
            endpoints.push({
              file: file.replace('./', ''),
              methods,
            });
          }
        } catch {}
      }
    } catch {}

    return endpoints;
  }

  /**
   * Generate onboarding guide with AI
   */
  async generateGuide(context) {
    console.log('🧠 Generating AI onboarding guide...');

    const prompt = this.buildPrompt(context);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at understanding codebases and creating comprehensive onboarding documentation for AI agents. Your goal is to help future AI assistants understand this repository quickly and accurately.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;

    } catch (error) {
      console.error('AI generation failed:', error);
      return this.generateFallback(context);
    }
  }

  /**
   * Build prompt for AI
   */
  buildPrompt(context) {
    let prompt = '# Repository Analysis for AI Agent Onboarding\n\n';

    prompt += `## Project: ${context.packageInfo.name || 'Unknown'}\n`;
    prompt += `Version: ${context.packageInfo.version || 'N/A'}\n\n`;

    prompt += '## Architecture\n\n';
    for (const [key, value] of Object.entries(context.architecture)) {
      if (value) {
        prompt += `- ${key}: ${value}\n`;
      }
    }
    prompt += '\n';

    if (context.packageInfo.scripts) {
      prompt += '## Key Scripts\n\n';
      for (const script of context.packageInfo.scripts.slice(0, 15)) {
        prompt += `- ${script}\n`;
      }
      prompt += '\n';
    }

    if (context.envVars.length > 0) {
      prompt += '## Environment Variables\n\n';
      for (const envVar of context.envVars.slice(0, 20)) {
        prompt += `- ${envVar}\n`;
      }
      prompt += '\n';
    }

    if (context.apiEndpoints.length > 0) {
      prompt += '## API Endpoints\n\n';
      for (const endpoint of context.apiEndpoints.slice(0, 10)) {
        prompt += `- ${endpoint.file}: ${endpoint.methods.join(', ')}\n`;
      }
      prompt += '\n';
    }

    if (context.workflows.length > 0) {
      prompt += '## CI/CD Workflows\n\n';
      for (const workflow of context.workflows) {
        prompt += `- ${workflow}\n`;
      }
      prompt += '\n';
    }

    prompt += `
---

**Task**: Create a comprehensive AI agent onboarding guide in markdown format:

1. **Quick Start**: How to set up and run the project
2. **Architecture Overview**: High-level system design
3. **Key Concepts**: Important patterns and conventions
4. **Development Workflow**: Common tasks and commands
5. **Testing**: How to run tests and what's tested
6. **Deployment**: How the system is deployed
7. **Common Tasks**: Reference for frequent operations
8. **Gotchas**: Known issues or quirks
9. **Agent Guidelines**: Best practices for AI agents working on this codebase

Make it comprehensive but concise. Focus on actionable information.
`;

    return prompt;
  }

  /**
   * Generate fallback guide
   */
  generateFallback(context) {
    let guide = '# AI Agent Onboarding Guide\n\n';

    guide += `## Project: ${context.packageInfo.name || 'Unknown'}\n\n`;

    guide += '## Quick Start\n\n';
    guide += '```bash\n';
    guide += 'npm install\n';
    guide += 'npm run dev\n';
    guide += '```\n\n';

    guide += '## Architecture\n\n';
    for (const [key, value] of Object.entries(context.architecture)) {
      if (value) {
        guide += `- **${key}**: ${value}\n`;
      }
    }
    guide += '\n';

    guide += '## Key Scripts\n\n';
    for (const script of (context.packageInfo.scripts || []).slice(0, 10)) {
      guide += `- \`npm run ${script}\`\n`;
    }
    guide += '\n';

    guide += '## Environment Setup\n\n';
    guide += 'Required environment variables:\n\n';
    for (const envVar of context.envVars.slice(0, 15)) {
      guide += `- \`${envVar}\`\n`;
    }
    guide += '\n';

    return guide;
  }

  /**
   * Save outputs
   */
  async saveOutputs(guide) {
    // Save main guide
    await writeFile('docs/AI_AGENT_GUIDE.md', guide, 'utf-8');
    console.log('✅ Saved docs/AI_AGENT_GUIDE.md');

    // Save machine-readable context
    const context = await this.gatherContext();
    await writeFile(
      'docs/ai_context.json',
      JSON.stringify(context, null, 2),
      'utf-8'
    );
    console.log('✅ Saved docs/ai_context.json');
  }
}

/**
 * CLI entrypoint
 */
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY required');
    process.exit(1);
  }

  const onboarding = new AIOnboarding();
  await onboarding.onboard();

  console.log('\n✅ AI agent onboarding complete!');
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export default AIOnboarding;
