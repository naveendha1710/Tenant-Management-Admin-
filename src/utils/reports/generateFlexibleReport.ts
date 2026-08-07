import ExcelJS from 'exceljs';
import { addMonths, format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { GlobalReportFilters } from '@/store/useGlobalReportFilterStore';
import { SheetConfig } from '@/store/useReportSheetStore';
import { getFieldLabel } from './reportFieldRegistry';
import { getHelpdeskFieldLabel, normalizeHelpdeskFieldKey } from './helpdeskReportFields';
import {
  getTenantFieldLabel,
  normalizeTenantFieldKey,
  loadTenantDynamicChargeFields,
  type TenantDynamicChargeFieldDefinition,
} from './tenantReportFields';
import { ReportType } from '@/types/report';

export type ExportSheet = {
  name: string;
  data: any[];
  fields: string[];
};

export type GenerateFlexibleReportInput = {
  globalFilters: GlobalReportFilters;
  sheets: SheetConfig[];
  reportName?: string;
  reportType?: ReportType;
  templateId?: string;
  generatedBy?: string;
};

export type GenerateFlexibleReportResult = {
  filename: string;
  totalSheets: number;
  totalRows: number;
  generationTimeMs: number;
};

const PAGE_SIZE = 1000;

const isUuid = (value: any) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isActiveFilterValue = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== undefined && value !== null && value !== '' && value !== 'all';
};

const normalizeValue = (value: any) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const isPlainObject = (value: any) =>
  Object.prototype.toString.call(value) === '[object Object]';

const formatExportObject = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.map((item) => formatExportValue(item)).filter(Boolean).join('\n');
  }
  if (!isPlainObject(value)) {
    return formatExportValue(value);
  }

  const materialLabel = value.item || value.name || value.material || value.title;
  const materialKeys = ['quantity', 'unit', 'rate', 'gst_percentage', 'gst', 'total'];
  const hasMaterialShape = Boolean(materialLabel) && materialKeys.some((key) => key in value);

  if (hasMaterialShape) {
    const parts: string[] = [String(materialLabel)];
    if (value.quantity !== undefined && value.quantity !== null && value.quantity !== '') {
      parts.push(`Qty: ${formatExportValue(value.quantity)}`);
    }
    if (value.unit) {
      parts.push(`Unit: ${formatExportValue(value.unit)}`);
    }
    if (value.rate !== undefined && value.rate !== null && value.rate !== '') {
      parts.push(`Rate: ${formatExportValue(value.rate)}`);
    }
    if (value.gst_percentage !== undefined && value.gst_percentage !== null && value.gst_percentage !== '') {
      parts.push(`GST: ${formatExportValue(value.gst_percentage)}%`);
    } else if (value.gst !== undefined && value.gst !== null && value.gst !== '') {
      parts.push(`GST: ${formatExportValue(value.gst)}%`);
    }
    if (value.total !== undefined && value.total !== null && value.total !== '') {
      parts.push(`Total: ${formatExportValue(value.total)}`);
    }
    return parts.join(' | ');
  }

  return Object.entries(value)
    .map(([key, entryValue]) => {
      const label = key.replace(/_/g, ' ');
      return `${label}: ${formatExportValue(entryValue)}`;
    })
    .join(', ');
};

// Formats values for export, applying ISO timestamp conversion and other sanitizations
const formatExportValue = (value: any): string => {
  // Convert ISO 8601 timestamps to "YYYY-MM-DD HH:MM:SS"
  if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/.test(value)) {
    try {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    } catch {}
  }
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value) || isPlainObject(value)) return formatExportObject(value);
  return String(value);
};
const parseTriState = (value: any) => {
  if (value === true || value === 'yes' || value === 'true') return true;
  if (value === false || value === 'no' || value === 'false') return false;
  return null;
};

// Updated to correctly handle both scalar and array filter values for Helpdesk.
// An array is considered active only if it contains at least one element that is not the sentinel 'all'.
// This mirrors the generic `isActiveFilterValue` helper used elsewhere.
const isActiveHelpdeskFilterValue = (value: any) => {
  if (Array.isArray(value)) {
    const realValues = value.filter((v) => v !== 'all');
    return realValues.length > 0;
  }
  return value !== undefined && value !== null && value !== '' && value !== 'all';
};

const fieldIsDateLike = (field: string) =>
  [
    'created_at',
    'updated_at',
    'resolved_at',
    'target_date',
    'sla_deadline',
    'lease_agreement_date',
    'operation_date',
    'rent_commencement_date',
    'lease_end_date',
    'agreement_created_at',
    'agreement_updated_at',
    'nextduedate',
    'date',
  ].includes(field);

