import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export interface TenantProfile {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: string;
  address: string;
  assignedunits: string[] | null;
  gst_number: string | null;
  pan_number: string | null;
  is_gst_company: boolean;
  lease_tenure: number | null;
  nextduedate: string | null;
  updated_at: string;
}

export function useTenantProfile() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    const fetchTenantProfile = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('email', user.email)
          .single();

        if (error) throw error;
        setTenant(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setTenant(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTenantProfile();
  }, [user?.email]);

  return { tenant, loading, error };
}
