# Tenant Reporting System - Technical Documentation

## Overview

A production-grade, enterprise-level reporting module that generates comprehensive multi-sheet Excel reports providing complete visibility into tenant management, agreements, space allocation, financials, and compliance.

---

## Architecture

### Service Layer
- **tenantReportService.ts** - Core data aggregation and transformation
- **tenantExcelExportService.ts** - Multi-sheet Excel generation

### UI Layer
- **TenantReportModal.tsx** - Main report interface with summary display
- **TenantReportFilters.tsx** - Sharp, grid-based filter component

### Type Definitions
- **tenantReports.ts** - Complete type safety for all 5 sheets + summary

---

## Report Structure

### Sheet 0: Executive Summary
**Purpose**: High-level KPIs for management decision-making

**Metrics**:
- Total Tenants
- Total Agreements
- Total Monthly Revenue
- Total Deposits
- Active Leases
- Expiring Soon (Warning/Critical)
- Expired Leases
- GST Companies
- Total Space Allocations

---

### Sheet 1: Tenant Summary
**Purpose**: Executive view of all tenants with key metrics

**Columns**:
1. Tenant Name
2. Company Group
3. Main / Branch (hierarchy indicator)
4. Parent Company (for branches)
5. Branch Count (for main tenants)
6. Total Units Assigned
7. Total Space
8. Active Agreements
9. Total Monthly Rent
10. Total Deposit
11. Next Due Date
12. Lease Status (ACTIVE/WARNING/CRITICAL/EXPIRED)
13. GST Company (Yes/No)

**Derived Logic**:
- Branch Count: Counts child tenants via parent_tenant_id
- Total Monthly Rent: Sum of all active agreement rents
- Lease Status: Calculated from earliest lease_end_date
  - EXPIRED: < today
  - CRITICAL: < 30 days
  - WARNING: < 60 days
  - ACTIVE: otherwise

---

### Sheet 2: Agreement Details
**Purpose**: Complete agreement lifecycle tracking

**Columns**:
1. Tenant Name
2. Agreement ID (auto-generated)
3. Agreement Name
4. Status
5. Rent Amount
6. Security Deposit
7. Payment Cycle
8. Lease Start Date
9. Rent Commencement Date
10. Lease End Date
11. Lock-in Period
12. Lease Tenure
13. Next Due Date
14. Days to Expiry (calculated)

**Derived Logic**:
- Days to Expiry: lease_end_date - today

---

### Sheet 3: Space Allocation
**Purpose**: Physical space tracking and occupancy analysis

**Columns**:
1. Tenant Name
2. Agreement ID
3. Building
4. Floor
5. Room / Unit
6. Space
7. Occupancy Type

**Data Source**:
- Extracted from agreements.space_assignments (JSONB)
- Cross-referenced with buildings, floors, rooms tables

---

### Sheet 4: Financial Breakdown
**Purpose**: Complete financial analysis per agreement

**Columns**:
1. Tenant Name
2. Agreement ID
3. Rent
4. Maintenance Charges (total from JSONB array)
5. General Charges (total from JSONB array)
6. Service Charges
7. Total Monthly Cost (calculated)
8. Escalation % (next scheduled)
9. Next Escalation Date

**Derived Logic**:
```
Total Monthly Cost = Rent + Maintenance + General + Service Charges

Maintenance Total = Σ(maintenance_charges[].amount)
General Total = Σ(general_charges[].amount)
Service Total = service_charge.amount (if not included in rent)

Escalation Info = Next future escalation from escalations[] array
```

---

### Sheet 5: Compliance & Documents
**Purpose**: Regulatory compliance tracking

**Columns**:
1. Tenant Name
2. GST Enabled (Yes/No)
3. GST Number
4. PAN Number
5. TAN Number
6. CIN Number
7. Document Count (from agreements.documents JSONB)
8. ID Proof Available (Yes/No)

---

## Filter System

### Available Filters

**Tenant Filters**:
- Tenant (dropdown)
- Company Group (dropdown)
- Building (dropdown)

**Date Range**:
- Start Date (agreement-based)
- End Date (agreement-based)

**Lease Status** (multi-select):
- ACTIVE
- WARNING
- CRITICAL
- EXPIRED

**Company Type**:
- GST Company Only
- Main Branch Only
- Branch Only

### Filter Application
All filters applied at query level for performance optimization.

---

## Data Flow

### 1. Query Optimization
```
Step 1: Fetch tenants with filters
Step 2: Fetch agreements for tenant_ids
Step 3: Extract unique IDs (buildings, floors, rooms)
Step 4: Parallel fetch related data (Promise.all)
Step 5: Build lookup maps
Step 6: Transform and aggregate
```

### 2. Transformation Layer
```typescript
// Financial Extraction
extractFinancialTotals(agreement) → {
  maintenanceCharges,
  generalCharges,
  serviceCharges,
  totalMonthlyCost
}

// Escalation Extraction
extractEscalationInfo(agreement) → {
  percentage,
  nextDate
}

// Lease Status Calculation
calculateLeaseStatus(leaseEndDate) → 'ACTIVE' | 'WARNING' | 'CRITICAL' | 'EXPIRED'
```

