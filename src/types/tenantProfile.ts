export interface TenantProfile {
  id: string;
  tenant_id: string;
  company_name: string;
  logo_url?: string;
  industry?: string;
  employee_count?: number;
  website?: string;
  description?: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Suspended';
  
  // Contact
  contact_person: string;
  designation?: string;
  email: string;
  phone: string;
  mobile?: string;
  alternate_phone?: string;
  accounts_email?: string;
  support_email?: string;
  secondary_contact_name?: string;
  secondary_contact_email?: string;
  secondary_contact_phone?: string;
  
  // Address
  address: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  billing_same_as_registered: boolean;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  
  // Legal
  gst_number?: string;
  pan_number?: string;
  cin?: string;
  tan?: string;
  sez_status?: 'SEZ' | 'DTA' | 'Non-SEZ';
  gst_certificate_url?: string;
  incorporation_certificate_url?: string;
  
  // Portal Settings
  invoice_email_enabled: boolean;
  ticket_update_enabled: boolean;
  lease_reminder_enabled: boolean;
  default_communication_email?: string;
  authorized_signatory?: string;
  digital_signature_url?: string;
  
  // Security
  last_login?: string;
  created_at: string;
  updated_at?: string;
}

export interface TenantProfileFormData extends Omit<TenantProfile, 'id' | 'tenant_id' | 'status' | 'last_login' | 'created_at' | 'updated_at'> {}
