import type { PrismaClient } from '@tokpulse/db';
import type { EmailService } from '@tokpulse/email';

export interface BillingJobConfig {
  emailService: EmailService;
}

export class BillingJobs {
  constructor(
    private db: PrismaClient,
    private config: BillingJobConfig,
  ) {}

  async processTrialExpirations(): Promise<void> {
    console.log('Processing trial expirations...');

    // Find subscriptions that are in trial and will expire in the next 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const expiringTrials = await this.db.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: {
          lte: threeDaysFromNow,
          gte: new Date(), // Not expired yet
        },
      },
      include: {
        organization: true,
      },
    });

    for (const subscription of expiringTrials) {
      const daysLeft = Math.ceil(
        (subscription.trialEndsAt!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysLeft <= 3 && daysLeft > 0) {
        try {
          await this.config.emailService.sendTrialEndingNotification(
            subscription.organizationId,
            daysLeft,
          );
          console.log(`Sent trial ending notification for org ${subscription.organizationId}`);
        } catch (error) {
          console.error('Failed to send trial ending notification:', error);
        }
      }
    }

    // Find subscriptions that have expired
    const expiredTrials = await this.db.subscription.findMany({
      where: {
        status: 'TRIAL',
        trialEndsAt: {
          lt: new Date(),
        },
      },
      include: {
        organization: true,
      },
    });

    for (const subscription of expiredTrials) {
      try {
        // Move to Starter plan
        const starterPlan = await this.db.plan.findUnique({
          where: { key: 'STARTER' },
        });

        if (starterPlan) {
          await this.db.subscription.update({
            where: { id: subscription.id },
            data: {
              planId: starterPlan.id,
              status: 'EXPIRED',
            },
          });

          await this.config.emailService.sendTrialEndedNotification(subscription.organizationId);

          console.log(`Moved expired trial to Starter plan for org ${subscription.organizationId}`);
        }
      } catch (error) {
        console.error('Failed to process expired trial:', error);
      }
    }

    console.log(
      `Processed ${expiringTrials.length} expiring trials and ${expiredTrials.length} expired trials`,
    );
  }

  async processPaymentFailures(): Promise<void> {
    console.log('Processing payment failures...');

    // Find subscriptions that are past due
    const pastDueSubscriptions = await this.db.subscription.findMany({
      where: {
        status: 'PAST_DUE',
      },
      include: {
        organization: true,
      },
    });

    for (const subscription of pastDueSubscriptions) {
      try {
        await this.config.emailService.sendPaymentFailedNotification(subscription.organizationId);
        console.log(`Sent payment failed notification for org ${subscription.organizationId}`);
      } catch (error) {
        console.error('Failed to send payment failed notification:', error);
      }
    }

    console.log(`Processed ${pastDueSubscriptions.length} payment failures`);
  }

  async processCancelledSubscriptions(): Promise<void> {
    console.log('Processing cancelled subscriptions...');

    // Find subscriptions that were cancelled recently
    const recentlyCancelled = await this.db.subscription.findMany({
      where: {
        status: 'CANCELLED',
        cancelledAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      include: {
        organization: true,
      },
    });

    for (const subscription of recentlyCancelled) {
      try {
        await this.config.emailService.sendSubscriptionCancelledNotification(
          subscription.organizationId,
        );
        console.log(`Sent cancellation notification for org ${subscription.organizationId}`);
      } catch (error) {
        console.error('Failed to send cancellation notification:', error);
      }
    }

    console.log(`Processed ${recentlyCancelled.length} cancelled subscriptions`);
  }

  async runAllJobs(): Promise<void> {
    console.log('Running all billing jobs...');

    try {
      await Promise.all([
        this.processTrialExpirations(),
        this.processPaymentFailures(),
        this.processCancelledSubscriptions(),
      ]);
      console.log('All billing jobs completed successfully');
    } catch (error) {
      console.error('Error running billing jobs:', error);
      throw error;
    }
  }
}
