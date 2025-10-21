# TokPulse Telemetry

This document describes the telemetry infrastructure for TokPulse, including metrics, logging, and tracing setup.

## Overview

TokPulse uses a comprehensive telemetry stack:

- **Metrics**: Prometheus + OpenTelemetry for counters, histograms, and gauges
- **Logging**: Pino for structured JSON logging with PII redaction
- **Tracing**: OpenTelemetry with W3C traceparent propagation

## Quick Start

### Local Development

1. **Start Prometheus**:
   ```bash
   # Copy the example config
   cp ops/prometheus/prometheus.yml.example ops/prometheus/prometheus.yml
   
   # Start Prometheus (requires Docker or local installation)
   docker run -d \
     --name prometheus \
     -p 9090:9090 \
     -v $(pwd)/ops/prometheus:/etc/prometheus \
     prom/prometheus:latest
   ```

2. **Start Grafana**:
   ```bash
   docker run -d \
     --name grafana \
     -p 3000:3000 \
     -e GF_SECURITY_ADMIN_PASSWORD=admin \
     grafana/grafana:latest
   ```

3. **Import Dashboards**:
   - Access Grafana at http://localhost:3000
   - Login with admin/admin
   - Import dashboard JSON files from `ops/dashboards/`

4. **Run TokPulse with Telemetry**:
   ```bash
   # Set environment variables
   export TRACING_ENABLED=true
   export OTLP_ENDPOINT=http://localhost:4318/v1/traces
   export LOG_LEVEL=debug
   
   # Start the application
   pnpm dev
   ```

## Metrics

### Available Metrics

#### Webhook Metrics
- `tokpulse_webhook_processed_total{topic,storeId,status}` - Total webhooks processed
- `tokpulse_webhook_processing_duration_seconds{topic,storeId}` - Processing time histogram
- `tokpulse_webhook_queue_depth{topic}` - Current queue depth
- `tokpulse_webhook_redelivery_rate{topic,storeId}` - Redelivery rate

#### Widget Performance
- `tokpulse_widget_render_ms{surface,storeId}` - Render time histogram
- `tokpulse_widget_errors_total{surface,storeId,errorType}` - Error counter
- `tokpulse_widget_lcp_proxy_ms{surface,storeId}` - LCP proxy time histogram

#### API Health
- `tokpulse_api_requests_total{route,method,code,storeId}` - Request counter
- `tokpulse_api_request_duration_seconds{route,method,storeId}` - Response time histogram
- `tokpulse_api_active_connections` - Active connection gauge

#### Jobs & Queues
- `tokpulse_job_attempts_total{job,status,storeId}` - Job attempt counter
- `tokpulse_job_queue_size{jobType}` - Queue size gauge
- `tokpulse_job_processing_duration_seconds{job,storeId}` - Processing time histogram

#### Tenancy
- `tokpulse_tenant_events_total{storeId,orgId,eventType}` - Event counter by tenant
- `tokpulse_tenant_throttling_total{storeId,orgId,reason}` - Throttling counter

#### Experiments
- `tokpulse_exposure_total{experiment,variant,surface,storeId}` - Exposure counter
- `tokpulse_assignment_total{experiment,variant,storeId}` - Assignment counter
- `tokpulse_guardrail_breach_total{experiment,metric,threshold}` - Guardrail breach counter

### Accessing Metrics

Metrics are available at `/internal/metrics` on each service:

```bash
# API metrics
curl http://localhost:3000/internal/metrics

# Partner app metrics
curl http://localhost:3001/internal/metrics

# Dashboard metrics
curl http://localhost:3002/internal/metrics
```

## Logging

### Configuration

Logging is configured via environment variables:

```bash
export LOG_LEVEL=info          # debug, info, warn, error
export REDACT_PII=true        # Enable PII redaction (default: true)
export NODE_ENV=development   # Enables pretty printing
```

### Log Format

