import { supabase } from '@/lib/supabaseClient';

export interface Tenant {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: string;
  monthly_rent: number;
  lease_end_date: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch single tenant by ID with RLS
export const fetchTenantById = async (tenantId: string): Promise<Tenant | null> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (error) {
    console.error('Error fetching tenant:', error);
    throw error;
  }

  return data;
};

// Update tenant with RLS
export const updateTenant = async (tenantId: string, updates: Partial<Tenant>): Promise<void> => {
  const { error } = await supabase
    .from('tenants')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', tenantId);

  if (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
};

// Fetch all tenants with RLS
export const fetchAllTenants = async (): Promise<Tenant[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tenants:', error);
    throw error;
  }

  return data || [];
};