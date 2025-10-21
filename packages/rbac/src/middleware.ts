import { Request, Response, NextFunction } from 'express'
import { RBACService } from './service'
import { Permission, Resource, Action } from './types'

export interface RBACMiddlewareConfig {
  rbacService: RBACService
  getCurrentUserId: (req: Request) => string | null
  getCurrentOrganizationId: (req: Request) => string | null
}

export class RBACMiddleware {
  constructor(private config: RBACMiddlewareConfig) {}

  requirePermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = this.config.getCurrentUserId(req)
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const hasPermission = await this.config.rbacService.can(userId, permission)
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient permissions',
            required: permission
          })
        }

        next()
      } catch (error) {
        console.error('RBAC middleware error:', error)
        res.status(500).json({ error: 'Authorization check failed' })
      }
    }
  }

  requireResourceAccess(resource: Resource, action: Action) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = this.config.getCurrentUserId(req)
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const resourceId = req.params.id || req.params.resourceId
        const hasAccess = await this.config.rbacService.canAccessResource(
          userId, 
          resource, 
          action, 
          resourceId
        )
        
        if (!hasAccess) {
          return res.status(403).json({ 
            error: 'Access denied',
            resource,
            action,
            resourceId
          })
        }

        next()
      } catch (error) {
        console.error('RBAC middleware error:', error)
        res.status(500).json({ error: 'Authorization check failed' })
      }
    }
  }

  requireRole(requiredRole: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = this.config.getCurrentUserId(req)
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        const user = await this.config.rbacService.db.user.findUnique({
          where: { id: userId }
        })

        if (!user) {
          return res.status(401).json({ error: 'User not found' })
        }

        const roleHierarchy = ['VIEWER', 'ANALYST', 'ADMIN', 'OWNER']
        const userRoleIndex = roleHierarchy.indexOf(user.role)
        const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

        if (userRoleIndex < requiredRoleIndex) {
          return res.status(403).json({ 
            error: 'Insufficient role',
            required: requiredRole,
            current: user.role
          })
        }

        next()
      } catch (error) {
        console.error('RBAC middleware error:', error)
        res.status(500).json({ error: 'Authorization check failed' })
      }
    }
  }

  requireOwner() {
    return this.requireRole('OWNER')
  }

  requireAdmin() {
    return this.requireRole('ADMIN')
  }

  requireAnalyst() {
    return this.requireRole('ANALYST')
  }

  // Organization-scoped middleware
  requireOrganizationAccess() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = this.config.getCurrentUserId(req)
        const organizationId = this.config.getCurrentOrganizationId(req)
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        if (!organizationId) {
          return res.status(400).json({ error: 'Organization context required' })
        }

        // Verify user belongs to the organization
        const user = await this.config.rbacService.db.user.findUnique({
          where: { id: userId }
        })

        if (!user || user.organizationId !== organizationId) {
          return res.status(403).json({ error: 'Access denied to organization' })
        }

        // Add organization context to request
        req.organizationId = organizationId
        req.userId = userId

        next()
      } catch (error) {
        console.error('Organization access middleware error:', error)
        res.status(500).json({ error: 'Authorization check failed' })
      }
    }
  }

  // Store-scoped middleware
  requireStoreAccess() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = this.config.getCurrentUserId(req)
        const storeId = req.params.storeId || req.query.storeId as string
        
        if (!userId) {
          return res.status(401).json({ error: 'Authentication required' })
        }

        if (!storeId) {
          return res.status(400).json({ error: 'Store context required' })
        }

        // Verify user has access to the store
        const hasAccess = await this.config.rbacService.canAccessResource(
          userId, 
          'store', 
          'read', 
          storeId
        )
        
        if (!hasAccess) {
          return res.status(403).json({ error: 'Access denied to store' })
        }

        // Add store context to request
        req.storeId = storeId

        next()
      } catch (error) {
        console.error('Store access middleware error:', error)
        res.status(500).json({ error: 'Authorization check failed' })
      }
    }
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      organizationId?: string
      userId?: string
      storeId?: string
    }
  }
}