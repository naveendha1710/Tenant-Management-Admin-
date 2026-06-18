import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabaseClient';
import { GlobalReportFilters } from '@/store/useGlobalReportFilterStore';
import { SheetConfig } from '@/store/useReportSheetStore';
import { getFieldLabel } from './reportFieldRegistry';
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

const isActiveFilterValue = (value?: string) => {
  return value !== undefined && value !== null && value !== '' && value !== 'all';
};

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

const buildSelectFields = (fields: string[], sortField: string) => {
  const selectFields = new Set(fields);
  selectFields.add(sortField);
  selectFields.add('asset_id');
  return Array.from(selectFields);
};

const fetchSheetData = async (
  sheet: SheetConfig,
  globalFilters: GlobalReportFilters
): Promise<ExportSheet> => {
  const mergedFilters = {
    ...globalFilters,
    ...(sheet.additionalFilters ?? sheet.filters ?? {}),
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
          acc[field] = raw ? JSON.stringify(raw) : raw;
          break;
        case 'asset_pictures':
          acc[field] = raw ? (typeof raw === 'string' ? raw : JSON.stringify(raw)) : raw;
          break;
        default:
          acc[field] = raw;
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
}: GenerateFlexibleReportInput): Promise<GenerateFlexibleReportResult> {
  const startTime = performance.now();
  const workbook = new ExcelJS.Workbook();
  let totalRows = 0;

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    const exportSheet = await fetchSheetData(sheet, globalFilters);
    totalRows += exportSheet.data.length;

    const worksheet = workbook.addWorksheet(exportSheet.name || `Sheet ${index + 1}`);
    worksheet.columns = exportSheet.fields.map((field) => ({
      header: getFieldLabel(field),
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
  const filename = `${reportName || 'Asset_Report'}_${new Date().toISOString().split('T')[0]}.xlsx`;

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
