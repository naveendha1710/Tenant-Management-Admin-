import { supabase } from '@/lib/supabaseClient';
import { TenantProfile, TenantProfileFormData } from '@/types/tenantProfile';

export const tenantProfileService = {
  async getProfile(tenantId: string): Promise<TenantProfile | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(tenantId: string, profileData: Partial<TenantProfileFormData>): Promise<void> {
    const { error } = await supabase
      .from('tenants')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) throw error;
  },

  async uploadFile(file: File, category: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/upload?category=${category}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    
    const result = await response.json();
    return result.file.url;
  },

  async changePassword(tenantId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Implement password change logic
    const { error } = await supabase
      .from('tenants')
      .update({ password: newPassword })
      .eq('id', tenantId)
      .eq('password', currentPassword);

    if (error) throw error;
  },
};
