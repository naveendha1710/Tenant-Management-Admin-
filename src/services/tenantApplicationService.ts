import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { createNotification } from './notificationService';
import { sendTenantApprovalEmail, sendTenantRejectionEmail } from './emailService';

export interface TenantApplication {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  agreement_details?: string;
  space_type?: string;
  space_requirement?: string;
  monthly_rent: number;
  security_deposit: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_date?: string;
  approved_by?: string;
  notes?: string;
}

// Get pending applications (status = 'pending')
export const getPendingApplications = async (): Promise<TenantApplication[]> => {
  const { data, error } = await supabase
    .from('tenant_applications')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};



// Approve tenant application with auth user creation
export const approveApplication = async (applicationId: string, password: string) => {
  try {
    const { data: application, error: fetchError } = await supabase
      .from('tenant_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) throw fetchError;
    if (!application) throw new Error('Application not found');

    // Create admin client with service role
    const adminClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: application.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'tenant',
        company_name: application.company_name,
        contact_person: application.contact_person
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }
    if (!authUser.user) throw new Error('Failed to create auth user');

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        tenant_id: `TEN-${Date.now()}`,
        company_name: application.company_name,
        'Contact Person Name': application.contact_person,
        'Contact Email (for login)': application.email,
        'Contact Phone Number': application.phone?.replace(/[^0-9]/g, '') || null,
        monthly_rent: application.monthly_rent,
        security_deposit: application.security_deposit,
        status: 'active',
        lease_start_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (tenantError) throw tenantError;

    const { error: updateError } = await supabase
      .from('tenant_applications')
      .update({
        status: 'approved',
        approved_date: new Date().toISOString(),
        approved_by: (await supabase.auth.getUser()).data.user?.email || 'admin'
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // Skip notifications for now
    console.log('Would send notifications and email for:', application.company_name);

    return { tenant, application, authUser };
  } catch (error) {
    console.error('Error approving application:', error);
    throw error;
  }
};

// Reject tenant application
export const rejectApplication = async (applicationId: string, notes?: string) => {
  try {
    const { data: application, error: fetchError } = await supabase
      .from('tenant_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) throw fetchError;
    if (!application) throw new Error('Application not found');

    const { error: updateError } = await supabase
      .from('tenant_applications')
      .update({
        status: 'rejected',
        approved_date: new Date().toISOString(),
        approved_by: (await supabase.auth.getUser()).data.user?.email || 'admin',
        notes
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    // Skip notifications for now
    console.log('Would send rejection notifications for:', application.company_name);

    return { application };
  } catch (error) {
    console.error('Error rejecting application:', error);
    throw error;
  }
};

export const createTenantApplication = async (leadData: any) => {
  const { data, error } = await supabase
    .from('tenant_applications')
    .insert({
      company_name: leadData.company_name,
      contact_person: leadData.contact_person,
      email: leadData.email,
      phone: leadData.phone,
      space_type: leadData.space_type,
      space_requirement: leadData.space_requirement,
      monthly_rent: leadData.monthly_rent || 0,
      security_deposit: leadData.security_deposit || 0,
      agreement_details: leadData.agreement_details,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const fetchTenantApplications = async (): Promise<TenantApplication[]> => {
  const { data, error } = await supabase
    .from('tenant_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// Legacy functions for backward compatibility
export const approveTenantApplication = async (applicationId: string, adminId: string) => {
  return approveApplication(applicationId, 'defaultPassword123');
};

export const rejectTenantApplication = async (applicationId: string, adminId: string, notes?: string) => {
  return rejectApplication(applicationId, notes);
};