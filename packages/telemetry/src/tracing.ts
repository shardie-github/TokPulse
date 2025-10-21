import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http'
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api'

export interface TracingConfig {
  serviceName: string
  serviceVersion?: string
  otlpEndpoint?: string
  enabled?: boolean
}

export class TelemetryTracing {
  private sdk: NodeSDK | null = null
  private config: TracingConfig

  constructor(config: TracingConfig) {
    this.config = config
  }

  initialize() {
    if (!this.config.enabled) {
      return
    }

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
    })

    const traceExporter = new OTLPTraceExporter({
      url: this.config.otlpEndpoint || process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    })

    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false // Disable file system instrumentation
          }
        })
      ]
    })

    this.sdk.start()
  }

  shutdown() {
    if (this.sdk) {
      this.sdk.shutdown()
    }
  }

  // Create a span for webhook processing
  createWebhookSpan(topic: string, storeId: string, operation: string) {
    const tracer = trace.getTracer('tokpulse-webhooks')
    return tracer.startSpan(`webhook.${operation}`, {
      kind: SpanKind.CONSUMER,
      attributes: {
        'webhook.topic': topic,
        'webhook.store_id': storeId,
        'webhook.operation': operation
      }
    })
  }

  // Create a span for widget rendering
  createWidgetSpan(surface: string, storeId: string, operation: string) {
    const tracer = trace.getTracer('tokpulse-widgets')
    return tracer.startSpan(`widget.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'widget.surface': surface,
        'widget.store_id': storeId,
        'widget.operation': operation
      }
    })
  }

  // Create a span for API requests
  createApiSpan(method: string, route: string, storeId?: string) {
    const tracer = trace.getTracer('tokpulse-api')
    return tracer.startSpan(`api.${method.toLowerCase()}.${route.replace(/\//g, '_')}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.route': route,
        'api.store_id': storeId
      }
    })
  }

  // Create a span for job processing
  createJobSpan(jobType: string, storeId: string, operation: string) {
    const tracer = trace.getTracer('tokpulse-jobs')
    return tracer.startSpan(`job.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'job.type': jobType,
        'job.store_id': storeId,
        'job.operation': operation
      }
    })
  }

  // Create a span for experiment operations
  createExperimentSpan(experimentId: string, operation: string, storeId?: string) {
    const tracer = trace.getTracer('tokpulse-experiments')
    return tracer.startSpan(`experiment.${operation}`, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'experiment.id': experimentId,
        'experiment.operation': operation,
        'experiment.store_id': storeId
      }
    })
  }

  // Add context to current span
  addSpanContext(key: string, value: string | number | boolean) {
    const span = trace.getActiveSpan()
    if (span) {
      span.setAttributes({ [key]: value })
    }
  }

  // Set span status and end it
  finishSpan(span: any, success: boolean, error?: Error) {
    if (error) {
      span.recordException(error)
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
    } else if (success) {
      span.setStatus({ code: SpanStatusCode.OK })
    } else {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Operation failed' })
    }
    span.end()
  }

  // Run a function within a span context
  async runInSpan<T>(span: any, fn: () => Promise<T>): Promise<T> {
    return context.with(trace.setSpan(context.active(), span), fn)
  }
}

// Default tracing instance
export const tracing = new TelemetryTracing({
  serviceName: 'tokpulse',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  otlpEndpoint: process.env.OTLP_ENDPOINT,
  enabled: process.env.TRACING_ENABLED !== 'false'
})

// Initialize tracing on module load
tracing.initialize()

// Graceful shutdown
process.on('SIGTERM', () => {
  tracing.shutdown()
})

process.on('SIGINT', () => {
  tracing.shutdown()
})