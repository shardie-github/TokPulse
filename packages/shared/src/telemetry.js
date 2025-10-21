export class ConsoleTelemetryLogger {
    log(event) {
        console.log('[TELEMETRY]', JSON.stringify(event));
    }
    error(error, context) {
        console.error('[ERROR]', {
            message: error.message,
            stack: error.stack,
            context,
        });
    }
    metric(name, value, tags) {
        console.log('[METRIC]', { name, value, tags });
    }
}
export const telemetry = new ConsoleTelemetryLogger();
