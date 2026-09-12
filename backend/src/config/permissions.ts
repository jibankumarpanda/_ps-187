import { UserRole } from '@prisma/client';

export type Permission =
  | 'camera:read'
  | 'camera:create'
  | 'camera:update'
  | 'camera:delete'
  | 'camera:control'
  | 'event:read'
  | 'event:create'
  | 'alert:read'
  | 'alert:acknowledge'
  | 'alert:resolve'
  | 'alert:escalate'
  | 'evidence:read'
  | 'evidence:create'
  | 'evidence:verify'
  | 'watchlist:read'
  | 'watchlist:create'
  | 'watchlist:update'
  | 'watchlist:delete'
  | 'blockchain:read'
  | 'blockchain:register'
  | 'blockchain:verify'
  | 'analytics:read'
  | 'audit:read'
  | 'bop:read'
  | 'bop:create'
  | 'bop:update'
  | 'bop:delete'
  | 'user:read'
  | 'user:create'
  | 'user:update'
  | 'user:delete'
  | 'system:read';

const ALL_PERMISSIONS: Permission[] = [
  'camera:read', 'camera:create', 'camera:update', 'camera:delete', 'camera:control',
  'event:read', 'event:create',
  'alert:read', 'alert:acknowledge', 'alert:resolve', 'alert:escalate',
  'evidence:read', 'evidence:create', 'evidence:verify',
  'watchlist:read', 'watchlist:create', 'watchlist:update', 'watchlist:delete',
  'blockchain:read', 'blockchain:register', 'blockchain:verify',
  'analytics:read', 'audit:read',
  'bop:read', 'bop:create', 'bop:update', 'bop:delete',
  'user:read', 'user:create', 'user:update', 'user:delete',
  'system:read',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,

  COMMANDER: [
    'camera:read', 'camera:create', 'camera:update', 'camera:control',
    'event:read', 'event:create',
    'alert:read', 'alert:acknowledge', 'alert:resolve', 'alert:escalate',
    'evidence:read', 'evidence:create', 'evidence:verify',
    'watchlist:read', 'watchlist:create', 'watchlist:update', 'watchlist:delete',
    'blockchain:read', 'blockchain:register', 'blockchain:verify',
    'analytics:read', 'audit:read',
    'bop:read', 'bop:create', 'bop:update',
    'user:read',
    'system:read',
  ],

  BOP_OPERATOR: [
    'camera:read', 'camera:create', 'camera:update', 'camera:control',
    'event:read', 'event:create',
    'alert:read', 'alert:acknowledge',
    'evidence:read', 'evidence:create',
    'watchlist:read',
    'blockchain:read',
    'analytics:read',
    'bop:read',
    'system:read',
  ],

  ANALYST: [
    'camera:read',
    'event:read',
    'alert:read',
    'evidence:read', 'evidence:verify',
    'watchlist:read',
    'blockchain:read', 'blockchain:verify',
    'analytics:read',
    'bop:read',
    'system:read',
  ],

  INVESTIGATOR: [
    'camera:read',
    'event:read',
    'alert:read', 'alert:acknowledge', 'alert:resolve',
    'evidence:read', 'evidence:create', 'evidence:verify',
    'watchlist:read', 'watchlist:create', 'watchlist:update',
    'blockchain:read', 'blockchain:register', 'blockchain:verify',
    'analytics:read',
    'bop:read',
    'system:read',
  ],

  AUDITOR: [
    'camera:read',
    'event:read',
    'alert:read',
    'evidence:read', 'evidence:verify',
    'watchlist:read',
    'blockchain:read', 'blockchain:verify',
    'analytics:read',
    'audit:read',
    'bop:read',
    'system:read',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