### 3. Excel Generation
```
- Create workbook
- Generate 6 sheets (Summary + 5 data sheets)
- Auto-size columns
- Freeze header rows
- Professional formatting
- Export with timestamp filename
```

---

## Database Schema Dependencies

### Primary Tables
- **tenants**: Core tenant data, GST info, branch hierarchy
- **agreements**: Financial terms, dates, JSONB fields
- **buildings**: Location hierarchy
- **floors**: Floor-level data
- **rooms**: Room/unit details

### Key Relationships
```
tenants.id ← agreements.tenant_id (one-to-many)
tenants.parent_tenant_id → tenants.id (self-referencing)
agreements.space_assignments → buildings/floors/rooms (JSONB references)
```

### JSONB Field Structures

**space_assignments**:
```json
[{
  "buildingId": "uuid",
  "floorId": "uuid",
  "roomId": "uuid",
  "space": "string",
  "occupancyType": "string"
}]
```

**maintenance_charges**:
```json
[{
  "amount": number,
  "description": "string"
}]
```

**general_charges**:
```json
[{
  "amount": number,
  "category": "string",
  "dueDate": "date"
}]
```

**service_charge**:
```json
{
  "amount": number,
  "serviceNames": ["string"],
  "isIncludedInRent": boolean
}
```

**escalations**:
```json
[{
  "percentage": number,
  "effectiveDate": "date"
}]
```

---

## UI Integration

### Route
`/admin/tenant-management`

### Button Location
Header actions, right side, before "Add Tenant" button

### Modal Behavior
1. Opens centered dialog with backdrop
2. Displays filters in sharp grid layout
3. Generate button triggers report creation
4. Shows executive summary on success
5. Export button downloads Excel file
6. No preview - direct export workflow

### UI Style
- Sharp edges, no rounded containers
- Dense spacing, grid-based layout
- Enterprise SAP/Oracle aesthetic
- Form inputs have rounded corners (rounded-md)
- Primary theme colors for interactive elements

---

## Performance Considerations

### Query Optimization
- Separate queries for related data (avoid nested joins)
- Parallel fetching with Promise.all
- Empty array checks before .in() queries
- Lookup maps for O(1) access

### Scalability
- Filters applied at database level
- Minimal data transformation
- Efficient JSONB extraction
- No heavy client-side processing

---

## Error Handling

### Service Layer
```typescript
try {
  const data = await getTenantReport(filters);
  setReportData(data);
} catch (err) {
  setError(err.message || 'Failed to generate report');
}
```

### Empty Data Handling
Returns empty response structure with zero counts when no data found.

---

## File Naming Convention
```
Tenant_Report_YYYY-MM-DD.xlsx
```

---

## Usage Example

```typescript
// 1. Open modal
<Button onClick={() => setIsReportModalOpen(true)}>
  <FileSpreadsheet className="h-4 w-4 mr-2" />
  Generate Report
</Button>

// 2. Apply filters
const filters: TenantReportFilters = {
  tenantId: 'uuid',
  leaseStatus: ['CRITICAL', 'EXPIRED'],
  isGstCompany: true
};

// 3. Generate report
const report = await getTenantReport(filters);

// 4. Export to Excel
exportTenantReport(report);
```

---

## Testing Checklist

- [ ] All filters work independently
- [ ] Combined filters work correctly
- [ ] Empty data returns valid structure
- [ ] All 6 sheets generate correctly
- [ ] Financial calculations accurate
- [ ] Lease status logic correct
- [ ] Branch hierarchy displays properly
- [ ] JSONB fields flatten correctly
- [ ] Excel file downloads successfully
- [ ] Column widths appropriate
- [ ] No console errors
- [ ] Performance acceptable with large datasets

---

## Future Enhancements

1. **Scheduled Reports**: Auto-generate and email reports
2. **Custom Templates**: User-defined report layouts
3. **Drill-down**: Click summary to filter detailed sheets
4. **Comparison Reports**: Month-over-month analysis
5. **Chart Integration**: Visual analytics in Excel
6. **PDF Export**: Alternative format option
7. **Report History**: Save and retrieve past reports
8. **Custom Calculations**: User-defined formulas

---

## Maintenance Notes

### Adding New Filters
1. Add to TenantReportFilters type
2. Update filter UI component
3. Apply filter in query logic
4. Test with existing filters

### Adding New Columns
1. Update row type definition
2. Add to transformation logic
3. Update Excel export headers
4. Adjust column width

### Modifying Calculations
1. Update utility functions
2. Test edge cases
3. Update documentation
4. Verify Excel output

---

## Support

For issues or enhancements, refer to:
- Service layer: `src/services/tenantReportService.ts`
- Excel export: `src/services/tenantExcelExportService.ts`
- UI components: `src/components/reports/`
- Type definitions: `src/types/tenantReports.ts`
