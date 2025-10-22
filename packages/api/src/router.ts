import type { Request, Response, NextFunction } from 'express';
import { Router } from 'express';
import {
  validateRequest,
  validateQuery,
  successResponse,
  errorResponse,
  ApiSchemas,
} from './validation';

export interface ApiRouterConfig {
  billingService: any;
  storeService: any;
  userService: any;
  experimentService: any;
  analyticsService: any;
  recommendationsService: any;
  getOrganizationId: (req: Request) => string | null;
  getUserId: (req: Request) => string | null;
  requireAuth: (req: Request, res: Response, next: NextFunction) => void;
  requirePermission: (
    permission: string,
  ) => (req: Request, res: Response, next: NextFunction) => void;
}

export function createApiRouter(config: ApiRouterConfig): Router {
  const router = Router();

  // Error handling middleware
  router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('API Error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json(errorResponse('Validation failed', 'VALIDATION_ERROR'));
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(401).json(errorResponse('Unauthorized', 'UNAUTHORIZED'));
    }

    if (error.name === 'ForbiddenError') {
      return res.status(403).json(errorResponse('Forbidden', 'FORBIDDEN'));
    }

    if (error.name === 'NotFoundError') {
      return res.status(404).json(errorResponse('Resource not found', 'NOT_FOUND'));
    }

    return res.status(500).json(errorResponse('Internal server error', 'INTERNAL_ERROR'));
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json(
      successResponse({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      }),
    );
  });

  // Billing routes
  router.get(
    '/billing/plans',
    config.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const plans = await config.billingService.getPlans();
        res.json(successResponse(plans));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/billing/subscription',
    config.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const subscription = await config.billingService.getSubscription(organizationId);
        if (!subscription) {
          return res.status(404).json(errorResponse('No subscription found', 'NOT_FOUND'));
        }

        res.json(successResponse(subscription));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/billing/subscription',
    config.requireAuth,
    config.requirePermission('billing:create'),
    validateRequest(ApiSchemas.createSubscription),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const subscription = await config.billingService.createSubscription({
          ...req.validatedData,
          organizationId,
        });

        res.status(201).json(successResponse(subscription, 'Subscription created successfully'));
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/billing/subscription',
    config.requireAuth,
    config.requirePermission('billing:update'),
    validateRequest(ApiSchemas.updateSubscription),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const subscription = await config.billingService.updateSubscription(
          organizationId,
          req.validatedData,
        );

        res.json(successResponse(subscription, 'Subscription updated successfully'));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/billing/subscription',
    config.requireAuth,
    config.requirePermission('billing:delete'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const subscription = await config.billingService.cancelSubscription(organizationId);
        res.json(successResponse(subscription, 'Subscription cancelled successfully'));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/billing/usage',
    config.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const subscription = await config.billingService.getSubscription(organizationId);
        if (!subscription) {
          return res.status(404).json(errorResponse('No subscription found', 'NOT_FOUND'));
        }

        const usage = await config.billingService.getUsageSummary(subscription.id);
        res.json(successResponse(usage));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/billing/usage',
    config.requireAuth,
    config.requirePermission('billing:record_usage'),
    validateRequest(ApiSchemas.recordUsage),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const subscription = await config.billingService.getSubscription(organizationId);
        if (!subscription) {
          return res.status(404).json(errorResponse('No subscription found', 'NOT_FOUND'));
        }

        const usageRecord = await config.billingService.recordUsage({
          subscriptionId: subscription.id,
          ...req.validatedData,
        });

        res.status(201).json(successResponse(usageRecord, 'Usage recorded successfully'));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/billing/entitlement',
    config.requireAuth,
    validateRequest(ApiSchemas.checkEntitlement),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const hasAccess = await config.billingService.checkEntitlement({
          organizationId,
          ...req.validatedData,
        });

        res.json(successResponse({ hasAccess }));
      } catch (error) {
        next(error);
      }
    },
  );

  // Store routes
  router.get(
    '/stores',
    config.requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const stores = await config.storeService.getStoresByOrganization(organizationId);
        res.json(successResponse(stores));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/stores',
    config.requireAuth,
    config.requirePermission('stores:create'),
    validateRequest(ApiSchemas.createStore),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const store = await config.storeService.createStore({
          ...req.validatedData,
          organizationId,
        });

        res.status(201).json(successResponse(store, 'Store created successfully'));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/stores/:storeId',
    config.requireAuth,
    config.requirePermission('stores:read'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { storeId } = req.params;
        const organizationId = config.getOrganizationId(req);

        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const store = await config.storeService.getStore(storeId, organizationId);
        if (!store) {
          return res.status(404).json(errorResponse('Store not found', 'NOT_FOUND'));
        }

        res.json(successResponse(store));
      } catch (error) {
        next(error);
      }
    },
  );

  // Analytics routes
  router.post(
    '/analytics/track',
    config.requireAuth,
    validateRequest(ApiSchemas.trackEvent),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const event = await config.analyticsService.trackEvent({
          ...req.validatedData,
          organizationId,
        });

        res.status(201).json(successResponse(event, 'Event tracked successfully'));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/analytics',
    config.requireAuth,
    config.requirePermission('analytics:read'),
    validateQuery(ApiSchemas.getAnalytics),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const analytics = await config.analyticsService.getAnalytics({
          ...req.validatedQuery,
          organizationId,
        });

        res.json(successResponse(analytics));
      } catch (error) {
        next(error);
      }
    },
  );

  // Recommendations routes
  router.get(
    '/recommendations',
    config.requireAuth,
    validateQuery(ApiSchemas.getRecommendations),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const organizationId = config.getOrganizationId(req);
        if (!organizationId) {
          return res.status(401).json(errorResponse('Organization not found', 'UNAUTHORIZED'));
        }

        const recommendations = await config.recommendationsService.getRecommendations({
          ...req.validatedQuery,
          organizationId,
        });

        res.json(successResponse(recommendations));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
