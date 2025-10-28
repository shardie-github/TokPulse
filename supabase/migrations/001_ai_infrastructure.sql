-- AI Infrastructure Tables
-- Migration: 001_ai_infrastructure
-- Description: Creates tables for AI health metrics, embeddings, and analytics

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Health Metrics Table
CREATE TABLE IF NOT EXISTS ai_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('deploy_failure', 'latency_spike', 'cold_start', 'error_rate')),
  value NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  context JSONB,
  recommendation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_health_metrics_timestamp ON ai_health_metrics(timestamp DESC);
CREATE INDEX idx_health_metrics_type ON ai_health_metrics(metric_type);
CREATE INDEX idx_health_metrics_severity ON ai_health_metrics(severity);

-- AI Embeddings Table (for semantic search)
CREATE TABLE IF NOT EXISTS ai_embeddings (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_embeddings_namespace ON ai_embeddings(namespace);
CREATE INDEX idx_embeddings_embedding ON ai_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id TEXT,
  namespace TEXT,
  content TEXT,
  similarity float,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_embeddings.id,
    ai_embeddings.namespace,
    ai_embeddings.content,
    1 - (ai_embeddings.embedding <=> query_embedding) AS similarity,
    ai_embeddings.metadata
  FROM ai_embeddings
  WHERE 1 - (ai_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY ai_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Cost Predictions Table
CREATE TABLE IF NOT EXISTS cost_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_spend NUMERIC NOT NULL,
  projected_monthly NUMERIC NOT NULL,
  budget NUMERIC NOT NULL,
  deviation_percent NUMERIC NOT NULL,
  trend TEXT NOT NULL CHECK (trend IN ('increasing', 'stable', 'decreasing')),
  recommendation TEXT,
  actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_cost_predictions_timestamp ON cost_predictions(timestamp DESC);

-- AI Usage Metrics Table
CREATE TABLE IF NOT EXISTS ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  cost NUMERIC NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_usage_metrics_timestamp ON ai_usage_metrics(timestamp DESC);
CREATE INDEX idx_usage_metrics_model ON ai_usage_metrics(model);
CREATE INDEX idx_usage_metrics_success ON ai_usage_metrics(success);

-- Usage Metrics Table (for cost tracking)
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('requests', 'compute', 'storage', 'bandwidth')),
  value NUMERIC NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_usage_metrics_timestamp ON usage_metrics(timestamp DESC);
CREATE INDEX idx_usage_metrics_service ON usage_metrics(service);

-- Baseline Metrics Table (for comparison)
CREATE TABLE IF NOT EXISTS baseline_metrics (
  metric TEXT PRIMARY KEY,
  value NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default baselines
INSERT INTO baseline_metrics (metric, value) VALUES
  ('p95', 100),
  ('p99', 200),
  ('error_rate', 0.01)
ON CONFLICT (metric) DO NOTHING;

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint TEXT,
  response_time INTEGER NOT NULL,
  status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX idx_performance_metrics_endpoint ON performance_metrics(endpoint);

-- Application Logs Table (for error tracking)
CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_application_logs_timestamp ON application_logs(timestamp DESC);
CREATE INDEX idx_application_logs_level ON application_logs(level);

-- CI Deploys Table (for tracking deployments)
CREATE TABLE IF NOT EXISTS ci_deploys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'cancelled')),
  branch TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  error_message TEXT,
  duration_seconds INTEGER
);

-- Add indexes
CREATE INDEX idx_ci_deploys_created_at ON ci_deploys(created_at DESC);
CREATE INDEX idx_ci_deploys_status ON ci_deploys(status);

-- Row Level Security (RLS) Policies
ALTER TABLE ai_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ci_deploys ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY service_role_all ON ai_health_metrics FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON ai_embeddings FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON cost_predictions FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON ai_usage_metrics FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON usage_metrics FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON performance_metrics FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON application_logs FOR ALL TO service_role USING (true);
CREATE POLICY service_role_all ON ci_deploys FOR ALL TO service_role USING (true);

-- Authenticated users can read embeddings
CREATE POLICY authenticated_read ON ai_embeddings FOR SELECT TO authenticated USING (true);

-- Functions for integrity checking (examples)
CREATE OR REPLACE FUNCTION find_orphaned_sessions()
RETURNS TABLE (id UUID, user_id UUID)
LANGUAGE sql
AS $$
  SELECT s.id, s.user_id
  FROM sessions s
  LEFT JOIN users u ON s.user_id = u.id
  WHERE u.id IS NULL
  LIMIT 100;
$$;

-- Comments for documentation
COMMENT ON TABLE ai_health_metrics IS 'Stores health and diagnostic metrics from AI self-diagnosis system';
COMMENT ON TABLE ai_embeddings IS 'Stores vector embeddings for semantic search';
COMMENT ON TABLE cost_predictions IS 'Tracks cost predictions and budget alerts';
COMMENT ON TABLE ai_usage_metrics IS 'Tracks AI model usage, tokens, and costs';
COMMENT ON TABLE usage_metrics IS 'Tracks general infrastructure usage metrics';

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ai_embeddings TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
