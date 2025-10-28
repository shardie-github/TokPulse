/**
 * AI-Powered Release Notes Generator
 * Uses commit diffs and AI summarization to create human-readable release notes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile } from 'fs/promises';

const execAsync = promisify(exec);

export class ReleaseNotesGenerator {
  constructor(openaiKey, githubToken) {
    this.openaiKey = openaiKey || process.env.OPENAI_API_KEY;
    this.githubToken = githubToken || process.env.GITHUB_TOKEN;
    this.model = 'gpt-4-turbo-preview';
  }

  /**
   * Generate release notes between two git refs
   */
  async generate(fromRef, toRef = 'HEAD', options = {}) {
    console.log(`📝 Generating release notes from ${fromRef} to ${toRef}...`);

    const commits = await this.getCommits(fromRef, toRef);
    const diff = await this.getDiff(fromRef, toRef);
    const prs = await this.getPullRequests(commits);

    const notes = await this.generateWithAI({
      commits,
      diff,
      prs,
      version: options.version,
    });

    return notes;
  }

  /**
   * Get commit history
   */
  async getCommits(fromRef, toRef) {
    const { stdout } = await execAsync(
      `git log ${fromRef}..${toRef} --pretty=format:'%H|%an|%ae|%ad|%s' --date=short`
    );

    return stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [hash, author, email, date, message] = line.split('|');
        return { hash, author, email, date, message };
      });
  }

  /**
   * Get diff statistics
   */
  async getDiff(fromRef, toRef) {
    const { stdout } = await execAsync(
      `git diff ${fromRef}..${toRef} --stat`
    );

    return stdout;
  }

  /**
   * Get associated pull requests (if GitHub)
   */
  async getPullRequests(commits) {
    if (!this.githubToken) return [];

    const prNumbers = new Set();
    
    for (const commit of commits) {
      const match = commit.message.match(/#(\d+)/);
      if (match) {
        prNumbers.add(match[1]);
      }
    }

    const prs = [];
    
    for (const prNum of prNumbers) {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pulls/${prNum}`,
          {
            headers: {
              Authorization: `token ${this.githubToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (response.ok) {
          const pr = await response.json();
          prs.push({
            number: pr.number,
            title: pr.title,
            body: pr.body,
            author: pr.user.login,
            labels: pr.labels.map(l => l.name),
          });
        }
      } catch (error) {
        console.warn(`Could not fetch PR #${prNum}:`, error.message);
      }
    }

    return prs;
  }

  /**
   * Generate release notes using AI
   */
  async generateWithAI(data) {
    const prompt = this.buildPrompt(data);

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
              content: 'You are an expert technical writer creating clear, informative release notes for software releases. Focus on user-facing changes and improvements.',
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
      return result.choices[0].message.content;

    } catch (error) {
      console.error('AI generation failed:', error);
      return this.generateFallback(data);
    }
  }

  /**
   * Build prompt for AI
   */
  buildPrompt(data) {
    let prompt = '# Generate Release Notes\n\n';

    if (data.version) {
      prompt += `Version: ${data.version}\n\n`;
    }

    prompt += `## Commits (${data.commits.length})\n\n`;
    for (const commit of data.commits.slice(0, 50)) {
      prompt += `- ${commit.message} (${commit.author})\n`;
    }

    if (data.prs.length > 0) {
      prompt += `\n## Pull Requests\n\n`;
      for (const pr of data.prs) {
        prompt += `### #${pr.number}: ${pr.title}\n`;
        if (pr.body) {
          prompt += `${pr.body.substring(0, 300)}...\n`;
        }
        prompt += `Labels: ${pr.labels.join(', ')}\n\n`;
      }
    }

    prompt += `\n## Diff Stats\n\`\`\`\n${data.diff.substring(0, 1000)}\n\`\`\`\n\n`;

    prompt += `
---

**Task**: Create comprehensive release notes in markdown format:

1. Start with a brief summary of what's new
2. Group changes by category:
   - ✨ New Features
   - 🚀 Improvements
   - 🐛 Bug Fixes
   - 📚 Documentation
   - 🔧 Internal/Maintenance
3. Use clear, user-friendly language
4. Highlight breaking changes if any
5. Include contributor acknowledgments
6. Format as proper markdown

Focus on changes that matter to users, not internal refactoring.
`;

    return prompt;
  }

  /**
   * Generate fallback notes without AI
   */
  generateFallback(data) {
    let notes = `# Release Notes\n\n`;
    
    if (data.version) {
      notes += `## Version ${data.version}\n\n`;
    }

    notes += `### Changes\n\n`;

    const categorized = this.categorizeCommits(data.commits);

    for (const [category, commits] of Object.entries(categorized)) {
      if (commits.length > 0) {
        notes += `#### ${category}\n\n`;
        for (const commit of commits) {
          notes += `- ${commit.message}\n`;
        }
        notes += '\n';
      }
    }

    if (data.prs.length > 0) {
      notes += `### Pull Requests\n\n`;
      for (const pr of data.prs) {
        notes += `- #${pr.number}: ${pr.title} by @${pr.author}\n`;
      }
      notes += '\n';
    }

    notes += `### Stats\n\n`;
    notes += `- ${data.commits.length} commits\n`;
    notes += `- ${data.prs.length} pull requests\n`;

    return notes;
  }

  /**
   * Categorize commits by type
   */
  categorizeCommits(commits) {
    const categories = {
      '✨ Features': [],
      '🐛 Fixes': [],
      '📚 Documentation': [],
      '🔧 Maintenance': [],
      '⚡ Performance': [],
      '🎨 Style': [],
      'Other': [],
    };

    for (const commit of commits) {
      const msg = commit.message.toLowerCase();
      
      if (msg.match(/^(feat|feature|add)/)) {
        categories['✨ Features'].push(commit);
      } else if (msg.match(/^(fix|bug|resolve)/)) {
        categories['🐛 Fixes'].push(commit);
      } else if (msg.match(/^(docs?|documentation)/)) {
        categories['📚 Documentation'].push(commit);
      } else if (msg.match(/^(perf|performance|optimize)/)) {
        categories['⚡ Performance'].push(commit);
      } else if (msg.match(/^(style|format|lint)/)) {
        categories['🎨 Style'].push(commit);
      } else if (msg.match(/^(chore|refactor|test)/)) {
        categories['🔧 Maintenance'].push(commit);
      } else {
        categories['Other'].push(commit);
      }
    }

    return categories;
  }

  /**
   * Save to file
   */
  async save(notes, filename = 'RELEASE_NOTES.md') {
    await writeFile(filename, notes, 'utf-8');
    console.log(`✅ Release notes saved to ${filename}`);
  }

  /**
   * Publish to GitHub Release
   */
  async publishToGitHub(tag, notes) {
    if (!this.githubToken) {
      console.warn('No GitHub token, skipping publish');
      return;
    }

    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/releases`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${this.githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tag_name: tag,
          name: tag,
          body: notes,
          draft: false,
          prerelease: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create release: ${response.statusText}`);
    }

    const release = await response.json();
    console.log(`✅ Published release: ${release.html_url}`);
    return release;
  }
}

/**
 * CLI entrypoint
 */
async function main() {
  const args = process.argv.slice(2);
  const fromRef = args[0] || 'v1.0.0';
  const toRef = args[1] || 'HEAD';
  const version = args[2];

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY required');
    process.exit(1);
  }

  const generator = new ReleaseNotesGenerator();
  
  const notes = await generator.generate(fromRef, toRef, { version });
  
  console.log('\n' + notes + '\n');
  
  await generator.save(notes);

  // Optionally publish to GitHub
  if (version && process.env.GITHUB_TOKEN) {
    await generator.publishToGitHub(version, notes);
  }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export default ReleaseNotesGenerator;
