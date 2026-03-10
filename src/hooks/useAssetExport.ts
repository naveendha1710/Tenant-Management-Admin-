import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  subCategory?: string;
  subType?: string;
  status?: string;
  condition?: string;
  building?: string;
  floor?: string;
  manufacturer?: string;
}

export function useAssetExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetsForExport = async (filters?: ExportFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('assets')
        .select(`
          *,
          tenants:handover_to (
            company,
            name
          )
        `);

      if (filters?.startDate) {
        query = query.gte('purchase_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('purchase_date', filters.endDate);
      }
      if (filters?.category) {
        query = query.eq('asset_category', filters.category);
      }
      if (filters?.subCategory) {
        query = query.eq('asset_sub_category', filters.subCategory);
      }
      if (filters?.subType) {
        query = query.eq('asset_type', filters.subType);
      }
      if (filters?.status) {
        query = query.eq('asset_status', filters.status);
      }
      if (filters?.condition) {
        query = query.eq('condition', filters.condition);
      }
      if (filters?.manufacturer) {
        query = query.eq('manufacturer', filters.manufacturer);
      }
      if (filters?.building) {
        query = query.eq('building', filters.building);
      }
      if (filters?.floor) {
        query = query.eq('floor', filters.floor);
      }

      const { data: assets, error: assetsError } = await query.order('created_at', { ascending: false });

      if (assetsError) throw assetsError;

      // Transform data to include tenant company name
      const transformedAssets = assets?.map(asset => ({
        ...asset,
        tenant_company: asset.tenants?.company || asset.tenants?.name || null
      })) || [];

      return transformedAssets;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assets');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { fetchAssetsForExport, loading, error };
}
