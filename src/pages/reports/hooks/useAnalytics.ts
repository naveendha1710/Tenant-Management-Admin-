import { useState, useEffect, useCallback, useRef } from 'react';
import { useFilterStore } from '../store/filterStore';
import { AnalyticsService } from '../services/analytics.service';
import { Asset } from '../types';

/**
 * Hook for fetching filtered assets
 */
export function useFilteredAssets() {
  const { filters } = useFilterStore();
  const filtersRef = useRef(filters);
  const debouncedFiltersKey = useDebounce(JSON.stringify(filters), 300);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AnalyticsService.fetchAssets(filtersRef.current);
      setAssets(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedFiltersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { assets, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching aggregated data
 */
export function useAggregatedData(field: string, limit?: number) {
  const { filters } = useFilterStore();
  const filtersRef = useRef(filters);
  const debouncedFiltersKey = useDebounce(JSON.stringify(filters), 300);
  const [data, setData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AnalyticsService.fetchAggregated(field, filtersRef.current, limit);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [field, limit, debouncedFiltersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching KPI metrics
 */
export function useKPIMetrics() {
  const { filters } = useFilterStore();
  const filtersRef = useRef(filters);
  const debouncedFiltersKey = useDebounce(JSON.stringify(filters), 300);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await AnalyticsService.fetchKPIs(filtersRef.current);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedFiltersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { metrics, loading, error, refetch: fetchData };
}

/**
 * Hook for fetching time-series data
 */
export function useTimeSeries(
  dateField: keyof Asset,
  groupBy: 'day' | 'week' | 'month' | 'year' = 'month'
) {
  const { filters } = useFilterStore();
  const filtersRef = useRef(filters);
  const debouncedFiltersKey = useDebounce(JSON.stringify(filters), 300);
  const [data, setData] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await AnalyticsService.fetchTimeSeries(dateField, filtersRef.current, groupBy);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateField, groupBy, debouncedFiltersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export { useCrossFilter } from './useCrossFilter';
