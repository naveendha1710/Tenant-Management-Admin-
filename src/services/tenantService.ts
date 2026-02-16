import { supabase } from "@/lib/supabaseClient";

export interface TenantData {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  location: string;
  status: string;
  monthly_rent: number;
  lease_start_date: string;
  lease_end_date: string;
  security_deposit?: number;
  sector?: string;
  pan_number?: string;
  gst_number?: string;
  address?: string;
  representative_name?: string;
  representative_email?: string;
  representative_phone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch tenant by ID from Supabase
 */
export const fetchTenantById = async (tenantId: string): Promise<TenantData | null> => {
  try {
    console.log('Fetching tenant:', tenantId);
    
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .limit(1)
      .single();

    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchTenantById:', error);
    throw error;
  }
};

/**
 * Update tenant in Supabase
 */
export const updateTenant = async (tenantId: string, updates: Partial<TenantData>): Promise<TenantData> => {
  try {
    console.log('Updating tenant:', tenantId, updates);
    
    const { data, error } = await supabase
      .from('tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateTenant:', error);
    throw error;
  }
};