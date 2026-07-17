export type ReportType = 'asset' | 'helpdesk' | 'tenant' | 'movement';

export interface GlobalReportFilters {
  // Asset fields (keep for backward compatibility)
  category?: string;
  subCategory?: string;
  assetType?: string;

  // Helpdesk specific – all optional, same shape as asset filters but with different names
  ticketCategory?: string;
  ticketSubCategory?: string;
  priority?: string;
  status?: string;
  building?: string;
  floor?: string;
  room?: string;
  assignedTo?: string;
  tenant?: string;
  safetyRisk?: string;
  previousOccurrence?: boolean;
  companyGroup?: string;
  tenantStatus?: string;
  agreementStatus?: string;
  isGstCompany?: string;
  isMainBranch?: string;
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  createdDateRange?: [string, string]; // ISO strings
  targetDateRange?:   [string, string];
  resolvedDateRange?: [string, string];
  sortOrder?: 'asc' | 'desc';
  // Movement specific filters
  movementType?: string;
  movementStatus?: string;
  approvalStatus?: string;
  vendor?: string;
  handoverTo?: string;
  fromTenant?: string;
  toTenant?: string;
}

/** Payload sent to generateFlexibleReport */
export interface GenerateFlexibleReportInput {
  globalFilters: GlobalReportFilters;
  sheets: SheetConfig[];
  reportName?: string;
  templateId?: string;
  generatedBy?: string;
  reportType?: ReportType; // NEW – tells RPC which column mapping to use
}

/** One sheet definition */
export interface SheetConfig {
  id: string;
  name: string;
  fields: string[];   // UI column keys (e.g., 'ticket_no')
  filters?: any;
  sort?: any;
}
