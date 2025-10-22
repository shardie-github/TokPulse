import { BillingJobs } from './jobs';
export class BillingCronService {
    db;
    config;
    intervalId = null;
    isRunning = false;
    constructor(db, config) {
        this.db = db;
        this.config = config;
    }
    start() {
        if (this.intervalId) {
            console.log('Billing cron service is already running');
            return;
        }
        const intervalMs = this.config.runIntervalMs || 60 * 60 * 1000; // Default: 1 hour
        console.log(`Starting billing cron service (interval: ${intervalMs}ms)`);
        this.intervalId = setInterval(async () => {
            if (this.isRunning) {
                console.log('Billing cron job is already running, skipping...');
                return;
            }
            this.isRunning = true;
            try {
                const billingJobs = new BillingJobs(this.db, this.config);
                await billingJobs.runAllJobs();
            }
            catch (error) {
                console.error('Billing cron job failed:', error);
            }
            finally {
                this.isRunning = false;
            }
        }, intervalMs);
        // Run immediately on start
        this.runJobs();
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Billing cron service stopped');
        }
    }
    async runJobs() {
        if (this.isRunning) {
            console.log('Billing cron job is already running, skipping...');
            return;
        }
        this.isRunning = true;
        try {
            const billingJobs = new BillingJobs(this.db, this.config);
            await billingJobs.runAllJobs();
        }
        catch (error) {
            console.error('Billing cron job failed:', error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    isActive() {
        return this.intervalId !== null;
    }
}
