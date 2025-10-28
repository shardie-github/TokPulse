# AI Automation Architecture

## Overview

TokPulse is equipped with a comprehensive AI-driven automation framework that enables self-diagnosis, intelligent optimization, and autonomous operation. This document explains the architecture, workflows, and usage of the AI automation system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AI Automation Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Self-Diagnose│  │   Insights   │  │  AutoScale   │     │
│  │    System    │  │    Agent     │  │   System     │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────────────────────────────────────────┐     │
│  │            Supabase (Metrics Storage)             │     │
│  └──────────────────────────────────────────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Privacy    │  │  Embeddings  │  │   Watchers   │     │
│  │    Guard     │  │   Pipeline   │  │   System     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Self-Diagnosis System (`ai/self_diagnose.ts`)

**Purpose**: Monitor system health and detect anomalies

**Flow**:
```
CI Logs → Metrics Collection → Pattern Detection → Actions
                                         ↓
                              Supabase Storage
                                         ↓
                              GitHub Issues (if needed)
```

**Capabilities**:
- Deploy failure detection (threshold: 3 failures)
- Latency spike detection (threshold: 20% increase)
- Error rate monitoring (threshold: 5%)
- Automatic GitHub issue creation

**Usage**:
```bash
# Manual run
node --loader ts-node/esm ai/self_diagnose.ts

# Via CI (runs weekly)
# See .github/workflows/ai-audit.yml
```

**Output Example**:
```json
{
  "status": "warning",
  "metrics": [
    {
      "metric_type": "latency_spike",
      "value": 150,
      "threshold": 120,
      "severity": "medium",
      "recommendation": "Consider adding caching..."
    }
  ],
  "patterns": [
    {
      "type": "recurring_deploy_failure",
      "occurrences": 3,
      "description": "..."
    }
  ],
  "actions": [
    {
      "type": "github_issue",
      "priority": "high",
      "payload": { ... }
    }
  ]
}
```

### 2. AI Insights Agent (`ai/insights_agent.mjs`)

**Purpose**: Analyze logs and provide optimization recommendations

**Flow**:
```
Git Logs → Code Analysis → GPT-4 Analysis → PR Comment
                                  ↓
                         Recommendations
```

**Capabilities**:
- Deployment analysis
- Performance bottleneck detection
- Code quality insights
- Risk assessment (1-10 scale)

**Usage**:
```bash
# Manual run
OPENAI_API_KEY=xxx GITHUB_TOKEN=xxx node ai/insights_agent.mjs

# Automatic (runs post-deploy)
# See .github/workflows/ai-audit.yml
```

**Output Format**:
```json
{
  "summary": "Overall system is performing well...",
  "issues": [
    {
      "title": "High dependency count",
      "severity": "medium",
      "description": "50+ dependencies may slow builds"
    }
  ],
  "recommendations": [
    {
      "category": "caching",
      "action": "Implement Redis caching for API responses",
      "impact": "high"
    }
  ],
  "risk_score": 4
}
```

### 3. AutoScale System (`ai/ai_autoscale.ts`)

**Purpose**: Monitor costs and predict budget deviations

**Flow**:
```
Usage Metrics → Cost Prediction → Budget Analysis → Alerts
                                          ↓
                              GitHub Discussion (if >20% deviation)
```

**Capabilities**:
- Real-time cost tracking
- Linear regression for projection
- Automatic budget alerts
- Service-level breakdown

**Usage**:
```bash
# Manual run
SUPABASE_SERVICE_KEY=xxx VERCEL_TOKEN=xxx node --loader ts-node/esm ai/ai_autoscale.ts

# Automatic (runs daily)
# See .github/workflows/ai-audit.yml
```

**Output Example**:
```json
{
  "prediction": {
    "current_spend": 125.50,
    "projected_monthly": 520.00,
    "budget": 500.00,
    "deviation_percent": 4.0,
    "trend": "increasing",
    "recommendation": "On track but monitor closely..."
  },
  "actions": [
    {
      "type": "optimize",
      "service": "vercel",
      "reason": "High bandwidth usage detected"
    }
  ]
}
```

