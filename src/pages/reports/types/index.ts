// Core Types
export interface Asset {
  id: string;
  asset_id: string;
  manual_asset_id?: string;
  asset_name: string;
  asset_category?: string;
  asset_sub_category?: string;
  asset_type?: string;
  asset_status?: string;
  status?: string;
  condition?: string;
  asset_value?: number;
  purchase_date?: string;
  warranty_date?: string;
  pm_date?: string;
  last_pm_date?: string;
  depreciation_date?: string;
  last_depreciation_date?: string;
  depreciation_percentage?: number;
  decommission_date?: string;
  sez_status?: string;
  sez_classification?: string;
  vendor_name?: string;
  building?: string;
  floor_id?: string;
  room_id?: string;
  handover_to?: string;
  created_at?: string;
  updated_at?: string;
}

// Filter Types
export interface ReportFilters {
  category?: string;
  subCategory?: string;
  type?: string;
  status?: string;
  building?: string;
  floor?: string;
  room?: string;
  tenant?: string;
  vendor?: string;
  sezStatus?: string;
  warrantyStatus?: 'active' | 'expired' | 'expiring_soon' | 'all';
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  sortOrder?: 'asc' | 'desc';
}

// Chart Types
export type ChartType = 
  | 'donut' 
  | 'bar' 
  | 'stackedBar' 
  | 'line' 
  | 'area' 
  | 'treemap' 
  | 'heatmap' 
  | 'funnel' 
  | 'gauge' 
  | 'scatter' 
  | 'bubble' 
  | 'sankey' 
  | 'timeline' 
  | 'histogram';

export interface ChartData {
  labels: string[];
  series: number[] | number[][];
  colors?: string[];
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  type: ChartType;
  title?: string;
  subtitle?: string;
  data: ChartData;
  height?: number | string;
  width?: number | string;
  theme?: 'light' | 'dark';
  interactive?: boolean;
  onClick?: (params: any) => void;
  options?: Record<string, any>;
}

// Widget Types
export interface WidgetSize {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetConfig {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'custom';
  title: string;
  subtitle?: string;
  size: WidgetSize;
  position: WidgetPosition;
  dataSource: string;
  chartConfig?: ChartConfig;
  filters?: string[];
  refreshInterval?: number;
  loading?: boolean;
  error?: string;
}

// KPI Types
export interface KPIData {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: string;
  format?: 'number' | 'currency' | 'percentage';
}

// Dashboard Section Types
export type DashboardSection = 
  | 'executive' 
  | 'lifecycle' 
  | 'maintenance' 
  | 'vendor' 
  | 'custom';

export interface DashboardConfig {
  section: DashboardSection;
  widgets: WidgetConfig[];
  layout?: any[];
}

// Analytics Types
export interface AnalyticsQuery {
  metric: string;
  filters?: ReportFilters;
  groupBy?: string[];
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  dateField?: string;
  limit?: number;
}

export interface AnalyticsResponse {
  data: any[];
  total: number;
  aggregated?: Record<string, number>;
  timestamp: string;
}
