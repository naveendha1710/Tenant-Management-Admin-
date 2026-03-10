/**
 * Utility to create user accounts for existing tenants
 * Run this once to sync existing tenants with user accounts
 */

import { tenantDataService } from '@/data/tenantData';
import { userService } from '@/data/userData';

export async function syncTenantUsers() {
  try {
    // Get all tenants
    const tenants = await tenantDataService.getAllTenants();
    
    // Get all existing users
    const users = await userService.getAllUsers();
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
    
    let created = 0;
    let skipped = 0;
    
    for (const tenant of tenants) {
      // Check if user already exists
      if (existingEmails.has(tenant.email.toLowerCase())) {
        skipped++;
        continue;
      }
      
      // Create user account
      try {
        await userService.addUser({
          name: tenant.name,
          email: tenant.email,
          phone: tenant.phone || '',
          password: tenant.password || 'admin123',
          role: 'Tenant',
          department: tenant.company,
          isActive: tenant.status === 'Active',
          isApprover: false,
          twoFactorEnabled: false,
          userType: 'predefined'
        });
        created++;
      } catch (error) {
        console.error(`Failed to create user for ${tenant.email}:`, error);
      }
    }
    
    return { created, skipped, total: tenants.length };
  } catch (error) {
    console.error('Error syncing tenant users:', error);
    throw error;
  }
}
