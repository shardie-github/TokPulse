import type { Shopify } from '@shopify/shopify-api';
import { prisma } from '@tokpulse/db';
import { telemetry } from '@tokpulse/shared';
import type { Request, Response, Router } from 'express';

export function createApiHandler(shopify: Shopify) {
  const router = Router();

  // Get store info
  router.get('/stores/:shopDomain', async (req: Request, res: Response) => {
    try {
      const { shopDomain } = req.params;

      const store = await prisma.store.findUnique({
        where: { shopDomain },
        include: {
          organization: true,
          _count: {
            select: {
              catalogItems: true,
              pixelEvents: true,
              attributions: true,
            },
          },
        },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      res.json({
        success: true,
        data: {
          id: store.id,
          shopDomain: store.shopDomain,
          status: store.status,
          region: store.region,
          scopes: store.scopes,
          organization: store.organization,
          stats: store._count,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt,
        },
      });
    } catch (error) {
      telemetry.error(error as Error, { endpoint: 'GET /stores/:shopDomain' });
      res.status(500).json({ error: 'Failed to fetch store info' });
    }
  });

  // Get catalog items
  router.get('/stores/:shopDomain/catalog', async (req: Request, res: Response) => {
    try {
      const { shopDomain } = req.params;
      const { page = '1', limit = '20', search } = req.query;

      const store = await prisma.store.findUnique({
        where: { shopDomain },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where = {
        storeId: store.id,
        ...(search && {
          OR: [
            { title: { contains: search as string, mode: 'insensitive' as const } },
            { handle: { contains: search as string, mode: 'insensitive' as const } },
            { vendor: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        prisma.catalogItem.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.catalogItem.count({ where }),
      ]);

      res.json({
        success: true,
        data: items,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      telemetry.error(error as Error, { endpoint: 'GET /stores/:shopDomain/catalog' });
      res.status(500).json({ error: 'Failed to fetch catalog items' });
    }
  });

  // Get webhook events
  router.get('/stores/:shopDomain/webhooks', async (req: Request, res: Response) => {
    try {
      const { shopDomain } = req.params;
      const { page = '1', limit = '20', topic } = req.query;

      const store = await prisma.store.findUnique({
        where: { shopDomain },
      });

      if (!store) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const take = parseInt(limit as string);

      const where = {
        storeId: store.id,
        ...(topic && { topic: topic as string }),
      };

      const [events, total] = await Promise.all([
        prisma.webhookEvent.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.webhookEvent.count({ where }),
      ]);

      res.json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      telemetry.error(error as Error, { endpoint: 'GET /stores/:shopDomain/webhooks' });
      res.status(500).json({ error: 'Failed to fetch webhook events' });
    }
  });

  return router;
}
