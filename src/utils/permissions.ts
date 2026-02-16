import { Permission } from '@/data/userData';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';

export class PermissionChecker {
  private permissions: Permission[];

  constructor(permissions: Permission[]) {
    this.permissions = permissions;
  }

  // Check if user has permission for a specific module and action
  hasPermission(module: string, action: PermissionAction): boolean {
    const permission = this.permissions.find(p => p.module === module);
    if (!permission) return false;
    
    return permission[action] === true;
  }

  // Check multiple permissions at once
  hasPermissions(module: string, actions: PermissionAction[]): Record<PermissionAction, boolean> {
    const result: Record<string, boolean> = {};
    actions.forEach(action => {
      result[action] = this.hasPermission(module, action);
    });
    return result as Record<PermissionAction, boolean>;
  }

  // Get all permissions for a module
  getModulePermissions(module: string): Permission | null {
    return this.permissions.find(p => p.module === module) || null;
  }
}

// Hook to use permissions in components
export const usePermissions = (permissions: Permission[]) => {
  return new PermissionChecker(permissions);
};