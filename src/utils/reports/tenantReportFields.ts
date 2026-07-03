import { supabase } from '@/lib/supabaseClient';
import { ReportFieldDefinition } from './reportFieldRegistry';

export type TenantDynamicChargeFormType = 'general_charges' | 'service_charges';

export type TenantDynamicChargeFieldDefinition = ReportFieldDefinition & {
  formType: TenantDynamicChargeFormType;
  chargeName: string;
  chargeKey: string;
  aliases: string[];
};

const TENANT_DYNAMIC_CHARGE_FORM_TYPES: TenantDynamicChargeFormType[] = [
  'general_charges',
  'service_charges',
];

const TENANT_DYNAMIC_CHARGE_PREFIXES: Record<TenantDynamicChargeFormType, string> = {
  general_charges: 'general_charge',
  service_charges: 'service_charge',
};

const TENANT_STATIC_REPORT_FIELDS: ReportFieldDefinition[] = [
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
  { key: 'annual_rent', label: 'Annual Rent', category: 'Financial', type: 'currency' },
  { key: 'rent_per_sqft', label: 'Rent Per Sq.Ft', category: 'Financial', type: 'currency' },
  { key: 'deposit_per_sqft', label: 'Deposit Per Sq.Ft', category: 'Financial', type: 'currency' },
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
  { key: 'assigned_sqft', label: 'Assigned Sq.Ft', category: 'Space', type: 'number' },
  { key: 'rate_per_sqft', label: 'Rate Per Sq.Ft', category: 'Space', type: 'currency' },
  { key: 'assignment_type', label: 'Assignment Type', category: 'Space', type: 'text' },
  { key: 'space_type', label: 'Space Type', category: 'Space', type: 'text' },

  { key: 'lease_remaining_days', label: 'Lease Remaining Days', category: 'Agreement', type: 'number' },
  { key: 'agreement_age', label: 'Agreement Age', category: 'Agreement', type: 'text' },
  { key: 'end_of_lock_in', label: 'End Of Lock In', category: 'Agreement', type: 'date' },
  { key: 'next_due_in', label: 'Next Due In', category: 'Agreement', type: 'number' },
  { key: 'next_escalation_date', label: 'Next Escalation Date', category: 'Agreement', type: 'date' },
  { key: 'next_escalation_percentage', label: 'Next Escalation %', category: 'Agreement', type: 'number' },
  { key: 'escalation_count', label: 'Escalation Count', category: 'Agreement', type: 'number' },
  { key: 'current_escalated_rent', label: 'Current Escalated Rent', category: 'Agreement', type: 'currency' },

  { key: 'gst_number', label: 'GST Number', category: 'Compliance', type: 'text' },
  { key: 'pan_number', label: 'PAN Number', category: 'Compliance', type: 'text' },
  { key: 'tan_number', label: 'TAN Number', category: 'Compliance', type: 'text' },
  { key: 'cin_number', label: 'CIN Number', category: 'Compliance', type: 'text' },
  { key: 'documents', label: 'Documents', category: 'Compliance', type: 'text' },
  { key: 'document_count', label: 'Document Count', category: 'Compliance', type: 'number' },
  { key: 'idproof', label: 'ID Proof', category: 'Compliance', type: 'text' },
  { key: 'idproof_available', label: 'ID Proof Available', category: 'Compliance', type: 'status' },
];

const TENANT_SORTABLE_FIELD_KEYS = new Set([
  'tenant_id',
  'name',
  'company',
  'email',
  'phone',
  'tenant_status',
  'companygroup',
  'branch_name',
  'branch_type',
  'parent_tenant',
  'is_main_branch',
  'is_gst_company',
  'nextduedate',
  'created_at',
  'updated_at',
  'agreement_name',
  'agreement_status',
  'payment_cycle',
  'lease_agreement_date',
  'operation_date',
  'rent_commencement_date',
  'lease_end_date',
  'rent_amount',
  'security_deposit',
  'annual_rent',
  'rent_per_sqft',
  'deposit_per_sqft',
  'maintenance_total',
  'general_total',
  'service_charge_amount',
  'total_monthly_cost',
  'assigned_sqft',
  'rate_per_sqft',
  'assignment_type',
  'space_type',
  'lease_remaining_days',
  'agreement_age',
  'end_of_lock_in',
  'next_due_in',
  'next_escalation_date',
  'next_escalation_percentage',
  'escalation_count',
  'current_escalated_rent',
  'agreement_created_at',
  'agreement_updated_at',
]);

const slugifyTenantFieldSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const humanizeTenantFieldKey = (value: string) =>
  value
    .replace(/__/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildTenantDynamicChargeFieldKey = (
  formType: TenantDynamicChargeFormType,
  chargeName: string
) => {
  const prefix = TENANT_DYNAMIC_CHARGE_PREFIXES[formType];
  return `${prefix}__${slugifyTenantFieldSegment(chargeName)}`;
};

const buildTenantCombinedFields = (dynamicFields: TenantDynamicChargeFieldDefinition[] = []) => {
  const sortedDynamicFields = [...dynamicFields].sort((left, right) =>
    left.label.localeCompare(right.label)
  );

  const generalChargeFields = sortedDynamicFields.filter((field) => field.formType === 'general_charges');
  const serviceChargeFields = sortedDynamicFields.filter((field) => field.formType === 'service_charges');

  const combined: ReportFieldDefinition[] = [];
  let insertedDynamicFields = false;

  TENANT_STATIC_REPORT_FIELDS.forEach((field) => {
    combined.push(field);

    if (!insertedDynamicFields && field.key === 'total_monthly_cost') {
      combined.push(...generalChargeFields, ...serviceChargeFields);
      insertedDynamicFields = true;
    }
  });

  if (!insertedDynamicFields) {
    combined.push(...generalChargeFields, ...serviceChargeFields);
  }

  return combined;
};

export const TENANT_REPORT_FIELDS = TENANT_STATIC_REPORT_FIELDS;

export const TENANT_FIELD_CATEGORIES = Array.from(
  new Set(TENANT_STATIC_REPORT_FIELDS.map((field) => field.category))
);

export const getTenantFieldsByCategory = (
  dynamicFields: TenantDynamicChargeFieldDefinition[] = []
) => {
  return buildTenantCombinedFields(dynamicFields).reduce<Record<string, ReportFieldDefinition[]>>(
    (acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    },
    {}
  );
};

export const getTenantSortableFields = (
  dynamicFields: TenantDynamicChargeFieldDefinition[] = []
) => {
  const dynamicKeys = new Set(dynamicFields.map((field) => field.key));
  return buildTenantCombinedFields(dynamicFields).filter((field) => {
    return TENANT_SORTABLE_FIELD_KEYS.has(field.key) || dynamicKeys.has(field.key);
  });
};

export const loadTenantDynamicChargeFields = async (): Promise<TenantDynamicChargeFieldDefinition[]> => {
  const { data, error } = await supabase
    .from('form_dropdowns')
    .select('id, name, form_type, short_code')
    .in('form_type', TENANT_DYNAMIC_CHARGE_FORM_TYPES)
    .order('name');

  if (error) throw error;

  const seenKeys = new Set<string>();

  return (data || [])
    .filter((row) => row?.name)
    .map((row) => {
      const formType = row.form_type as TenantDynamicChargeFormType;
      const chargeName = String(row.name).trim();
      const chargeKeyBase = buildTenantDynamicChargeFieldKey(formType, chargeName);
      let chargeKey = chargeKeyBase;
      let suffix = 2;

      while (seenKeys.has(chargeKey)) {
        chargeKey = `${chargeKeyBase}__${suffix}`;
        suffix += 1;
      }

      seenKeys.add(chargeKey);

      return {
        key: chargeKey,
        label: chargeName,
        category: 'Financial',
        type: 'currency' as const,
        formType,
        chargeName,
        chargeKey,
        aliases: [
          chargeName,
          slugifyTenantFieldSegment(chargeName),
          row.short_code ? String(row.short_code).trim() : '',
          row.short_code ? slugifyTenantFieldSegment(String(row.short_code)) : '',
        ].filter(Boolean),
      };
    });
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
    rentAmount: 'rent_amount',
    securityDeposit: 'security_deposit',
    paymentCycle: 'payment_cycle',
    leaseAgreementDate: 'lease_agreement_date',
    operationDate: 'operation_date',
    rentCommencementDate: 'rent_commencement_date',
    leaseEndDate: 'lease_end_date',
    agreementCreatedAt: 'agreement_created_at',
    agreementUpdatedAt: 'agreement_updated_at',
    documentCount: 'document_count',
    idProofAvailable: 'idproof_available',
    totalMonthlyCost: 'total_monthly_cost',
    annualRent: 'annual_rent',
    rentPerSqFt: 'rent_per_sqft',
    depositPerSqFt: 'deposit_per_sqft',
    maintenanceTotal: 'maintenance_total',
    generalTotal: 'general_total',
    serviceChargeAmount: 'service_charge_amount',
    assignedSqFt: 'assigned_sqft',
    ratePerSqFt: 'rate_per_sqft',
    assignmentType: 'assignment_type',
    spaceType: 'space_type',
    leaseRemainingDays: 'lease_remaining_days',
    agreementAge: 'agreement_age',
    endOfLockIn: 'end_of_lock_in',
    nextDueIn: 'next_due_in',
    nextEscalationDate: 'next_escalation_date',
    nextEscalationPercentage: 'next_escalation_percentage',
    escalationCount: 'escalation_count',
    currentEscalatedRent: 'current_escalated_rent',
    spaceSummary: 'space_summary',
    spaceCount: 'space_count',
    maintenanceCharges: 'maintenance_charges',
    generalCharges: 'general_charges',
    serviceCharge: 'service_charge',
    spaceAssignments: 'space_assignments',
  };

  return aliases[key] || key;
};

export const getTenantFieldLabel = (
  key: string,
  dynamicFields: TenantDynamicChargeFieldDefinition[] = []
) => {
  const normalizedKey = normalizeTenantFieldKey(key);
  const field = buildTenantCombinedFields(dynamicFields).find((item) => item.key === normalizedKey);
  return field?.label || humanizeTenantFieldKey(normalizedKey);
};
