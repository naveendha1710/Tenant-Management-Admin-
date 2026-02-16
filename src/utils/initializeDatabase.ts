import { supabase } from '@/lib/supabaseClient';

export const initializeTenantsTable = async () => {
  try {
    // Test if we can query the tenants table
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Tenants table access error:', error);
      return { success: false, error: error.message };
    }

    console.log('Tenants table is accessible');
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error: 'Failed to initialize database' };
  }
};

export const seedSampleTenants = async () => {
  try {
    // Check if we already have tenants
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Tenants already exist, skipping seed');
      return { success: true };
    }

    // Insert sample tenants
    const sampleTenants = [
      {
        company_name: 'TechStart Solutions',
        contact_person: 'John Doe',
        email: 'john@techstart.com',
        phone: '+91 9876543210',
        status: 'active',
        monthly_rent: 25000
      },
      {
        company_name: 'Creative Hub',
        contact_person: 'Sarah Smith',
        email: 'sarah@creativehub.com',
        phone: '+91 9876543211',
        status: 'active',
        monthly_rent: 18000
      },
      {
        company_name: 'Innovation Labs',
        contact_person: 'Mike Johnson',
        email: 'mike@innovationlabs.com',
        phone: '+91 9876543212',
        status: 'trial',
        monthly_rent: 15000
      }
    ];

    const { error } = await supabase
      .from('tenants')
      .insert(sampleTenants);

    if (error) {
      console.error('Error seeding tenants:', error);
      return { success: false, error: error.message };
    }

    console.log('Sample tenants seeded successfully');
    return { success: true };
  } catch (error) {
    console.error('Seeding error:', error);
    return { success: false, error: 'Failed to seed sample data' };
  }
};