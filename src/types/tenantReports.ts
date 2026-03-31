// Tenant 360° Report Type Definitions

export interface TenantReportFilters {
  tenantIds?: string[];
  companyGroups?: string[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  status?: ('Active' | 'Pending Move-In' | 'Vacated')[];
  buildingIds?: string[];
  isGstCompany?: boolean;
  isMainBranch?: boolean;
}

// Sheet 1: Tenant Summary
export interface TenantSummaryRow {
  tenant_name: string;
  company_group: string | null;
  branch_type: 'Main' | 'Branch';
  parent_company: string | null;
  branch_count: number;
  total_units_assigned: number;
  total_space: string | null;
  active_agreements: number;
  total_monthly_rent: number;
  total_deposit: number;
  next_due_date: string | null;
  status: 'Active' | 'Pending Move-In' | 'Vacated';
  gst_company: 'Yes' | 'No';
}

// Sheet 2: Agreement Details
export interface AgreementDetailsRow {
  tenant_name: string;
  agreement_id: string;
  agreement_name: string | null;
  status: string;
  rent_amount: number;
  security_deposit: number;
  payment_cycle: string | null;
  lease_start_date: string | null;
  rent_commencement_date: string | null;
  lease_end_date: string | null;
  lock_in_period: string | null;
  lease_tenure: string | null;
  next_due_date: string | null;
  days_to_expiry: number | null;
}

// Sheet 3: Space Allocation
export interface SpaceAllocationRow {
  tenant_name: string;
  agreement_id: string;
  building: string;
  floor: string;
  room_unit: string;
  space: string;
  occupancy_type: string;
}

// Sheet 4: Financial Breakdown
export interface FinancialBreakdownRow {
  tenant_name: string;
  agreement_id: string;
  rent: number;
  maintenance_charges: number;
  general_charges: number;
  service_charges: number;
  total_monthly_cost: number;
  escalation_percentage: number | null;
  next_escalation_date: string | null;
}

// Sheet 5: Compliance & Documents
export interface ComplianceRow {
  tenant_name: string;
  gst_enabled: 'Yes' | 'No';
  gst_number: string | null;
  pan_number: string | null;
  tan_number: string | null;
  cin_number: string | null;
  document_count: number;
  id_proof_available: 'Yes' | 'No';
}

// Summary Statistics
export interface TenantReportSummary {
  total_tenants: number;
  total_agreements: number;
  total_monthly_revenue: number;
  total_deposits: number;
  active_leases: number;
  expiring_soon: number;
  expired_leases: number;
  gst_companies: number;
  total_space_allocated: number;
}

// Complete Report Response
export interface TenantReportResponse {
  summary: TenantReportSummary;
  tenantSummary: TenantSummaryRow[];
  agreementDetails: AgreementDetailsRow[];
  spaceAllocation: SpaceAllocationRow[];
  financialBreakdown: FinancialBreakdownRow[];
  compliance: ComplianceRow[];
  filters: TenantReportFilters;
  generated_at: string;
}