### 4. Privacy Guard (`ai/privacy_guard.ts`)

**Purpose**: Redact PII before AI processing

**Flow**:
```
Raw Data → Pattern Detection → Redaction → Safe Output
```

**Capabilities**:
- Email redaction
- Phone number redaction
- API key redaction
- Credit card redaction
- Custom pattern support

**Usage**:
```typescript
import { getPrivacyGuard } from './ai/privacy_guard';

const guard = getPrivacyGuard({ strictMode: true });

// Redact text
const safe = guard.redact("Contact john@example.com");
// Output: "Contact [EMAIL_REDACTED]"

// Redact object
const safeObj = guard.redactObject({
  email: "user@test.com",
  password: "secret123",
  apiKey: "sk-abc123..."
});
// Output: { email: "[REDACTED]", password: "[REDACTED]", apiKey: "[REDACTED]" }
```

### 5. Embeddings Pipeline (`scripts/generate-embeddings.mjs`)

**Purpose**: Generate and store vector embeddings for semantic search

**Flow**:
```
Docs/Code → Chunking → OpenAI Embeddings → Supabase Vector Store
                                                    ↓
                                          Semantic Search Ready
```

**Capabilities**:
- Automatic document chunking
- Batch processing
- Deduplication
- Namespace isolation

**Usage**:
```bash
# Generate embeddings for docs
OPENAI_API_KEY=xxx SUPABASE_SERVICE_KEY=xxx \
  node scripts/generate-embeddings.mjs ./docs docs

# Refresh existing embeddings
node scripts/generate-embeddings.mjs refresh docs

# Output:
# 📊 Results:
#    Total: 150
#    Processed: 120
#    Skipped: 30
#    Failed: 0
#    Cost: $0.0024
```

### 6. Semantic Search (`supabase/functions/search-ai/index.ts`)

**Purpose**: Hybrid semantic + keyword search

**Usage**:
```typescript
// Search embeddings
const response = await fetch('https://xxx.supabase.co/functions/v1/search-ai', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    query: 'How do I deploy to production?',
    namespace: 'docs',
    limit: 10,
    threshold: 0.7,
    hybrid: true,
  }),
});

const { results } = await response.json();
```

### 7. Autonomous Watchers

#### Database Integrity Watcher (`watchers/db_integrity.watcher.ts`)

- Checks for orphaned records
- Validates referential integrity
- Detects data anomalies
- Runs nightly via cron

#### API Contract Watcher (`watchers/api_contract.watcher.ts`)

- Compares OpenAPI spec vs deployed endpoints
- Validates response schemas
- Detects breaking changes
- Creates GitHub issues for violations

#### AI Performance Watcher (`watchers/ai_performance.watcher.ts`)

- Tracks token usage per model
- Monitors latency
- Calculates cost efficiency
- Detects anomalies

**Usage**:
```bash
# Run watchers manually
node --loader ts-node/esm watchers/db_integrity.watcher.ts
node --loader ts-node/esm watchers/api_contract.watcher.ts
node --loader ts-node/esm watchers/ai_performance.watcher.ts

# Automatic (runs nightly)
# See .github/workflows/watcher-cron.yml
```

## Event-Driven Workflows

### Weekly AI Audit

**Trigger**: Every Monday at 9 AM UTC

**Steps**:
1. Self-diagnosis
2. AI insights generation
3. Privacy guard check
4. Cost analysis
5. PR comment (if applicable)
6. Upload artifacts

### Nightly Watchers

**Trigger**: Every day at 2 AM UTC

**Steps**:
1. DB integrity check
2. API contract validation
3. AI performance analysis
4. GitHub issue creation (if needed)
5. Summary report

### Future Runtime Check

**Trigger**: Every PR with code changes

**Steps**:
1. Scan all TS/JS files
2. Check for Edge/WASM/Workers compatibility
3. Generate compatibility report
4. Comment on PR
5. Fail if blocking issues found

## Developer Experience Tools

### Release Notes Generator (`scripts/release-notes-ai.mjs`)

**Purpose**: Auto-generate release notes from commits

