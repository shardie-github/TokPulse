import type { PrismaClient } from '@tokpulse/db';
import type {
  UserRole,
  Permission,
  Resource,
  Action,
  UserInvite,
  StoreConnection,
  AuditLog,
} from './types';
import { ROLE_PERMISSIONS } from './types';

export interface RBACServiceConfig {
  getCurrentUserId: (req: any) => string | null;
  getCurrentOrganizationId: (req: any) => string | null;
}

export class RBACService {
  constructor(
    private db: PrismaClient,
    private config: RBACServiceConfig,
  ) {}

  // Permission checking
  async can(userId: string, permission: Permission, resourceId?: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      return false;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
    return userPermissions.includes(permission);
  }

  async canAccessResource(
    userId: string,
    resource: Resource,
    action: Action,
    resourceId?: string,
  ): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      return false;
    }

    // Check if user has permission for the specific resource and action
    const permission = `${resource}:${action}` as Permission;
    const userPermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];

    if (!userPermissions.includes(permission)) {
      return false;
    }

    // Additional resource-specific checks
    switch (resource) {
      case 'store':
        if (resourceId) {
          const store = await this.db.store.findUnique({
            where: { id: resourceId },
          });
          return store?.organizationId === user.organizationId;
        }
        break;

      case 'user':
        if (resourceId) {
          const targetUser = await this.db.user.findUnique({
            where: { id: resourceId },
          });
          return targetUser?.organizationId === user.organizationId;
        }
        break;

      case 'experiment':
        if (resourceId) {
          const experiment = await this.db.experiment.findUnique({
            where: { id: resourceId },
          });
          return experiment?.orgId === user.organizationId;
        }
        break;
    }

    return true;
  }

  // Organization management
  async getOrganizationUsers(organizationId: string): Promise<any[]> {
    return this.db.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async inviteUser(invite: UserInvite): Promise<void> {
    // Check if user already exists
    const existingUser = await this.db.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create invite record (in a real implementation, this would be a separate table)
    // For now, we'll create the user directly
    await this.db.user.create({
      data: {
        email: invite.email,
        role: invite.role,
        organizationId: invite.organizationId,
        name: 'Pending Invitation',
      },
    });

    // Log the invitation
    await this.logAuditEvent({
      action: 'user:invite',
      resource: 'user',
      changes: { email: invite.email, role: invite.role },
      userId: invite.invitedBy,
      organizationId: invite.organizationId,
    });
  }

  async updateUserRole(userId: string, newRole: UserRole, updatedBy: string): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const oldRole = user.role;

    await this.db.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Log the role change
    await this.logAuditEvent({
      action: 'user:update',
      resource: 'user',
      resourceId: userId,
      changes: { role: { from: oldRole, to: newRole } },
      userId: updatedBy,
      organizationId: user.organizationId,
    });
  }

  async removeUser(userId: string, removedBy: string): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow removing the last owner
    const ownerCount = await this.db.user.count({
      where: {
        organizationId: user.organizationId,
        role: 'OWNER',
      },
    });

    if (user.role === 'OWNER' && ownerCount <= 1) {
      throw new Error('Cannot remove the last owner of the organization');
    }

    await this.db.user.delete({
      where: { id: userId },
    });

    // Log the removal
    await this.logAuditEvent({
      action: 'user:delete',
      resource: 'user',
      resourceId: userId,
      changes: { email: user.email, role: user.role },
      userId: removedBy,
      organizationId: user.organizationId,
    });
  }

  // Store management
  async getOrganizationStores(organizationId: string): Promise<any[]> {
    return this.db.store.findMany({
      where: { organizationId },
      select: {
        id: true,
        shopDomain: true,
        status: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async connectStore(connection: StoreConnection): Promise<void> {
    // Check if store is already connected to another organization
    const existingStore = await this.db.store.findUnique({
      where: { id: connection.storeId },
    });

    if (existingStore && existingStore.organizationId !== connection.organizationId) {
      throw new Error('Store is already connected to another organization');
    }

    // Update or create store connection
    await this.db.store.upsert({
      where: { id: connection.storeId },
      update: {
        organizationId: connection.organizationId,
      },
      create: {
        id: connection.storeId,
        shopDomain: 'pending', // This would be set when the store is actually connected
        accessToken: 'pending',
        scopes: 'read_products,read_orders',
        organizationId: connection.organizationId,
        status: 'ACTIVE',
      },
    });

    // If this is set as default, unset other defaults
    if (connection.isDefault) {
      await this.db.store.updateMany({
        where: {
          organizationId: connection.organizationId,
          id: { not: connection.storeId },
        },
        data: {
          /* Add default store flag if needed */
        },
      });
    }

    // Log the connection
    await this.logAuditEvent({
      action: 'store:connect',
      resource: 'store',
      resourceId: connection.storeId,
      changes: { isDefault: connection.isDefault },
      userId: connection.connectedBy,
      organizationId: connection.organizationId,
      storeId: connection.storeId,
    });
  }

  async disconnectStore(storeId: string, disconnectedBy: string): Promise<void> {
    const store = await this.db.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error('Store not found');
    }

    await this.db.store.update({
      where: { id: storeId },
      data: { status: 'UNINSTALLED' },
    });

    // Log the disconnection
    await this.logAuditEvent({
      action: 'store:disconnect',
      resource: 'store',
      resourceId: storeId,
      changes: { shopDomain: store.shopDomain },
      userId: disconnectedBy,
      organizationId: store.organizationId,
      storeId,
    });
  }

  // Audit logging
  async logAuditEvent(event: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    await this.db.auditLog.create({
      data: {
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        changes: event.changes ? JSON.stringify(event.changes) : null,
        userId: event.userId,
        organizationId: event.organizationId,
        storeId: event.storeId,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    });
  }

  async getAuditLogs(
    organizationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<any[]> {
    return this.db.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        resource: true,
        resourceId: true,
        changes: true,
        userId: true,
        storeId: true,
        createdAt: true,
        metadata: true,
      },
    });
  }

  // Helper methods
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    return ROLE_PERMISSIONS[user.role as UserRole] || [];
  }

  async isOwner(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    return user?.role === 'OWNER';
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    return user?.role === 'ADMIN' || user?.role === 'OWNER';
  }
}
