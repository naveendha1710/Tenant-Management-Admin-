export type PMStatus = 'upcoming' | 'due' | 'overdue';

export interface PMAsset {
  id: string;
  asset_id: string;
  asset_name: string;
  tenant_name: string;
  status: string;
  pm_date: string;
  pmStatus: PMStatus;
}

export interface AssetSnapshot {
  asset_id: string;
  asset_name: string;
  asset_category: string;
  asset_type: string;
  serial_number: string;
  tenant_name: string;
  building: string;
  floor: string;
  room_rack: string;
  status: string;
  asset_status: string;
  condition?: string;
  pm_date?: string;
  pmStatus?: PMStatus;
  last_pm_date?: string;
  last_audit_date?: string;
  audit_result?: string;
}

export interface PhysicalAuditRecord {
  asset_id: string;
  barcode_scanned: boolean;
  asset_found: boolean;
  location_match: boolean;
  tenant_match: boolean;
  condition: 'Good' | 'Damaged' | 'Scrap';
  serial_match: boolean;
  audit_result: 'Pass' | 'Issues';
  remarks: string;
  audit_date: string;
  auditor_name: string;
}
