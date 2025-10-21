import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'

// Enable default metrics collection
collectDefaultMetrics()

// Webhook metrics
export const webhookProcessedTotal = new Counter({
  name: 'tokpulse_webhook_processed_total',
  help: 'Total number of webhooks processed',
  labelNames: ['topic', 'storeId', 'status']
})

export const webhookProcessingDuration = new Histogram({
  name: 'tokpulse_webhook_processing_duration_seconds',
  help: 'Time spent processing webhooks',
  labelNames: ['topic', 'storeId'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
})

export const webhookQueueDepth = new Gauge({
  name: 'tokpulse_webhook_queue_depth',
  help: 'Current depth of webhook processing queue',
  labelNames: ['topic']
})

export const webhookRedeliveryRate = new Gauge({
  name: 'tokpulse_webhook_redelivery_rate',
  help: 'Rate of webhook redeliveries',
  labelNames: ['topic', 'storeId']
})

// Widget performance metrics
export const widgetRenderDuration = new Histogram({
  name: 'tokpulse_widget_render_ms',
  help: 'Widget render duration in milliseconds',
  labelNames: ['surface', 'storeId'],
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
})

export const widgetErrorRate = new Counter({
  name: 'tokpulse_widget_errors_total',
  help: 'Total widget errors',
  labelNames: ['surface', 'storeId', 'errorType']
})

export const widgetLCPProxy = new Histogram({
  name: 'tokpulse_widget_lcp_proxy_ms',
  help: 'Widget LCP proxy duration in milliseconds',
  labelNames: ['surface', 'storeId'],
  buckets: [100, 200, 500, 1000, 2000, 5000, 10000]
})

// API metrics
export const apiRequestsTotal = new Counter({
  name: 'tokpulse_api_requests_total',
  help: 'Total API requests',
  labelNames: ['route', 'method', 'code', 'storeId']
})

export const apiRequestDuration = new Histogram({
  name: 'tokpulse_api_request_duration_seconds',
  help: 'API request duration',
  labelNames: ['route', 'method', 'storeId'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
})

export const apiActiveConnections = new Gauge({
  name: 'tokpulse_api_active_connections',
  help: 'Number of active API connections'
})

// Job/Queue metrics
export const jobAttemptsTotal = new Counter({
  name: 'tokpulse_job_attempts_total',
  help: 'Total job attempts',
  labelNames: ['job', 'status', 'storeId']
})

export const jobQueueSize = new Gauge({
  name: 'tokpulse_job_queue_size',
  help: 'Current job queue size',
  labelNames: ['jobType']
})

export const jobProcessingDuration = new Histogram({
  name: 'tokpulse_job_processing_duration_seconds',
  help: 'Job processing duration',
  labelNames: ['job', 'storeId'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600]
})

// Tenancy metrics
export const tenantEventsTotal = new Counter({
  name: 'tokpulse_tenant_events_total',
  help: 'Total events by tenant',
  labelNames: ['storeId', 'orgId', 'eventType']
})

export const tenantThrottlingTotal = new Counter({
  name: 'tokpulse_tenant_throttling_total',
  help: 'Total tenant throttling events',
  labelNames: ['storeId', 'orgId', 'reason']
})

// Experiment metrics
export const experimentExposureTotal = new Counter({
  name: 'tokpulse_exposure_total',
  help: 'Total experiment exposures',
  labelNames: ['experiment', 'variant', 'surface', 'storeId']
})

export const experimentAssignmentTotal = new Counter({
  name: 'tokpulse_assignment_total',
  help: 'Total experiment assignments',
  labelNames: ['experiment', 'variant', 'storeId']
})

export const experimentGuardrailBreachTotal = new Counter({
  name: 'tokpulse_guardrail_breach_total',
  help: 'Total guardrail breaches',
  labelNames: ['experiment', 'metric', 'threshold']
})

// System metrics
export const systemMemoryUsage = new Gauge({
  name: 'tokpulse_system_memory_usage_bytes',
  help: 'System memory usage in bytes'
})

export const systemCpuUsage = new Gauge({
  name: 'tokpulse_system_cpu_usage_percent',
  help: 'System CPU usage percentage'
})

// Register all metrics
register.registerMetric(webhookProcessedTotal)
register.registerMetric(webhookProcessingDuration)
register.registerMetric(webhookQueueDepth)
register.registerMetric(webhookRedeliveryRate)
register.registerMetric(widgetRenderDuration)
register.registerMetric(widgetErrorRate)
register.registerMetric(widgetLCPProxy)
register.registerMetric(apiRequestsTotal)
register.registerMetric(apiRequestDuration)
register.registerMetric(apiActiveConnections)
register.registerMetric(jobAttemptsTotal)
register.registerMetric(jobQueueSize)
register.registerMetric(jobProcessingDuration)
register.registerMetric(tenantEventsTotal)
register.registerMetric(tenantThrottlingTotal)
register.registerMetric(experimentExposureTotal)
register.registerMetric(experimentAssignmentTotal)
register.registerMetric(experimentGuardrailBreachTotal)
register.registerMetric(systemMemoryUsage)
register.registerMetric(systemCpuUsage)

export { register }