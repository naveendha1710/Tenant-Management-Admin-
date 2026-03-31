// PM Report Types
export type PMReportType = 'schedule' | 'task' | 'audit';

// Global Filters for PM Reports
export interface PMReportFilters {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  tenantId?: string;
  categoryId?: string;
  subCategoryId?: string;
  typeId?: string;
  assignedTo?: string;
  assetStatus?: string[];
  exceptionMode?: boolean;
}

// PM Schedule Report
export interface PMScheduleReportRow {
  asset_code: string;
  asset_name: string;
  category: string;
  sub_category: string;
  type: string;
  location: string;
  tenant: string;
  pm_start_date: string;
  pm_end_date: string | null;
  frequency_days: number;
  assigned_to: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  schedule_status: string;
  completion_rate: number;
  next_due_date: string | null;
}

export interface PMScheduleReportSummary {
  total_schedules: number;
  active_schedules: number;
  inactive_schedules: number;
  total_tasks_generated: number;
  overall_completion_rate: number;
  total_overdue: number;
}

// PM Task Report
export interface PMTaskReportRow {
  task_id: string;
  asset_code: string;
  asset_name: string;
  category: string;
  location: string;
  tenant: string;
  scheduled_date: string;
  assigned_to: string;
  status: string;
  completed_date: string | null;
  completed_by: string | null;
  days_overdue: number;
  delay_days: number | null;
  sla_status: 'On Time' | 'Delayed' | 'Missed' | 'Pending';
  audit_result: string | null;
  notes: string | null;
}

export interface PMTaskReportSummary {
  total_tasks: number;
  completed: number;
  pending: number;
  overdue: number;
  upcoming: number;
  completion_percentage: number;
  average_delay_days: number;
  on_time_count: number;
  delayed_count: number;
}

// PM Audit Report
export interface PMAuditReportRow {
  audit_id: string;
  audit_date: string;
  asset_code: string;
  asset_name: string;
  category: string;
  location: string;
  tenant: string;
  auditor_name: string;
  asset_found: boolean;
  location_match: boolean;
  tenant_match: boolean;
  serial_match: boolean;
  condition: string;
  audit_result: 'PASS' | 'FAIL';
  risk_level: 'High' | 'Medium' | 'Low';
  gps_location: string | null;
  remarks: string | null;
}

export interface PMAuditReportSummary {
  total_audits: number;
  passed: number;
  failed: number;
  pass_rate: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  assets_not_found: number;
  location_mismatches: number;
}

// Generic PM Report Response
export interface PMReportResponse<T, S> {
  data: T[];
  summary: S;
  filters: PMReportFilters;
  generated_at: string;
}
