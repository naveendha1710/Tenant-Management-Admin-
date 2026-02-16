import { supabase } from '@/lib/supabaseClient';

export interface TenantAgreement {
  id: string;
  version: string;
  title: string;
  agreement_text: string;
  signed_date: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  is_current: boolean;
  file_url: string;
}

export interface TenantInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  description: string;
  created_at: string;
}

export interface RenewalRequest {
  id: string;
  tenant_id: string;
  agreement_id: string;
  status: string;
  requested_at: string;
  notes?: string;
}

import { supabase } from '@/lib/supabaseClient';

export interface TenantAgreement {
  id: string;
  version: string;
  title: string;
  agreement_text: string;
  signed_date: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  is_current: boolean;
  file_url: string;
}

export interface TenantInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  description: string;
  created_at: string;
}

export interface RenewalRequest {
  id: string;
  tenant_id: string;
  agreement_id: string;
  status: string;
  requested_at: string;
  notes?: string;
}

export class TenantPortalService {
  static async getTenantByEmail(email: string) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('email', email)
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  }

  static async getTenantAgreements(tenantId: string): Promise<TenantAgreement[]> {
    const { data, error } = await supabase
      .from('agreements')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getTenantInvoices(tenantId: string): Promise<TenantInvoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async createRenewalRequest(tenantId: string, agreementId: string, notes?: string): Promise<RenewalRequest> {
    const { data, error } = await supabase
      .from('renewal_requests')
      .insert({
        tenant_id: tenantId,
        agreement_id: agreementId,
        status: 'pending',
        notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async checkExistingRenewalRequest(tenantId: string, agreementId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('renewal_requests')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('agreement_id', agreementId)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }

  static isAgreementExpiringSoon(endDate: string, daysThreshold: number = 30): boolean {
    const today = new Date();
    const expiryDate = new Date(endDate);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= daysThreshold && diffDays > 0;
  }
}