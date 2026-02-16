import { supabase } from '@/lib/supabaseClient';

export const cleanupDuplicateTenants = async () => {
  try {
    // Get all tenants
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by company name
    const tenantGroups: { [key: string]: any[] } = {};
    tenants?.forEach(tenant => {
      const name = tenant.company_name || tenant.name || 'Unknown';
      if (!tenantGroups[name]) {
        tenantGroups[name] = [];
      }
      tenantGroups[name].push(tenant);
    });

    // Remove duplicates (keep the first one)
    for (const [name, group] of Object.entries(tenantGroups)) {
      if (group.length > 1) {
        const duplicateIds = group.slice(1).map(t => t.id);
        
        // Delete duplicates
        const { error: deleteError } = await supabase
          .from('tenants')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) {
          console.error(`Error deleting duplicates for ${name}:`, deleteError);
        } else {
          console.log(`Removed ${duplicateIds.length} duplicates for ${name}`);
        }
      }
    }

    // Fix "Unknown" tenant names
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ company_name: 'Sample Company' })
      .eq('company_name', 'Unknown');

    if (updateError) {
      console.error('Error updating Unknown tenants:', updateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error cleaning up data:', error);
    return { success: false, error };
  }
};

export const ensureTenantsTable = async () => {
  try {
    // Check if tenants table exists and has proper structure
    const { data, error } = await supabase
      .from('tenants')
      .select('id, company_name, status, monthly_rent, created_at')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, create it
      console.log('Creating tenants table...');
      // This would need to be done via Supabase dashboard or migration
      return { success: false, error: 'Tenants table needs to be created in Supabase' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error checking tenants table:', error);
    return { success: false, error };
  }
};