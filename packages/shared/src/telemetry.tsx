export interface TelemetryEvent {
  event: string
  properties: Record<string, any>
  timestamp: number
  organizationId: string
  storeId?: string
  userId?: string
}

export interface TelemetryLogger {
  log(event: TelemetryEvent): void
  error(error: Error, context?: Record<string, any>): void
  metric(name: string, value: number, tags?: Record<string, string>): void
}

export class ConsoleTelemetryLogger implements TelemetryLogger {
  log(event: TelemetryEvent): void {
    console.log('[TELEMETRY]', JSON.stringify(event))
  }

  error(error: Error, context?: Record<string, any>): void {
    console.error('[ERROR]', {
      message: error.message,
      stack: error.stack,
      context,
    })
  }

  metric(name: string, value: number, tags?: Record<string, string>): void {
    console.log('[METRIC]', { name, value, tags })
  }
}

export const telemetry = new ConsoleTelemetryLogger()