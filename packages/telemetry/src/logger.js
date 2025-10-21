import pino from 'pino';
import { randomUUID } from 'crypto';
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
    'paymentMethod'
];
const redactPII = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(redactPII);
    }
    const redacted = { ...obj };
    for (const [key, value] of Object.entries(redacted)) {
        if (PII_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            redacted[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            redacted[key] = redactPII(value);
        }
    }
    return redacted;
};
export class TelemetryLogger {
    logger;
    redactPII;
    constructor(config = {}) {
        this.redactPII = config.redactPII ?? true;
        const baseConfig = {
            level: config.level || 'info',
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label })
            },
            serializers: {
                req: pino.stdSerializers.req,
                res: pino.stdSerializers.res,
                err: pino.stdSerializers.err
            }
        };
        if (config.pretty) {
            this.logger = pino(baseConfig, pino.destination({
                dest: 1,
                sync: false
            }));
        }
        else {
            this.logger = pino(baseConfig);
        }
    }
    processContext(context = {}) {
        if (!context.requestId) {
            context.requestId = randomUUID();
        }
        if (this.redactPII) {
            return redactPII(context);
        }
        return context;
    }
    info(message, context = {}) {
        this.logger.info(this.processContext(context), message);
    }
    warn(message, context = {}) {
        this.logger.warn(this.processContext(context), message);
    }
    error(message, error, context = {}) {
        const errorContext = {
            ...this.processContext(context),
            error: error ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : undefined
        };
        this.logger.error(errorContext, message);
    }
    debug(message, context = {}) {
        this.logger.debug(this.processContext(context), message);
    }
    // Webhook specific logging
    webhookProcessed(topic, storeId, status, duration, context = {}) {
        this.info(`Webhook processed: ${topic}`, {
            ...context,
            storeId,
            topic,
            status,
            duration
        });
    }
    webhookError(topic, storeId, error, context = {}) {
        this.error(`Webhook processing failed: ${topic}`, error, {
            ...context,
            storeId,
            topic
        });
    }
    // Widget specific logging
    widgetRendered(surface, storeId, duration, context = {}) {
        this.info(`Widget rendered: ${surface}`, {
            ...context,
            storeId,
            surface,
            duration
        });
    }
    widgetError(surface, storeId, error, context = {}) {
        this.error(`Widget render failed: ${surface}`, error, {
            ...context,
            storeId,
            surface
        });
    }
    // API specific logging
    apiRequest(method, route, statusCode, duration, storeId, context = {}) {
        this.info(`API request: ${method} ${route}`, {
            ...context,
            storeId,
            method,
            route,
            statusCode,
            duration
        });
    }
    // Job specific logging
    jobStarted(jobType, storeId, context = {}) {
        this.info(`Job started: ${jobType}`, {
            ...context,
            storeId,
            jobType
        });
    }
    jobCompleted(jobType, storeId, duration, context = {}) {
        this.info(`Job completed: ${jobType}`, {
            ...context,
            storeId,
            jobType,
            duration
        });
    }
    jobFailed(jobType, storeId, error, context = {}) {
        this.error(`Job failed: ${jobType}`, error, {
            ...context,
            storeId,
            jobType
        });
    }
    // Experiment specific logging
    experimentAssignment(experimentId, variantId, storeId, subjectKey, context = {}) {
        this.info(`Experiment assignment`, {
            ...context,
            experimentId,
            variantId,
            storeId,
            subjectKey
        });
    }
    experimentExposure(experimentId, variantId, surface, storeId, context = {}) {
        this.info(`Experiment exposure`, {
            ...context,
            experimentId,
            variantId,
            surface,
            storeId
        });
    }
}
// Default logger instance
export const logger = new TelemetryLogger({
    level: process.env.LOG_LEVEL || 'info',
    pretty: process.env.NODE_ENV === 'development',
    redactPII: process.env.REDACT_PII !== 'false'
});
