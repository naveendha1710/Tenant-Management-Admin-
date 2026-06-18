export type ReportFieldDefinition = {
  key: string;
  label: string;
  category:
    | 'General'
    | 'Classification'
    | 'Location'
    | 'Financial'
    | 'Maintenance'
    | 'Compliance';
  type: 'text' | 'number' | 'date' | 'currency' | 'status';
};

export const ASSET_REPORT_FIELDS: ReportFieldDefinition[] = [
  { key: 'asset_id', label: 'Asset ID', category: 'General', type: 'text' },
  { key: 'manual_asset_id', label: 'Manual Asset ID', category: 'General', type: 'text' },
  { key: 'asset_name', label: 'Asset Name', category: 'General', type: 'text' },
  { key: 'asset_description', label: 'Asset Description', category: 'General', type: 'text' },
  { key: 'asset_spec', label: 'Asset Specification', category: 'General', type: 'text' },
  { key: 'make_model', label: 'Make / Model', category: 'General', type: 'text' },
  { key: 'serial_number', label: 'Serial Number', category: 'General', type: 'text' },
  { key: 'id', label: 'Record ID', category: 'General', type: 'text' },
  { key: 'asset_pictures', label: 'Asset Pictures', category: 'General', type: 'text' },

  { key: 'asset_category', label: 'Asset Category', category: 'Classification', type: 'text' },
  { key: 'asset_sub_category', label: 'Asset Sub Category', category: 'Classification', type: 'text' },
  { key: 'asset_type', label: 'Asset Type', category: 'Classification', type: 'text' },
  { key: 'asset_status', label: 'Asset Status', category: 'Classification', type: 'status' },
  { key: 'asset_combination', label: 'Asset Combination', category: 'Classification', type: 'text' },
  { key: 'status', label: 'Working Status', category: 'Classification', type: 'status' },
  { key: 'condition', label: 'Condition', category: 'Classification', type: 'status' },
  { key: 'sez_status', label: 'SEZ Status', category: 'Compliance', type: 'status' },
  { key: 'sez_classification', label: 'SEZ Classification', category: 'Compliance', type: 'text' },
  { key: 'customs_category', label: 'Customs Category', category: 'Compliance', type: 'text' },
  { key: 'customs_location', label: 'Customs Location', category: 'Compliance', type: 'text' },
  { key: 'sez_zone', label: 'SEZ Zone', category: 'Compliance', type: 'text' },
  { key: 'unit', label: 'Unit', category: 'Compliance', type: 'text' },

  { key: 'building', label: 'Building', category: 'Location', type: 'text' },
  { key: 'floor', label: 'Floor (text)', category: 'Location', type: 'text' },
  { key: 'floor_id', label: 'Floor', category: 'Location', type: 'text' },
  { key: 'room_id', label: 'Room', category: 'Location', type: 'text' },
  { key: 'room_rack', label: 'Room / Rack', category: 'Location', type: 'text' },
  { key: 'room_rack_backup', label: 'Room / Rack (backup)', category: 'Location', type: 'text' },
  { key: 'handover_to', label: 'Tenant', category: 'Location', type: 'text' },
  { key: 'handover_other_name', label: 'Handover Other Name', category: 'Location', type: 'text' },
  { key: 'handover_other_email', label: 'Handover Other Email', category: 'Location', type: 'text' },
  { key: 'handover_other_contact', label: 'Handover Other Contact', category: 'Location', type: 'text' },

  { key: 'asset_value', label: 'Asset Value', category: 'Financial', type: 'currency' },
  { key: 'vendor_name', label: 'Vendor Name', category: 'Financial', type: 'text' },
  { key: 'manufacturer', label: 'Manufacturer', category: 'Financial', type: 'text' },
  { key: 'po_number', label: 'PO Number', category: 'Financial', type: 'text' },
  { key: 'invoice_number', label: 'Invoice Number', category: 'Financial', type: 'text' },
  { key: 'invoice_date', label: 'Invoice Date', category: 'Financial', type: 'date' },
  { key: 'boe_number', label: 'BOE Number', category: 'Financial', type: 'text' },
  { key: 'boe_date', label: 'BOE Date', category: 'Financial', type: 'date' },
  { key: 'cif_value', label: 'CIF Value', category: 'Financial', type: 'currency' },
  { key: 'import_date', label: 'Import Date', category: 'Financial', type: 'date' },
  { key: 'contract', label: 'Contract', category: 'Financial', type: 'text' },
  { key: 'vendor_id', label: 'Vendor ID', category: 'Financial', type: 'text' },

  { key: 'purchase_date', label: 'Purchase Date', category: 'Maintenance', type: 'date' },
  { key: 'warranty_date', label: 'Warranty Date', category: 'Maintenance', type: 'date' },
  { key: 'pm_date', label: 'PM Date', category: 'Maintenance', type: 'date' },
  { key: 'last_pm_date', label: 'Last PM Date', category: 'Maintenance', type: 'date' },
  { key: 'depreciation_date', label: 'Depreciation Date', category: 'Maintenance', type: 'date' },
  { key: 'last_depreciation_date', label: 'Last Depreciation Date', category: 'Maintenance', type: 'date' },
  { key: 'depreciation_percentage', label: 'Depreciation %', category: 'Maintenance', type: 'number' },
  { key: 'decommission_date', label: 'Decommission Date', category: 'Maintenance', type: 'date' },

  { key: 'asset_incharge', label: 'Asset Incharge', category: 'General', type: 'text' },
  { key: 'created_by', label: 'Created By', category: 'General', type: 'text' },
  { key: 'created_at', label: 'Created At', category: 'General', type: 'date' },
  { key: 'updated_by', label: 'Updated By', category: 'General', type: 'text' },
  { key: 'updated_at', label: 'Updated At', category: 'General', type: 'date' },
  { key: 'comments', label: 'Comments', category: 'General', type: 'text' },
  { key: 'update_history', label: 'Update History', category: 'General', type: 'text' },
  { key: 'id_config_id', label: 'ID Config', category: 'General', type: 'text' },
];

export const FIELD_CATEGORIES = Array.from(
  new Set(ASSET_REPORT_FIELDS.map((field) => field.category))
);

export const getFieldLabel = (key: string) => {
  return ASSET_REPORT_FIELDS.find((field) => field.key === key)?.label || key;
};

export const getFieldsByCategory = () => {
  return ASSET_REPORT_FIELDS.reduce<Record<string, ReportFieldDefinition[]>>(
    (acc, field) => {
      if (!acc[field.category]) acc[field.category] = [];
      acc[field.category].push(field);
      return acc;
    },
    {}
  );
};