const toDate = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const fetchLookupMap = async (
  table: string,
  ids: string[],
  columns: string,
  transform: (row: any) => { id: string; label: string }
) => {
  if (ids.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.from(table).select(columns).in('id', ids);
  if (error) throw error;
  return (data || []).reduce<Record<string, string>>((acc, row) => {
    const { id, label } = transform(row);
    acc[id] = label;
    return acc;
  }, {});
};

const gatherIds = (values: any[]) =>
  Array.from(new Set(values.filter(isUuid)));

const applyReportFilters = (query: any, filters: Record<string, any>) => {
  const mapping: Record<string, string> = {
    tenant: 'handover_to',
    building: 'building',
    floor: 'floor_id',
    room: 'room_id',
    category: 'asset_category',
    subCategory: 'asset_sub_category',
    assetType: 'asset_type',
    status: 'asset_status',
    vendor: 'vendor_name',
    sezStatus: 'sez_status',
  };

  Object.entries(mapping).forEach(([filterKey, column]) => {
    const value = filters[filterKey];
    if (isActiveFilterValue(value)) {
      query = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
    }
  });

  if (isActiveFilterValue(filters.warrantyStatus)) {
    const now = new Date();
    const nowIso = now.toISOString();
    const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const futureIso = future.toISOString();

    switch (filters.warrantyStatus) {
      case 'expired':
        query = query.lt('warranty_date', nowIso);
        break;
      case 'active':
        query = query.gte('warranty_date', nowIso);
        break;
      case 'expiring_soon':
        query = query.gte('warranty_date', nowIso).lte('warranty_date', futureIso);
        break;
      default:
        break;
    }
  }

  // Apply per-sheet date range filter when provided
  if (filters.dateField && filters.dateField !== 'all') {
    const df = filters.dateField as string;
    if (filters.dateFrom) {
      query = query.gte(df, filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.lte(df, filters.dateTo);
    }
  }

  if (filters.depreciationStatus === 'has') {
    query = query.not('depreciation_date', 'is', null);
  }

  return query;
};

type HelpdeskLookupMaps = {
  buildings: Record<string, string>;
  floors: Record<string, string>;
  rooms: Record<string, string>;
  tenants: Record<string, string>;
  users: Record<string, string>;
};

const normalizeHelpdeskFields = (fields: string[]) => fields.map(normalizeHelpdeskFieldKey);

const buildHelpdeskLookupMaps = async (rows: any[], filters: Record<string, any>): Promise<HelpdeskLookupMaps> => {
  const buildingIds = gatherIds([
    ...rows.map((row) => row.building),
    filters.building,
  ]);
  const floorIds = gatherIds([
    ...rows.map((row) => row.floor),
    filters.floor,
  ]);
  const roomIds = gatherIds([
    ...rows.map((row) => row.room),
    filters.room,
  ]);
  const tenantIds = gatherIds([
    ...rows.map((row) => row.tenant_id ?? row.on_behalf_tenant_id),
    filters.tenant,
  ]);
  const userIds = gatherIds([
    ...rows.flatMap((row) => [row.assigned_to, row.created_by_user_id, row.updated_by]),
    filters.assignedTo,
  ]);

  const [buildings, floors, rooms, tenants, users] = await Promise.all([
    fetchLookupMap('buildings', buildingIds, 'id, name', (row) => ({ id: row.id, label: row.name })),
    fetchLookupMap('floors', floorIds, 'id, floor_name, floor_number', (row) => ({
      id: row.id,
      label: row.floor_name || `Floor ${row.floor_number}`,
    })),
    fetchLookupMap('rooms', roomIds, 'id, room_number', (row) => ({ id: row.id, label: row.room_number })),
    fetchLookupMap('tenants', tenantIds, 'id, company, name', (row) => ({
      id: row.id,
      label: row.company || row.name || row.id,
    })),
    fetchLookupMap('users', userIds, 'id, name', (row) => ({ id: row.id, label: row.name || row.id })),
  ]);

  return { buildings, floors, rooms, tenants, users };
};

const resolveHelpdeskValue = (
  value: any,
  lookup: Record<string, string>
) => {
  if (value === null || value === undefined || value === '') return value;
  if (isUuid(value)) {
    return lookup[value] || value;
  }
  return value;
};

const matchesHelpdeskFilters = (
  ticket: any,
  filters: Record<string, any>,
  refs: HelpdeskLookupMaps
) => {
  const ticketCategory = filters.ticketCategory ?? filters.category;
  const ticketSubCategory = filters.ticketSubCategory ?? filters.subCategory;

  // Helper to compare a field value against a filter value that may be a scalar or an array.
  // - For scalar filters we keep the original equality check.
  // - For array filters we consider the filter active if any element (excluding the sentinel 'all')
  //   matches the field value after normalisation and optional lookup resolution.
  const matchesText = (fieldValue: any, filterValue: any, lookup?: Record<string, string>) => {
    if (!isActiveHelpdeskFilterValue(filterValue)) return true;

    const resolvedValue = resolveHelpdeskValue(fieldValue, lookup || {});
    const normalizedResolved = normalizeValue(resolvedValue);

    // Array filter handling – check inclusion of the resolved field value.
    if (Array.isArray(filterValue)) {
      const cleaned = filterValue.filter((v) => v !== 'all');
      if (cleaned.length === 0) return true;
      return cleaned.some((v) => {
        const resolved = resolveHelpdeskValue(v, lookup || {});
        return normalizeValue(resolved) === normalizedResolved;
      });
    }

    // Scalar filter handling – keep original behaviour.
    const resolvedFilter = resolveHelpdeskValue(filterValue, lookup || {});
    return normalizedResolved === normalizeValue(filterValue)
      || normalizedResolved === normalizeValue(resolvedFilter);
  };

  // Category comparison – support array filters.
  if (isActiveHelpdeskFilterValue(ticketCategory)) {
    if (Array.isArray(ticketCategory)) {
      const normalizedTicket = normalizeValue(ticket.category);
      const matches = ticketCategory.some((v) => normalizeValue(v) === normalizedTicket);
      if (!matches) return false;
    } else if (normalizeValue(ticket.category) !== normalizeValue(ticketCategory)) {
      return false;
    }
  }

  // Sub‑category comparison – support array filters.
  if (isActiveHelpdeskFilterValue(ticketSubCategory)) {
    if (Array.isArray(ticketSubCategory)) {
      const normalizedTicket = normalizeValue(ticket.sub_category);
      const matches = ticketSubCategory.some((v) => normalizeValue(v) === normalizedTicket);
      if (!matches) return false;
    } else if (normalizeValue(ticket.sub_category) !== normalizeValue(ticketSubCategory)) {
      return false;
    }
  }

  // Priority comparison – support array filters.
  if (isActiveHelpdeskFilterValue(filters.priority)) {
    if (Array.isArray(filters.priority)) {
      const normalizedTicket = normalizeValue(ticket.priority);
      const matches = filters.priority.some((v) => normalizeValue(v) === normalizedTicket);
      if (!matches) return false;
    } else if (normalizeValue(ticket.priority) !== normalizeValue(filters.priority)) {
      return false;
    }
  }

  // Status comparison – support array filters.
  if (isActiveHelpdeskFilterValue(filters.status)) {
    if (Array.isArray(filters.status)) {
      const normalizedTicket = normalizeValue(ticket.status);
      const matches = filters.status.some((v) => normalizeValue(v) === normalizedTicket);
      if (!matches) return false;
    } else if (normalizeValue(ticket.status) !== normalizeValue(filters.status)) {
      return false;
    }
  }

  if (!matchesText(ticket.building, filters.building, refs.buildings)) {
    return false;
  }

  if (!matchesText(ticket.floor, filters.floor, refs.floors)) {
    return false;
  }

  if (!matchesText(ticket.room, filters.room, refs.rooms)) {
    return false;
  }

  if (!matchesText(ticket.tenant_id ?? ticket.on_behalf_tenant_id, filters.tenant, refs.tenants)) {
    return false;
  }

  if (!matchesText(ticket.assigned_to, filters.assignedTo, refs.users)) {
    return false;
  }

  if (filters.safetyRisk !== undefined && filters.safetyRisk !== null && filters.safetyRisk !== 'all') {
    const expected = parseTriState(filters.safetyRisk);
    const actual = parseTriState(ticket.safety_risk);
    if (expected !== actual) return false;
  }

  if (filters.previousOccurrence !== undefined && filters.previousOccurrence !== null && filters.previousOccurrence !== 'all') {
    const expected = parseTriState(filters.previousOccurrence);
    const actual = parseTriState(ticket.previous_occurrence);
    if (expected !== actual) return false;
  }

  const dateField = filters.dateField;
  if (isActiveHelpdeskFilterValue(dateField) && fieldIsDateLike(dateField)) {
    const dateValue = ticket[dateField];
    const date = toDate(dateValue);
    if (!date) return false;
    if (filters.dateFrom) {
      const from = toDate(filters.dateFrom);
      if (from && date < from) return false;
    }
    if (filters.dateTo) {
      const to = toDate(filters.dateTo);
      if (to && date > to) return false;
    }
  }

  const ranges = [
    ['createdDateRange', 'created_at'],
    ['targetDateRange', 'target_date'],
    ['resolvedDateRange', 'resolved_at'],
  ] as const;

  for (const [rangeKey, fieldName] of ranges) {
    const range = filters[rangeKey];
    if (Array.isArray(range) && (range[0] || range[1])) {
      const current = toDate(ticket[fieldName]);
      if (!current) return false;
      if (range[0]) {
        const from = toDate(range[0]);
        if (from && current < from) return false;
      }
      if (range[1]) {
        const to = toDate(range[1]);
        if (to && current > to) return false;
      }
    }
  }

  return true;
};

const resolveHelpdeskFieldValue = (
  field: string,
  ticket: any,
  estimation: any,
  refs: HelpdeskLookupMaps
) => {
  const normalizedField = normalizeHelpdeskFieldKey(field);

  switch (normalizedField) {
    case 'ticket_number':
      return ticket.ticket_number || ticket.id;
    case 'created_at':
    case 'updated_at':
    case 'resolved_at':
    case 'target_date':
    case 'sla_deadline':
      return ticket[normalizedField];
    case 'category':
    case 'sub_category':
    case 'priority':
    case 'status':
    case 'description':
    case 'opex_code':
    case 'tenant_satisfaction':
    case 'creator_satisfaction':
      return ticket[normalizedField];
    case 'building':
      return resolveHelpdeskValue(ticket.building, refs.buildings);
    case 'floor':
      return resolveHelpdeskValue(ticket.floor, refs.floors);
    case 'room':
      return resolveHelpdeskValue(ticket.room, refs.rooms);
    case 'tenant':
      return resolveHelpdeskValue(ticket.tenant_id ?? ticket.on_behalf_tenant_id, refs.tenants);
    case 'assigned_to':
      return resolveHelpdeskValue(ticket.assigned_to, refs.users);
    case 'safety_risk':
      return ticket.safety_risk;
    case 'previous_occurrence':
      return ticket.previous_occurrence;
    case 'work_hours':
      return estimation?.work_hours ?? estimation?.labor_hours ?? ticket.work_hours ?? ticket.labor_hours ?? null;
    case 'num_labourers':
      return estimation?.num_labourers ?? ticket.num_labourers ?? null;
    case 'total_hours': {
      const workHours = Number(estimation?.work_hours ?? estimation?.labor_hours ?? ticket.work_hours ?? ticket.labor_hours ?? 0);
      const numLabourers = Number(estimation?.num_labourers ?? ticket.num_labourers ?? 0);
      const total = Number.isFinite(workHours) && Number.isFinite(numLabourers) && workHours > 0 && numLabourers > 0
        ? workHours * numLabourers
        : workHours || numLabourers || null;
      return total;
    }
    case 'labor_cost':
      return estimation?.labor_cost ?? ticket.labor_cost ?? null;
    case 'materials':
      return estimation?.materials || estimation?.selected_materials || ticket.materials || null;
    case 'material_cost_without_gst':
      return estimation?.material_cost_without_gst ?? ticket.material_cost_without_gst ?? null;
    case 'total_gst':
      return estimation?.total_gst ?? ticket.total_gst ?? null;
    case 'ticket_total_amount': {
      const laborCost = Number(estimation?.labor_cost ?? ticket.labor_cost ?? 0);
      const materialCost = Number(estimation?.material_cost_without_gst ?? ticket.material_cost_without_gst ?? 0);
      const totalGst = Number(estimation?.total_gst ?? ticket.total_gst ?? 0);
      const totalCost = Number(estimation?.total_cost ?? ticket.total_cost ?? ticket.total_amount ?? 0);
      if (totalCost > 0) return totalCost;
      const sum = laborCost + materialCost + totalGst;
      return sum > 0 ? sum : null;
    }
    case 'root_cause':
      return estimation?.root_cause ?? ticket.root_cause ?? null;
    case 'findings':
      return estimation?.findings ?? ticket.findings ?? null;
    case 'resolution_notes':
      return ticket.resolution_notes ?? estimation?.notes ?? null;
    case 'created_by':
      return resolveHelpdeskValue(ticket.created_by_user_id, refs.users) || ticket.created_by;
    case 'updated_by':
      return resolveHelpdeskValue(ticket.updated_by_user_id, refs.users) || ticket.updated_by;
    default:
      return ticket[normalizedField] ?? estimation?.[normalizedField];
  }
};

type TenantLookupMaps = {
  buildings: Record<string, string>;
  floors: Record<string, string>;
  rooms: Record<string, string>;
  tenants: Record<string, string>;
};

const normalizeTenantFilters = (filters: Record<string, any>) => ({
  ...filters,
  dateField: filters.dateField || 'all',
  dateFrom: filters.dateFrom || '',
  dateTo: filters.dateTo || '',
  isGstCompany: filters.isGstCompany ?? 'all',
  isMainBranch: filters.isMainBranch ?? 'all',
});

const buildTenantLookupMaps = async (agreements: any[], tenants: any[], filters: Record<string, any>): Promise<TenantLookupMaps> => {
  const allAssignments = agreements.flatMap((agreement) =>
    Array.isArray(agreement.space_assignments) ? agreement.space_assignments : []
  );
  const escalationFloorIds = gatherIds(
    agreements.flatMap((agreement) =>
      Array.isArray(agreement.escalations)
        ? agreement.escalations.flatMap((escalation: any) =>
            Array.isArray(escalation.floorWiseEscalations)
              ? escalation.floorWiseEscalations.flatMap((floor: any) => [
                  floor?.floorId,
                  floor?.floor_id,
                  floor?.id,
                  floor?.floor,
                ])
              : [escalation?.floorId, escalation?.floor_id, escalation?.floor, escalation?.id]
          )
        : []
    )
  );

  const buildingIds = gatherIds([
    ...allAssignments.flatMap((assignment: any) => [assignment.buildingId, assignment.building]),
    filters.building,
  ]);
  const floorIds = gatherIds([
    ...allAssignments.flatMap((assignment: any) => [assignment.floorId, assignment.floor]),
    ...escalationFloorIds,
    filters.floor,
  ]);
  const roomIds = gatherIds([
    ...allAssignments.flatMap((assignment: any) => [assignment.roomId, assignment.room]),
    filters.room,
  ]);
  const tenantIds = gatherIds([
    ...tenants.map((tenant) => tenant.id),
    filters.tenant,
  ]);

  const [buildings, floors, rooms, tenantLabels] = await Promise.all([
    fetchLookupMap('buildings', buildingIds, 'id, name', (row) => ({ id: row.id, label: row.name })),
    fetchLookupMap('floors', floorIds, 'id, floor_name, floor_number', (row) => ({
      id: row.id,
      label: row.floor_name || `Floor ${row.floor_number}`,
    })),
    fetchLookupMap('rooms', roomIds, 'id, room_number', (row) => ({ id: row.id, label: row.room_number })),
    fetchLookupMap('tenants', tenantIds, 'id, company, name', (row) => ({
      id: row.id,
      label: row.company || row.name || row.id,
    })),
  ]);

  return { buildings, floors, rooms, tenants: tenantLabels };
};

const getTenantDateValue = (tenant: any, agreement: any, field: string) => {
  const normalizedField = normalizeTenantFieldKey(field);

  switch (normalizedField) {
    case 'nextduedate':
      return tenant?.nextduedate;
    case 'created_at':
      return tenant?.created_at;
    case 'updated_at':
      return tenant?.updated_at;
    case 'lease_agreement_date':
    case 'operation_date':
    case 'rent_commencement_date':
    case 'lease_end_date':
    case 'agreement_created_at':
    case 'agreement_updated_at':
      return agreement?.[normalizedField];
    default:
      return agreement?.[normalizedField] ?? tenant?.[normalizedField];
  }
};

const getSpaceAssignmentValue = (assignment: any, key: 'building' | 'floor' | 'room', lookup: Record<string, string>) => {
  const idKey = `${key}Id`;
  const raw = assignment?.[idKey] ?? assignment?.[key];
  if (raw === null || raw === undefined || raw === '') return '';
  if (isUuid(raw)) return lookup[raw] || raw;
  return lookup[raw] || raw;
};

const matchesTenantSpaceFilter = (
  agreement: any,
  filterValue: any,
  key: 'building' | 'floor' | 'room',
  lookup: Record<string, string>
) => {
  if (!isActiveFilterValue(filterValue)) return true;

  const assignments = Array.isArray(agreement?.space_assignments) ? agreement.space_assignments : [];
  if (assignments.length === 0) return false;

  const expected = resolveHelpdeskValue(filterValue, lookup);

  return assignments.some((assignment: any) => {
    const resolved = getSpaceAssignmentValue(assignment, key, lookup);
    return normalizeValue(resolved) === normalizeValue(filterValue)
      || normalizeValue(resolved) === normalizeValue(expected);
  });
};

const parseTenantBranchFilter = (value: any) => {
  if (value === 'main' || value === true || value === 'yes' || value === 'true') return true;
  if (value === 'branch' || value === false || value === 'no' || value === 'false') return false;
  return null;
};

const matchesTenantFilters = (
  tenant: any,
  agreement: any,
  filters: Record<string, any>,
  refs: TenantLookupMaps
) => {
  if (isActiveFilterValue(filters.tenant) && tenant.id !== filters.tenant) {
    return false;
  }

  if (isActiveFilterValue(filters.companyGroup) && normalizeValue(tenant.companygroup) !== normalizeValue(filters.companyGroup)) {
    return false;
  }

  if (isActiveFilterValue(filters.tenantStatus) && normalizeValue(tenant.status) !== normalizeValue(filters.tenantStatus)) {
    return false;
  }

  if (isActiveFilterValue(filters.agreementStatus) && normalizeValue(agreement?.status) !== normalizeValue(filters.agreementStatus)) {
    return false;
  }

  if (filters.isGstCompany !== undefined && filters.isGstCompany !== null && filters.isGstCompany !== 'all') {
    const expected = parseTriState(filters.isGstCompany);
    const actual = parseTriState(tenant.is_gst_company);
    if (expected !== actual) return false;
  }

  if (filters.isMainBranch !== undefined && filters.isMainBranch !== null && filters.isMainBranch !== 'all') {
    const expected = parseTenantBranchFilter(filters.isMainBranch);
    const actual = parseTenantBranchFilter(tenant.is_main_branch);
    if (expected !== actual) return false;
  }

  if (!matchesTenantSpaceFilter(agreement, filters.building, 'building', refs.buildings)) {
    return false;
  }

  if (!matchesTenantSpaceFilter(agreement, filters.floor, 'floor', refs.floors)) {
    return false;
  }

  if (!matchesTenantSpaceFilter(agreement, filters.room, 'room', refs.rooms)) {
    return false;
  }

  const dateField = filters.dateField;
  if (isActiveFilterValue(dateField)) {
    const dateValue = getTenantDateValue(tenant, agreement, dateField);
    const date = toDate(dateValue);
    if (!date) return false;
    if (filters.dateFrom) {
      const from = toDate(filters.dateFrom);
      if (from && date < from) return false;
    }
    if (filters.dateTo) {
      const to = toDate(filters.dateTo);
      if (to && date > to) return false;
    }
  }

  return true;
};

const buildSpaceSummary = (agreement: any, refs: TenantLookupMaps) => {
  const assignments = Array.isArray(agreement?.space_assignments) ? agreement.space_assignments : [];
  if (assignments.length === 0) return '';

  return assignments
    .map((assignment) => {
      const building = getSpaceAssignmentValue(assignment, 'building', refs.buildings);
      const floor = getSpaceAssignmentValue(assignment, 'floor', refs.floors);
      const room = getSpaceAssignmentValue(assignment, 'room', refs.rooms);
      const space = assignment.space || assignment.area || assignment.unit || '';
      return [building, floor, room, space].filter(Boolean).join(' / ');
    })
    .filter(Boolean)
    .join('\n');
};

const calculateAgreementTotals = (agreement: any) => {
  const maintenanceTotal = Array.isArray(agreement?.maintenance_charges)
    ? agreement.maintenance_charges.reduce((sum: number, charge: any) => sum + (Number(charge.amount) || 0), 0)
    : 0;

  const generalTotal = Array.isArray(agreement?.general_charges)
    ? agreement.general_charges.reduce((sum: number, charge: any) => sum + (Number(charge.amount) || 0), 0)
    : 0;

  const serviceChargeAmount = Number(agreement?.service_charge?.amount || 0);

  return {
    maintenanceTotal,
    generalTotal,
    serviceChargeAmount,
    totalMonthlyCost: Number(agreement?.rent_amount || 0) + maintenanceTotal + generalTotal + serviceChargeAmount,
  };
};

const formatServiceCharge = (charge: any) => {
  if (!charge) return '';

  const serviceNames = Array.isArray(charge.serviceNames)
    ? charge.serviceNames.filter(Boolean).join(', ')
    : String(charge.serviceNames || '').trim();
  const amount = Number(charge.amount || 0);
  const hasMeaningfulValue = Boolean(serviceNames) || amount > 0 || charge.isIncludedInRent === true;
  if (!hasMeaningfulValue) return '';

  const namePrefix = serviceNames ? `${serviceNames} - ` : '';
  const included = charge.isIncludedInRent ? 'Yes' : 'No';

  return `${namePrefix}Amount: ${formatTenantNumber(amount)} (Included: ${included})`;
};

const resolveFloorNameFromLookup = (floor: any, floorLookup: Record<string, string>) => {
  if (!floor) return 'Unknown Floor';

  const rawFloorId = floor?.floorId ?? floor?.floor_id ?? floor?.id ?? floor?.floor;
  if (rawFloorId !== null && rawFloorId !== undefined && rawFloorId !== '') {
    const resolvedById = floorLookup[String(rawFloorId)];
    if (resolvedById) return String(resolvedById).replace(/^Floor\s+Floor\s+/i, 'Floor ');
  }

  const floorName = floor?.floorName || floor?.floor_name || floor?.name;
  if (floorName) return String(floorName).replace(/^Floor\s+Floor\s+/i, 'Floor ');

  const floorNumber = floor?.floorNumber ?? floor?.floor_number;
  if (floorNumber !== null && floorNumber !== undefined && floorNumber !== '') {
    return `Floor ${floorNumber}`;
  }

  return 'Unknown Floor';
};

const formatEscalations = (escalations: any[], floorLookup: Record<string, string> = {}) => {
  if (!Array.isArray(escalations) || escalations.length === 0) return '-';

  return escalations
    .flatMap((esc) => {
      const rawDate = esc?.date || esc?.effectiveDate;
      let dateStr = 'N/A';
      if (rawDate) {
        const parsedDate = toTenantDate(rawDate);
        if (parsedDate) dateStr = format(parsedDate, 'dd-MMM-yyyy');
        else dateStr = String(rawDate);
      }
      const percentage = esc?.percentage !== undefined && esc?.percentage !== null ? `${esc.percentage}%` : 'N/A';
      const baseRentVal = esc?.newRent ?? esc?.calculatedRent;
      const baseRent = baseRentVal ? formatTenantNumber(baseRentVal) : 'N/A';
      const floorEntries = Array.isArray(esc?.floorWiseEscalations) && esc.floorWiseEscalations.length > 0
        ? esc.floorWiseEscalations
        : [esc];

      return floorEntries.map((floorEntry: any) => {
        const rentVal = floorEntry?.newRent ?? floorEntry?.calculatedRent ?? baseRentVal;
        const rent = rentVal ? `₹${formatTenantNumber(rentVal)}` : baseRent !== 'N/A' ? `₹${baseRent}` : 'N/A';
        const floor = resolveFloorNameFromLookup(floorEntry, floorLookup);
        const floorPercentage = floorEntry?.percentage ?? esc?.percentage;
        const pct = floorPercentage !== undefined && floorPercentage !== null ? `${floorPercentage}%` : percentage;
        
        return `• Date: ${dateStr} | Escalation: ${pct} | New Rent: ${rent} | Floor: ${floor}`;
      });
    })
    .filter(Boolean)
    .join('\n');
};

const formatGeneralCharges = (charges: any[]) => {
  if (!Array.isArray(charges) || charges.length === 0) return '';

  return charges
    .map((charge) => {
      const name = charge?.chargeName || charge?.name || 'Charge';
      const amount = formatTenantNumber(charge?.amount || 0);
      const dueDate = charge?.dueDate || 'N/A';
      return `${name} | Amount: ${amount} | Due: ${dueDate}`;
    })
    .filter(Boolean)
    .join('\n');
};

const formatMaintenance = (maint: any) => {
  if (!maint) return '';

  if (Array.isArray(maint)) {
    return maint
      .map((item) => {
        const floorName = item?.floorName || 'Unknown Floor';
        const sqft = formatTenantNumber(item?.sqft || item?.assignedSqft || 0);
        const rate = formatTenantNumber(item?.ratePerSqft || 0);
        const included = item?.isIncludedInRent ? 'Yes' : 'No';
        return `${floorName} | ${sqft} sqft | Rate: ${rate} | Included: ${included}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  const floorName = maint.floorName || 'Unknown Floor';
  const sqft = formatTenantNumber(maint.sqft || maint.assignedSqft || 0);
  const rate = formatTenantNumber(maint.ratePerSqft || 0);
  const included = maint.isIncludedInRent ? 'Yes' : 'No';

  return `${floorName} | ${sqft} sqft | Rate: ${rate} | Included: ${included}`;
};

const formatSpaceAssignments = (assignments: any[], refs: TenantLookupMaps) => {
  if (!Array.isArray(assignments) || assignments.length === 0) return '-';

  return assignments
    .map((assignment: any) => {
      const bldg = getSpaceAssignmentValue(assignment, 'building', refs.buildings);
      const flr = getSpaceAssignmentValue(assignment, 'floor', refs.floors);
      const rm = getSpaceAssignmentValue(assignment, 'room', refs.rooms);
      const sqft = Number(assignment?.sqft ?? assignment?.assignedSqft ?? 0);
      const rate = Number(assignment?.ratePerSqft ?? assignment?.rate ?? 0);
      const amount = Number(assignment?.amount ?? 0);

      const locParts = [bldg, flr, rm].filter(Boolean).join(' → ');
      let details = locParts || 'Unassigned Unit';
      
      if (sqft > 0 && rate > 0) {
        details += ` (${formatTenantNumber(sqft, 0)} sq.ft @ ₹${formatTenantNumber(rate)}/sq.ft = ₹${formatTenantNumber(sqft * rate)})`;
      } else if (sqft > 0) {
        details += ` (${formatTenantNumber(sqft, 0)} sq.ft)`;
      } else if (amount > 0) {
        details += ` (₹${formatTenantNumber(amount)})`;
      }
      return `• ${details}`;
    })
    .filter(Boolean)
    .join('\n');
};

const formatTenantDocuments = (documents: any[]) => {
  if (!Array.isArray(documents) || documents.length === 0) return '-';

  return documents
    .map((doc: any) => {
      if (typeof doc === 'string') return `• ${doc}`;
      const name = doc?.name || doc?.title || doc?.document_type || doc?.fileName || 'Document';
      const rawDate = doc?.date || doc?.created_at;
      const docDate = rawDate ? format(toTenantDate(rawDate) || new Date(), 'dd-MMM-yyyy') : '';
      return `• ${name}${docDate ? ` (${docDate})` : ''}`;
    })
    .filter(Boolean)
    .join('\n');
};

const formatTenantNumber = (value: any, precision = 2) => {
  if (value === null || value === undefined || value === '') return '';

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  const rounded = Number(numericValue.toFixed(precision));
  if (Number.isInteger(rounded)) return String(rounded);

  return rounded.toFixed(precision).replace(/\.?0+$/, '');
};

const normalizeTenantChargeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const toTenantDate = (value: any) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTenantDuration = (fromDate: any, toDate: any) => {
  const start = toTenantDate(fromDate);
  const end = toTenantDate(toDate);
  if (!start || !end || end < start) return '';

  let cursor = new Date(start);
  let years = 0;
  let months = 0;

  while (cursor.getFullYear() < end.getFullYear() || (cursor.getFullYear() === end.getFullYear() && cursor.getMonth() < end.getMonth())) {
    const nextYearCursor = new Date(cursor);
    nextYearCursor.setFullYear(nextYearCursor.getFullYear() + 1);
    if (nextYearCursor <= end) {
      cursor = nextYearCursor;
      years += 1;
      continue;
    }

    const nextMonthCursor = addMonths(cursor, 1);
    if (nextMonthCursor <= end) {
      cursor = nextMonthCursor;
      months += 1;
      continue;
    }

    break;
  }

  const days = Math.max(0, Math.floor((end.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24)));
  const parts: string[] = [];

  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  return parts.join(' ');
};

export type ParsedMaterialItem = {
  name: string;
  qty: number;
  unit: string;
  rate: number;
  gstPercent: number;
};

export const parseMaterialsString = (raw: any): ParsedMaterialItem[] => {
  if (!raw) return [];

  let str = '';
  if (typeof raw === 'string') {
    str = raw;
  } else if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === 'object' && item !== null) {
        return [{
          name: String(item.name || item.material_name || item.item || '').trim(),
          qty: Number(item.qty || item.quantity || item.material_qty || 1),
          unit: String(item.unit || item.material_unit || 'NOS').trim(),
          rate: Number(item.rate || item.unit_price || item.material_rate || 0),
          gstPercent: Number(item.gst || item.gstPercent || item.gst_percent || 0),
        }];
      }
      return parseMaterialsString(String(item));
    });
  } else {
    str = String(raw);
  }

  const regex = /([^|]+?)\s*\|\s*Qty:\s*([\d.]+)\s*\|\s*Unit:\s*([^|]+?)\s*\|\s*Rate:\s*([\d.]+)\s*\|\s*GST:\s*([\d.]+)\s*%/gi;
  const materials: ParsedMaterialItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    materials.push({
      name: match[1].trim(),
      qty: parseFloat(match[2]) || 0,
      unit: match[3].trim(),
      rate: parseFloat(match[4]) || 0,
      gstPercent: parseFloat(match[5]) || 0,
    });
  }

  if (materials.length === 0 && str.trim()) {
    materials.push({
      name: str.replace(/\r?\n/g, ', ').trim(),
      qty: 1,
      unit: 'NOS',
      rate: 0,
      gstPercent: 0,
    });
  }

  return materials;
};

export type ParsedAgreementItem = {
  agreement_name: string;
  agreement_status: string;
  payment_cycle: string;
  lease_agreement_date: string;
  operation_date: string;
  rent_commencement_date: string;
  lease_end_date: string;
  lock_in_period: string;
  lease_tenure: string;
  agreement_created_at: string;
  agreement_updated_at: string;
  lease_remaining_days: string;
  agreement_age: string;
  end_of_lock_in: string;
  next_due_in: string;
  next_escalation_date: string;
  next_escalation_percentage: string;
  escalation_count: string;
  current_escalated_rent: string;
};

export const parseAgreementItem = (
  agreement: any,
  tenant: any,
  refs: TenantLookupMaps,
  dynamicFields: TenantDynamicChargeFieldDefinition[] = []
): ParsedAgreementItem => {
  return {
    agreement_name: formatExportValue(resolveTenantFieldValue('agreement_name', tenant, agreement, refs, dynamicFields)),
    agreement_status: formatExportValue(resolveTenantFieldValue('agreement_status', tenant, agreement, refs, dynamicFields)),
    payment_cycle: formatExportValue(resolveTenantFieldValue('payment_cycle', tenant, agreement, refs, dynamicFields)),
    lease_agreement_date: formatExportValue(resolveTenantFieldValue('lease_agreement_date', tenant, agreement, refs, dynamicFields)),
    operation_date: formatExportValue(resolveTenantFieldValue('operation_date', tenant, agreement, refs, dynamicFields)),
    rent_commencement_date: formatExportValue(resolveTenantFieldValue('rent_commencement_date', tenant, agreement, refs, dynamicFields)),
    lease_end_date: formatExportValue(resolveTenantFieldValue('lease_end_date', tenant, agreement, refs, dynamicFields)),
    lock_in_period: formatExportValue(resolveTenantFieldValue('lock_in_period', tenant, agreement, refs, dynamicFields)),
    lease_tenure: formatExportValue(resolveTenantFieldValue('lease_tenure', tenant, agreement, refs, dynamicFields)),
    agreement_created_at: formatExportValue(resolveTenantFieldValue('agreement_created_at', tenant, agreement, refs, dynamicFields)),
    agreement_updated_at: formatExportValue(resolveTenantFieldValue('agreement_updated_at', tenant, agreement, refs, dynamicFields)),
    lease_remaining_days: formatExportValue(resolveTenantFieldValue('lease_remaining_days', tenant, agreement, refs, dynamicFields)),
    agreement_age: formatExportValue(resolveTenantFieldValue('agreement_age', tenant, agreement, refs, dynamicFields)),
    end_of_lock_in: formatExportValue(resolveTenantFieldValue('end_of_lock_in', tenant, agreement, refs, dynamicFields)),
    next_due_in: formatExportValue(resolveTenantFieldValue('next_due_in', tenant, agreement, refs, dynamicFields)),
    next_escalation_date: formatExportValue(resolveTenantFieldValue('next_escalation_date', tenant, agreement, refs, dynamicFields)),
    next_escalation_percentage: formatExportValue(resolveTenantFieldValue('next_escalation_percentage', tenant, agreement, refs, dynamicFields)),
    escalation_count: formatExportValue(resolveTenantFieldValue('escalation_count', tenant, agreement, refs, dynamicFields)),
    current_escalated_rent: formatExportValue(resolveTenantFieldValue('current_escalated_rent', tenant, agreement, refs, dynamicFields)),
  };
};

export type ParsedTenantAgreementBlock = {
  agreement: ParsedAgreementItem;
  spaces: ParsedSpaceAssignmentItem[];
  escalations: ParsedEscalationItem[];
};

export type ParsedEscalationItem = {
  date: string;
  percent: number;
  newRent: number;
  floor: string;
};

export const parseTenantEscalationsDirect = (
  agreement: any,
  tenant: any,
  refs: TenantLookupMaps
): ParsedEscalationItem[] => {
  const escList = (Array.isArray(agreement?.escalations) && agreement.escalations.length > 0)
    ? agreement.escalations
    : (Array.isArray(tenant?.escalations) && tenant.escalations.length > 0)
      ? tenant.escalations
      : [];

  if (!Array.isArray(escList) || escList.length === 0) return [];

  return escList.flatMap((esc: any) => {
    const rawDate = esc?.effectiveDate ?? esc?.effective_date ?? esc?.date;
    let dateStr = '';
    if (rawDate) {
      const parsedDate = toTenantDate(rawDate);
      if (parsedDate) dateStr = format(parsedDate, 'dd-MMM-yyyy');
      else dateStr = String(rawDate);
    }

    const basePercentage = Number(esc?.percentage ?? esc?.percent ?? 0);
    const baseRentVal = Number(esc?.newRent ?? esc?.calculatedRent ?? esc?.rent ?? 0);

    const floorEntries = Array.isArray(esc?.floorWiseEscalations) && esc.floorWiseEscalations.length > 0
      ? esc.floorWiseEscalations
      : [esc];

    return floorEntries.map((floorEntry: any) => {
      const pct = Number(floorEntry?.percentage ?? esc?.percentage ?? basePercentage);
      const rentVal = Number(floorEntry?.newRent ?? floorEntry?.calculatedRent ?? baseRentVal);
      const floorStr = resolveFloorNameFromLookup(floorEntry, refs.floors);

      return {
        date: dateStr,
        percent: pct,
        newRent: rentVal,
        floor: floorStr !== 'Unknown Floor' ? floorStr : '',
      };
    });
  });
};

export const parseEscalationsString = (raw: any): ParsedEscalationItem[] => {
  if (!raw) return [];
  const str = String(raw);
  if (!str.trim() || str === '-') return [];

  const lines = str.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const items: ParsedEscalationItem[] = [];

  for (const line of lines) {
    const dateMatch = line.match(/Date:\s*([^|]+)/i);
    const pctMatch = line.match(/Escalation:\s*([\d.]+)\s*%/i);
    const rentMatch = line.match(/New Rent:\s*[₹\s]*([\d.,]+)/i);
    const floorMatch = line.match(/Floor:\s*([^|\n\r]+)/i);

    if (dateMatch || pctMatch || rentMatch) {
      items.push({
        date: dateMatch ? dateMatch[1].trim() : '',
        percent: pctMatch ? parseFloat(pctMatch[1]) || 0 : 0,
        newRent: rentMatch ? parseFloat(rentMatch[1].replace(/,/g, '')) || 0 : 0,
        floor: floorMatch ? floorMatch[1].trim() : '',
      });
    }
  }

  return items;
};

const getAgreementDaysDifference = (fromDate: any, toDate: any) => {
  const start = toTenantDate(fromDate);
  const end = toTenantDate(toDate);
  if (!start || !end) return null;
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

const getAssignmentSqft = (assignment: any) =>
  Number(assignment?.assignedSqft ?? assignment?.area ?? 0) || 0;

const getAssignmentRate = (assignment: any) => {
  const sqft = getAssignmentSqft(assignment);
  const explicitRate = Number(assignment?.ratePerSqft ?? assignment?.rate_per_sqft ?? 0);
  if (Number.isFinite(explicitRate) && explicitRate > 0) return explicitRate;

  const amount = Number(assignment?.amount ?? 0);
  if (sqft > 0 && amount > 0) {
    return amount / sqft;
  }

  return 0;
};

const getDirectRentPerSqft = (tenant: any, agreement: any) => {
  // 1. Direct DB column check on agreement or tenant
  const directCol = agreement?.rent_per_sqft ?? agreement?.rate_per_sqft ?? tenant?.rent_per_sqft ?? tenant?.rate_per_sqft;
  if (directCol !== undefined && directCol !== null && directCol !== '') {
    const val = Number(directCol);
    if (!Number.isNaN(val) && val > 0) return val;
  }

  // 2. Direct rate check inside space_assignments JSONB array in DB
  const assignments = (Array.isArray(agreement?.space_assignments) && agreement.space_assignments.length > 0)
    ? agreement.space_assignments
    : (Array.isArray(tenant?.space_assignments) && tenant.space_assignments.length > 0)
      ? tenant.space_assignments
      : [];

  if (assignments.length > 0) {
    const explicitRates = assignments
      .map((a: any) => Number(a?.ratePerSqft ?? a?.rate_per_sqft ?? a?.rate ?? a?.rentPerSqft ?? a?.rent_per_sqft ?? 0))
      .filter((r: number) => !Number.isNaN(r) && r > 0);

    if (explicitRates.length > 0) {
      if (explicitRates.every((r: number) => r === explicitRates[0])) {
        return explicitRates[0];
      }
      const sum = explicitRates.reduce((acc: number, r: number) => acc + r, 0);
      return sum / explicitRates.length;
    }
  }

  return null;
};

const getAssignmentLabel = (assignment: any) =>
  String(assignment?.assignmentType ?? assignment?.type ?? '').trim();

const getSpaceTypeLabel = (assignment: any) =>
  String(assignment?.spaceType ?? assignment?.category ?? '').trim();

const getAssignmentSummary = (agreement: any) => {
  const assignments = Array.isArray(agreement?.space_assignments) ? agreement.space_assignments : [];
  const totalSqft = assignments.reduce((sum: number, assignment: any) => sum + getAssignmentSqft(assignment), 0);

  const rateWeightedBySqft = assignments.reduce((sum: number, assignment: any) => {
    const sqft = getAssignmentSqft(assignment);
    const rate = getAssignmentRate(assignment);
    return sum + (sqft * rate);
  }, 0);

  const assignmentTypes = Array.from(
    new Set(assignments.map((assignment: any) => getAssignmentLabel(assignment)).filter(Boolean))
  );
  const spaceTypes = Array.from(
    new Set(assignments.map((assignment: any) => getSpaceTypeLabel(assignment)).filter(Boolean))
  );

  return {
    totalSqft,
    ratePerSqft: totalSqft > 0 ? rateWeightedBySqft / totalSqft : 0,
    assignmentType: assignmentTypes.join('\n'),
    spaceType: spaceTypes.join('\n'),
  };
};

export type ParsedSpaceAssignmentItem = {
  building: string;
  floor: string;
  room: string;
  spaceCount: number;
  assignedUnits: string;
  assignedSqft: number;
  ratePerSqft: number;
  assignmentType: string;
  spaceType: string;
};

export const parseSpaceAssignments = (
  agreement: any,
  tenant: any,
  refs: TenantLookupMaps
): ParsedSpaceAssignmentItem[] => {
  const assignments = (Array.isArray(agreement?.space_assignments) && agreement.space_assignments.length > 0)
    ? agreement.space_assignments
    : (Array.isArray(tenant?.space_assignments) && tenant.space_assignments.length > 0)
      ? tenant.space_assignments
      : [];

  if (!Array.isArray(assignments) || assignments.length === 0) return [];

  return assignments.map((assignment: any) => {
    const building = getSpaceAssignmentValue(assignment, 'building', refs.buildings);
    const rawFloor = getSpaceAssignmentValue(assignment, 'floor', refs.floors);
    const floor = String(rawFloor).replace(/^Floor\s+Floor\s+/i, 'Floor ');
    const room = getSpaceAssignmentValue(assignment, 'room', refs.rooms);
    const spaceCount = 1;
    const assignedUnits = String(assignment?.assignedunits || assignment?.unit || assignment?.name || '').trim();
    const assignedSqft = getAssignmentSqft(assignment);
    const ratePerSqft = getAssignmentRate(assignment);
    const assignmentType = getAssignmentLabel(assignment);
    const spaceType = getSpaceTypeLabel(assignment);

    return {
      building,
      floor,
      room,
      spaceCount,
      assignedUnits,
      assignedSqft,
      ratePerSqft,
      assignmentType,
      spaceType,
    };
  });
};

const getDynamicChargeMatchTokens = (field: TenantDynamicChargeFieldDefinition) => {
  const suffix = field.key
    .split('__')
    .slice(1)
    .join('__')
    .replace(/__\d+$/, '');
  return Array.from(
    new Set(
      [
        field.chargeName,
        suffix,
        field.chargeKey,
        ...field.aliases,
      ]
        .filter(Boolean)
        .map(normalizeTenantChargeName)
    )
  );
};

const getDynamicChargeFieldValue = (
  agreement: any,
  field: TenantDynamicChargeFieldDefinition
) => {
  const normalizedTokens = getDynamicChargeMatchTokens(field);

  if (field.formType === 'general_charges') {
    const generalCharges = Array.isArray(agreement?.general_charges) ? agreement.general_charges : [];
    const charge = generalCharges.find((item: any) => {
      const candidate = normalizeTenantChargeName(
        String(item?.chargeName ?? item?.name ?? item?.label ?? item?.short_code ?? '')
      );
      return normalizedTokens.includes(candidate);
    });

    return formatTenantNumber(charge?.amount || 0);
  }

  const serviceCharge = agreement?.service_charge || {};
  const serviceNames = Array.isArray(serviceCharge.serviceNames) ? serviceCharge.serviceNames : [];
  const selectedServiceMatches = serviceNames.some((name: string) =>
    normalizedTokens.includes(normalizeTenantChargeName(String(name)))
  );

  return selectedServiceMatches ? formatTenantNumber(serviceCharge.amount || 0) : '0';
};

const resolveDynamicChargeFieldByKey = (agreement: any, fieldKey: string) => {
  const normalizedKey = normalizeTenantFieldKey(fieldKey);

  if (!normalizedKey.startsWith('general_charge__') && !normalizedKey.startsWith('service_charge__')) {
    return null;
  }

  const [prefix, ...rest] = normalizedKey.split('__');
  const chargeSlug = rest.join('__').replace(/__\d+$/, '');
  if (!chargeSlug) return null;

  const pseudoField: TenantDynamicChargeFieldDefinition = {
    key: normalizedKey,
    label: chargeSlug.replace(/_/g, ' '),
    category: 'Financial',
    type: 'currency',
    formType: prefix === 'general_charge' ? 'general_charges' : 'service_charges',
    chargeName: chargeSlug,
    chargeKey: normalizedKey,
    aliases: [chargeSlug],
  };

  return getDynamicChargeFieldValue(agreement, pseudoField);
};

const getTenantEscalationMetrics = (tenant: any, agreement: any) => {
  const escalations = (Array.isArray(agreement?.escalations) && agreement.escalations.length > 0)
    ? agreement.escalations
    : (Array.isArray(tenant?.escalations) && tenant.escalations.length > 0)
      ? tenant.escalations
      : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedEscalations = escalations
    .map((escalation: any) => {
      const escalationDate = toTenantDate(escalation?.date ?? escalation?.effectiveDate);
      return escalationDate ? { escalation, escalationDate } : null;
    })
    .filter(Boolean) as Array<{ escalation: any; escalationDate: Date }>;

  const sortedEscalations = [...normalizedEscalations].sort(
    (left, right) => left.escalationDate.getTime() - right.escalationDate.getTime()
  );

  const upcomingEscalations = sortedEscalations
    .filter(({ escalationDate }) => escalationDate > today)
    .sort((left, right) => left.escalationDate.getTime() - right.escalationDate.getTime());

  const appliedEscalations = sortedEscalations
    .filter(({ escalationDate }) => escalationDate <= today)
    .sort((left, right) => left.escalationDate.getTime() - right.escalationDate.getTime());

  const nextEscalation = upcomingEscalations[0]?.escalation || null;
  const latestAppliedEscalation = appliedEscalations[appliedEscalations.length - 1]?.escalation || null;
  const latestEscalation = sortedEscalations[sortedEscalations.length - 1]?.escalation || null;

  return {
    escalations,
    nextEscalation,
    latestAppliedEscalation,
    latestEscalation,
  };
};

const calculateCurrentEscalatedRent = (tenant: any, agreement: any) => {
  const baseRent = Number(agreement?.rent_amount || tenant?.rent_amount || 0);
  const spaceAssignments = Array.isArray(agreement?.space_assignments)
    ? agreement.space_assignments
    : Array.isArray(tenant?.space_assignments)
      ? tenant.space_assignments
      : [];
  const {
    latestAppliedEscalation,
    latestEscalation,
  } = getTenantEscalationMetrics(tenant, agreement);
  const rawEscalations = (Array.isArray(agreement?.escalations) && agreement.escalations.length > 0)
    ? agreement.escalations
    : (Array.isArray(tenant?.escalations) && tenant.escalations.length > 0)
      ? tenant.escalations
      : [];
  const sortedAppliedEscalations = Array.isArray(rawEscalations)
    ? [...rawEscalations]
        .map((escalation: any) => ({
          escalation,
          escalationDate: toTenantDate(escalation?.date ?? escalation?.effectiveDate),
        }))
        .filter((item: any) => item.escalationDate)
        .sort((left: any, right: any) => left.escalationDate.getTime() - right.escalationDate.getTime())
        .map((item: any) => item.escalation)
    : [];

  const calculatedRentFromEscalation = Number(
    latestAppliedEscalation?.calculatedRent ?? latestEscalation?.calculatedRent ?? 0
  );
  if (calculatedRentFromEscalation > 0) {
    return calculatedRentFromEscalation;
  }

  const today = new Date();
  const appliedEscalations = Array.isArray(agreement?.escalations) ? agreement.escalations : [];

  if (spaceAssignments.length > 0) {
    let currentRent = 0;

    spaceAssignments.forEach((assignment: any, index: number) => {
      const uniqueId = assignment?.id || `${assignment?.floorId || assignment?.floor || index}`;
      let assignmentRent = Number(assignment?.amount || 0);

      sortedAppliedEscalations.forEach((escalation: any) => {
        if (!escalation?.date) return;
        const escalationDate = toTenantDate(escalation.date);
        if (!escalationDate || escalationDate > today) return;

        const floorEscalation = Array.isArray(escalation.floorWiseEscalations)
          ? escalation.floorWiseEscalations.find((floor: any) => {
              const floorId = String(floor?.floorId ?? '');
              return floorId === uniqueId || floorId === String(assignment?.floorId ?? '') || floorId === String(assignment?.id ?? '');
            })
          : null;

        if (floorEscalation?.percentage) {
          assignmentRent += assignmentRent * (Number(floorEscalation.percentage) / 100);
        } else if (escalation.percentage) {
          assignmentRent += assignmentRent * (Number(escalation.percentage) / 100);
        }
      });

      currentRent += assignmentRent;
    });

    return currentRent > 0 ? Math.round(currentRent) : baseRent;
  }

  if (latestAppliedEscalation?.calculatedRent) {
    return Number(latestAppliedEscalation.calculatedRent);
  }

  let escalatedRent = baseRent;
  sortedAppliedEscalations.forEach((escalation: any, index: number) => {
    if (!escalation?.percentage) return;
    if (index === 0) {
      escalatedRent = baseRent + (baseRent * Number(escalation.percentage) / 100);
      return;
    }
    escalatedRent = escalatedRent + (escalatedRent * Number(escalation.percentage) / 100);
  });

  return Math.round(escalatedRent);
};

const resolveTenantFieldValue = (
  field: string,
  tenant: any,
  agreement: any,
  refs: TenantLookupMaps,
  dynamicFields: TenantDynamicChargeFieldDefinition[] = []
) => {
  const normalizedField = normalizeTenantFieldKey(field);
  const totals = calculateAgreementTotals(agreement);
  const assignments = Array.isArray(agreement?.space_assignments) ? agreement.space_assignments : [];
  const documentCount = Array.isArray(agreement?.documents) ? agreement.documents.length : 0;
  const assignmentSummary = getAssignmentSummary(agreement);
  const escalationMetrics = getTenantEscalationMetrics(tenant, agreement);
  const currentEscalatedRent = calculateCurrentEscalatedRent(tenant, agreement);
  const lockInMonths = Number.parseInt(String(agreement?.lock_in_period ?? '').match(/\d+/)?.[0] || '', 10);
  const rentCommencementDate = toTenantDate(agreement?.rent_commencement_date);
  const nextDueDate = toTenantDate(tenant?.nextduedate);
  const leaseEndDate = toTenantDate(agreement?.lease_end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (normalizedField) {
    // Tenant ID field removed per request – no longer included in export
    case 'name':
    case 'company':
    case 'email':
    case 'phone':
    case 'status':
    case 'companygroup':
    case 'branch_name':
    case 'address':
    case 'space':
    case 'nextduedate':
    case 'created_at':
    case 'updated_at':
      return tenant[normalizedField];
    case 'tenant_status':
      return tenant.status;
    case 'branch_type':
      return tenant.is_main_branch ? 'Main' : 'Branch';
    case 'parent_tenant':
      return tenant.parent_tenant_id ? refs.tenants[tenant.parent_tenant_id] || tenant.parent_tenant_id : '';
    case 'is_main_branch':
      return tenant.is_main_branch;
    case 'is_gst_company':
      return tenant.is_gst_company;
    case 'agreement_row_id':
      return agreement?.id || '';
    case 'agreement_id':
      return agreement?.agreement_id || agreement?.id || '';
    case 'agreement_name':
    case 'agreement_status':
    case 'payment_cycle':
    case 'lease_agreement_date':
    case 'operation_date':
    case 'rent_commencement_date':
    case 'lease_end_date':
    case 'lock_in_period':
    case 'lease_tenure':
      return agreement?.[normalizedField];
    case 'agreement_created_at':
      return agreement?.created_at;
    case 'agreement_updated_at':
      return agreement?.updated_at;
    case 'rent_amount':
      return formatTenantNumber(agreement?.rent_amount);
    case 'security_deposit':
      return formatTenantNumber(agreement?.security_deposit);
    case 'annual_rent':
      return formatTenantNumber(Number(agreement?.rent_amount || 0) * 12);
    case 'rent_per_sqft':
    case 'rate_per_sqft': {
      const directRate = getDirectRentPerSqft(tenant, agreement);
      return directRate !== null ? formatTenantNumber(directRate) : '';
    }
    case 'deposit_per_sqft':
      return formatTenantNumber(
        assignmentSummary.totalSqft > 0
        ? Number(agreement?.security_deposit || 0) / assignmentSummary.totalSqft
        : 0
      );
    case 'maintenance_total':
      return formatTenantNumber(totals.maintenanceTotal);
    case 'general_total':
      return formatTenantNumber(totals.generalTotal);
    case 'service_charge_amount':
      return formatTenantNumber(totals.serviceChargeAmount);
    case 'total_monthly_cost':
      return formatTenantNumber(totals.totalMonthlyCost);
    case 'assigned_sqft':
      return formatTenantNumber(assignmentSummary.totalSqft);
    case 'assignment_type':
      return assignmentSummary.assignmentType;
    case 'space_type':
      return assignmentSummary.spaceType;
    // Return calculated totals for financial array fields based on raw data
    case 'maintenance_charges': {
      // Reduce the raw maintenance_charges array, computing amount via sqft*rate when available
      const charges = Array.isArray(agreement?.maintenance_charges) ? agreement.maintenance_charges : [];
      return charges.reduce((sum: number, charge: any) => {
        const sqft = Number(charge.sqft ?? charge.assignedSqft ?? 0);
        const rate = Number(charge.ratePerSqft ?? charge.rate ?? 0);
        const amount = Number(charge.amount ?? 0);
        if (sqft > 0 && rate > 0) return sum + sqft * rate;
        return sum + amount;
      }, 0);
    }
    case 'general_charges':
      // Keep existing summed total for general charges (amount field only)
      return totals.generalTotal;
    case 'service_charge': {
      // Service charge may be a single object or an array; compute total similarly
      const raw = agreement?.service_charge;
      if (!raw) return 0;
      const charges = Array.isArray(raw) ? raw : [raw];
      return charges.reduce((sum: number, charge: any) => {
        const sqft = Number(charge.sqft ?? charge.assignedSqft ?? 0);
        const rate = Number(charge.ratePerSqft ?? charge.rate ?? 0);
        const amount = Number(charge.amount ?? 0);
        if (sqft > 0 && rate > 0) return sum + sqft * rate;
        return sum + amount;
      }, 0);
    }
    case 'lease_remaining_days':
      return formatTenantNumber(getAgreementDaysDifference(today, leaseEndDate), 0);
    case 'agreement_age':
      return rentCommencementDate ? formatTenantDuration(rentCommencementDate, today) : '';
    case 'end_of_lock_in':
      return rentCommencementDate && Number.isFinite(lockInMonths)
        ? format(addMonths(rentCommencementDate, lockInMonths), 'dd-MMM-yyyy')
        : '';
    case 'next_due_in':
      return formatTenantNumber(getAgreementDaysDifference(today, nextDueDate), 0);
    case 'next_escalation_date':
      return escalationMetrics.nextEscalation?.date || escalationMetrics.nextEscalation?.effectiveDate || null;
    case 'next_escalation_percentage':
      return formatTenantNumber(escalationMetrics.nextEscalation?.percentage ?? null);
    case 'escalation_count':
      return formatTenantNumber(escalationMetrics.escalations.length, 0);
    case 'current_escalated_rent':
      return formatTenantNumber(currentEscalatedRent);
    case 'escalations': {
      const escList = (Array.isArray(agreement?.escalations) && agreement.escalations.length > 0)
        ? agreement.escalations
        : (Array.isArray(tenant?.escalations) && tenant.escalations.length > 0)
          ? tenant.escalations
          : [];
      return formatEscalations(escList, refs.floors);
    }
    case 'building': {
      const bldgNames = Array.from(new Set(assignments.map((assignment: any) => getSpaceAssignmentValue(assignment, 'building', refs.buildings)).filter(Boolean)));
      if (bldgNames.length > 0) return bldgNames.join('\n');
      return tenant?.space || '';
    }
    case 'floor':
      return Array.from(new Set(assignments.map((assignment: any) => getSpaceAssignmentValue(assignment, 'floor', refs.floors)).filter(Boolean))).join('\n');
    case 'room':
      return Array.from(new Set(assignments.map((assignment: any) => getSpaceAssignmentValue(assignment, 'room', refs.rooms)).filter(Boolean))).join('\n');
    case 'space_summary':
      return buildSpaceSummary(agreement, refs);
    case 'space_count': {
      const count = assignments.length > 0
        ? assignments.length
        : (Array.isArray(tenant?.assignedunits) && tenant.assignedunits.length > 0)
          ? tenant.assignedunits.length
          : tenant?.space ? 1 : 0;
      return formatTenantNumber(count, 0);
    }
    case 'assignedunits': {
      const units = Array.isArray(tenant?.assignedunits) ? tenant.assignedunits : [];
      return units.join(', ') || '-';
    }
    case 'space_assignments': {
      const spaceAssig = (Array.isArray(agreement?.space_assignments) && agreement.space_assignments.length > 0)
        ? agreement.space_assignments
        : (Array.isArray(tenant?.space_assignments) && tenant.space_assignments.length > 0)
          ? tenant.space_assignments
          : [];
      return formatSpaceAssignments(spaceAssig, refs);
    }
    case 'gst_number':
    case 'pan_number':
    case 'tan_number':
    case 'cin_number':
    case 'idproof':
      return tenant[normalizedField];
    case 'documents': {
      const docList = (Array.isArray(agreement?.documents) && agreement.documents.length > 0)
        ? agreement.documents
        : (Array.isArray(tenant?.documents) && tenant.documents.length > 0)
          ? tenant.documents
          : [];
      return formatTenantDocuments(docList);
    }
    case 'document_count':
      return formatTenantNumber(documentCount, 0);
    case 'idproof_available':
      return tenant.idproof ? 'Yes' : 'No';
    default:
      if (dynamicFields.length > 0) {
        const dynamicField = dynamicFields.find((definition) => definition.key === normalizedField);
        if (dynamicField) {
          return getDynamicChargeFieldValue(agreement, dynamicField);
        }
      }
      const dynamicFallback = resolveDynamicChargeFieldByKey(agreement, normalizedField);
      if (dynamicFallback !== null) {
        return dynamicFallback;
      }
      return agreement?.[normalizedField] ?? tenant?.[normalizedField];
  }
};

const sortTenantRows = (rows: Record<string, any>[], field: string, direction: 'asc' | 'desc') => {
  const factor = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[field];
    const right = b[field];

    if (left === right) return 0;
    if (left === null || left === undefined || left === '') return 1 * factor;
    if (right === null || right === undefined || right === '') return -1 * factor;

    const leftDate = toDate(left);
    const rightDate = toDate(right);
    if (leftDate && rightDate) {
      return (leftDate.getTime() - rightDate.getTime()) * factor;
    }

    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return (leftNumber - rightNumber) * factor;
    }

    return String(left).localeCompare(String(right)) * factor;
  });
};

const fetchTenantSheetData = async (
  sheet: SheetConfig,
  globalFilters: GlobalReportFilters,
  dynamicFields: TenantDynamicChargeFieldDefinition[] = []
): Promise<ExportSheet> => {
  const mergedFilters = normalizeTenantFilters({
    ...globalFilters,
    ...(sheet.filters ?? {}),
    ...(sheet.additionalFilters ?? {}),
  });

  const sortConfig = sheet.sortOrder ?? sheet.sort;
  const requestedSortField = normalizeTenantFieldKey(sortConfig?.field || 'company');
  const sortField = requestedSortField;
  const sortDirection = sortConfig?.direction || globalFilters.sortOrder || 'asc';
  const normalizedFields = (sheet.fields || []).map(normalizeTenantFieldKey);

  const [tenantsRes, agreementsRes] = await Promise.all([
    supabase.from('tenants').select('*').order('company'),
    supabase.from('agreements').select('*').order('created_at', { ascending: false }),
  ]);

  if (tenantsRes.error) throw tenantsRes.error;
  if (agreementsRes.error) throw agreementsRes.error;

  const tenants = tenantsRes.data || [];
  const agreements = agreementsRes.data || [];
  const agreementsByTenant = agreements.reduce<Record<string, any[]>>((acc, agreement) => {
    if (!acc[agreement.tenant_id]) acc[agreement.tenant_id] = [];
    acc[agreement.tenant_id].push(agreement);
    return acc;
  }, {});

  const refs = await buildTenantLookupMaps(agreements, tenants, mergedFilters);
  const rows: Record<string, any>[] = [];

  tenants.forEach((tenant) => {
    const tenantAgreements = agreementsByTenant[tenant.id] || [null];
    const matchingAgreements = tenantAgreements.filter((agr) =>
      matchesTenantFilters(tenant, agr || {}, mergedFilters, refs)
    );

    if (matchingAgreements.length === 0) return;

    const primaryAgreement = matchingAgreements[0] || {};
    const agreementBlocks: ParsedTenantAgreementBlock[] = matchingAgreements.map((agr) => ({
      agreement: parseAgreementItem(agr, tenant, refs, dynamicFields),
      spaces: parseSpaceAssignments(agr, tenant, refs),
      escalations: parseTenantEscalationsDirect(agr, tenant, refs),
    }));

    const allAgreements = agreementBlocks.map((b) => b.agreement);
    const allSpaceAssignments = agreementBlocks.flatMap((b) => b.spaces);
    const allEscalations = agreementBlocks.flatMap((b) => b.escalations);

    const row = (sheet.fields || []).reduce<Record<string, any>>((acc, originalField) => {
      const normalizedField = normalizeTenantFieldKey(originalField);
      const raw = resolveTenantFieldValue(normalizedField, tenant, primaryAgreement, refs, dynamicFields);
      const formatted = formatExportValue(raw);
      acc[originalField] = formatted;
      acc[normalizedField] = formatted;
      return acc;
    }, {});
    row.__sortValue = resolveTenantFieldValue(sortField, tenant, primaryAgreement, refs, dynamicFields);

    if (allAgreements.length > 0) {
      const firstAgr = allAgreements[0];
      Object.assign(row, firstAgr);
    }
    row.__parsedAgreements = allAgreements;
    row.__parsedAgreementBlocks = agreementBlocks;

    if (allEscalations.length > 0) {
      const lastEsc = allEscalations[allEscalations.length - 1];
      row['escalation_date'] = lastEsc.date;
      row['escalation_percent'] = lastEsc.percent;
      row['escalation_new_rent'] = lastEsc.newRent;
      row['escalation_floor'] = lastEsc.floor;
    }
    row.__parsedEscalations = allEscalations;

    if (allSpaceAssignments.length > 0) {
      const sp = allSpaceAssignments[0];
      row['building'] = sp.building;
      row['floor'] = sp.floor;
      row['room'] = sp.room;
      row['space_count'] = sp.spaceCount;
      row['assignedunits'] = sp.assignedUnits;
      row['assigned_sqft'] = sp.assignedSqft;
      row['rate_per_sqft'] = sp.ratePerSqft;
      row['assignment_type'] = sp.assignmentType;
      row['space_type'] = sp.spaceType;
    }
    row.__parsedSpaceAssignments = allSpaceAssignments;

    rows.push(row);
  });

  const sortedRows = sortTenantRows(rows, '__sortValue', sortDirection).map((row) => {
    const { __sortValue, ...rest } = row;
    return rest;
  });

  return {
    name: sheet.name || 'Sheet',
    data: sortedRows,
    fields: sheet.fields || normalizedFields,
  };
};

const buildSelectFields = (fields: string[], sortField: string) => {
  const selectFields = new Set(fields);
  selectFields.add(sortField);
  selectFields.add('asset_id');
  return Array.from(selectFields);
};

const fetchHelpdeskSheetData = async (
  sheet: SheetConfig,
  globalFilters: GlobalReportFilters
): Promise<ExportSheet> => {
  const mergedFilters = {
    ...globalFilters,
    ...(sheet.filters ?? {}),
    ...(sheet.additionalFilters ?? {}),
  };

  const sortConfig = sheet.sortOrder ?? sheet.sort;
  const helpdeskSortableKeys = new Set([
    'ticket_number',
    'created_at',
    'tenant',
    'target_date',
    'resolved_at',
    'safety_risk',
    'previous_occurrence',
    'sla_deadline',
    'category',
    'sub_category',
    'priority',
    'status',
    'building',
    'floor',
    'room',
    'assigned_to',
    'description',
    'resolution_notes',
    'tenant_satisfaction',
    'creator_satisfaction',
    'opex_code',
    'updated_at',
  ]);
  const requestedSortField = normalizeHelpdeskFieldKey(sortConfig?.field || 'ticket_number');
  const sortField = helpdeskSortableKeys.has(requestedSortField) ? requestedSortField : 'ticket_number';
  const sortDirection = sortConfig?.direction || globalFilters.sortOrder || 'asc';
  const normalizedFields = normalizeHelpdeskFields(sheet.fields);
  const rows: any[] = [];
  let lastValue: any = null;

  while (true) {
    let query = supabase
      .from('maintenance_tickets')
      .select('*')
      .order(sortField, { ascending: sortDirection === 'asc' })
      .limit(PAGE_SIZE);

    if (lastValue !== null && lastValue !== undefined) {
      query = sortDirection === 'asc'
        ? query.gt(sortField, lastValue)
        : query.lt(sortField, lastValue);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    const refs = await buildHelpdeskLookupMaps(data, mergedFilters);
    const ticketIds = data.map((ticket) => ticket.id).filter(Boolean);
    let estimations: any[] = [];

    if (ticketIds.length > 0) {
      const { data: estimationData, error: estimationError } = await supabase
        .from('ticket_estimations')
        .select('*')
        .in('ticket_id', ticketIds)
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (estimationError) throw estimationError;
      estimations = estimationData || [];
    }

    const estimationMap = estimations.reduce<Record<string, any>>((acc, estimation) => {
      acc[estimation.ticket_id] = estimation;
      return acc;
    }, {});

    const filteredRows = data.filter((ticket) => matchesHelpdeskFilters(ticket, mergedFilters, refs));

      rows.push(
        ...filteredRows.map((ticket) => {
          const estimation = estimationMap[ticket.id];
          const rawMaterials = estimation?.materials || estimation?.selected_materials || ticket.materials;
          const parsedMaterials = parseMaterialsString(rawMaterials);

          const rowData: Record<string, any> = {};
          (sheet.fields || normalizedFields).forEach((originalField) => {
            const normalizedField = normalizeHelpdeskFieldKey(originalField);
            const raw = resolveHelpdeskFieldValue(normalizedField, ticket, estimation, refs);
            const formatted = formatExportValue(raw);
            rowData[originalField] = formatted;
            rowData[normalizedField] = formatted;
          });

          if (parsedMaterials.length > 0) {
            const firstMat = parsedMaterials[0];
            rowData['material_name'] = firstMat.name;
            rowData['material_qty'] = firstMat.qty;
            rowData['material_unit'] = firstMat.unit;
            rowData['material_rate'] = firstMat.rate;
            rowData['material_gst_percent'] = firstMat.gstPercent;
            rowData['material_amount'] = firstMat.qty * firstMat.rate * (1 + firstMat.gstPercent / 100);
          }

          rowData.__parsedMaterials = parsedMaterials;
          return rowData;
        })
      );

    const newLastValue = data[data.length - 1]?.[sortField];
    if (!newLastValue || data.length < PAGE_SIZE) {
      break;
    }

    lastValue = newLastValue;
  }

  return {
    name: sheet.name || 'Sheet',
    data: rows,
    fields: sheet.fields || normalizedFields,
  };
};

// Fetch movement data for the movement report type
const fetchMovementSheetData = async (
  sheet: SheetConfig,
  globalFilters: GlobalReportFilters
): Promise<ExportSheet> => {
  const mergedFilters = {
    ...globalFilters,
    ...(sheet.filters ?? {}),
    ...(sheet.additionalFilters ?? {}),
  } as Record<string, any>;

  const sortConfig = sheet.sortOrder ?? sheet.sort;
  const sortField = sortConfig?.field || 'id';
  const sortDirection = sortConfig?.direction || globalFilters.sortOrder || 'asc';
  const selectFields = buildSelectFields(sheet.fields, sortField);

  let lastValue: any = null;
  const rows: any[] = [];

  while (true) {
    let query = supabase
      .from('asset_movements')
      .select(selectFields.join(', '))
      .order(sortField, { ascending: sortDirection === 'asc' })
      .limit(PAGE_SIZE);

    // Apply movement specific filters
    if (isActiveFilterValue(mergedFilters.movementType) && mergedFilters.movementType !== 'all') {
      query = query.eq('movement_type', mergedFilters.movementType);
    }
    if (isActiveFilterValue(mergedFilters.movementStatus) && mergedFilters.movementStatus !== 'all') {
      query = query.eq('status', mergedFilters.movementStatus);
    }
    if (isActiveFilterValue(mergedFilters.approvalStatus) && mergedFilters.approvalStatus !== 'all') {
      query = query.eq('approval_status', mergedFilters.approvalStatus);
    }
    if (isActiveFilterValue(mergedFilters.vendor) && mergedFilters.vendor !== 'all') {
      query = query.eq('vendor_id', mergedFilters.vendor);
    }
    if (isActiveFilterValue(mergedFilters.handoverTo) && mergedFilters.handoverTo !== 'all') {
      query = query.eq('handover_to', mergedFilters.handoverTo);
    }
    if (isActiveFilterValue(mergedFilters.fromTenant) && mergedFilters.fromTenant !== 'all') {
      query = query.eq('from_tenant', mergedFilters.fromTenant);
    }
    if (isActiveFilterValue(mergedFilters.toTenant) && mergedFilters.toTenant !== 'all') {
      query = query.eq('to_tenant', mergedFilters.toTenant);
    }
    if (isActiveFilterValue(mergedFilters.building) && mergedFilters.building !== 'all') {
      query = query.eq('building', mergedFilters.building);
    }
    if (isActiveFilterValue(mergedFilters.floor) && mergedFilters.floor !== 'all') {
      query = query.eq('floor_id', mergedFilters.floor);
    }
    if (isActiveFilterValue(mergedFilters.room) && mergedFilters.room !== 'all') {
      query = query.eq('room_id', mergedFilters.room);
    }
    // Date range on created_at
    if (mergedFilters.dateFrom) {
      query = query.gte('created_at', mergedFilters.dateFrom);
    }
    if (mergedFilters.dateTo) {
      query = query.lte('created_at', mergedFilters.dateTo);
    }

    if (lastValue !== null && lastValue !== undefined) {
      query = sortDirection === 'asc'
        ? query.gt(sortField, lastValue)
        : query.lt(sortField, lastValue);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    const newLastValue = data[data.length - 1][sortField];
    if (newLastValue === lastValue) break;
    lastValue = newLastValue;
  }

  // Resolve lookup maps similar to asset handling for related entities
  const buildingIds = gatherIds(rows.map((r) => r.building));
  const floorIds = gatherIds(rows.map((r) => r.floor_id));
  const roomIds = gatherIds(rows.map((r) => r.room_id));
  const tenantIds = gatherIds(rows.map((r) => r.handover_to || r.from_tenant || r.to_tenant));
  const vendorIds = gatherIds(rows.map((r) => r.vendor_id));

  const [buildingMap, floorMap, roomMap, tenantMap, vendorMap] = await Promise.all([
    fetchLookupMap('buildings', buildingIds, 'id, name', (row) => ({ id: row.id, label: row.name })),
    fetchLookupMap('floors', floorIds, 'id, floor_name, floor_number', (row) => ({ id: row.id, label: row.floor_name || `Floor ${row.floor_number}` })),
    fetchLookupMap('rooms', roomIds, 'id, room_number', (row) => ({ id: row.id, label: row.room_number })),
    fetchLookupMap('tenants', tenantIds, 'id, company, name', (row) => ({ id: row.id, label: row.company || row.name })),
    fetchLookupMap('vendors', vendorIds, 'id, vendor_name', (row) => ({ id: row.id, label: row.vendor_name })),
  ]);

  const filteredRows = rows.map((row) =>
    sheet.fields.reduce<Record<string, any>>((acc, field) => {
      const raw = row[field as keyof typeof row];
      switch (field) {
        case 'building':
          acc[field] = raw ? (buildingMap[raw] || raw) : raw;
          break;
        case 'floor_id':
          acc[field] = raw ? (floorMap[raw] || raw) : raw;
          break;
        case 'room_id':
          acc[field] = raw ? (roomMap[raw] || raw) : raw;
          break;
        case 'handover_to':
          acc[field] = raw ? (tenantMap[raw] || raw) : raw;
          break;
        case 'vendor_id':
          acc[field] = raw ? (vendorMap[raw] || raw) : raw;
          break;
        default:
          acc[field] = formatExportValue(raw);
      }
      return acc;
    }, {})
  );

  return {
    name: sheet.name || 'Sheet',
    data: filteredRows,
    fields: sheet.fields,
  };
};

const fetchSheetData = async (
  sheet: SheetConfig,
  globalFilters: GlobalReportFilters
): Promise<ExportSheet> => {
  const mergedFilters = {
    ...globalFilters,
    ...(sheet.filters ?? {}),
    ...(sheet.additionalFilters ?? {}),
  };

  const sortConfig = sheet.sortOrder ?? sheet.sort;
  const sortField = sortConfig?.field || 'asset_id';
  const sortDirection = sortConfig?.direction || globalFilters.sortOrder || 'asc';
  const selectFields = buildSelectFields(sheet.fields, sortField);

  let lastValue: any = null;
  const rows: any[] = [];

  while (true) {
    let query = supabase
      .from('assets')
      .select(selectFields.join(', '))
      .order(sortField, { ascending: sortDirection === 'asc' })
      .limit(PAGE_SIZE);

    query = applyReportFilters(query, mergedFilters);

    if (lastValue !== null && lastValue !== undefined) {
      query = sortDirection === 'asc'
        ? query.gt(sortField, lastValue)
        : query.lt(sortField, lastValue);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);

    const newLastValue = data[data.length - 1]?.[sortField];
    if (!newLastValue || data.length < PAGE_SIZE) {
      break;
    }

    lastValue = newLastValue;
  }

  // Resolve foreign-key IDs to human-readable names for common location/user fields
  const isUuid = (v: any) =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  const needBuilding = sheet.fields.includes('building');
  const needFloor = sheet.fields.includes('floor_id');
  const needRoom = sheet.fields.includes('room_id');
  const needTenant = sheet.fields.includes('handover_to');
  const userFields = ['asset_incharge', 'created_by', 'updated_by'];
  const needUsers = sheet.fields.some((f) => userFields.includes(f));
  const needVendor = sheet.fields.includes('vendor_id');
  const needCombination = sheet.fields.includes('asset_combination');
  const needIdConfig = sheet.fields.includes('id_config_id');

  const floorIds = needFloor
    ? Array.from(new Set(rows.map((r) => r.floor_id).filter(Boolean).filter(isUuid)))
    : [];
  const buildingIds = needBuilding
    ? Array.from(new Set(rows.map((r) => r.building).filter(Boolean).filter(isUuid)))
    : [];
  const roomIds = needRoom
    ? Array.from(new Set(rows.map((r) => r.room_id).filter(Boolean).filter(isUuid)))
    : [];
  const tenantIds = needTenant
    ? Array.from(new Set(rows.map((r) => r.handover_to).filter(Boolean).filter(isUuid)))
    : [];
  const userIds = needUsers
    ? Array.from(
        new Set(
          rows
            .flatMap((r) => [r.asset_incharge, r.created_by, r.updated_by])
            .filter(Boolean)
            .filter(isUuid)
        )
      )
    : [];

  const vendorIds = needVendor
    ? Array.from(new Set(rows.map((r) => r.vendor_id).filter(Boolean).filter(isUuid)))
    : [];

  const combIds = needCombination
    ? Array.from(new Set(rows.map((r) => r.asset_combination).filter(Boolean).filter(isUuid)))
    : [];

  const idConfigIds = needIdConfig
    ? Array.from(new Set(rows.map((r) => r.id_config_id).filter(Boolean).filter(isUuid)))
    : [];

  let floorsData: any[] = [];
  let buildingsData: any[] = [];
  let roomsData: any[] = [];
  let tenantsData: any[] = [];
  let usersData: any[] = [];
  let vendorsData: any[] = [];
  let combData: any[] = [];
  let idConfigData: any[] = [];

  if (floorIds.length) {
    const { data, error } = await supabase.from('floors').select('id, floor_name, floor_number').in('id', floorIds);
    if (error) throw error;
    floorsData = data || [];
  }

  if (buildingIds.length) {
    const { data, error } = await supabase.from('buildings').select('id, name').in('id', buildingIds);
    if (error) throw error;
    buildingsData = data || [];
  }

  if (roomIds.length) {
    const { data, error } = await supabase.from('rooms').select('id, room_number').in('id', roomIds);
    if (error) throw error;
    roomsData = data || [];
  }

  if (tenantIds.length) {
    const { data, error } = await supabase.from('tenants').select('id, company, name').in('id', tenantIds);
    if (error) throw error;
    tenantsData = data || [];
  }

  if (userIds.length) {
    const { data, error } = await supabase.from('users').select('id, name').in('id', userIds);
    if (error) throw error;
    usersData = data || [];
  }

  if (vendorIds.length) {
    const { data, error } = await supabase.from('vendors').select('id, vendor_name').in('id', vendorIds);
    if (error) throw error;
    vendorsData = data || [];
  }

  if (combIds.length) {
    const { data, error } = await supabase.from('sub_subcategory_combinations').select('id, name').in('id', combIds);
    if (error) throw error;
    combData = data || [];
  }

  if (idConfigIds.length) {
    const { data, error } = await supabase.from('id_configs').select('id, structure').in('id', idConfigIds);
    if (error) throw error;
    idConfigData = data || [];
  }

  const floorMap = floorsData.reduce<Record<string, string>>((acc, f) => {
    acc[f.id] = f.floor_name || `Floor ${f.floor_number}`;
    return acc;
  }, {});

  const buildingMap = buildingsData.reduce<Record<string, string>>((acc, b) => {
    acc[b.id] = b.name;
    return acc;
  }, {});

  const roomMap = roomsData.reduce<Record<string, string>>((acc, r) => {
    acc[r.id] = r.room_number;
    return acc;
  }, {});

  const tenantMap = tenantsData.reduce<Record<string, string>>((acc, t) => {
    acc[t.id] = t.company || t.name;
    return acc;
  }, {});

  const userMap = usersData.reduce<Record<string, string>>((acc, u) => {
    acc[u.id] = u.name;
    return acc;
  }, {});

  const vendorMap = vendorsData.reduce<Record<string, string>>((acc, v) => {
    acc[v.id] = v.vendor_name;
    return acc;
  }, {});

  const combMap = combData.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  const idConfigMap = idConfigData.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.structure || c.id;
    return acc;
  }, {});

  const filteredRows = rows.map((row) =>
    sheet.fields.reduce<Record<string, any>>((acc, field) => {
      const raw = row[field as keyof typeof row];

      switch (field) {
        case 'building':
          // If building stores a UUID, map to building name; otherwise use raw text
          acc[field] = raw ? (isUuid(raw) ? (buildingMap[raw] || raw) : raw) : raw;
          break;
        case 'floor_id':
          acc[field] = raw ? (floorMap[raw] || raw) : raw;
          break;
        case 'floor':
          acc[field] = raw;
          break;
        case 'room_id':
          acc[field] = raw ? (roomMap[raw] || raw) : raw;
          break;
        case 'room_rack':
        case 'room_rack_backup':
          acc[field] = raw;
          break;
        case 'handover_to':
          acc[field] = raw ? (tenantMap[raw] || raw) : raw;
          break;
        case 'asset_incharge':
        case 'created_by':
        case 'updated_by':
          // these are text in the assets schema; if they contain UUIDs we map to user names
          acc[field] = raw ? (isUuid(raw) ? (userMap[raw] || raw) : raw) : raw;
          break;
        case 'vendor_id':
          acc[field] = raw ? (vendorMap[raw] || raw) : raw;
          break;
        case 'asset_combination':
          acc[field] = raw ? (combMap[raw] || raw) : raw;
          break;
        case 'id_config_id':
          acc[field] = raw ? (idConfigMap[raw] || raw) : raw;
          break;
        case 'update_history':
          acc[field] = formatExportValue(raw);
          break;
        case 'asset_pictures':
          acc[field] = formatExportValue(raw);
          break;
        default:
          acc[field] = formatExportValue(raw);
      }

      return acc;
    }, {})
  );

  return {
    name: sheet.name || 'Sheet',
    data: filteredRows,
    fields: sheet.fields,
  };
};



export async function generateFlexibleReport({
  globalFilters,
  sheets,
  reportName,
  reportType = 'asset',
}: GenerateFlexibleReportInput): Promise<GenerateFlexibleReportResult> {
  const startTime = performance.now();
  const workbook = new ExcelJS.Workbook();
  let totalRows = 0;
  const tenantDynamicFields = reportType === 'tenant'
    ? await loadTenantDynamicChargeFields().catch((err) => {
        console.warn('Network error loading tenant dynamic fields:', err);
        return [];
      })
    : [];

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    const exportSheet = reportType === 'helpdesk'
      ? await fetchHelpdeskSheetData(sheet, globalFilters)
      : reportType === 'tenant'
        ? await fetchTenantSheetData(sheet, globalFilters, tenantDynamicFields)
        : reportType === 'movement'
          ? await fetchMovementSheetData(sheet, globalFilters)
          : await fetchSheetData(sheet, globalFilters);
    totalRows += exportSheet.data.length;

    // Filter out completely empty fields BEFORE setting worksheet.columns and adding rows
    // so headers and data row cells remain 100% physically aligned in every column
    const validFields = exportSheet.fields.filter((field) => {
      const normalizedKey = reportType === 'helpdesk'
        ? normalizeHelpdeskFieldKey(field)
        : reportType === 'tenant'
          ? normalizeTenantFieldKey(field)
          : field;

      if (reportType === 'helpdesk') {
        const materialKeys = new Set([
          'material_name',
          'material_qty',
          'material_unit',
          'material_rate',
          'material_gst_percent',
          'material_amount',
        ]);
        if (materialKeys.has(normalizedKey)) {
          const hasMaterials = exportSheet.data.some(
            (row) => Array.isArray(row.__parsedMaterials) && row.__parsedMaterials.length > 0
          );
          if (hasMaterials) return true;
        }
      }

      if (reportType === 'tenant') {
        const agreementKeys = new Set([
          'agreement_name',
          'agreement_status',
          'payment_cycle',
          'lease_agreement_date',
          'operation_date',
          'rent_commencement_date',
          'lease_end_date',
          'lock_in_period',
          'lease_tenure',
          'agreement_created_at',
          'agreement_updated_at',
          'lease_remaining_days',
          'agreement_age',
          'end_of_lock_in',
          'next_due_in',
          'next_escalation_date',
          'next_escalation_percentage',
          'escalation_count',
          'current_escalated_rent',
        ]);
        if (agreementKeys.has(normalizedKey)) {
          const hasAgreements = exportSheet.data.some(
            (row) => Array.isArray(row.__parsedAgreements) && row.__parsedAgreements.length > 0
          );
          if (hasAgreements) return true;
        }

        const escalationKeys = new Set([
          'escalation_date',
          'escalation_percent',
          'escalation_new_rent',
          'escalation_floor',
        ]);
        if (escalationKeys.has(normalizedKey)) {
          const hasEscalations = exportSheet.data.some(
            (row) => Array.isArray(row.__parsedEscalations) && row.__parsedEscalations.length > 0
          );
          if (hasEscalations) return true;
        }

        const spaceKeys = new Set([
          'building',
          'floor',
          'room',
          'space_count',
          'assignedunits',
          'assigned_sqft',
          'rate_per_sqft',
          'assignment_type',
          'space_type',
        ]);
        if (spaceKeys.has(normalizedKey)) {
          const hasSpaces = exportSheet.data.some(
            (row) => Array.isArray(row.__parsedSpaceAssignments) && row.__parsedSpaceAssignments.length > 0
          );
          if (hasSpaces) return true;
        }
      }

      return exportSheet.data.some((row) => {
        const cell = row[field] ?? row[normalizedKey];
        return cell !== null && cell !== undefined && cell !== '';
      });
    });

    const finalFields = validFields.length > 0 ? validFields : exportSheet.fields;

    const worksheet = workbook.addWorksheet(exportSheet.name || `Sheet ${index + 1}`);
    worksheet.columns = finalFields.map((field) => ({
      header: reportType === 'helpdesk'
        ? getHelpdeskFieldLabel(field)
        : reportType === 'tenant'
        ? getTenantFieldLabel(field, tenantDynamicFields)
        : getFieldLabel(field),
      key: field,
      width: 20,
    }));

    // ---------------------------------------------------------------------
    // Row population and running totals calculation
    // ---------------------------------------------------------------------
    const runningTotals: Record<string, number> = {};
    if (sheet.totalsFor && sheet.totalsFor.length > 0) {
      sheet.totalsFor.forEach((key) => {
        runningTotals[key] = 0;
      });
    }

    // Clean data rows according to new Helpdesk export requirements before adding to worksheet.
    const cleanRow = (row: Record<string, any>) => {
      const cleaned: Record<string, any> = { ...row };
      // Resolution Notes – replace line breaks with spaces and trim.
      if (cleaned['resolution_notes'] && typeof cleaned['resolution_notes'] === 'string') {
        cleaned['resolution_notes'] = cleaned['resolution_notes'].replace(/\r?\n/g, ' ').trim();
      }
      // Materials – replace newlines with commas.
      if (cleaned['materials'] && typeof cleaned['materials'] === 'string') {
        cleaned['materials'] = cleaned['materials'].replace(/\r?\n/g, ', ');
      }
      // ISO timestamps – reformat to "YYYY-MM-DD HH:MM:SS".
      Object.keys(cleaned).forEach((key) => {
        const val = cleaned[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(val)) {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            const pad = (n: number) => n.toString().padStart(2, '0');
            cleaned[key] = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
          }
        }
      });
      return cleaned;
    };

    const cleanedData = exportSheet.data.map(cleanRow);

    if (reportType === 'helpdesk') {
      worksheet.properties.outlineProperties = {
        summaryBelow: true,
        summaryRight: true,
      };

      const getColLetter = (index: number): string => {
        let temp = '';
        let letter = '';
        let colIndex = index;
        while (colIndex > 0) {
          temp = (colIndex - 1) % 26;
          letter = String.fromCharCode(65 + temp) + letter;
          colIndex = Math.floor((colIndex - temp - 1) / 26);
        }
        return letter;
      };

      const findColIdx = (key: string) => {
        const normKey = normalizeHelpdeskFieldKey(key);
        const idx = finalFields.findIndex((f) => normalizeHelpdeskFieldKey(f) === normKey);
        return idx >= 0 ? idx + 1 : -1;
      };

      const qtyColIdx = findColIdx('material_qty');
      const rateColIdx = findColIdx('material_rate');
      const gstColIdx = findColIdx('material_gst_percent');
      const amountColIdx = findColIdx('material_amount');

      const qtyColLetter = qtyColIdx > 0 ? getColLetter(qtyColIdx) : '';
      const rateColLetter = rateColIdx > 0 ? getColLetter(rateColIdx) : '';
      const gstColLetter = gstColIdx > 0 ? getColLetter(gstColIdx) : '';
      const amountColLetter = amountColIdx > 0 ? getColLetter(amountColIdx) : '';

      let currentExcelRow = 2; // Row 1 is header

      cleanedData.forEach((ticketRow) => {
        const materials = (ticketRow.__parsedMaterials || []) as ParsedMaterialItem[];

        if (materials.length <= 1) {
          // 0 or 1 material: Write 1 row as today
          const mat = materials[0];
          const singleRowData: Record<string, any> = { ...ticketRow };

          if (mat) {
            singleRowData['material_name'] = mat.name;
            singleRowData['material_qty'] = mat.qty;
            singleRowData['material_unit'] = mat.unit;
            singleRowData['material_rate'] = mat.rate;
            singleRowData['material_gst_percent'] = mat.gstPercent;
          }

          const addedRow = worksheet.addRow(singleRowData);
          addedRow.outlineLevel = 0;

          if (mat && amountColIdx > 0 && qtyColIdx > 0 && rateColIdx > 0 && gstColIdx > 0) {
            const formulaStr = `${qtyColLetter}${currentExcelRow}*${rateColLetter}${currentExcelRow}*(1+${gstColLetter}${currentExcelRow}/100)`;
            const calcAmount = mat.qty * mat.rate * (1 + mat.gstPercent / 100);
            addedRow.getCell(amountColIdx).value = { formula: formulaStr, result: calcAmount };

            if (sheet.totalsFor && sheet.totalsFor.includes('material_amount')) {
              runningTotals['material_amount'] = (runningTotals['material_amount'] ?? 0) + calcAmount;
            }
          }

          currentExcelRow += 1;
        } else {
          // 2+ materials: Write detail rows FIRST, followed by ONE summary row AFTER (below)
          const startDetailRow = currentExcelRow;

          materials.forEach((mat) => {
            const detailRowData: Record<string, any> = {};
            finalFields.forEach((f) => {
              detailRowData[f] = '';
            });
            detailRowData['material_name'] = mat.name;
            detailRowData['material_qty'] = mat.qty;
            detailRowData['material_unit'] = mat.unit;
            detailRowData['material_rate'] = mat.rate;
            detailRowData['material_gst_percent'] = mat.gstPercent;

            const detailRow = worksheet.addRow(detailRowData);
            detailRow.outlineLevel = 1;
            detailRow.hidden = true; // Collapsed by default

            if (amountColIdx > 0 && qtyColIdx > 0 && rateColIdx > 0 && gstColIdx > 0) {
              const formulaStr = `${qtyColLetter}${currentExcelRow}*${rateColLetter}${currentExcelRow}*(1+${gstColLetter}${currentExcelRow}/100)`;
              const calcAmount = mat.qty * mat.rate * (1 + mat.gstPercent / 100);
              detailRow.getCell(amountColIdx).value = { formula: formulaStr, result: calcAmount };
            }

            currentExcelRow += 1;
          });

          const endDetailRow = currentExcelRow - 1;

          // Summary row AFTER (below) detail rows
          const summaryRowData: Record<string, any> = { ...ticketRow };
          summaryRowData['material_name'] = `${materials.length} materials`;
          summaryRowData['material_qty'] = '';
          summaryRowData['material_unit'] = '';
          summaryRowData['material_rate'] = '';
          summaryRowData['material_gst_percent'] = '';

          const summaryRow = worksheet.addRow(summaryRowData);
          summaryRow.outlineLevel = 0;

          if (amountColIdx > 0) {
            const sumFormula = `SUM(${amountColLetter}${startDetailRow}:${amountColLetter}${endDetailRow})`;
            const totalMaterialAmount = materials.reduce((sum, m) => sum + (m.qty * m.rate * (1 + m.gstPercent / 100)), 0);
            summaryRow.getCell(amountColIdx).value = { formula: sumFormula, result: totalMaterialAmount };

            if (sheet.totalsFor && sheet.totalsFor.includes('material_amount')) {
              runningTotals['material_amount'] = (runningTotals['material_amount'] ?? 0) + totalMaterialAmount;
            }
          }

          currentExcelRow += 1;
        }

        // Accumulate running totals for non-material totals requested in sheet.totalsFor
        if (sheet.totalsFor && sheet.totalsFor.length > 0) {
          sheet.totalsFor.forEach((key) => {
            if (key === 'material_amount') return;
            const raw = ticketRow[key];
            let num = typeof raw === 'number' ? raw : parseFloat(raw as any);
            if (isNaN(num) && typeof raw === 'string') {
              const numbers = raw.match(/[\d,.]+/g);
              if (numbers && numbers.length > 0) {
                for (let i = numbers.length - 1; i >= 0; i--) {
                  const cleaned = numbers[i].replace(/,/g, '');
                  const val = parseFloat(cleaned);
                  if (!isNaN(val)) {
                    num = val;
                    break;
                  }
                }
              }
            }
            if (!isNaN(num)) {
              runningTotals[key] = (runningTotals[key] ?? 0) + num;
            }
          });
        }
      });
    } else if (reportType === 'tenant') {
      worksheet.properties.outlineProperties = {
        summaryBelow: true,
        summaryRight: true,
      };

      cleanedData.forEach((tenantRow) => {
        const blocks = (tenantRow.__parsedAgreementBlocks || []) as ParsedTenantAgreementBlock[];
        const totalAgreements = blocks.length;
        const totalSpaces = blocks.reduce((sum, b) => sum + b.spaces.length, 0);
        const totalEscalations = blocks.reduce((sum, b) => sum + b.escalations.length, 0);

        const isMultiBreakdown = totalAgreements >= 2 || totalSpaces >= 2 || totalEscalations >= 2;

        if (isMultiBreakdown) {
          // Loop through each agreement block for this tenant:
          // Agreement 1 -> its spaces -> its escalations
          // Agreement 2 -> its spaces -> its escalations...
          blocks.forEach((block) => {
            const agr = block.agreement;

            // 1. Write Agreement header / detail row
            if (totalAgreements >= 2 || agr.agreement_name) {
              const detailRowData: Record<string, any> = {};
              finalFields.forEach((f) => {
                detailRowData[f] = '';
              });

              detailRowData['agreement_name'] = agr.agreement_name;
              detailRowData['agreement_status'] = agr.agreement_status;
              detailRowData['payment_cycle'] = agr.payment_cycle;
              detailRowData['lease_agreement_date'] = agr.lease_agreement_date;
              detailRowData['operation_date'] = agr.operation_date;
              detailRowData['rent_commencement_date'] = agr.rent_commencement_date;
              detailRowData['lease_end_date'] = agr.lease_end_date;
              detailRowData['lock_in_period'] = agr.lock_in_period;
              detailRowData['lease_tenure'] = agr.lease_tenure;
              detailRowData['agreement_created_at'] = agr.agreement_created_at;
              detailRowData['agreement_updated_at'] = agr.agreement_updated_at;
              detailRowData['lease_remaining_days'] = agr.lease_remaining_days;
              detailRowData['agreement_age'] = agr.agreement_age;
              detailRowData['end_of_lock_in'] = agr.end_of_lock_in;
              detailRowData['next_due_in'] = agr.next_due_in;
              detailRowData['next_escalation_date'] = agr.next_escalation_date;
              detailRowData['next_escalation_percentage'] = agr.next_escalation_percentage;
              detailRowData['escalation_count'] = agr.escalation_count;
              detailRowData['current_escalated_rent'] = agr.current_escalated_rent;

              const agrRow = worksheet.addRow(detailRowData);
              agrRow.outlineLevel = 1;
              agrRow.hidden = true; // Collapsed by default
            }

            // 2. Write Space detail rows for THIS agreement
            block.spaces.forEach((sp) => {
              const detailRowData: Record<string, any> = {};
              finalFields.forEach((f) => {
                detailRowData[f] = '';
              });

              detailRowData['building'] = sp.building;
              detailRowData['floor'] = sp.floor;
              detailRowData['room'] = sp.room;
              detailRowData['space_count'] = sp.spaceCount;
              detailRowData['assignedunits'] = sp.assignedUnits;
              detailRowData['assigned_sqft'] = sp.assignedSqft;
              detailRowData['rate_per_sqft'] = sp.ratePerSqft;
              detailRowData['assignment_type'] = sp.assignmentType;
              detailRowData['space_type'] = sp.spaceType;

              const spaceRow = worksheet.addRow(detailRowData);
              spaceRow.outlineLevel = 1;
              spaceRow.hidden = true; // Collapsed by default
            });

            // 3. Write Escalation detail rows for THIS agreement
            block.escalations.forEach((esc) => {
              const detailRowData: Record<string, any> = {};
              finalFields.forEach((f) => {
                detailRowData[f] = '';
              });

              detailRowData['escalation_date'] = esc.date;
              detailRowData['escalation_percent'] = esc.percent;
              detailRowData['escalation_new_rent'] = esc.newRent;
              detailRowData['escalation_floor'] = esc.floor;

              const escRow = worksheet.addRow(detailRowData);
              escRow.outlineLevel = 1;
              escRow.hidden = true; // Collapsed by default
            });
          });

          // 4. Write ONE Master Summary Row AFTER (below) all agreement blocks
          const summaryRowData: Record<string, any> = { ...tenantRow };

          if (totalAgreements >= 2) {
            summaryRowData['agreement_name'] = `${totalAgreements} agreements`;
            summaryRowData['agreement_status'] = 'Multiple';
          }

          if (totalSpaces >= 2) {
            const allSpaces = blocks.flatMap((b) => b.spaces);
            const totalSqft = allSpaces.reduce((sum, s) => sum + s.assignedSqft, 0);
            const rateWeighted = allSpaces.reduce((sum, s) => sum + (s.assignedSqft * s.ratePerSqft), 0);
            const avgRate = totalSqft > 0 ? rateWeighted / totalSqft : 0;
            const buildingsJoined = Array.from(new Set(allSpaces.map((s) => s.building).filter(Boolean))).join(', ');
            const typesJoined = Array.from(new Set(allSpaces.map((s) => s.assignmentType).filter(Boolean))).join(', ');
            const spaceTypesJoined = Array.from(new Set(allSpaces.map((s) => s.spaceType).filter(Boolean))).join(', ');

            summaryRowData['building'] = buildingsJoined || `${totalSpaces} spaces`;
            summaryRowData['space_count'] = totalSpaces;
            summaryRowData['assigned_sqft'] = totalSqft;
            if (avgRate > 0) summaryRowData['rate_per_sqft'] = avgRate;
            summaryRowData['assignment_type'] = typesJoined;
            summaryRowData['space_type'] = spaceTypesJoined;
          }

          if (totalEscalations >= 2) {
            const allEscs = blocks.flatMap((b) => b.escalations);
            summaryRowData['escalation_date'] = `${totalEscalations} escalations`;
            summaryRowData['escalation_percent'] = '';
            const latestRent = allEscs[allEscs.length - 1]?.newRent || '';
            summaryRowData['escalation_new_rent'] = latestRent;
            summaryRowData['escalation_floor'] = '';
          }

          const summaryRow = worksheet.addRow(summaryRowData);
          summaryRow.outlineLevel = 0;
        } else {
          // Standard single row
          const firstBlock = blocks[0];
          const agr = firstBlock?.agreement;
          const sp = firstBlock?.spaces[0];
          const esc = firstBlock?.escalations[0];
          const singleRowData: Record<string, any> = { ...tenantRow };

          if (agr) {
            singleRowData['agreement_name'] = agr.agreement_name;
            singleRowData['agreement_status'] = agr.agreement_status;
            singleRowData['payment_cycle'] = agr.payment_cycle;
            singleRowData['lease_agreement_date'] = agr.lease_agreement_date;
            singleRowData['operation_date'] = agr.operation_date;
            singleRowData['rent_commencement_date'] = agr.rent_commencement_date;
            singleRowData['lease_end_date'] = agr.lease_end_date;
            singleRowData['lock_in_period'] = agr.lock_in_period;
            singleRowData['lease_tenure'] = agr.lease_tenure;
            singleRowData['agreement_created_at'] = agr.agreement_created_at;
            singleRowData['agreement_updated_at'] = agr.agreement_updated_at;
            singleRowData['lease_remaining_days'] = agr.lease_remaining_days;
            singleRowData['agreement_age'] = agr.agreement_age;
            singleRowData['end_of_lock_in'] = agr.end_of_lock_in;
            singleRowData['next_due_in'] = agr.next_due_in;
            singleRowData['next_escalation_date'] = agr.next_escalation_date;
            singleRowData['next_escalation_percentage'] = agr.next_escalation_percentage;
            singleRowData['escalation_count'] = agr.escalation_count;
            singleRowData['current_escalated_rent'] = agr.current_escalated_rent;
          }

          if (sp) {
            singleRowData['building'] = sp.building;
            singleRowData['floor'] = sp.floor;
            singleRowData['room'] = sp.room;
            singleRowData['space_count'] = sp.spaceCount;
            singleRowData['assignedunits'] = sp.assignedUnits;
            singleRowData['assigned_sqft'] = sp.assignedSqft;
            singleRowData['rate_per_sqft'] = sp.ratePerSqft;
            singleRowData['assignment_type'] = sp.assignmentType;
            singleRowData['space_type'] = sp.spaceType;
          }

          if (esc) {
            singleRowData['escalation_date'] = esc.date;
            singleRowData['escalation_percent'] = esc.percent;
            singleRowData['escalation_new_rent'] = esc.newRent;
            singleRowData['escalation_floor'] = esc.floor;
          }

          const addedRow = worksheet.addRow(singleRowData);
          addedRow.outlineLevel = 0;
        }

        // Accumulate totals for requested fields while iterating rows
        if (sheet.totalsFor && sheet.totalsFor.length > 0) {
          sheet.totalsFor.forEach((key) => {
            const raw = tenantRow[key];
            let num = typeof raw === 'number' ? raw : parseFloat(raw as any);
            if (isNaN(num) && typeof raw === 'string') {
              const numbers = raw.match(/[\d,.]+/g);
              if (numbers && numbers.length > 0) {
                for (let i = numbers.length - 1; i >= 0; i--) {
                  const cleaned = numbers[i].replace(/,/g, '');
                  const val = parseFloat(cleaned);
                  if (!isNaN(val)) {
                    num = val;
                    break;
                  }
                }
              }
            }
            if (!isNaN(num)) {
              runningTotals[key] = (runningTotals[key] ?? 0) + num;
            }
          });
        }
      });
    } else {
      cleanedData.forEach((row) => {
        worksheet.addRow(row);
        // Accumulate totals for the requested fields while iterating rows
        if (sheet.totalsFor && sheet.totalsFor.length > 0) {
          sheet.totalsFor.forEach((key) => {
            const raw = row[key];
            let num = typeof raw === 'number' ? raw : parseFloat(raw as any);
            if (isNaN(num) && typeof raw === 'string') {
              const numbers = raw.match(/[\d,.]+/g);
              if (numbers && numbers.length > 0) {
                for (let i = numbers.length - 1; i >= 0; i--) {
                  const cleaned = numbers[i].replace(/,/g, '');
                  const val = parseFloat(cleaned);
                  if (!isNaN(val)) {
                    num = val;
                    break;
                  }
                }
              }
            }
            if (!isNaN(num)) {
              runningTotals[key] = (runningTotals[key] ?? 0) + num;
            }
          });
        }
      });
    }

    // ---------------------------------------------------------------------
    // Totals row handling – per‑sheet totals defined in `sheet.totalsFor`
    // ---------------------------------------------------------------------
    if (sheet.totalsFor && sheet.totalsFor.length > 0) {
      // Initialise a totals object with empty strings for all columns
      const totalsRowData: Record<string, any> = {};
      finalFields.forEach((field) => {
        totalsRowData[field] = '';
      });
      // Place the label "Total" in the first column (or first field)
      const firstField = finalFields[0];
      if (firstField) totalsRowData[firstField] = 'Total';

      // Populate the computed running totals
      sheet.totalsFor.forEach((key) => {
        totalsRowData[key] = runningTotals[key] ?? 0;
      });

      const totalRow = worksheet.addRow(totalsRowData);
      // Apply bold styling to the totals row for emphasis
      totalRow.font = { bold: true };
    }

    // ---------------------------------------------------------------------
    // Custom Footer / Signature Row handling – defined in `sheet.footerConfig`
    // ---------------------------------------------------------------------
    let signatureRowNumber: number | null = null;
    if (sheet.footerConfig?.enabled) {
      const { leftText, leftCentreText, rightCentreText, rightText } = sheet.footerConfig;
      const hasAnyText = Boolean(
        (leftText && leftText.trim()) ||
        (leftCentreText && leftCentreText.trim()) ||
        (rightCentreText && rightCentreText.trim()) ||
        (rightText && rightText.trim())
      );

      if (hasAnyText) {
        // Add 2 blank rows for spacing / signature gap
        worksheet.addRow([]);
        worksheet.addRow([]);

        const footerRowData: Record<string, any> = {};
        finalFields.forEach((f) => {
          footerRowData[f] = '';
        });

        const N = finalFields.length;
        const c1 = 1;
        const c2 = Math.max(1, Math.floor(N / 4));
        const c3 = c2 + 1;
        const c4 = Math.max(c3, Math.floor(N / 2));
        const c5 = c4 + 1;
        const c6 = Math.max(c5, Math.floor((3 * N) / 4));
        const c7 = c6 + 1;
        const c8 = N;

        if (leftText && leftText.trim() && finalFields[c1 - 1]) {
          footerRowData[finalFields[c1 - 1]] = leftText.trim();
        }
        if (leftCentreText && leftCentreText.trim() && finalFields[c3 - 1]) {
          footerRowData[finalFields[c3 - 1]] = leftCentreText.trim();
        }
        if (rightCentreText && rightCentreText.trim() && finalFields[c5 - 1]) {
          footerRowData[finalFields[c5 - 1]] = rightCentreText.trim();
        }
        if (rightText && rightText.trim() && finalFields[c7 - 1]) {
          footerRowData[finalFields[c7 - 1]] = rightText.trim();
        }

        const fRow = worksheet.addRow(footerRowData);
        signatureRowNumber = fRow.number;
        fRow.height = 26;

        if (c2 > c1) worksheet.mergeCells(fRow.number, c1, fRow.number, c2);
        if (c4 > c3) worksheet.mergeCells(fRow.number, c3, fRow.number, c4);
        if (c6 > c5) worksheet.mergeCells(fRow.number, c5, fRow.number, c6);
        if (c8 > c7) worksheet.mergeCells(fRow.number, c7, fRow.number, c8);

        // Styling the merged signature cells
        const leftCell = fRow.getCell(c1);
        leftCell.font = { bold: true, size: 11, name: 'Calibri' };
        leftCell.alignment = { horizontal: 'left', vertical: 'middle' };

        const leftCentreCell = fRow.getCell(c3);
        leftCentreCell.font = { bold: true, size: 11, name: 'Calibri' };
        leftCentreCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const rightCentreCell = fRow.getCell(c5);
        rightCentreCell.font = { bold: true, size: 11, name: 'Calibri' };
        rightCentreCell.alignment = { horizontal: 'center', vertical: 'middle' };

        const rightCell = fRow.getCell(c7);
        rightCell.font = { bold: true, size: 11, name: 'Calibri' };
        rightCell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    }

    // ---------------------------------------------------------------------
    // Post‑processing: data cleanup and styling
    // ---------------------------------------------------------------------

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    // Updated header fill color per new requirement.
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // 3️⃣ Uniform styling with strict fixed row height and disabled wrapText
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.height = 22;
        return;
      }
      if (rowNumber === signatureRowNumber) {
        row.height = 26;
        return;
      }
      // Strictly enforce fixed row height for every data row
      row.height = 20;

      row.eachCell({ includeEmpty: true }, (cell) => {
        if (signatureRowNumber && rowNumber >= signatureRowNumber - 2 && rowNumber <= signatureRowNumber) {
          if (rowNumber === signatureRowNumber) {
            cell.alignment = { vertical: 'middle', wrapText: false };
          }
          return;
        }

        cell.border = {
          top: { style: 'thin', color: { argb: 'D3D3D3' } },
          left: { style: 'thin', color: { argb: 'D3D3D3' } },
          bottom: { style: 'thin', color: { argb: 'D3D3D3' } },
          right: { style: 'thin', color: { argb: 'D3D3D3' } },
        };
        // Set wrapText to false to prevent Excel auto-fit from stretching row heights
        cell.alignment = { vertical: 'middle', wrapText: false };
      });
    });

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `${reportName || (reportType === 'helpdesk' ? 'Helpdesk_Report' : reportType === 'tenant' ? 'Tenant_Report' : 'Asset_Report')}_${new Date().toISOString().split('T')[0]}.xlsx`;

  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);

  return {
    filename,
    totalSheets: sheets.length,
    totalRows,
    generationTimeMs: Math.round(performance.now() - startTime),
  };
}
