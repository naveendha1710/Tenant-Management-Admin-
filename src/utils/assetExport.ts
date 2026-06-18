import ExcelJS from 'exceljs';
import { supabase } from '@/lib/supabaseClient';

interface AssetExportData {
  id: string;
  asset_id: string;
  manual_asset_id?: string;
  asset_name: string;
  asset_category: string;
  asset_sub_category?: string;
  asset_type?: string;
  make_model?: string;
  serial_number?: string;
  asset_status?: string;
  sez_status?: string;
  sez_classification?: string;
  customs_category?: string;
  customs_location?: string;
  sez_zone?: string;
  unit?: string;
  vendor_name?: string;
  po_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  boe_number?: string;
  boe_date?: string;
  cif_value?: number;
  import_date?: string;
  building?: string;
  floor?: string;
  room_rack?: string;
  manufacturer?: string;
  asset_description?: string;
  comments?: string;
  pm_date?: string;
  last_pm_date?: string;
  asset_incharge?: string;
  asset_spec?: string;
  purchase_date?: string;
  status?: string;
  warranty_date?: string;
  contract?: string;
  asset_value?: number;
  depreciation_date?: string;
  last_depreciation_date?: string;
  depreciation_percentage?: number;
  decommission_date?: string;
  handover_to?: string;
  tenant_company?: string;
  condition?: string;
  handover_other_name?: string;
  handover_other_email?: string;
  handover_other_contact?: string;
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
}

const formatCurrency = (value?: number) => value ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'N/A';
const formatPercent = (value?: number) => value ? `${value}%` : 'N/A';
const formatText = (value?: string) => value || 'N/A';

