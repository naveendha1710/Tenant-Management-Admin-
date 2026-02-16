import { supabase } from '@/lib/supabaseClient';

export interface TenantBilling {
  id: string;
  company_name: string;
  email: string;
  status: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  status: string;
  created_at: string;
  tenant_id?: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
}

export interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string;
  status: string;
}

export const fetchAllTenants = async (): Promise<TenantBilling[]> => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_name, email, status')
    .order('company_name');

  if (error) throw error;
  return data || [];
};

export const fetchTenantById = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, company_name, email, status')
    .eq('id', tenantId)
    .single();

  if (error) throw error;
  return data;
};

export const fetchTenantInvoices = async (tenantId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoice_overview')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchAllInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoice_overview')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchTenantPayments = async (tenantId: string): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('payment_date', { ascending: false });

  if (error) throw error;
  return data || [];
};