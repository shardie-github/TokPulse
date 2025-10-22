import { randomUUID } from 'crypto';
import pino from 'pino';

export interface LogContext {
  requestId?: string;
  storeId?: string;
  orgId?: string;
  userId?: string;
  experimentId?: string;
  variantId?: string;
  [key: string]: any;
}

export interface PinoConfig {
  level?: string;
  pretty?: boolean;
  redactPII?: boolean;
}

const PII_FIELDS = [
  'email',
  'phone',
  'address',
  'name',
  'firstName',
  'lastName',
  'customerId',
  'sessionId',
  'accessToken',
  'refreshToken',
  'password',
  'ssn',
  'creditCard',
  'paymentMethod',
];

const redactPII = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  }

  const redacted = { ...obj };
  for (const [key, value] of Object.entries(redacted)) {
    if (PII_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPII(value);
    }
  }
  return redacted;
};

export class TelemetryLogger {
  private logger: pino.Logger;
  private redactPII: boolean;

  constructor(config: PinoConfig = {}) {
    this.redactPII = config.redactPII ?? true;

    const baseConfig = {
      level: config.level || 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      serializers: {
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
        err: pino.stdSerializers.err,
      },
    };

    if (config.pretty) {
      this.logger = pino(
        baseConfig,
        pino.destination({
          dest: 1,
          sync: false,
        }),
      );
    } else {
      this.logger = pino(baseConfig);
    }
  }

  private processContext(context: LogContext = {}): LogContext {
    if (!context.requestId) {
      context.requestId = randomUUID();
    }

    if (this.redactPII) {
      return redactPII(context);
    }

    return context;
  }

  info(message: string, context: LogContext = {}) {
    this.logger.info(this.processContext(context), message);
  }

  warn(message: string, context: LogContext = {}) {
    this.logger.warn(this.processContext(context), message);
  }

  error(message: string, error?: Error, context: LogContext = {}) {
    const errorContext = {
      ...this.processContext(context),
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    };
    this.logger.error(errorContext, message);
  }

  debug(message: string, context: LogContext = {}) {
    this.logger.debug(this.processContext(context), message);
  }

  // Webhook specific logging
  webhookProcessed(
    topic: string,
    storeId: string,
    status: 'success' | 'error',
    duration?: number,
    context: LogContext = {},
  ) {
    this.info(`Webhook processed: ${topic}`, {
      ...context,
      storeId,
      topic,
      status,
      duration,
    });
  }

  webhookError(topic: string, storeId: string, error: Error, context: LogContext = {}) {
    this.error(`Webhook processing failed: ${topic}`, error, {
      ...context,
      storeId,
      topic,
    });
  }

  // Widget specific logging
  widgetRendered(surface: string, storeId: string, duration: number, context: LogContext = {}) {
    this.info(`Widget rendered: ${surface}`, {
      ...context,
      storeId,
      surface,
      duration,
    });
  }

  widgetError(surface: string, storeId: string, error: Error, context: LogContext = {}) {
    this.error(`Widget render failed: ${surface}`, error, {
      ...context,
      storeId,
      surface,
    });
  }

  // API specific logging
  apiRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    storeId?: string,
    context: LogContext = {},
  ) {
    this.info(`API request: ${method} ${route}`, {
      ...context,
      storeId,
      method,
      route,
      statusCode,
      duration,
    });
  }

  // Job specific logging
  jobStarted(jobType: string, storeId: string, context: LogContext = {}) {
    this.info(`Job started: ${jobType}`, {
      ...context,
      storeId,
      jobType,
    });
  }

  jobCompleted(jobType: string, storeId: string, duration: number, context: LogContext = {}) {
    this.info(`Job completed: ${jobType}`, {
      ...context,
      storeId,
      jobType,
      duration,
    });
  }

  jobFailed(jobType: string, storeId: string, error: Error, context: LogContext = {}) {
    this.error(`Job failed: ${jobType}`, error, {
      ...context,
      storeId,
      jobType,
    });
  }

  // Experiment specific logging
  experimentAssignment(
    experimentId: string,
    variantId: string,
    storeId: string,
    subjectKey: string,
    context: LogContext = {},
  ) {
    this.info(`Experiment assignment`, {
      ...context,
      experimentId,
      variantId,
      storeId,
      subjectKey,
    });
  }

  experimentExposure(
    experimentId: string,
    variantId: string,
    surface: string,
    storeId: string,
    context: LogContext = {},
  ) {
    this.info(`Experiment exposure`, {
      ...context,
      experimentId,
      variantId,
      surface,
      storeId,
    });
  }
}

// Default logger instance
export const logger = new TelemetryLogger({
  level: process.env.LOG_LEVEL || 'info',
  pretty: process.env.NODE_ENV === 'development',
  redactPII: process.env.REDACT_PII !== 'false',
});
