import type { Request, Response } from 'express';
import { Router } from 'express';
import type { RBACMiddleware } from './middleware';
import type { RBACService } from './service';
import { UserInviteSchema, StoreConnectionSchema } from './types';

export interface RBACRoutesConfig {
  rbacService: RBACService;
  rbacMiddleware: RBACMiddleware;
}

export function createRBACRoutes(config: RBACRoutesConfig): Router {
  const router = Router();

  // Get current user permissions
  router.get('/permissions', async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const permissions = await config.rbacService.getUserPermissions(userId);
      res.json({ permissions });
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ error: 'Failed to get permissions' });
    }
  });

  // Organization users management
  router.get(
    '/users',
    config.rbacMiddleware.requirePermission('users:read'),
    async (req: Request, res: Response) => {
      try {
        const organizationId = req.organizationId;

        if (!organizationId) {
          return res.status(400).json({ error: 'Organization context required' });
        }

        const users = await config.rbacService.getOrganizationUsers(organizationId);
        res.json({ users });
      } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
      }
    },
  );

  router.post(
    '/users/invite',
    config.rbacMiddleware.requirePermission('users:invite'),
    async (req: Request, res: Response) => {
      try {
        const organizationId = req.organizationId;
        const userId = req.userId;

        if (!organizationId || !userId) {
          return res.status(400).json({ error: 'Organization and user context required' });
        }

        const inviteData = UserInviteSchema.parse({
          ...req.body,
          organizationId,
          invitedBy: userId,
        });

        await config.rbacService.inviteUser(inviteData);
        res.json({ success: true });
      } catch (error) {
        console.error('Invite user error:', error);
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to invite user' });
        }
      }
    },
  );

  router.put(
    '/users/:userId/role',
    config.rbacMiddleware.requirePermission('users:update'),
    async (req: Request, res: Response) => {
      try {
        const { userId: targetUserId } = req.params;
        const { role } = req.body;
        const updatedBy = req.userId;

        if (!updatedBy) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        await config.rbacService.updateUserRole(targetUserId, role, updatedBy);
        res.json({ success: true });
      } catch (error) {
        console.error('Update user role error:', error);
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to update user role' });
        }
      }
    },
  );

  router.delete(
    '/users/:userId',
    config.rbacMiddleware.requirePermission('users:delete'),
    async (req: Request, res: Response) => {
      try {
        const { userId: targetUserId } = req.params;
        const removedBy = req.userId;

        if (!removedBy) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        await config.rbacService.removeUser(targetUserId, removedBy);
        res.json({ success: true });
      } catch (error) {
        console.error('Remove user error:', error);
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to remove user' });
        }
      }
    },
  );

  // Store management
  router.get(
    '/stores',
    config.rbacMiddleware.requirePermission('stores:read'),
    async (req: Request, res: Response) => {
      try {
        const organizationId = req.organizationId;

        if (!organizationId) {
          return res.status(400).json({ error: 'Organization context required' });
        }

        const stores = await config.rbacService.getOrganizationStores(organizationId);
        res.json({ stores });
      } catch (error) {
        console.error('Get stores error:', error);
        res.status(500).json({ error: 'Failed to get stores' });
      }
    },
  );

  router.post(
    '/stores/connect',
    config.rbacMiddleware.requirePermission('stores:connect'),
    async (req: Request, res: Response) => {
      try {
        const organizationId = req.organizationId;
        const connectedBy = req.userId;

        if (!organizationId || !connectedBy) {
          return res.status(400).json({ error: 'Organization and user context required' });
        }

        const connectionData = StoreConnectionSchema.parse({
          ...req.body,
          organizationId,
          connectedBy,
        });

        await config.rbacService.connectStore(connectionData);
        res.json({ success: true });
      } catch (error) {
        console.error('Connect store error:', error);
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to connect store' });
        }
      }
    },
  );

  router.delete(
    '/stores/:storeId',
    config.rbacMiddleware.requirePermission('stores:disconnect'),
    async (req: Request, res: Response) => {
      try {
        const { storeId } = req.params;
        const disconnectedBy = req.userId;

        if (!disconnectedBy) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        await config.rbacService.disconnectStore(storeId, disconnectedBy);
        res.json({ success: true });
      } catch (error) {
        console.error('Disconnect store error:', error);
        if (error instanceof Error) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Failed to disconnect store' });
        }
      }
    },
  );

  // Audit logs
  router.get(
    '/audit-logs',
    config.rbacMiddleware.requirePermission('org:read'),
    async (req: Request, res: Response) => {
      try {
        const organizationId = req.organizationId;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        if (!organizationId) {
          return res.status(400).json({ error: 'Organization context required' });
        }

        const logs = await config.rbacService.getAuditLogs(organizationId, limit, offset);
        res.json({ logs });
      } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to get audit logs' });
      }
    },
  );

  // Permission check endpoint
  router.post('/check-permission', async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      const { permission, resource, action, resourceId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      let hasPermission = false;

      if (permission) {
        hasPermission = await config.rbacService.can(userId, permission);
      } else if (resource && action) {
        hasPermission = await config.rbacService.canAccessResource(
          userId,
          resource,
          action,
          resourceId,
        );
      } else {
        return res.status(400).json({ error: 'Permission or resource/action required' });
      }

      res.json({ hasPermission });
    } catch (error) {
      console.error('Check permission error:', error);
      res.status(500).json({ error: 'Failed to check permission' });
    }
  });

  return router;
}
