import * as XLSX from 'xlsx';
import type {
  PMReportType,
  PMScheduleReportRow,
  PMScheduleReportSummary,
  PMTaskReportRow,
  PMTaskReportSummary,
  PMAuditReportRow,
  PMAuditReportSummary,
  PMReportResponse,
} from '@/types/pmReports';

// Export PM Schedule Report
export function exportPMScheduleReport(
  report: PMReportResponse<PMScheduleReportRow, PMScheduleReportSummary>
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['PM Schedule Report - Summary'],
    ['Generated At', new Date(report.generated_at).toLocaleString()],
    ['Date Range', `${report.filters.dateRange.startDate} to ${report.filters.dateRange.endDate}`],
    [],
    ['Metric', 'Value'],
    ['Total Schedules', report.summary.total_schedules],
    ['Active Schedules', report.summary.active_schedules],
    ['Inactive Schedules', report.summary.inactive_schedules],
    ['Total Tasks Generated', report.summary.total_tasks_generated],
    ['Overall Completion Rate', `${report.summary.overall_completion_rate}%`],
    ['Total Overdue Tasks', report.summary.total_overdue],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Data Sheet
  const dataRows = report.data.map(row => ({
    'Asset Code': row.asset_code,
    'Asset Name': row.asset_name,
    'Category': row.category,
    'Sub-Category': row.sub_category,
    'Type': row.type,
    'Location': row.location,
    'Tenant': row.tenant,
    'Start Date': row.pm_start_date,
    'End Date': row.pm_end_date || 'N/A',
    'Frequency (Days)': row.frequency_days,
    'Assigned To': row.assigned_to,
    'Total Tasks': row.total_tasks,
    'Completed': row.completed_tasks,
    'Pending': row.pending_tasks,
    'Overdue': row.overdue_tasks,
    'Status': row.schedule_status,
    'Completion %': `${row.completion_rate}%`,
    'Next Due': row.next_due_date || 'N/A',
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataRows);
  dataSheet['!cols'] = Array(18).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Schedule Data');

  XLSX.writeFile(wb, `PM_Schedule_Report_${Date.now()}.xlsx`);
}

// Export PM Task Report
export function exportPMTaskReport(
  report: PMReportResponse<PMTaskReportRow, PMTaskReportSummary>
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['PM Task Report - Summary'],
    ['Generated At', new Date(report.generated_at).toLocaleString()],
    ['Date Range', `${report.filters.dateRange.startDate} to ${report.filters.dateRange.endDate}`],
    [],
    ['Metric', 'Value'],
    ['Total Tasks', report.summary.total_tasks],
    ['Completed', report.summary.completed],
    ['Pending', report.summary.pending],
    ['Overdue', report.summary.overdue],
    ['Upcoming', report.summary.upcoming],
    ['Completion %', `${report.summary.completion_percentage}%`],
    ['Average Delay (Days)', report.summary.average_delay_days],
    ['On Time Tasks', report.summary.on_time_count],
    ['Delayed Tasks', report.summary.delayed_count],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Data Sheet
  const dataRows = report.data.map(row => ({
    'Task ID': row.task_id,
    'Asset Code': row.asset_code,
    'Asset Name': row.asset_name,
    'Category': row.category,
    'Location': row.location,
    'Tenant': row.tenant,
    'Scheduled Date': row.scheduled_date,
    'Assigned To': row.assigned_to,
    'Status': row.status,
    'Completed Date': row.completed_date || 'N/A',
    'Completed By': row.completed_by || 'N/A',
    'Days Overdue': row.days_overdue,
    'Delay (Days)': row.delay_days !== null ? row.delay_days : 'N/A',
    'SLA Status': row.sla_status,
    'Audit Result': row.audit_result || 'N/A',
    'Notes': row.notes || '',
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataRows);
  dataSheet['!cols'] = Array(16).fill({ wch: 15 });

  // Apply conditional formatting via cell styles
  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const statusCell = dataSheet[XLSX.utils.encode_cell({ r: R, c: 8 })]; // Status column
    if (statusCell) {
      if (statusCell.v === 'OVERDUE') {
        statusCell.s = { fill: { fgColor: { rgb: 'FFCCCC' } } };
      } else if (statusCell.v === 'COMPLETED') {
        statusCell.s = { fill: { fgColor: { rgb: 'CCFFCC' } } };
      } else if (statusCell.v === 'PENDING') {
        statusCell.s = { fill: { fgColor: { rgb: 'FFFFCC' } } };
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, dataSheet, 'Task Data');

  XLSX.writeFile(wb, `PM_Task_Report_${Date.now()}.xlsx`);
}

// Export PM Audit Report
export function exportPMAuditReport(
  report: PMReportResponse<PMAuditReportRow, PMAuditReportSummary>
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Physical Audit Report - Summary'],
    ['Generated At', new Date(report.generated_at).toLocaleString()],
    ['Date Range', `${report.filters.dateRange.startDate} to ${report.filters.dateRange.endDate}`],
    [],
    ['Metric', 'Value'],
    ['Total Audits', report.summary.total_audits],
    ['Passed', report.summary.passed],
    ['Failed', report.summary.failed],
    ['Pass Rate', `${report.summary.pass_rate}%`],
    ['High Risk', report.summary.high_risk_count],
    ['Medium Risk', report.summary.medium_risk_count],
    ['Low Risk', report.summary.low_risk_count],
    ['Assets Not Found', report.summary.assets_not_found],
    ['Location Mismatches', report.summary.location_mismatches],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  // Data Sheet
  const dataRows = report.data.map(row => ({
    'Audit ID': row.audit_id,
    'Audit Date': new Date(row.audit_date).toLocaleDateString(),
    'Asset Code': row.asset_code,
    'Asset Name': row.asset_name,
    'Category': row.category,
    'Location': row.location,
    'Tenant': row.tenant,
    'Auditor': row.auditor_name,
    'Asset Found': row.asset_found ? 'Yes' : 'No',
    'Location Match': row.location_match ? 'Yes' : 'No',
    'Tenant Match': row.tenant_match ? 'Yes' : 'No',
    'Serial Match': row.serial_match ? 'Yes' : 'No',
    'Condition': row.condition,
    'Result': row.audit_result,
    'Risk Level': row.risk_level,
    'GPS': row.gps_location || 'N/A',
    'Remarks': row.remarks || '',
  }));

  const dataSheet = XLSX.utils.json_to_sheet(dataRows);
  dataSheet['!cols'] = Array(17).fill({ wch: 15 });

  // Apply conditional formatting
  const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const resultCell = dataSheet[XLSX.utils.encode_cell({ r: R, c: 13 })]; // Result column
    if (resultCell) {
      if (resultCell.v === 'FAIL') {
        resultCell.s = { fill: { fgColor: { rgb: 'FFCCCC' } } };
      } else if (resultCell.v === 'PASS') {
        resultCell.s = { fill: { fgColor: { rgb: 'CCFFCC' } } };
      }
    }

    const riskCell = dataSheet[XLSX.utils.encode_cell({ r: R, c: 14 })]; // Risk column
    if (riskCell) {
      if (riskCell.v === 'High') {
        riskCell.s = { fill: { fgColor: { rgb: 'FF6666' } } };
      } else if (riskCell.v === 'Medium') {
        riskCell.s = { fill: { fgColor: { rgb: 'FFCC66' } } };
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, dataSheet, 'Audit Data');

  XLSX.writeFile(wb, `Physical_Audit_Report_${Date.now()}.xlsx`);
}

// Main PM Report export function
export function exportPMReport(reportType: PMReportType, report: any) {
  switch (reportType) {
    case 'schedule':
      exportPMScheduleReport(report);
      break;
    case 'task':
      exportPMTaskReport(report);
      break;
    case 'audit':
      exportPMAuditReport(report);
      break;
  }
}
