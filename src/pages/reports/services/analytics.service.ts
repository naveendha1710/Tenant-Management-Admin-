import { supabase } from '@/lib/supabaseClient';
import { ReportFilters, AnalyticsQuery, AnalyticsResponse, Asset } from '../types';

export class AnalyticsService {
  /**
   * Apply filters to Supabase query
   */
  static applyFilters(query: any, filters: ReportFilters) {
    if (filters.category && filters.category !== 'all') {
      query = query.eq('asset_category', filters.category);
    }
    if (filters.subCategory && filters.subCategory !== 'all') {
      query = query.eq('asset_sub_category', filters.subCategory);
    }
    if (filters.type && filters.type !== 'all') {
      query = query.eq('asset_type', filters.type);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('asset_status', filters.status);
    }
    if (filters.building && filters.building !== 'all') {
      query = query.eq('building', filters.building);
    }
    if (filters.floor && filters.floor !== 'all') {
      query = query.eq('floor_id', filters.floor);
    }
    if (filters.room && filters.room !== 'all') {
      query = query.eq('room_id', filters.room);
    }
    if (filters.tenant && filters.tenant !== 'all') {
      query = query.eq('handover_to', filters.tenant);
    }
    if (filters.vendor && filters.vendor !== 'all') {
      query = query.eq('vendor_name', filters.vendor);
    }
    if (filters.sezStatus && filters.sezStatus !== 'all') {
      query = query.eq('sez_status', filters.sezStatus);
    }
    
    return query;
  }

  /**
   * Fetch filtered assets
   */
  static async fetchAssets(filters: ReportFilters = {}): Promise<Asset[]> {
    const selectFields = [
      'id',
      'asset_name',
      'asset_id',
      'asset_status',
      'status',
      'asset_value',
      'sez_status',
      'warranty_date',
      'asset_category',
      'asset_sub_category',
      'asset_type',
      'handover_to',
      'vendor_name',
      'building',
      'floor_id',
      'room_id',
      'purchase_date',
      'condition',
      'last_pm_date',
    ].join(', ');
    const pageSize = 1000;
    let lastId: string | null = null;
    const allAssets: Asset[] = [];

    while (true) {
      let query = supabase
        .from('assets')
        .select(selectFields)
        .order('id', { ascending: true })
        .limit(pageSize);
      query = this.applyFilters(query, filters);

      if (lastId) {
        query = query.gt('id', lastId);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) break;

      allAssets.push(...data);

      const newLastId = data[data.length - 1]?.id;
      if (!newLastId || newLastId === lastId || data.length < pageSize) {
        break;
      }

      lastId = newLastId;
    }

    return allAssets;
  }

  /**
   * Fetch aggregated data for charts
   */
  static async fetchAggregated(
    field: string,
    filters: ReportFilters = {},
    limit?: number
  ): Promise<{ label: string; value: number }[]> {
    const assets = await this.fetchAssets(filters);
    
    const grouped = assets.reduce((acc, asset) => {
      const key = asset[field as keyof Asset] || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let labelMap: Record<string, string> = {};
    if (field === 'building') {
      const buildingIds = Object.keys(grouped).filter(id => id && id !== 'Unknown');
      if (buildingIds.length > 0) {
        const { data: buildingsData } = await supabase
          .from('buildings')
          .select('id, name')
          .in('id', buildingIds);
        labelMap = buildingsData?.reduce((acc, b) => {
          acc[b.id] = b.name;
          return acc;
        }, {} as Record<string, string>) || {};
      }
    }

    let result = Object.entries(grouped).map(([label, value]) => ({
      label: labelMap[label] || String(label),
      value,
    }));

    result.sort((a, b) => b.value - a.value);
    
    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }

  /**
   * Fetch KPI metrics
   */
  static async fetchKPIs(filters: ReportFilters = {}) {
    const assets = await this.fetchAssets(filters);
    
    const totalAssets = assets.length;
    const activeAssets = assets.filter(a => a.status === 'Active' || a.asset_status === 'Working').length;
    const underRepair = assets.filter(a => a.asset_status === 'Under Repair' || a.asset_status === 'Not Working').length;
    const totalValue = assets.reduce((sum, a) => sum + (Number(a.asset_value) || 0), 0);
    const sezAssets = assets.filter(a => a.sez_status === 'SEZ').length;
    const dtaAssets = assets.filter(a => a.sez_status === 'DTA').length;
    
    const now = new Date();
    const warrantyExpiring = assets.filter(a => {
      if (!a.warranty_date) return false;
      const warrantyDate = new Date(a.warranty_date);
      const daysUntilExpiry = Math.floor((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    }).length;

    return {
      totalAssets,
      activeAssets,
      underRepair,
      totalValue,
      sezAssets,
      dtaAssets,
      warrantyExpiring,
    };
  }

  /**
   * Fetch time-series data
   */
  static async fetchTimeSeries(
    dateField: keyof Asset,
    filters: ReportFilters = {},
    groupBy: 'day' | 'week' | 'month' | 'year' = 'month'
  ) {
    const assets = await this.fetchAssets(filters);
    
    const grouped = assets.reduce((acc, asset) => {
      const date = asset[dateField];
      if (!date) return acc;
      
      const d = new Date(date as string);
      let key: string;
      
      switch (groupBy) {
        case 'day':
          key = d.toISOString().split('T')[0];
          break;
        case 'week':
          const week = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
          key = `${d.getFullYear()}-W${week}`;
          break;
        case 'month':
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(d.getFullYear());
          break;
      }
      
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}
