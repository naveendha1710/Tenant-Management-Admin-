import { ReportFieldDefinition } from './reportFieldRegistry';

export const TENANT_REPORT_FIELDS: ReportFieldDefinition[] = [
  { key: 'tenant_id', label: 'Tenant ID', category: 'General', type: 'text' },
  { key: 'name', label: 'Contact Name', category: 'General', type: 'text' },
  { key: 'company', label: 'Company Name', category: 'General', type: 'text' },
  { key: 'email', label: 'Email', category: 'General', type: 'text' },
  { key: 'phone', label: 'Phone', category: 'General', type: 'text' },
  { key: 'tenant_status', label: 'Tenant Status', category: 'General', type: 'status' },
  { key: 'companygroup', label: 'Company Group', category: 'General', type: 'text' },
  { key: 'branch_name', label: 'Branch Name', category: 'General', type: 'text' },
  { key: 'branch_type', label: 'Branch Type', category: 'General', type: 'status' },
  { key: 'parent_tenant', label: 'Parent Company', category: 'General', type: 'text' },
  { key: 'is_main_branch', label: 'Main Branch', category: 'General', type: 'status' },
  { key: 'is_gst_company', label: 'GST Company', category: 'General', type: 'status' },
  { key: 'address', label: 'Address', category: 'General', type: 'text' },
  { key: 'space', label: 'Space', category: 'General', type: 'text' },
  { key: 'nextduedate', label: 'Next Due Date', category: 'Dates', type: 'date' },
  { key: 'created_at', label: 'Tenant Created At', category: 'Dates', type: 'date' },
  { key: 'updated_at', label: 'Tenant Updated At', category: 'Dates', type: 'date' },

  { key: 'agreement_row_id', label: 'Agreement Row ID', category: 'Agreement', type: 'text' },
  { key: 'agreement_id', label: 'Agreement ID', category: 'Agreement', type: 'text' },
  { key: 'agreement_name', label: 'Agreement Name', category: 'Agreement', type: 'text' },
  { key: 'agreement_status', label: 'Agreement Status', category: 'Agreement', type: 'status' },
  { key: 'payment_cycle', label: 'Payment Cycle', category: 'Agreement', type: 'text' },
  { key: 'lease_agreement_date', label: 'Lease Agreement Date', category: 'Agreement', type: 'date' },
  { key: 'operation_date', label: 'Operation Date', category: 'Agreement', type: 'date' },
  { key: 'rent_commencement_date', label: 'Rent Commencement Date', category: 'Agreement', type: 'date' },
  { key: 'lease_end_date', label: 'Lease End Date', category: 'Agreement', type: 'date' },
  { key: 'lock_in_period', label: 'Lock In Period', category: 'Agreement', type: 'text' },
  { key: 'lease_tenure', label: 'Lease Tenure', category: 'Agreement', type: 'text' },
  { key: 'agreement_created_at', label: 'Agreement Created At', category: 'Agreement', type: 'date' },
  { key: 'agreement_updated_at', label: 'Agreement Updated At', category: 'Agreement', type: 'date' },

  { key: 'rent_amount', label: 'Rent Amount', category: 'Financial', type: 'currency' },
  { key: 'security_deposit', label: 'Security Deposit', category: 'Financial', type: 'currency' },
  { key: 'maintenance_total', label: 'Maintenance Total', category: 'Financial', type: 'currency' },
  { key: 'general_total', label: 'General Total', category: 'Financial', type: 'currency' },
  { key: 'service_charge_amount', label: 'Service Charge Amount', category: 'Financial', type: 'currency' },
  { key: 'total_monthly_cost', label: 'Total Monthly Cost', category: 'Financial', type: 'currency' },
  { key: 'maintenance_charges', label: 'Maintenance Charges', category: 'Financial', type: 'text' },
  { key: 'general_charges', label: 'General Charges', category: 'Financial', type: 'text' },
  { key: 'service_charge', label: 'Service Charge', category: 'Financial', type: 'text' },
  { key: 'escalations', label: 'Escalations', category: 'Financial', type: 'text' },

  { key: 'building', label: 'Building', category: 'Space', type: 'text' },
  { key: 'floor', label: 'Floor', category: 'Space', type: 'text' },
  { key: 'room', label: 'Room', category: 'Space', type: 'text' },
  { key: 'space_summary', label: 'Space Summary', category: 'Space', type: 'text' },
  { key: 'space_count', label: 'Space Count', category: 'Space', type: 'number' },
  { key: 'assignedunits', label: 'Assigned Units', category: 'Space', type: 'text' },
  { key: 'space_assignments', label: 'Space Assignments', category: 'Space', type: 'text' },

  { key: 'gst_number', label: 'GST Number', category: 'Compliance', type: 'text' },
  { key: 'pan_number', label: 'PAN Number', category: 'Compliance', type: 'text' },
  { key: 'tan_number', label: 'TAN Number', category: 'Compliance', type: 'text' },
  { key: 'cin_number', label: 'CIN Number', category: 'Compliance', type: 'text' },
  { key: 'documents', label: 'Documents', category: 'Compliance', type: 'text' },
  { key: 'document_count', label: 'Document Count', category: 'Compliance', type: 'number' },
  { key: 'idproof', label: 'ID Proof', category: 'Compliance', type: 'text' },
  { key: 'idproof_available', label: 'ID Proof Available', category: 'Compliance', type: 'status' },
];

export const TENANT_FIELD_CATEGORIES = Array.from(
  new Set(TENANT_REPORT_FIELDS.map((field) => field.category))
);

export const getTenantFieldsByCategory = () => {
  return TENANT_REPORT_FIELDS.reduce<Record<string, ReportFieldDefinition[]>>(
    (acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    },
    {}
  );
};

export const normalizeTenantFieldKey = (key: string) => {
  const aliases: Record<string, string> = {
    tenantName: 'company',
    companyGroup: 'companygroup',
    tenantStatus: 'tenant_status',
    agreementStatus: 'agreement_status',
    agreementRowId: 'agreement_row_id',
    branchType: 'branch_type',
    parentTenantName: 'parent_tenant',
    documentCount: 'document_count',
    idProofAvailable: 'idproof_available',
    totalMonthlyCost: 'total_monthly_cost',
    maintenanceTotal: 'maintenance_total',
    generalTotal: 'general_total',
    serviceChargeAmount: 'service_charge_amount',
    spaceSummary: 'space_summary',
    spaceCount: 'space_count',
  };

  return aliases[key] || key;
};

export const getTenantFieldLabel = (key: string) => {
  const normalizedKey = normalizeTenantFieldKey(key);
  return TENANT_REPORT_FIELDS.find((field) => field.key === normalizedKey)?.label || normalizedKey;
};
