import * as XLSX from 'xlsx';
import type { TenantReportResponse } from '@/types/tenantReports';

export function exportTenantReport(reportData: TenantReportResponse): void {
  const workbook = XLSX.utils.book_new();

  // Sheet 0: Summary Statistics with Enhanced Formatting
  const summarySheet = XLSX.utils.aoa_to_sheet([]);
  
  // Title Row
  XLSX.utils.sheet_add_aoa(summarySheet, [['TENANT REPORT - EXECUTIVE SUMMARY']], { origin: 'A1' });
  XLSX.utils.sheet_add_aoa(summarySheet, [[`Generated: ${new Date(reportData.generated_at).toLocaleString()}`]], { origin: 'A2' });
  
  // Empty row for spacing
  XLSX.utils.sheet_add_aoa(summarySheet, [['']], { origin: 'A3' });
  
  // Key Metrics Section
  XLSX.utils.sheet_add_aoa(summarySheet, [['KEY METRICS', '', '']], { origin: 'A4' });
  
  // Financial Highlights (Large Cards)
  XLSX.utils.sheet_add_aoa(summarySheet, [
    ['Total Monthly Revenue', '', `₹${(reportData.summary.total_monthly_revenue / 100000).toFixed(2)}L`],
    ['Total Deposits', '', `₹${(reportData.summary.total_deposits / 100000).toFixed(2)}L`],
  ], { origin: 'A5' });
  
  // Empty row
  XLSX.utils.sheet_add_aoa(summarySheet, [['']], { origin: 'A7' });
  
  // Tenant & Agreement Metrics
  XLSX.utils.sheet_add_aoa(summarySheet, [['TENANT & AGREEMENT OVERVIEW', '', '']], { origin: 'A8' });
  XLSX.utils.sheet_add_aoa(summarySheet, [
    ['Total Tenants', '', reportData.summary.total_tenants],
    ['Total Agreements', '', reportData.summary.total_agreements],
    ['GST Companies', '', reportData.summary.gst_companies],
    ['Total Space Allocations', '', reportData.summary.total_space_allocated],
  ], { origin: 'A9' });
  
  // Empty row
  XLSX.utils.sheet_add_aoa(summarySheet, [['']], { origin: 'A13' });
  
  // Lease Status Breakdown
  XLSX.utils.sheet_add_aoa(summarySheet, [['LEASE STATUS BREAKDOWN', '', '']], { origin: 'A14' });
  XLSX.utils.sheet_add_aoa(summarySheet, [
    ['Active Leases', '', reportData.summary.active_leases],
    ['Pending Move-In', '', reportData.summary.expiring_soon],
    ['Vacated', '', reportData.summary.expired_leases],
  ], { origin: 'A15' });
  
  // Column widths
  summarySheet['!cols'] = [
    { wch: 30 },  // Column A - Labels
    { wch: 5 },   // Column B - Spacer
    { wch: 25 },  // Column C - Values
  ];
  
  // Row heights for better spacing
  summarySheet['!rows'] = [
    { hpt: 24 },  // Row 1 - Title (larger)
    { hpt: 16 },  // Row 2 - Generated date
    { hpt: 10 },  // Row 3 - Spacer
    { hpt: 20 },  // Row 4 - Section header
    { hpt: 22 },  // Row 5 - Revenue (larger)
    { hpt: 22 },  // Row 6 - Deposits (larger)
    { hpt: 10 },  // Row 7 - Spacer
    { hpt: 20 },  // Row 8 - Section header
    { hpt: 18 },  // Rows 9-12
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 18 },
    { hpt: 10 },  // Row 13 - Spacer
    { hpt: 20 },  // Row 14 - Section header
    { hpt: 18 },  // Rows 15-17
    { hpt: 18 },
    { hpt: 18 },
  ];
  
  // Apply styles
  const range = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!summarySheet[cellAddress]) continue;
      
      // Initialize cell style
      if (!summarySheet[cellAddress].s) summarySheet[cellAddress].s = {};
      
      // Title row (Row 1)
      if (R === 0) {
        summarySheet[cellAddress].s = {
          font: { bold: true, sz: 16, color: { rgb: '1F4E78' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: 'E7F3FF' } },
        };
      }
      
      // Generated date (Row 2)
      if (R === 1) {
        summarySheet[cellAddress].s = {
          font: { sz: 10, italic: true, color: { rgb: '666666' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      }
      
      // Section headers (Rows 4, 8, 14)
      if (R === 3 || R === 7 || R === 13) {
        summarySheet[cellAddress].s = {
          font: { bold: true, sz: 12, color: { rgb: '1F4E78' } },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: 'F0F0F0' } },
          border: {
            bottom: { style: 'medium', color: { rgb: '1F4E78' } },
          },
        };
      }
      
      // Financial values (Rows 5-6, Column C)
      if ((R === 4 || R === 5) && C === 2) {
        summarySheet[cellAddress].s = {
          font: { bold: true, sz: 18, color: { rgb: '0B5394' } },
          alignment: { horizontal: 'right', vertical: 'center' },
          fill: { fgColor: { rgb: 'E7F3FF' } },
        };
      }
      
      // Financial labels (Rows 5-6, Column A)
      if ((R === 4 || R === 5) && C === 0) {
        summarySheet[cellAddress].s = {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: 'left', vertical: 'center' },
          fill: { fgColor: { rgb: 'E7F3FF' } },
        };
      }
      
      // Regular metric labels (Column A)
      if (C === 0 && R > 7 && R !== 12 && R !== 13) {
        summarySheet[cellAddress].s = {
          font: { sz: 11 },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      }
      
      // Regular metric values (Column C)
      if (C === 2 && R > 7 && R !== 12 && R !== 13) {
        summarySheet[cellAddress].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'right', vertical: 'center' },
          fill: { fgColor: { rgb: 'F9F9F9' } },
        };
      }
    }
  }
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Sheet 1: Tenant Summary
  if (reportData.tenantSummary.length > 0) {
    const tenantSummaryData = [
      [
        'Company Name',
        'Company Group',
        'Main / Branch',
        'Parent Company',
        'Branch Count',
        'Total Units Assigned',
        'Total Space',
        'Active Agreements',
        'Total Monthly Rent',
        'Total Deposit',
        'Next Due Date',
        'Status',
        'GST Company',
      ],
      ...reportData.tenantSummary.map(row => [
        row.tenant_name,
        row.company_group || '',
        row.branch_type,
        row.parent_company || '',
        row.branch_count,
        row.total_units_assigned,
        row.total_space || '',
        row.active_agreements,
        row.total_monthly_rent,
        row.total_deposit,
        row.next_due_date || '',
        row.status,
        row.gst_company,
      ]),
    ];

    const tenantSheet = XLSX.utils.aoa_to_sheet(tenantSummaryData);
    tenantSheet['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 25 }, { wch: 12 },
      { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(workbook, tenantSheet, 'Tenant Summary');
  }

  // Sheet 2: Agreement Details
  if (reportData.agreementDetails.length > 0) {
    const agreementData = [
      [
        'Company Name',
        'Agreement ID',
        'Agreement Name',
        'Status',
        'Rent Amount',
        'Security Deposit',
        'Payment Cycle',
        'Lease Start Date',
        'Rent Commencement Date',
        'Lease End Date',
        'Lock-in Period',
        'Lease Tenure',
        'Next Due Date',
        'Days to Expiry',
      ],
      ...reportData.agreementDetails.map(row => [
        row.tenant_name,
        row.agreement_id,
        row.agreement_name || '',
        row.status,
        row.rent_amount,
        row.security_deposit,
        row.payment_cycle || '',
        row.lease_start_date || '',
        row.rent_commencement_date || '',
        row.lease_end_date || '',
        row.lock_in_period || '',
        row.lease_tenure || '',
        row.next_due_date || '',
        row.days_to_expiry !== null ? row.days_to_expiry : '',
      ]),
    ];

    const agreementSheet = XLSX.utils.aoa_to_sheet(agreementData);
    agreementSheet['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
      { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 18 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, agreementSheet, 'Agreement Details');
  }

  // Sheet 3: Space Allocation
  if (reportData.spaceAllocation.length > 0) {
    const spaceData = [
      [
        'Company Name',
        'Agreement ID',
        'Building',
        'Floor',
        'Room / Unit',
        'Space',
        'Occupancy Type',
      ],
      ...reportData.spaceAllocation.map(row => [
        row.tenant_name,
        row.agreement_id,
        row.building,
        row.floor,
        row.room_unit,
        row.space,
        row.occupancy_type,
      ]),
    ];

    const spaceSheet = XLSX.utils.aoa_to_sheet(spaceData);
    spaceSheet['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 20 }, { wch: 15 }, { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, spaceSheet, 'Space Allocation');
  }

  // Sheet 4: Financial Breakdown
  if (reportData.financialBreakdown.length > 0) {
    const financialData = [
      [
        'Company Name',
        'Agreement ID',
        'Rent',
        'Maintenance Charges',
        'General Charges',
        'Service Charges',
        'Total Monthly Cost',
        'Escalation %',
        'Next Escalation Date',
      ],
      ...reportData.financialBreakdown.map(row => [
        row.tenant_name,
        row.agreement_id,
        row.rent,
        row.maintenance_charges,
        row.general_charges,
        row.service_charges,
        row.total_monthly_cost,
        row.escalation_percentage !== null ? row.escalation_percentage : '',
        row.next_escalation_date || '',
      ]),
    ];

    const financialSheet = XLSX.utils.aoa_to_sheet(financialData);
    financialSheet['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, financialSheet, 'Financial Breakdown');
  }

  // Sheet 5: Compliance & Documents
  if (reportData.compliance.length > 0) {
    const complianceData = [
      [
        'Company Name',
        'GST Enabled',
        'GST Number',
        'PAN Number',
        'TAN Number',
        'CIN Number',
        'Document Count',
        'ID Proof Available',
      ],
      ...reportData.compliance.map(row => [
        row.tenant_name,
        row.gst_enabled,
        row.gst_number || '',
        row.pan_number || '',
        row.tan_number || '',
        row.cin_number || '',
        row.document_count,
        row.id_proof_available,
      ]),
    ];

    const complianceSheet = XLSX.utils.aoa_to_sheet(complianceData);
    complianceSheet['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, complianceSheet, 'Compliance & Documents');
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Tenant_Report_${timestamp}.xlsx`;

  // Export file
  XLSX.writeFile(workbook, filename);
}
