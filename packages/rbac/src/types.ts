import { z } from 'zod'

export const UserRole = z.enum(['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'])
export type UserRole = z.infer<typeof UserRole>

export const Permission = z.enum([
  // Organization management
  'org:read',
  'org:update',
  'org:delete',
  
  // User management
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'users:invite',
  
  // Store management
  'stores:read',
  'stores:create',
  'stores:update',
  'stores:delete',
  'stores:connect',
  'stores:disconnect',
  
  // Analytics and data
  'analytics:read',
  'analytics:export',
  'analytics:advanced',
  
  // Experiments
  'experiments:read',
  'experiments:create',
  'experiments:update',
  'experiments:delete',
  'experiments:run',
  
  // Billing
  'billing:read',
  'billing:update',
  'billing:manage',
  
  // Settings
  'settings:read',
  'settings:update',
  'settings:advanced',
  
  // API access
  'api:read',
  'api:write',
  'api:admin'
])

export type Permission = z.infer<typeof Permission>

export const Resource = z.enum([
  'organization',
  'user',
  'store',
  'analytics',
  'experiment',
  'billing',
  'settings',
  'api'
])

export type Resource = z.infer<typeof Resource>

export const Action = z.enum(['read', 'create', 'update', 'delete', 'invite', 'connect', 'disconnect', 'export', 'run', 'manage'])
export type Action = z.infer<typeof Action>

export const RolePermissionSchema = z.object({
  role: UserRole,
  permissions: z.array(Permission)
})

export const UserInviteSchema = z.object({
  email: z.string().email(),
  role: UserRole,
  organizationId: z.string(),
  invitedBy: z.string()
})

export const StoreConnectionSchema = z.object({
  storeId: z.string(),
  organizationId: z.string(),
  connectedBy: z.string(),
  isDefault: z.boolean().default(false)
})

export const AuditLogSchema = z.object({
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  changes: z.record(z.any()).optional(),
  userId: z.string(),
  organizationId: z.string(),
  storeId: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

export type RolePermission = z.infer<typeof RolePermissionSchema>
export type UserInvite = z.infer<typeof UserInviteSchema>
export type StoreConnection = z.infer<typeof StoreConnectionSchema>
export type AuditLog = z.infer<typeof AuditLogSchema>

// Role-based permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    // All permissions
    'org:read', 'org:update', 'org:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:invite',
    'stores:read', 'stores:create', 'stores:update', 'stores:delete', 'stores:connect', 'stores:disconnect',
    'analytics:read', 'analytics:export', 'analytics:advanced',
    'experiments:read', 'experiments:create', 'experiments:update', 'experiments:delete', 'experiments:run',
    'billing:read', 'billing:update', 'billing:manage',
    'settings:read', 'settings:update', 'settings:advanced',
    'api:read', 'api:write', 'api:admin'
  ],
  ADMIN: [
    // Most permissions except org deletion and billing management
    'org:read', 'org:update',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:invite',
    'stores:read', 'stores:create', 'stores:update', 'stores:delete', 'stores:connect', 'stores:disconnect',
    'analytics:read', 'analytics:export', 'analytics:advanced',
    'experiments:read', 'experiments:create', 'experiments:update', 'experiments:delete', 'experiments:run',
    'billing:read',
    'settings:read', 'settings:update',
    'api:read', 'api:write'
  ],
  ANALYST: [
    // Read and analyze data, run experiments
    'org:read',
    'users:read',
    'stores:read',
    'analytics:read', 'analytics:export', 'analytics:advanced',
    'experiments:read', 'experiments:create', 'experiments:update', 'experiments:run',
    'billing:read',
    'settings:read',
    'api:read'
  ],
  VIEWER: [
    // Read-only access
    'org:read',
    'users:read',
    'stores:read',
    'analytics:read',
    'experiments:read',
    'billing:read',
    'settings:read',
    'api:read'
  ]
}