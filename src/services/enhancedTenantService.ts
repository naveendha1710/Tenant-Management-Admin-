import { supabase } from "@/lib/supabaseClient";

export interface EnhancedTenantData {
  id?: string;
  tenant_id?: string;
  company_name: string;
  contact_person_name?: string;
  contact_person?: string; // Legacy field
  email?: string;
  contact_phone?: string;
  phone?: string; // Legacy field
  company_address?: string;
  business_type?: string;
  monthly_rent: number;
  security_deposit?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  status: 'active' | 'pending' | 'expired' | 'inactive';
  lease_document_url?: string;
  gst_certificate_url?: string;
  pan_card_url?: string;
  space_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TenantDocument {
  file: File;
  type: 'lease_document' | 'gst_certificate' | 'pan_card';
}

/**
 * Upload document to Supabase Storage
 */
export const uploadTenantDocument = async (
  tenantEmail: string,
  file: File,
  documentType: string
): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${tenantEmail}/${documentType}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('tenant-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('tenant-documents')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Create new tenant with documents
 */
export const createTenant = async (
  tenantData: EnhancedTenantData,
  documents?: TenantDocument[]
): Promise<EnhancedTenantData> => {
  try {
    // Upload documents first if provided
    const documentUrls: Record<string, string> = {};
    
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const url = await uploadTenantDocument(
          tenantData.email,
          doc.file,
          doc.type
        );
        documentUrls[`${doc.type}_url`] = url;
      }
    }

    // Generate tenant ID if not provided
    const tenantId = tenantData.tenant_id || `TEN${Date.now().toString().slice(-6)}`;

    const finalTenantData = {
      ...tenantData,
      tenant_id: tenantId,
      // Map new fields to legacy fields for compatibility
      contact_person: tenantData.contact_person_name,
      phone: tenantData.contact_phone,
      ...documentUrls
    };

    const { data, error } = await supabase
      .from('tenants')
      .insert([finalTenantData])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
};

/**
 * Fetch all tenants
 */
export const fetchAllTenants = async (): Promise<EnhancedTenantData[]> => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw error;
  }
};

/**
 * Fetch tenant by ID
 */
export const fetchTenantById = async (tenantId: string): Promise<EnhancedTenantData | null> => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    throw error;
  }
};

/**
 * Update tenant
 */
export const updateTenant = async (
  tenantId: string,
  updates: Partial<EnhancedTenantData>,
  documents?: TenantDocument[]
): Promise<EnhancedTenantData> => {
  try {
    // Upload new documents if provided
    const documentUrls: Record<string, string> = {};
    
    if (documents && documents.length > 0) {
      const tenant = await fetchTenantById(tenantId);
      if (!tenant) throw new Error('Tenant not found');

      for (const doc of documents) {
        const url = await uploadTenantDocument(
          tenant.email,
          doc.file,
          doc.type
        );
        documentUrls[`${doc.type}_url`] = url;
      }
    }

    const finalUpdates = {
      ...updates,
      ...documentUrls,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tenants')
      .update(finalUpdates)
      .eq('id', tenantId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
};

/**
 * Delete tenant
 */
export const deleteTenant = async (tenantId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw error;
  }
};

/**
 * Download document
 */
export const downloadDocument = async (documentUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = documentUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    const filePath = urlParts.slice(-2).join('/'); // tenant-email/filename

    const { data, error } = await supabase.storage
      .from('tenant-documents')
      .download(filePath);

    if (error) throw error;

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};