```bash
# Generate release notes
OPENAI_API_KEY=xxx GITHUB_TOKEN=xxx \
  node scripts/release-notes-ai.mjs v1.0.0 v2.0.0 v2.0.0

# Publishes to GitHub Releases
```

### AI Onboarding (`scripts/onboard-ai.mjs`)

**Purpose**: Generate comprehensive repo guide for AI agents

```bash
# Generate onboarding guide
OPENAI_API_KEY=xxx node scripts/onboard-ai.mjs

# Outputs:
# - docs/AI_AGENT_GUIDE.md
# - docs/ai_context.json
```

## Configuration

### Main Config (`ai/agent_config.json`)

```json
{
  "project_ref": "ghqyxhbyyirveptgwoqm",
  "models": {
    "reasoning": "gpt-4-turbo-preview",
    "embeddings": "text-embedding-3-small"
  },
  "thresholds": {
    "deploy_failures": 3,
    "latency_spike_percent": 20,
    "error_rate_percent": 5
  },
  "features": {
    "self_diagnosis": true,
    "insights_agent": true,
    "cost_tracking": true,
    "privacy_guard": true
  }
}
```

### Environment Variables

Required:
```bash
SUPABASE_URL=https://ghqyxhbyyirveptgwoqm.supabase.co
SUPABASE_SERVICE_KEY=xxx
OPENAI_API_KEY=xxx
GITHUB_TOKEN=xxx
```

Optional:
```bash
VERCEL_TOKEN=xxx
VERCEL_TEAM_ID=xxx
MONTHLY_BUDGET=500
API_BASE_URL=https://api.example.com
```

## Database Schema

See `supabase/migrations/001_ai_infrastructure.sql`

Key tables:
- `ai_health_metrics` - System health data
- `ai_embeddings` - Vector embeddings
- `ai_usage_metrics` - AI model usage
- `cost_predictions` - Budget forecasts

## CI/CD Integration

### GitHub Actions Workflows

1. **ai-audit.yml** - Weekly AI system audit
2. **futurecheck.yml** - Runtime compatibility check
3. **watcher-cron.yml** - Nightly autonomous watchers

### Secrets Required

```yaml
SUPABASE_URL: Your Supabase project URL
SUPABASE_SERVICE_KEY: Service role key
OPENAI_API_KEY: OpenAI API key
GITHUB_TOKEN: Automatically provided by GitHub Actions
VERCEL_TOKEN: (optional) For cost tracking
```

## Monitoring & Alerts

### GitHub Issues

Automatically created for:
- High-severity health metrics
- Recurring patterns (3+ occurrences)
- Database integrity issues
- API contract violations

### GitHub Discussions

Created for:
- Cost alerts (>20% budget deviation)
- Weekly summaries
- Optimization suggestions

## Best Practices

### For Developers

1. **Always redact PII** before AI processing
2. **Use smallest model** that meets requirements
3. **Cache AI responses** aggressively
4. **Monitor costs** via AutoScale system
5. **Review AI insights** weekly

### For AI Agents

1. **Read `AI_AGENT_GUIDE.md`** first
2. **Check `ai_context.json`** for structure
3. **Use Privacy Guard** for all user data
4. **Follow recommendations** from Insights Agent
5. **Respect rate limits** and budgets

## Troubleshooting

### Common Issues

**Issue**: OpenAI API rate limit
```bash
# Solution: Reduce batch size
export BATCH_SIZE=50
```

**Issue**: Supabase connection timeout
```bash
# Solution: Check service key and network
curl https://ghqyxhbyyirveptgwoqm.supabase.co/rest/v1/
```

**Issue**: High AI costs
```bash
# Solution: Enable caching and use cheaper models
# See SUSTAINABILITY.md for optimization tips
```

## Future Enhancements

- [ ] Multi-model support (Claude, Gemini)
- [ ] Real-time anomaly detection
- [ ] Predictive scaling
- [ ] A/B testing for AI features
- [ ] Cost optimization ML model

## Resources

- **OpenAI Docs**: https://platform.openai.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs

---

**Questions?** Check `AI_COMPLIANCE.md` and `SUSTAINABILITY.md`

**Last Updated**: 2025-10-28  
**Version**: 1.0.0
