import { AppUser, Permission } from '@/data/userData';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

/**
 * Check if user has specific permission for a module
 */
export const hasPermission = (
  user: AppUser | null,
  module: string,
  action: PermissionAction
): boolean => {
  if (!user || !user.permissions) return false;
  
  const permission = user.permissions.find(p => p.module === module);
  if (!permission) return false;
  
  return permission[action] === true;
};

/**
 * Check if user has any permission for a module
 */
export const hasAnyPermission = (
  user: AppUser | null,
  module: string
): boolean => {
  if (!user || !user.permissions) return false;
  
  const permission = user.permissions.find(p => p.module === module);
  if (!permission) return false;
  
  return permission.view || permission.add || permission.edit || permission.delete;
};

/**
 * Get user's permissions for a specific module
 */
export const getModulePermissions = (
  user: AppUser | null,
  module: string
): Permission | null => {
  if (!user || !user.permissions) return null;
  
  return user.permissions.find(p => p.module === module) || null;
};

/**
 * Check multiple permissions at once
 */
export const hasPermissions = (
  user: AppUser | null,
  checks: Array<{ module: string; action: PermissionAction }>
): boolean => {
  return checks.every(check => hasPermission(user, check.module, check.action));
};

/**
 * Get list of modules user has view access to
 */
export const getAccessibleModules = (
  user: AppUser | null
): string[] => {
  if (!user || !user.permissions) return [];
  
  return user.permissions
    .filter(p => p.view === true)
    .map(p => p.module);
};