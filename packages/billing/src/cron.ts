import type { PrismaClient } from '@tokpulse/db';
import type { EmailService } from '@tokpulse/email';
import { BillingJobs } from './jobs';

export interface BillingCronConfig {
  emailService: EmailService;
  runIntervalMs?: number;
}

export class BillingCronService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private db: PrismaClient,
    private config: BillingCronConfig,
  ) {}

  start(): void {
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
      } catch (error) {
        console.error('Billing cron job failed:', error);
      } finally {
        this.isRunning = false;
      }
    }, intervalMs);

    // Run immediately on start
    this.runJobs();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Billing cron service stopped');
    }
  }

  async runJobs(): Promise<void> {
    if (this.isRunning) {
      console.log('Billing cron job is already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      const billingJobs = new BillingJobs(this.db, this.config);
      await billingJobs.runAllJobs();
    } catch (error) {
      console.error('Billing cron job failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  isActive(): boolean {
    return this.intervalId !== null;
  }
}
