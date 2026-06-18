import { useCallback } from 'react';
import { useFilterStore } from '../store/filterStore';

/**
 * Hook for handling cross-filtering between charts
 * Power BI style - clicking on a chart element filters other charts
 */
export function useCrossFilter() {
  const { setFilter, setFilters } = useFilterStore();

  /**
   * Handle chart click for cross-filtering
   */
  const handleChartClick = useCallback((params: any, filterKey: string) => {
    if (!params || !params.name) return;

    const value = params.name;
    
    // Map chart data to filter keys
    const filterMapping: Record<string, keyof any> = {
      asset_status: 'status',
      asset_category: 'category',
      asset_sub_category: 'subCategory',
      asset_type: 'type',
      vendor_name: 'vendor',
      building: 'building',
      condition: 'status',
    };

    const mappedKey = filterMapping[filterKey] || filterKey;
    setFilter(mappedKey as any, value);
  }, [setFilter]);

  /**
   * Handle multiple filter updates at once
   */
  const handleMultipleFilters = useCallback((filters: Record<string, any>) => {
    setFilters(filters);
  }, [setFilters]);

  /**
   * Create click handler for specific chart
   */
  const createClickHandler = useCallback((filterKey: string) => {
    return (params: any) => handleChartClick(params, filterKey);
  }, [handleChartClick]);

  return {
    handleChartClick,
    handleMultipleFilters,
    createClickHandler,
  };
}
