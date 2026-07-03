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

const isActiveFilterValue = (value?: string) => {
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

const formatExportValue = (value: any): string => {
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

const isActiveHelpdeskFilterValue = (value: any) => value !== undefined && value !== null && value !== '' && value !== 'all';

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
      query = query.eq(column, value);
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

  const matchesText = (fieldValue: any, filterValue: any, lookup?: Record<string, string>) => {
    if (!isActiveHelpdeskFilterValue(filterValue)) return true;
    const resolvedValue = resolveHelpdeskValue(fieldValue, lookup || {});
    const resolvedFilter = resolveHelpdeskValue(filterValue, lookup || {});
    return normalizeValue(resolvedValue) === normalizeValue(filterValue)
      || normalizeValue(resolvedValue) === normalizeValue(resolvedFilter);
  };

  if (isActiveHelpdeskFilterValue(ticketCategory) && normalizeValue(ticket.category) !== normalizeValue(ticketCategory)) {
    return false;
  }

  if (isActiveHelpdeskFilterValue(ticketSubCategory) && normalizeValue(ticket.sub_category) !== normalizeValue(ticketSubCategory)) {
    return false;
  }

  if (isActiveHelpdeskFilterValue(filters.priority) && normalizeValue(ticket.priority) !== normalizeValue(filters.priority)) {
    return false;
  }

  if (isActiveHelpdeskFilterValue(filters.status) && normalizeValue(ticket.status) !== normalizeValue(filters.status)) {
    return false;
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
    case 'material_cost_with_gst':
      return estimation?.material_cost_with_gst ?? ticket.material_cost_with_gst ?? null;
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
    if (resolvedById) return resolvedById;
  }

  const floorName = floor?.floorName || floor?.floor_name || floor?.name;
  if (floorName) return String(floorName);

  const floorNumber = floor?.floorNumber ?? floor?.floor_number;
  if (floorNumber !== null && floorNumber !== undefined && floorNumber !== '') {
    return `Floor ${floorNumber}`;
  }

  return 'Unknown Floor';
};

const formatEscalations = (escalations: any[], floorLookup: Record<string, string> = {}) => {
  if (!Array.isArray(escalations) || escalations.length === 0) return '';

  return escalations
    .flatMap((esc) => {
      const date = esc?.date || esc?.effectiveDate || 'N/A';
      const percentage = formatTenantNumber(esc?.percentage ?? 0);
      const baseRent = formatTenantNumber(esc?.newRent ?? esc?.calculatedRent ?? 0);
      const floorEntries = Array.isArray(esc?.floorWiseEscalations) && esc.floorWiseEscalations.length > 0
        ? esc.floorWiseEscalations
        : [esc];

      return floorEntries.map((floorEntry: any) => {
        const rent = formatTenantNumber(
          floorEntry?.newRent ?? floorEntry?.calculatedRent ?? esc?.newRent ?? esc?.calculatedRent ?? 0
        ) || baseRent;
        const floor = resolveFloorNameFromLookup(floorEntry, floorLookup);
        const floorPercentage = formatTenantNumber(floorEntry?.percentage ?? esc?.percentage ?? 0);
        return `Date: ${date} | ${floorPercentage}% | New Rent: ${rent} | Floor: ${floor}`;
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

const getTenantEscalationMetrics = (agreement: any) => {
  const escalations = Array.isArray(agreement?.escalations) ? agreement.escalations : [];
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

const calculateCurrentEscalatedRent = (agreement: any) => {
  const baseRent = Number(agreement?.rent_amount || 0);
  const spaceAssignments = Array.isArray(agreement?.space_assignments) ? agreement.space_assignments : [];
  const {
    latestAppliedEscalation,
    latestEscalation,
  } = getTenantEscalationMetrics(agreement);
  const sortedAppliedEscalations = Array.isArray(agreement?.escalations)
    ? [...agreement.escalations]
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
  const escalationMetrics = getTenantEscalationMetrics(agreement);
  const currentEscalatedRent = calculateCurrentEscalatedRent(agreement);
  const lockInMonths = Number.parseInt(String(agreement?.lock_in_period ?? '').match(/\d+/)?.[0] || '', 10);
  const rentCommencementDate = toTenantDate(agreement?.rent_commencement_date);
  const nextDueDate = toTenantDate(tenant?.nextduedate);
  const leaseEndDate = toTenantDate(agreement?.lease_end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (normalizedField) {
    case 'tenant_id':
      return tenant.id;
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
      return formatTenantNumber(
        assignmentSummary.totalSqft > 0
        ? Number(agreement?.rent_amount || 0) / assignmentSummary.totalSqft
        : 0
      );
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
    case 'rate_per_sqft':
      return formatTenantNumber(assignmentSummary.ratePerSqft);
    case 'assignment_type':
      return assignmentSummary.assignmentType;
    case 'space_type':
      return assignmentSummary.spaceType;
    case 'maintenance_charges':
      return formatMaintenance(agreement?.maintenance_charges);
    case 'general_charges':
      return formatGeneralCharges(agreement?.general_charges);
    case 'service_charge':
      return formatServiceCharge(agreement?.service_charge);
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
    case 'escalations':
      return formatEscalations(agreement?.escalations, refs.floors);
    case 'building':
      return Array.from(new Set(assignments.map((assignment: any) => getSpaceAssignmentValue(assignment, 'building', refs.buildings)).filter(Boolean))).join('\n');
    case 'floor':
      return Array.from(new Set(assignments.map((assignment: any) => getSpaceAssignmentValue(assignment, 'floor', refs.floors)).filter(Boolean))).join('\n');
    case 'room':
      return Array.from(new Set(assignments.map((assignment: any) => getSpaceAssignmentValue(assignment, 'room', refs.rooms)).filter(Boolean))).join('\n');
    case 'space_summary':
      return buildSpaceSummary(agreement, refs);
    case 'space_count':
      return formatTenantNumber(assignments.length, 0);
    case 'assignedunits':
      return tenant.assignedunits || [];
    case 'space_assignments':
      return agreement?.space_assignments || [];
    case 'gst_number':
    case 'pan_number':
    case 'tan_number':
    case 'cin_number':
    case 'idproof':
      return tenant[normalizedField];
    case 'documents':
      return agreement?.documents || [];
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

    tenantAgreements.forEach((agreement) => {
      const agreementRecord = agreement || {};
      if (!matchesTenantFilters(tenant, agreementRecord, mergedFilters, refs)) {
        return;
      }

      const row = normalizedFields.reduce<Record<string, any>>((acc, field) => {
        const raw = resolveTenantFieldValue(field, tenant, agreementRecord, refs, dynamicFields);
        acc[field] = formatExportValue(raw);
        return acc;
      }, {});
      row.__sortValue = resolveTenantFieldValue(sortField, tenant, agreementRecord, refs, dynamicFields);

      rows.push(row);
    });
  });

  const sortedRows = sortTenantRows(rows, '__sortValue', sortDirection).map((row) => {
    const { __sortValue, ...rest } = row;
    return rest;
  });

  return {
    name: sheet.name || 'Sheet',
    data: sortedRows,
    fields: normalizedFields,
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
        ...filteredRows.map((ticket) =>
        normalizedFields.reduce<Record<string, any>>((acc, field) => {
          const estimation = estimationMap[ticket.id];
          const raw = resolveHelpdeskFieldValue(field, ticket, estimation, refs);
          acc[field] = formatExportValue(raw);

          return acc;
        }, {})
      )
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
    fields: normalizedFields,
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

const autoSizeColumns = (worksheet: ExcelJS.Worksheet) => {
  worksheet.columns?.forEach((column) => {
    let maxLength = 10;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      maxLength = Math.max(maxLength, cellValue.length + 2);
    });
    column.width = Math.min(Math.max(maxLength, 12), 40);
  });
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
    ? await loadTenantDynamicChargeFields()
    : [];

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    const exportSheet = reportType === 'helpdesk'
      ? await fetchHelpdeskSheetData(sheet, globalFilters)
      : reportType === 'tenant'
        ? await fetchTenantSheetData(sheet, globalFilters, tenantDynamicFields)
        : await fetchSheetData(sheet, globalFilters);
    totalRows += exportSheet.data.length;

    const worksheet = workbook.addWorksheet(exportSheet.name || `Sheet ${index + 1}`);
      worksheet.columns = exportSheet.fields.map((field) => ({
        header: reportType === 'helpdesk'
          ? getHelpdeskFieldLabel(field)
          : reportType === 'tenant'
          ? getTenantFieldLabel(field, tenantDynamicFields)
          : getFieldLabel(field),
        key: field,
        width: 20,
      }));

    exportSheet.data.forEach((row) => {
      worksheet.addRow(row);
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    autoSizeColumns(worksheet);
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
