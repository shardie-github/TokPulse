import type { Request, Response, NextFunction } from 'express';
import type { BillingService } from './service';

export interface BillingMiddlewareConfig {
  billingService: BillingService;
  getOrganizationId: (req: Request) => string | null;
}

export class BillingMiddleware {
  constructor(private config: BillingMiddlewareConfig) {}

  requireFeature(feature: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = this.config.getOrganizationId(req);

        if (!organizationId) {
          return res.status(401).json({ error: 'Organization not found' });
        }

        const hasAccess = await this.config.billingService.checkEntitlement({
          organizationId,
          feature,
        });

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Feature not available',
            feature,
            upgradeRequired: true,
          });
        }

        next();
      } catch (error) {
        console.error('Billing middleware error:', error);
        res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  }

  requirePlan(planKey: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = this.config.getOrganizationId(req);

        if (!organizationId) {
          return res.status(401).json({ error: 'Organization not found' });
        }

        const subscription = await this.config.billingService.getSubscription(organizationId);

        if (!subscription) {
          return res.status(403).json({
            error: 'No active subscription',
            upgradeRequired: true,
          });
        }

        const plan = await this.config.billingService.getPlanByKey(planKey);

        if (!plan) {
          return res.status(500).json({ error: 'Plan not found' });
        }

        // Check if current plan meets requirements
        const currentPlan = await this.config.billingService.getPlanByKey(subscription.planId);

        if (!currentPlan || currentPlan.price < plan.price) {
          return res.status(403).json({
            error: 'Plan upgrade required',
            currentPlan: currentPlan?.key,
            requiredPlan: planKey,
            upgradeRequired: true,
          });
        }

        next();
      } catch (error) {
        console.error('Billing middleware error:', error);
        res.status(500).json({ error: 'Authorization check failed' });
      }
    };
  }

  checkUsageLimit(metric: string, limit: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = this.config.getOrganizationId(req);

        if (!organizationId) {
          return res.status(401).json({ error: 'Organization not found' });
        }

        const usageCheck = await this.config.billingService.checkUsageLimit(
          organizationId,
          metric as any,
          limit,
        );

        if (!usageCheck.withinLimit) {
          return res.status(429).json({
            error: 'Usage limit exceeded',
            metric,
            currentUsage: usageCheck.currentUsage,
            limit: usageCheck.limit,
            upgradeRequired: true,
          });
        }

        // Add usage info to request for tracking
        req.billingUsage = {
          metric,
          limit: usageCheck.limit,
          currentUsage: usageCheck.currentUsage,
        };

        next();
      } catch (error) {
        console.error('Usage limit check error:', error);
        res.status(500).json({ error: 'Usage check failed' });
      }
    };
  }

  trackUsage(metric: string, quantity: number = 1) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = this.config.getOrganizationId(req);

        if (!organizationId) {
          return next(); // Skip tracking if no org
        }

        const subscription = await this.config.billingService.getSubscription(organizationId);

        if (!subscription) {
          return next(); // Skip tracking if no subscription
        }

        // Record usage asynchronously
        setImmediate(async () => {
          try {
            await this.config.billingService.recordUsage({
              subscriptionId: subscription.id,
              metric: metric as any,
              quantity,
              metadata: {
                endpoint: req.path,
                method: req.method,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
              },
            });
          } catch (error) {
            console.error('Usage tracking error:', error);
          }
        });

        next();
      } catch (error) {
        console.error('Usage tracking middleware error:', error);
        next(); // Continue even if tracking fails
      }
    };
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      billingUsage?: {
        metric: string;
        limit: number;
        currentUsage: number;
      };
    }
  }
}