export async function generateAssetDetailExcel(assets: AssetExportData[], filename?: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Asset Details');

  sheet.columns = [
    { header: 'Asset ID',              key: 'asset_id',               width: 16 },
    { header: 'Manual Asset ID',       key: 'manual_asset_id',        width: 16 },
    { header: 'Asset Name',            key: 'asset_name',             width: 28 },
    { header: 'Asset Type',            key: 'asset_category',         width: 20 },
    { header: 'Category',              key: 'asset_sub_category',     width: 20 },
    { header: 'Sub Category',          key: 'asset_type',             width: 20 },
    { header: 'Manufacturer',          key: 'manufacturer',           width: 20 },
    { header: 'Make/Model',            key: 'make_model',             width: 20 },
    { header: 'Serial Number',         key: 'serial_number',          width: 20 },
    { header: 'Description',           key: 'asset_description',      width: 30 },
    { header: 'Specifications',        key: 'asset_spec',             width: 30 },
    { header: 'Asset Status',          key: 'asset_status',           width: 14 },
    { header: 'Working Status',        key: 'status',                 width: 14 },
    { header: 'Condition',             key: 'condition',              width: 14 },
    { header: 'Asset Value',           key: 'asset_value',            width: 16 },
    { header: 'Purchase Date',         key: 'purchase_date',          width: 15 },
    { header: 'PO Number',             key: 'po_number',              width: 16 },
    { header: 'Invoice Number',        key: 'invoice_number',         width: 16 },
    { header: 'Invoice Date',          key: 'invoice_date',           width: 15 },
    { header: 'Warranty Expiry',       key: 'warranty_date',          width: 15 },
    { header: 'PM Date',               key: 'pm_date',                width: 15 },
    { header: 'Last PM Date',          key: 'last_pm_date',           width: 15 },
    { header: 'Depreciation Date',     key: 'depreciation_date',      width: 16 },
    { header: 'Last Depreciation Date',key: 'last_depreciation_date', width: 18 },
    { header: 'Depreciation %',        key: 'depreciation_percentage',width: 14 },
    { header: 'Decommission Date',     key: 'decommission_date',      width: 16 },
    { header: 'Contract',              key: 'contract',               width: 10 },
    { header: 'Asset Incharge',        key: 'asset_incharge',         width: 20 },
    { header: 'Building',              key: 'building',               width: 20 },
    { header: 'Floor',                 key: 'floor',                  width: 15 },
    { header: 'Room/Rack',             key: 'room_rack',              width: 15 },
    { header: 'Tenant',                key: 'tenant_company',         width: 25 },
    { header: 'Other Handover Name',   key: 'handover_other_name',    width: 20 },
    { header: 'Other Handover Email',  key: 'handover_other_email',   width: 25 },
    { header: 'Other Handover Contact',key: 'handover_other_contact', width: 18 },
    { header: 'SEZ Status',            key: 'sez_status',             width: 12 },
    { header: 'SEZ Classification',    key: 'sez_classification',     width: 18 },
    { header: 'Customs Category',      key: 'customs_category',       width: 18 },
    { header: 'Customs Location',      key: 'customs_location',       width: 18 },
    { header: 'SEZ Zone',              key: 'sez_zone',               width: 15 },
    { header: 'Unit',                  key: 'unit',                   width: 15 },
    { header: 'BOE Number',            key: 'boe_number',             width: 16 },
    { header: 'BOE Date',              key: 'boe_date',               width: 14 },
    { header: 'CIF Value',             key: 'cif_value',              width: 16 },
    { header: 'Import Date',           key: 'import_date',            width: 14 },
    { header: 'Vendor Name',           key: 'vendor_name',            width: 20 },
    { header: 'Created By',            key: 'created_by',             width: 20 },
    { header: 'Created At',            key: 'created_at',             width: 20 },
    { header: 'Updated By',            key: 'updated_by',             width: 20 },
    { header: 'Updated At',            key: 'updated_at',             width: 20 },
    { header: 'Comments',              key: 'comments',               width: 30 },
  ];

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  assets.forEach((a, i) => {
    const row = sheet.addRow({
      asset_id:               formatText(a.asset_id),
      manual_asset_id:        formatText(a.manual_asset_id),
      asset_name:             formatText(a.asset_name),
      asset_category:         formatText(a.asset_category),
      asset_sub_category:     formatText(a.asset_sub_category),
      asset_type:             formatText(a.asset_type),
      manufacturer:           formatText(a.manufacturer),
      make_model:             formatText(a.make_model),
      serial_number:          formatText(a.serial_number),
      asset_description:      formatText(a.asset_description),
      asset_spec:             formatText(a.asset_spec),
      asset_status:           formatText(a.asset_status),
      status:                 formatText(a.status),
      condition:              formatText(a.condition),
      asset_value:            formatCurrency(a.asset_value),
      purchase_date:          formatDate(a.purchase_date),
      po_number:              formatText(a.po_number),
      invoice_number:         formatText(a.invoice_number),
      invoice_date:           formatDate(a.invoice_date),
      warranty_date:          formatDate(a.warranty_date),
      pm_date:                formatDate(a.pm_date),
      last_pm_date:           formatDate(a.last_pm_date),
      depreciation_date:      formatDate(a.depreciation_date),
      last_depreciation_date: formatDate(a.last_depreciation_date),
      depreciation_percentage:formatPercent(a.depreciation_percentage),
      decommission_date:      formatDate(a.decommission_date),
      contract:               formatText(a.contract),
      asset_incharge:         formatText(a.asset_incharge),
      building:               formatText(a.building),
      floor:                  formatText(a.floor),
      room_rack:              formatText(a.room_rack),
      tenant_company:         formatText(a.tenant_company),
      handover_other_name:    formatText(a.handover_other_name),
      handover_other_email:   formatText(a.handover_other_email),
      handover_other_contact: formatText(a.handover_other_contact),
      sez_status:             formatText(a.sez_status),
      sez_classification:     formatText(a.sez_classification),
      customs_category:       formatText(a.customs_category),
      customs_location:       formatText(a.customs_location),
      sez_zone:               formatText(a.sez_zone),
      unit:                   formatText(a.unit),
      boe_number:             formatText(a.boe_number),
      boe_date:               formatDate(a.boe_date),
      cif_value:              formatCurrency(a.cif_value),
      import_date:            formatDate(a.import_date),
      vendor_name:            formatText(a.vendor_name),
      created_by:             formatText(a.created_by),
      created_at:             formatDate(a.created_at),
      updated_by:             formatText(a.updated_by),
      updated_at:             formatDate(a.updated_at),
      comments:               formatText(a.comments),
    });
    // Alternate row shading
    if (i % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    }
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `Asset_Details_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

export async function generateAssetExcelReport(assets: AssetExportData[]) {
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Summary Report
  const summarySheet = workbook.addWorksheet('Summary Report');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 20 }
  ];
  
  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, a) => sum + (a.asset_value || 0), 0);
  const activeAssets = assets.filter(a => a.asset_status === 'Active').length;
  
  summarySheet.addRows([
    { metric: 'Total Assets', value: totalAssets },
    { metric: 'Total Asset Value', value: formatCurrency(totalValue) },
    { metric: 'Active Assets', value: activeAssets },
    { metric: 'Inactive/Scrap Assets', value: totalAssets - activeAssets }
  ]);
  
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  // Sheet 2: Detailed Assets
  const detailSheet = workbook.addWorksheet('Detailed Assets');
  detailSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Manual Asset ID', key: 'manual_asset_id', width: 15 },
    { header: 'Asset Name', key: 'asset_name', width: 25 },
    { header: 'Asset Type', key: 'asset_category', width: 20 },
    { header: 'Category', key: 'asset_sub_category', width: 20 },
    { header: 'Sub Category', key: 'asset_type', width: 20 },
    { header: 'Manufacturer', key: 'manufacturer', width: 20 },
    { header: 'Make/Model', key: 'make_model', width: 20 },
    { header: 'Serial Number', key: 'serial_number', width: 20 },
    { header: 'Asset Status', key: 'asset_status', width: 15 },
    { header: 'Working Status', key: 'status', width: 15 },
    { header: 'Condition', key: 'condition', width: 15 },
    { header: 'Asset Value', key: 'asset_value', width: 15 },
    { header: 'Purchase Date', key: 'purchase_date', width: 15 },
    { header: 'Warranty Expiry', key: 'warranty_date', width: 15 },
    { header: 'PM Date', key: 'pm_date', width: 15 },
    { header: 'Last PM Date', key: 'last_pm_date', width: 15 },
    { header: 'Building', key: 'building', width: 20 },
    { header: 'Floor', key: 'floor', width: 15 },
    { header: 'Room/Rack', key: 'room_rack', width: 15 },
    { header: 'Tenant', key: 'tenant_company', width: 25 },
    { header: 'SEZ Status', key: 'sez_status', width: 15 },
    { header: 'CIF Value', key: 'cif_value', width: 15 },
    { header: 'Depreciation %', key: 'depreciation_percentage', width: 15 }
  ];
  
  assets.forEach(asset => {
    detailSheet.addRow({
      asset_id: formatText(asset.asset_id),
      manual_asset_id: formatText(asset.manual_asset_id),
      asset_name: formatText(asset.asset_name),
      asset_category: formatText(asset.asset_category),
      asset_sub_category: formatText(asset.asset_sub_category),
      asset_type: formatText(asset.asset_type),
      manufacturer: formatText(asset.manufacturer),
      make_model: formatText(asset.make_model),
      serial_number: formatText(asset.serial_number),
      asset_status: formatText(asset.asset_status),
      status: formatText(asset.status),
      condition: formatText(asset.condition),
      asset_value: formatCurrency(asset.asset_value),
      purchase_date: formatDate(asset.purchase_date),
      warranty_date: formatDate(asset.warranty_date),
      pm_date: formatDate(asset.pm_date),
      last_pm_date: formatDate(asset.last_pm_date),
      building: formatText(asset.building),
      floor: formatText(asset.floor),
      room_rack: formatText(asset.room_rack),
      tenant_company: formatText(asset.tenant_company || asset.handover_other_name),
      sez_status: formatText(asset.sez_status),
      cif_value: formatCurrency(asset.cif_value),
      depreciation_percentage: formatPercent(asset.depreciation_percentage)
    });
  });
  
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  // Sheet 3: Cost & Valuation Breakdown
  const costSheet = workbook.addWorksheet('Cost & Valuation');
  costSheet.columns = [
    { header: 'Sub Category', key: 'subcategory', width: 25 },
    { header: 'Count', key: 'count', width: 12 },
    { header: 'Total Asset Value', key: 'total_value', width: 20 }
  ];
  
  const subcategoryGroups = assets.reduce((acc, asset) => {
    const subcat = asset.asset_type || 'Uncategorized';
    if (!acc[subcat]) acc[subcat] = [];
    acc[subcat].push(asset);
    return acc;
  }, {} as Record<string, AssetExportData[]>);
  
  Object.entries(subcategoryGroups).forEach(([subcategory, items]) => {
    costSheet.addRow({
      subcategory,
      count: items.length,
      total_value: formatCurrency(items.reduce((sum, a) => sum + (a.asset_value || 0), 0))
    });
  });
  
  costSheet.getRow(1).font = { bold: true };
  costSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  // Sheet 4: Status & Maintenance
  const statusSheet = workbook.addWorksheet('Status & Maintenance');
  statusSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Asset Name', key: 'asset_name', width: 25 },
    { header: 'Working Status', key: 'status', width: 15 },
    { header: 'Asset Status', key: 'asset_status', width: 15 },
    { header: 'Condition', key: 'condition', width: 15 },
    { header: 'Asset Incharge', key: 'asset_incharge', width: 20 },
    { header: 'Purchase Date', key: 'purchase_date', width: 15 },
    { header: 'Warranty Expiry', key: 'warranty_date', width: 15 },
    { header: 'Vendor', key: 'vendor_name', width: 20 },
    { header: 'Invoice Number', key: 'invoice_number', width: 15 },
    { header: 'Invoice Date', key: 'invoice_date', width: 15 },
    { header: 'PM Date', key: 'pm_date', width: 15 },
    { header: 'Depreciation Date', key: 'depreciation_date', width: 15 },
    { header: 'Depreciation %', key: 'depreciation_percentage', width: 12 },
    { header: 'Decommission Date', key: 'decommission_date', width: 15 }
  ];
  
  assets.forEach(asset => {
    statusSheet.addRow({
      asset_id: formatText(asset.asset_id),
      asset_name: formatText(asset.asset_name),
      status: formatText(asset.status),
      asset_status: formatText(asset.asset_status),
      condition: formatText(asset.condition),
      asset_incharge: formatText(asset.asset_incharge),
      purchase_date: formatDate(asset.purchase_date),
      warranty_date: formatDate(asset.warranty_date),
      vendor_name: formatText(asset.vendor_name),
      invoice_number: formatText(asset.invoice_number),
      invoice_date: formatDate(asset.invoice_date),
      pm_date: formatDate(asset.pm_date),
      depreciation_date: formatDate(asset.depreciation_date),
      depreciation_percentage: formatPercent(asset.depreciation_percentage),
      decommission_date: formatDate(asset.decommission_date)
    });
  });
  
  statusSheet.getRow(1).font = { bold: true };
  statusSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  statusSheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  // Sheet 5: Location Analysis
  const locationSheet = workbook.addWorksheet('Location Analysis');
  locationSheet.columns = [
    { header: 'Building', key: 'building', width: 25 },
    { header: 'Floor', key: 'floor', width: 20 },
    { header: 'Room/Rack', key: 'room', width: 20 },
    { header: 'Asset Count', key: 'count', width: 15 },
    { header: 'Total Value', key: 'total_value', width: 20 }
  ];
  locationSheet.getRow(1).font = { bold: true };
  locationSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  // Group assets by location
  const locationGroups: Record<string, { count: number; value: number; floor: string; room: string }> = {};
  
  assets.forEach(asset => {
    const building = asset.building || 'Unassigned';
    const floor = asset.floor || 'N/A';
    const room = asset.room_rack || 'N/A';
    const key = `${building}|${floor}|${room}`;
    
    if (!locationGroups[key]) {
      locationGroups[key] = { count: 0, value: 0, floor, room };
    }
    locationGroups[key].count++;
    locationGroups[key].value += asset.asset_value || 0;
  });
  
  // Sort by building, then floor, then room
  const sortedLocations = Object.entries(locationGroups)
    .map(([key, data]) => {
      const [building, floor, room] = key.split('|');
      return { building, floor, room, ...data };
    })
    .sort((a, b) => {
      if (a.building !== b.building) return a.building.localeCompare(b.building);
      if (a.floor !== b.floor) return a.floor.localeCompare(b.floor);
      return a.room.localeCompare(b.room);
    });
  
  sortedLocations.forEach(loc => {
    locationSheet.addRow({
      building: loc.building,
      floor: loc.floor,
      room: loc.room,
      count: loc.count,
      total_value: formatCurrency(loc.value)
    });
  });
  
  locationSheet.views = [{ state: 'frozen', ySplit: 1 }];
  
  // Fetch related data for all exported assets
  const assetIds = assets.map(a => a.id);
  const assetIdStrings = assets.map(a => a.asset_id);
  
  // Fetch tickets
  const { data: tickets } = await supabase
    .from('maintenance_tickets')
    .select('*')
    .in('asset_id', assetIds)
    .order('created_at', { ascending: false });
  
  // Fetch movement history
  const { data: history } = await supabase
    .from('asset_history')
    .select('*')
    .in('asset_id', assetIds)
    .order('changed_at', { ascending: false });
  
  // Fetch audits
  const { data: audits } = await supabase
    .from('physical_audits')
    .select('*')
    .in('asset_id', assetIdStrings)
    .order('audit_date', { ascending: false });
  
  // Fetch services
  const { data: services } = await supabase
    .from('asset_service_records')
    .select('*')
    .in('asset_id', assetIdStrings)
    .order('service_date', { ascending: false });
  
  // Sheet 5: Tickets
  const ticketsSheet = workbook.addWorksheet('Tickets');
  ticketsSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Ticket Number', key: 'ticket_number', width: 15 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Sub Category', key: 'sub_category', width: 15 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Building', key: 'building', width: 15 },
    { header: 'Floor', key: 'floor', width: 12 },
    { header: 'Room', key: 'room', width: 12 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Assigned To', key: 'assigned_to', width: 20 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Created At', key: 'created_at', width: 18 },
    { header: 'Resolved At', key: 'resolved_at', width: 18 }
  ];
  ticketsSheet.getRow(1).font = { bold: true };
  ticketsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  if (tickets && tickets.length > 0) {
    tickets.forEach(ticket => {
      const asset = assets.find(a => a.id === ticket.asset_id);
      ticketsSheet.addRow({
        asset_id: asset?.asset_id || 'N/A',
        ticket_number: formatText(ticket.ticket_number),
        title: formatText(ticket.title),
        category: formatText(ticket.category),
        sub_category: formatText(ticket.sub_category),
        priority: formatText(ticket.priority),
        status: formatText(ticket.status),
        building: formatText(ticket.building),
        floor: formatText(ticket.floor),
        room: formatText(ticket.room),
        description: formatText(ticket.description),
        assigned_to: formatText(ticket.assigned_to),
        cost: ticket.cost ? formatCurrency(ticket.cost) : 'N/A',
        created_at: formatDate(ticket.created_at),
        resolved_at: formatDate(ticket.resolved_at)
      });
    });
  }
  
  // Sheet 6: Movement History
  const movementHistorySheet = workbook.addWorksheet('Movement History');
  movementHistorySheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Change Type', key: 'change_type', width: 15 },
    { header: 'Field Changed', key: 'field_name', width: 20 },
    { header: 'Old Value', key: 'old_value', width: 25 },
    { header: 'New Value', key: 'new_value', width: 25 },
    { header: 'Changed By', key: 'changed_by', width: 20 },
    { header: 'Changed At', key: 'changed_at', width: 18 },
    { header: 'Remarks', key: 'remarks', width: 30 }
  ];
  movementHistorySheet.getRow(1).font = { bold: true };
  movementHistorySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  if (history && history.length > 0) {
    history.forEach(record => {
      const asset = assets.find(a => a.id === record.asset_id);
      movementHistorySheet.addRow({
        asset_id: asset?.asset_id || 'N/A',
        change_type: formatText(record.change_type),
        field_name: formatText(record.field_name),
        old_value: formatText(record.old_value),
        new_value: formatText(record.new_value),
        changed_by: formatText(record.changed_by),
        changed_at: formatDate(record.changed_at),
        remarks: formatText(record.remarks)
      });
    });
  }
  
  // Sheet 7: Audits
  const auditsSheet = workbook.addWorksheet('Audits');
  auditsSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Audit Date', key: 'audit_date', width: 15 },
    { header: 'Auditor', key: 'auditor_name', width: 20 },
    { header: 'Result', key: 'audit_result', width: 12 },
    { header: 'Barcode Scanned', key: 'barcode_scanned', width: 15 },
    { header: 'Asset Found', key: 'asset_found', width: 12 },
    { header: 'Location Match', key: 'location_match', width: 15 },
    { header: 'Tenant Match', key: 'tenant_match', width: 12 },
    { header: 'Serial Match', key: 'serial_match', width: 12 },
    { header: 'Condition', key: 'condition', width: 15 },
    { header: 'GPS Latitude', key: 'gps_latitude', width: 15 },
    { header: 'GPS Longitude', key: 'gps_longitude', width: 15 },
    { header: 'Remarks', key: 'remarks', width: 30 }
  ];
  auditsSheet.getRow(1).font = { bold: true };
  auditsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  if (audits && audits.length > 0) {
    audits.forEach(audit => {
      auditsSheet.addRow({
        asset_id: formatText(audit.asset_id),
        audit_date: formatDate(audit.audit_date),
        auditor_name: formatText(audit.auditor_name),
        audit_result: formatText(audit.audit_result),
        barcode_scanned: audit.barcode_scanned ? 'Yes' : 'No',
        asset_found: audit.asset_found ? 'Yes' : 'No',
        location_match: audit.location_match ? 'Yes' : 'No',
        tenant_match: audit.tenant_match ? 'Yes' : 'No',
        serial_match: audit.serial_match ? 'Yes' : 'No',
        condition: formatText(audit.condition),
        gps_latitude: audit.gps_latitude || 'N/A',
        gps_longitude: audit.gps_longitude || 'N/A',
        remarks: formatText(audit.remarks)
      });
    });
  }
  
  // Sheet 8: Services
  const servicesSheet = workbook.addWorksheet('Services');
  servicesSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Service Date', key: 'service_date', width: 15 },
    { header: 'Service Type', key: 'service_type', width: 20 },
    { header: 'Service Provider', key: 'service_provider', width: 25 },
    { header: 'Description', key: 'service_description', width: 30 },
    { header: 'Cost', key: 'service_cost', width: 15 },
    { header: 'Next Service Date', key: 'next_service_date', width: 18 },
    { header: 'Performed By', key: 'performed_by', width: 20 },
    { header: 'Invoice Number', key: 'invoice_number', width: 15 },
    { header: 'PO Number', key: 'po_number', width: 15 },
    { header: 'Warranty Extended', key: 'warranty_extended', width: 15 },
    { header: 'Remarks', key: 'remarks', width: 30 }
  ];
  servicesSheet.getRow(1).font = { bold: true };
  servicesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  if (services && services.length > 0) {
    services.forEach(service => {
      servicesSheet.addRow({
        asset_id: formatText(service.asset_id),
        service_date: formatDate(service.service_date),
        service_type: formatText(service.service_type),
        service_provider: formatText(service.service_provider),
        service_description: formatText(service.service_description),
        service_cost: service.service_cost ? formatCurrency(service.service_cost) : 'N/A',
        next_service_date: formatDate(service.next_service_date),
        performed_by: formatText(service.performed_by),
        invoice_number: formatText(service.invoice_number),
        po_number: formatText(service.po_number),
        warranty_extended: service.warranty_extended ? 'Yes' : 'No',
        remarks: formatText(service.remarks)
      });
    });
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Download file
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Asset_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
