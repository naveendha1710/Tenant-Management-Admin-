import { supabase } from '@/lib/supabaseClient';

export interface TenantRecord {
  id: string;
  company_name: string;
  status: 'active' | 'trial' | 'inactive' | 'pending approval';
  monthly_rent: number;
  created_at: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export const fetchAllTenants = async (): Promise<TenantRecord[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_name, status, monthly_rent, created_at')
    .order('monthly_rent', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getTenantStats = (tenants: TenantRecord[]) => {
  const total = tenants.length;
  const active = tenants.filter(t => t.status?.toLowerCase() === 'active').length;
  const trial = tenants.filter(t => t.status?.toLowerCase() === 'trial').length;
  const inactive = tenants.filter(t => t.status?.toLowerCase() === 'inactive').length;
  const pending = tenants.filter(t => t.status?.toLowerCase() === 'pending approval').length;

  return { total, active, trial, inactive, pending };
};

export const calculateRevenue = (tenants: TenantRecord[]) => {
  return tenants
    .filter(t => t.status?.toLowerCase() === 'active')
    .reduce((sum, t) => sum + (t.monthly_rent || 0), 0);
};

export const subscribeToTenantChanges = (callback: () => void) => {
  return supabase
    .channel('tenant-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tenants' },
      callback
    )
    .subscribe();
};