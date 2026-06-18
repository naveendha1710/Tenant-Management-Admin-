import { GlobalReportFilters } from '@/store/useGlobalReportFilterStore';
import { SheetConfig } from '@/store/useReportSheetStore';

export type DefaultReportDefinition = {
  id: string;
  title: string;
  description: string;
  reportType: 'default' | 'custom';
  globalFilters?: GlobalReportFilters;
  sheets: Omit<SheetConfig, 'id'>[];
};

export const DEFAULT_REPORTS: DefaultReportDefinition[] = [
  {
    id: 'executive-overview',
    title: 'Executive Overview',
    description: 'High-level asset summary for leadership reporting.',
    reportType: 'default',
    sheets: [
      {
        name: 'Executive Overview',
        fields: [
          'asset_id',
          'asset_name',
          'asset_category',
          'asset_type',
          'asset_status',
          'building',
          'floor_id',
          'room_id',
        ],
        additionalFilters: {},
      },
    ],
  },
  {
    id: 'sez-assets',
    title: 'SEZ Assets',
    description: 'Assets tagged under SEZ compliance.',
    reportType: 'default',
    sheets: [
      {
        name: 'SEZ Assets',
        fields: ['asset_id', 'asset_name', 'sez_status', 'sez_classification', 'building'],
        additionalFilters: { sezStatus: 'SEZ' },
      },
    ],
  },
  {
    id: 'dta-assets',
    title: 'DTA Assets',
    description: 'Assets tagged under DTA compliance.',
    reportType: 'default',
    sheets: [
      {
        name: 'DTA Assets',
        fields: ['asset_id', 'asset_name', 'sez_status', 'sez_classification', 'building'],
        additionalFilters: { sezStatus: 'DTA' },
      },
    ],
  },
  {
    id: 'warranty-expiry',
    title: 'Warranty Expiry',
    description: 'Assets with warranty expiring soon.',
    reportType: 'default',
    sheets: [
      {
        name: 'Warranty Expiry',
        fields: ['asset_id', 'asset_name', 'warranty_date', 'asset_status', 'building'],
        additionalFilters: { warrantyStatus: 'expiring_soon' },
      },
    ],
  },
  {
    id: 'under-repair',
    title: 'Under Repair',
    description: 'Assets currently under repair.',
    reportType: 'default',
    sheets: [
      {
        name: 'Under Repair',
        fields: ['asset_id', 'asset_name', 'asset_status', 'status', 'building'],
        additionalFilters: { status: 'Under Repair' },
      },
    ],
  },
  {
    id: 'depreciation',
    title: 'Depreciation',
    description: 'Assets with depreciation details captured.',
    reportType: 'default',
    sheets: [
      {
        name: 'Depreciation',
        fields: ['asset_id', 'asset_name', 'asset_value', 'depreciation_date', 'depreciation_percentage'],
        additionalFilters: { depreciationStatus: 'has' },
      },
    ],
  },
  {
    id: 'vendor-summary',
    title: 'Vendor Summary',
    description: 'Assets grouped by vendor.',
    reportType: 'default',
    sheets: [
      {
        name: 'Vendor Summary',
        fields: ['vendor_name', 'asset_id', 'asset_name', 'asset_value'],
        additionalFilters: {},
      },
    ],
  },
  {
    id: 'location-summary',
    title: 'Location Summary',
    description: 'Assets grouped by building and floor.',
    reportType: 'default',
    sheets: [
      {
        name: 'Location Summary',
        fields: ['building', 'floor_id', 'room_id', 'asset_id', 'asset_name'],
        additionalFilters: {},
      },
    ],
  },
];