All logs are structured JSON with the following fields:

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123456",
  "storeId": "store_789",
  "orgId": "org_456",
  "msg": "Webhook processed: orders/create"
}
```

### PII Redaction

The following fields are automatically redacted when `REDACT_PII=true`:

- `email`, `phone`, `address`, `name`
- `firstName`, `lastName`, `customerId`
- `sessionId`, `accessToken`, `refreshToken`
- `password`, `ssn`, `creditCard`, `paymentMethod`

### Request Correlation

All requests include a `requestId` for correlation across services. The ID can be:

1. Provided via `X-Request-ID` header
2. Generated automatically if not provided
3. Propagated through the `X-Correlation-ID` header

## Tracing

### Configuration

Tracing is configured via environment variables:

```bash
export TRACING_ENABLED=true
export OTLP_ENDPOINT=http://localhost:4318/v1/traces
export SERVICE_VERSION=1.0.0
```

### Trace Propagation

Traces are propagated using W3C `traceparent` headers:

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

### Trace Flow

Traces flow through the following services:

1. **Partner App** → API → Jobs → Hydrogen Route → Theme Bootstrap
2. **Webhook Intake** → Job Processing → API → Database
3. **Widget Render** → Theme Extension → API → Database

### Viewing Traces

Traces can be viewed in:

- **Jaeger**: http://localhost:16686 (if running)
- **Grafana**: With Tempo data source
- **OTLP Collector**: For forwarding to other systems

## Dashboards

### Available Dashboards

1. **Webhooks Health** (`ops/dashboards/webhooks-health.json`)
   - Processing rate and duration
   - Queue depth and redelivery rate
   - Error rates by topic

2. **Widget Performance** (`ops/dashboards/widget-performance.json`)
   - Render duration (p50, p95)
   - LCP proxy performance
   - Error rates by surface

3. **API Health** (`ops/dashboards/api-health.json`)
   - Request rate and response time
   - Error rates (4xx, 5xx)
   - Active connections and latency offenders

4. **Jobs & Queues** (`ops/dashboards/jobs-queues.json`)
   - Queue size and processing duration
   - Success/fail ratios
   - Job attempts by status

5. **Tenancy Overview** (`ops/dashboards/tenancy-overview.json`)
   - Top stores by events
   - Noisy tenants and throttling
   - Events by type

### Importing Dashboards

1. Access Grafana at http://localhost:3000
2. Go to **Dashboards** → **Import**
3. Upload the JSON files from `ops/dashboards/`
4. Configure the Prometheus data source

## Environment Variables

### Required
- `NODE_ENV` - Environment (development, production)
- `SERVICE_VERSION` - Service version for tracing

### Optional
- `LOG_LEVEL` - Log level (default: info)
- `REDACT_PII` - Enable PII redaction (default: true)
- `TRACING_ENABLED` - Enable tracing (default: true)
- `OTLP_ENDPOINT` - OTLP trace export endpoint
- `PROMETHEUS_PORT` - Metrics port (default: 3000)

## Data Retention

### Metrics
- **Retention**: 15 days (configurable in Prometheus)
- **Resolution**: 15s for 1 day, 1m for 7 days, 5m for 15 days

### Logs
- **Retention**: 30 days (configurable in log aggregation system)
- **Rotation**: Daily rotation with compression

### Traces
- **Retention**: 7 days (configurable in trace backend)
- **Sampling**: 10% in production, 100% in development

## PII and Privacy

### Data Handling
- All PII is redacted from logs by default
- Metrics use stable, anonymized identifiers
- Traces exclude sensitive request data

### Compliance
- GDPR compliant data handling
- Configurable data retention policies
- Audit logging for data access

## Troubleshooting

### Common Issues

1. **Metrics not appearing**:
   - Check Prometheus configuration
   - Verify `/internal/metrics` endpoint is accessible
   - Check service discovery configuration

2. **Traces not showing**:
   - Verify OTLP endpoint is reachable
   - Check tracing configuration
   - Ensure traceparent headers are propagated

3. **High log volume**:
   - Adjust log level to `warn` or `error`
   - Check for error loops
   - Review PII redaction configuration

### Debug Commands

```bash
# Check metrics endpoint
curl -s http://localhost:3000/internal/metrics | grep tokpulse

# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets

# Check Grafana health
curl -s http://localhost:3000/api/health

# View recent logs
tail -f /var/log/tokpulse/app.log | jq .
```

## CI Integration

### Linting

```bash
# Validate Grafana dashboards
pnpm obs:lint

# Check Prometheus configuration
promtool check config ops/prometheus/prometheus.yml

# Validate metrics endpoint
curl -s http://localhost:3000/internal/metrics | promtool check metrics
```

### Testing

```bash
# Run telemetry tests
pnpm test packages/telemetry

# Run E2E tests with telemetry
pnpm test:e2e -- --grep "telemetry"
```

## Production Considerations

### Scaling
- Use external Prometheus for production
- Consider Prometheus federation for multiple regions
- Use log aggregation (ELK, Fluentd, etc.)

### Security
- Secure metrics endpoints with authentication
- Use TLS for OTLP trace export
- Implement log access controls

### Monitoring
- Set up alerting rules for critical metrics
- Monitor dashboard performance
- Track telemetry system health