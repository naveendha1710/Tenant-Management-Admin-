import ExcelJS from 'exceljs';

interface AssetExportData {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_category: string;
  asset_sub_category?: string;
  asset_type?: string;
  make_model?: string;
  serial_number?: string;
  asset_status?: string;
  sez_status?: string;
  customs_category?: string;
  vendor_name?: string;
  po_number?: string;
  invoice_number?: string;
  invoice_date?: string;
  boe_number?: string;
  boe_date?: string;
  cif_value?: number;
  duty_foregone?: number;
  import_date?: string;
  building?: string;
  floor?: string;
  room_rack?: string;
  manufacturer?: string;
  asset_description?: string;
  comments?: string;
  pm_date?: string;
  asset_incharge?: string;
  asset_spec?: string;
  purchase_date?: string;
  status?: string;
  warranty_date?: string;
  contract?: string;
  asset_value?: number;
  depreciation_date?: string;
  depreciation_percentage?: number;
  decommission_date?: string;
  handover_to?: string;
  tenant_company?: string;
  condition?: string;
  last_pm_date?: string;
  handover_other_name?: string;
}

const formatCurrency = (value?: number) => value ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : 'N/A';
const formatPercent = (value?: number) => value ? `${value}%` : 'N/A';
const formatText = (value?: string) => value || 'N/A';

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
  const totalCIF = assets.reduce((sum, a) => sum + (a.cif_value || 0), 0);
  const totalDuty = assets.reduce((sum, a) => sum + (a.duty_foregone || 0), 0);
  
  summarySheet.addRows([
    { metric: 'Total Assets', value: totalAssets },
    { metric: 'Total Asset Value', value: formatCurrency(totalValue) },
    { metric: 'Active Assets', value: activeAssets },
    { metric: 'Inactive/Scrap Assets', value: totalAssets - activeAssets },
    { metric: 'Total CIF Value', value: formatCurrency(totalCIF) },
    { metric: 'Total Duty Foregone', value: formatCurrency(totalDuty) }
  ]);
  
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  // Sheet 2: Detailed Assets
  const detailSheet = workbook.addWorksheet('Detailed Assets');
  detailSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
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
    { header: 'Building', key: 'building', width: 20 },
    { header: 'Floor', key: 'floor', width: 15 },
    { header: 'Room/Rack', key: 'room_rack', width: 15 },
    { header: 'Tenant', key: 'tenant_company', width: 25 },
    { header: 'SEZ Status', key: 'sez_status', width: 15 },
    { header: 'CIF Value', key: 'cif_value', width: 15 },
    { header: 'Duty Foregone', key: 'duty_foregone', width: 15 },
    { header: 'Depreciation %', key: 'depreciation_percentage', width: 15 }
  ];
  
  assets.forEach(asset => {
    detailSheet.addRow({
      asset_id: formatText(asset.asset_id),
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
      building: formatText(asset.building),
      floor: formatText(asset.floor),
      room_rack: formatText(asset.room_rack),
      tenant_company: formatText(asset.tenant_company || asset.handover_other_name),
      sez_status: formatText(asset.sez_status),
      cif_value: formatCurrency(asset.cif_value),
      duty_foregone: formatCurrency(asset.duty_foregone),
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
  
  // Sheet 4: Tenant-wise Allocation
  const tenantSheet = workbook.addWorksheet('Tenant-wise Allocation');
  tenantSheet.columns = [
    { header: 'Tenant/Recipient', key: 'tenant', width: 30 },
    { header: 'Building', key: 'building', width: 20 },
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Asset Name', key: 'asset_name', width: 25 },
    { header: 'Asset Type', key: 'asset_category', width: 20 },
    { header: 'Asset Value', key: 'asset_value', width: 15 }
  ];
  
  const handedOverAssets = assets.filter(a => a.handover_to || a.handover_other_name);
  handedOverAssets.forEach(asset => {
    tenantSheet.addRow({
      tenant: formatText(asset.tenant_company || asset.handover_other_name),
      building: formatText(asset.building),
      asset_id: formatText(asset.asset_id),
      asset_name: formatText(asset.asset_name),
      asset_category: formatText(asset.asset_category),
      asset_value: formatCurrency(asset.asset_value)
    });
  });
  
  tenantSheet.getRow(1).font = { bold: true };
  tenantSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
  // Sheet 5: Maintenance & Compliance
  const maintenanceSheet = workbook.addWorksheet('Maintenance & Compliance');
  maintenanceSheet.columns = [
    { header: 'Asset ID', key: 'asset_id', width: 15 },
    { header: 'Asset Name', key: 'asset_name', width: 25 },
    { header: 'Issue Type', key: 'issue_type', width: 20 },
    { header: 'Details', key: 'details', width: 30 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Condition', key: 'condition', width: 15 }
  ];
  
  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  assets.forEach(asset => {
    if (asset.condition === 'Damaged') {
      maintenanceSheet.addRow({
        asset_id: formatText(asset.asset_id),
        asset_name: formatText(asset.asset_name),
        issue_type: 'Damaged Asset',
        details: 'Asset marked as damaged',
        date: 'N/A',
        condition: formatText(asset.condition)
      });
    }
    
    if (asset.warranty_date) {
      const warrantyDate = new Date(asset.warranty_date);
      if (warrantyDate < today) {
        maintenanceSheet.addRow({
          asset_id: formatText(asset.asset_id),
          asset_name: formatText(asset.asset_name),
          issue_type: 'Warranty Expired',
          details: 'Warranty has expired',
          date: formatDate(asset.warranty_date),
          condition: formatText(asset.condition)
        });
      }
    }
    
    if (asset.pm_date) {
      const pmDate = new Date(asset.pm_date);
      if (pmDate <= thirtyDaysFromNow && pmDate >= today) {
        maintenanceSheet.addRow({
          asset_id: formatText(asset.asset_id),
          asset_name: formatText(asset.asset_name),
          issue_type: 'Upcoming PM',
          details: 'Preventive maintenance due soon',
          date: formatDate(asset.pm_date),
          condition: formatText(asset.condition)
        });
      }
    }
  });
  
  maintenanceSheet.getRow(1).font = { bold: true };
  maintenanceSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
  
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
