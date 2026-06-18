import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { AnalyticsService } from '../services/analytics.service';
import { useFilterStore } from '../store/filterStore';
import { Asset } from '../types';

/**
 * Query keys for cache management
 */
export const queryKeys = {
  assets: (filters: any) => ['assets', filters],
  aggregated: (field: string, filters: any, limit?: number) => 
    ['aggregated', field, filters, limit],
  kpis: (filters: any) => ['kpis', filters],
  timeSeries: (field: string, filters: any, groupBy: string) => 
    ['timeSeries', field, filters, groupBy],
};

/**
 * Cached asset fetching with React Query
 */
export function useCachedAssets(options?: UseQueryOptions<Asset[]>) {
  const { filters } = useFilterStore();
  
  return useQuery({
    queryKey: queryKeys.assets(filters),
    queryFn: () => AnalyticsService.fetchAssets(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

/**
 * Cached aggregated data
 */
export function useCachedAggregated(
  field: string,
  limit?: number,
  options?: UseQueryOptions<{ label: string; value: number }[]>
) {
  const { filters } = useFilterStore();
  
  return useQuery({
    queryKey: queryKeys.aggregated(field, filters, limit),
    queryFn: () => AnalyticsService.fetchAggregated(field, filters, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Cached KPI metrics
 */
export function useCachedKPIs(options?: UseQueryOptions<any>) {
  const { filters } = useFilterStore();
  
  return useQuery({
    queryKey: queryKeys.kpis(filters),
    queryFn: () => AnalyticsService.fetchKPIs(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Cached time series data
 */
export function useCachedTimeSeries(
  dateField: keyof Asset,
  groupBy: 'day' | 'week' | 'month' | 'year' = 'month',
  options?: UseQueryOptions<{ label: string; value: number }[]>
) {
  const { filters } = useFilterStore();
  
  return useQuery({
    queryKey: queryKeys.timeSeries(dateField, filters, groupBy),
    queryFn: () => AnalyticsService.fetchTimeSeries(dateField, filters, groupBy),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Prefetch data for better UX
 */
export function usePrefetchAnalytics() {
  const { filters } = useFilterStore();
  
  // Prefetch common queries
  useCachedAssets({ enabled: false });
  useCachedKPIs({ enabled: false });
  useCachedAggregated('asset_status', 10, { enabled: false });
  useCachedAggregated('asset_category', 10, { enabled: false });
}
