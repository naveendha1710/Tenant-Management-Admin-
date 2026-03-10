import { AppUser } from '@/data/userData';

/**
 * Get accessible tenant IDs for user
 * Returns null if no restrictions (admin/empty branchAccess)
 */
export function getAccessibleTenantIds(user: AppUser | null): string[] | null {
  if (!user || user.role !== 'Tenant') return null;
  if (!user.branchAccess || user.branchAccess.length === 0) return null;
  return user.branchAccess;
}

/**
 * Filter data by tenant_id field
 */
export function filterByTenantAccess<T extends { tenant_id: string }>(
  data: T[],
  user: AppUser | null
): T[] {
  const accessibleIds = getAccessibleTenantIds(user);
  if (accessibleIds === null) return data;
  return data.filter(item => accessibleIds.includes(item.tenant_id));
}

/**
 * Check if user can access specific tenant
 */
export function canAccessTenant(user: AppUser | null, tenantId: string): boolean {
  const accessibleIds = getAccessibleTenantIds(user);
  if (accessibleIds === null) return true;
  return accessibleIds.includes(tenantId);
}
