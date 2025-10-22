import type { PrismaClient } from '@tokpulse/db';

export interface EmailConfig {
  fromEmail: string;
  fromName: string;
  mailerUrl: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  constructor(
    private db: PrismaClient,
    private config: EmailConfig,
  ) {}

  async sendEmail(to: string, template: EmailTemplate): Promise<void> {
    try {
      const response = await fetch(`${this.config.mailerUrl}/api/mailer/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      throw error;
    }
  }

  async sendTrialEndingNotification(organizationId: string, daysLeft: number): Promise<void> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!organization || !organization.users.length) {
      return;
    }

    const user = organization.users[0];
    const template = this.getTrialEndingTemplate(daysLeft);

    await this.sendEmail(user.email, template);
  }

  async sendTrialEndedNotification(organizationId: string): Promise<void> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!organization || !organization.users.length) {
      return;
    }

    const user = organization.users[0];
    const template = this.getTrialEndedTemplate();

    await this.sendEmail(user.email, template);
  }

  async sendPaymentFailedNotification(organizationId: string): Promise<void> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!organization || !organization.users.length) {
      return;
    }

    const user = organization.users[0];
    const template = this.getPaymentFailedTemplate();

    await this.sendEmail(user.email, template);
  }

  async sendSubscriptionCancelledNotification(organizationId: string): Promise<void> {
    const organization = await this.db.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: 'OWNER' },
          take: 1,
        },
      },
    });

    if (!organization || !organization.users.length) {
      return;
    }

    const user = organization.users[0];
    const template = this.getSubscriptionCancelledTemplate();

    await this.sendEmail(user.email, template);
  }

  private getTrialEndingTemplate(daysLeft: number): EmailTemplate {
    const subject = `Your TokPulse trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e3e5; border-top: none; }
          .cta { background: #008060; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .footer { background: #f6f6f7; padding: 20px; text-align: center; font-size: 14px; color: #6d7175; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Your TokPulse trial is ending soon!</h1>
        </div>
        <div class="content">
          <p>Hi there!</p>
          <p>Your TokPulse trial will end in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>. Don't miss out on all the powerful features you've been using!</p>
          
          <h3>What happens next?</h3>
          <ul>
            <li>Your account will be downgraded to the free Starter plan</li>
            <li>You'll lose access to advanced analytics and features</li>
            <li>Your data will be preserved and accessible when you upgrade</li>
          </ul>

          <h3>Upgrade now to keep your features:</h3>
          <ul>
            <li>✅ Advanced analytics and insights</li>
            <li>✅ A/B testing capabilities</li>
            <li>✅ Priority support</li>
            <li>✅ Export your data</li>
            <li>✅ Multiple store management</li>
          </ul>

          <div style="text-align: center;">
            <a href="${process.env.APP_URL}/billing" class="cta">Upgrade Now</a>
          </div>

          <p>Questions? Reply to this email and we'll help you out!</p>
        </div>
        <div class="footer">
          <p>© 2024 TokPulse. All rights reserved.</p>
          <p>You received this email because you have an active TokPulse trial.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Your TokPulse trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}

Hi there!

Your TokPulse trial will end in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Don't miss out on all the powerful features you've been using!

What happens next?
- Your account will be downgraded to the free Starter plan
- You'll lose access to advanced analytics and features
- Your data will be preserved and accessible when you upgrade

Upgrade now to keep your features:
- Advanced analytics and insights
- A/B testing capabilities
- Priority support
- Export your data
- Multiple store management

Upgrade now: ${process.env.APP_URL}/billing

Questions? Reply to this email and we'll help you out!

© 2024 TokPulse. All rights reserved.
You received this email because you have an active TokPulse trial.
    `;

    return { subject, html, text };
  }

  private getTrialEndedTemplate(): EmailTemplate {
    const subject = 'Your TokPulse trial has ended';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e3e5; border-top: none; }
          .cta { background: #008060; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .footer { background: #f6f6f7; padding: 20px; text-align: center; font-size: 14px; color: #6d7175; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⏰ Your TokPulse trial has ended</h1>
        </div>
        <div class="content">
          <p>Hi there!</p>
          <p>Your TokPulse trial has ended, and your account has been moved to our free Starter plan.</p>
          
          <h3>What you still have access to:</h3>
          <ul>
            <li>✅ Basic dashboard and analytics</li>
            <li>✅ Core tracking features</li>
            <li>✅ Email support</li>
            <li>✅ 1 store connection</li>
            <li>✅ Limited API calls and widget views</li>
          </ul>

          <h3>What you're missing:</h3>
          <ul>
            <li>❌ Advanced analytics and insights</li>
            <li>❌ A/B testing capabilities</li>
            <li>❌ Priority support</li>
            <li>❌ Data export</li>
            <li>❌ Multiple store management</li>
          </ul>

          <div style="text-align: center;">
            <a href="${process.env.APP_URL}/billing" class="cta">Upgrade to Unlock All Features</a>
          </div>

          <p>Your data is safe and will be restored when you upgrade. Questions? Reply to this email!</p>
        </div>
        <div class="footer">
          <p>© 2024 TokPulse. All rights reserved.</p>
          <p>You received this email because your TokPulse trial has ended.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Your TokPulse trial has ended

Hi there!

Your TokPulse trial has ended, and your account has been moved to our free Starter plan.

What you still have access to:
- Basic dashboard and analytics
- Core tracking features
- Email support
- 1 store connection
- Limited API calls and widget views

What you're missing:
- Advanced analytics and insights
- A/B testing capabilities
- Priority support
- Data export
- Multiple store management

Upgrade to unlock all features: ${process.env.APP_URL}/billing

Your data is safe and will be restored when you upgrade. Questions? Reply to this email!

© 2024 TokPulse. All rights reserved.
You received this email because your TokPulse trial has ended.
    `;

    return { subject, html, text };
  }

  private getPaymentFailedTemplate(): EmailTemplate {
    const subject = 'Payment failed - Action required';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d72c0d 0%, #ff6b6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e3e5; border-top: none; }
          .cta { background: #008060; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .footer { background: #f6f6f7; padding: 20px; text-align: center; font-size: 14px; color: #6d7175; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Payment Failed</h1>
        </div>
        <div class="content">
          <p>Hi there!</p>
          <p>We were unable to process your payment for your TokPulse subscription. This could be due to:</p>
          
          <ul>
            <li>Expired credit card</li>
            <li>Insufficient funds</li>
            <li>Card issuer declined the transaction</li>
            <li>Incorrect billing information</li>
          </ul>

          <h3>What happens next?</h3>
          <p>We'll retry your payment automatically. If it continues to fail, your subscription may be suspended.</p>

          <div style="text-align: center;">
            <a href="${process.env.APP_URL}/billing" class="cta">Update Payment Method</a>
          </div>

          <p>Need help? Reply to this email and we'll assist you with updating your payment information.</p>
        </div>
        <div class="footer">
          <p>© 2024 TokPulse. All rights reserved.</p>
          <p>You received this email because your payment failed.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Payment Failed - Action Required

Hi there!

We were unable to process your payment for your TokPulse subscription. This could be due to:
- Expired credit card
- Insufficient funds
- Card issuer declined the transaction
- Incorrect billing information

What happens next?
We'll retry your payment automatically. If it continues to fail, your subscription may be suspended.

Update your payment method: ${process.env.APP_URL}/billing

Need help? Reply to this email and we'll assist you with updating your payment information.

© 2024 TokPulse. All rights reserved.
You received this email because your payment failed.
    `;

    return { subject, html, text };
  }

  private getSubscriptionCancelledTemplate(): EmailTemplate {
    const subject = 'Your TokPulse subscription has been cancelled';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6d7175 0%, #9ca3af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e1e3e5; border-top: none; }
          .cta { background: #008060; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; font-weight: 600; }
          .footer { background: #f6f6f7; padding: 20px; text-align: center; font-size: 14px; color: #6d7175; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>👋 Subscription Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi there!</p>
          <p>Your TokPulse subscription has been cancelled as requested. We're sorry to see you go!</p>
          
          <h3>What happens next?</h3>
          <ul>
            <li>Your account will remain active until the end of your current billing period</li>
            <li>You'll be moved to the free Starter plan after that</li>
            <li>Your data will be preserved for 30 days</li>
            <li>You can reactivate anytime during this period</li>
          </ul>

          <h3>We'd love to have you back!</h3>
          <p>If you change your mind, you can reactivate your subscription anytime. We're constantly improving TokPulse based on feedback from merchants like you.</p>

          <div style="text-align: center;">
            <a href="${process.env.APP_URL}/billing" class="cta">Reactivate Subscription</a>
          </div>

          <p>Questions or feedback? Reply to this email - we'd love to hear from you!</p>
        </div>
        <div class="footer">
          <p>© 2024 TokPulse. All rights reserved.</p>
          <p>You received this email because your subscription was cancelled.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Your TokPulse subscription has been cancelled

Hi there!

Your TokPulse subscription has been cancelled as requested. We're sorry to see you go!

What happens next?
- Your account will remain active until the end of your current billing period
- You'll be moved to the free Starter plan after that
- Your data will be preserved for 30 days
- You can reactivate anytime during this period

We'd love to have you back!
If you change your mind, you can reactivate your subscription anytime. We're constantly improving TokPulse based on feedback from merchants like you.

Reactivate subscription: ${process.env.APP_URL}/billing

Questions or feedback? Reply to this email - we'd love to hear from you!

© 2024 TokPulse. All rights reserved.
You received this email because your subscription was cancelled.
    `;

    return { subject, html, text };
  }
}
