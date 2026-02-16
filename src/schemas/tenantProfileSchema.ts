import { z } from 'zod';

export const tenantProfileSchema = z.object({
  // Basic Info
  company_name: z.string().min(2, 'Company name is required'),
  logo_url: z.string().optional(),
  industry: z.string().optional(),
  employee_count: z.number().min(0).optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().max(500, 'Description too long').optional(),
  
  // Contact
  contact_person: z.string().min(2, 'Contact person is required'),
  designation: z.string().optional(),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Valid phone required'),
  mobile: z.string().optional(),
  alternate_phone: z.string().optional(),
  accounts_email: z.string().email('Invalid email').optional().or(z.literal('')),
  support_email: z.string().email('Invalid email').optional().or(z.literal('')),
  secondary_contact_name: z.string().optional(),
  secondary_contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  secondary_contact_phone: z.string().optional(),
  
  // Address
  address: z.string().min(5, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode'),
  country: z.string().optional(),
  billing_same_as_registered: z.boolean(),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_pincode: z.string().optional(),
  
  // Legal
  gst_number: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST').optional().or(z.literal('')),
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN').optional().or(z.literal('')),
  cin: z.string().optional(),
  tan: z.string().optional(),
  sez_status: z.enum(['SEZ', 'DTA', 'Non-SEZ']).optional(),
  gst_certificate_url: z.string().optional(),
  incorporation_certificate_url: z.string().optional(),
  
  // Portal Settings
  invoice_email_enabled: z.boolean(),
  ticket_update_enabled: z.boolean(),
  lease_reminder_enabled: z.boolean(),
  default_communication_email: z.string().email('Invalid email').optional().or(z.literal('')),
  authorized_signatory: z.string().optional(),
  digital_signature_url: z.string().optional(),
});

export type TenantProfileFormData = z.infer<typeof tenantProfileSchema>;
