import { memo } from 'react';
import { useAggregatedData, useCrossFilter } from '../hooks/useAnalytics';
import { ChartWidget } from '../components/ChartWidget';
import { ChartRenderer } from '../charts/ChartRenderer';
import { transformToChartData } from '../utils/chartUtils';
import { Button } from '@/components/ui/button';
import { useFilterStore } from '../store/filterStore';

export const ExecutiveOverview = memo(function ExecutiveOverview() {
  const { data: statusData, loading: statusLoading } = useAggregatedData('asset_status', 10);
  const { data: categoryData, loading: categoryLoading } = useAggregatedData('asset_category', 10);
  const { data: vendorData, loading: vendorLoading } = useAggregatedData('vendor_name', 10);
  const { data: buildingData, loading: buildingLoading } = useAggregatedData('building', 10);
  const { createClickHandler } = useCrossFilter();
  const filters = useFilterStore((state) => state.filters);
  const activeFilterCount = useFilterStore((state) => state.activeFilters);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const chartKey = JSON.stringify(filters);



  return (
    <div className="space-y-6">
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Back to all assets
          </Button>
        </div>
      )}


      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Status Donut */}
        <ChartWidget
          key={`${chartKey}-status`}
          title="Asset Status Distribution"
          subtitle="Current status of all assets (click to filter)"
          loading={statusLoading}
          isEmpty={statusData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'donut',
              data: transformToChartData(statusData),
              height: 350,
              onClick: createClickHandler('asset_status'),
            }}
          />
        </ChartWidget>

        {/* Asset Category Bar */}
        <ChartWidget
          key={`${chartKey}-category`}
          title="Assets by Category"
          subtitle="Distribution across categories (click to filter)"
          loading={categoryLoading}
          isEmpty={categoryData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'bar',
              data: transformToChartData(categoryData),
              height: 350,
              onClick: createClickHandler('asset_category'),
            }}
          />
        </ChartWidget>

        {/* Vendor Distribution */}
        <ChartWidget
          key={`${chartKey}-vendor`}
          title="Top Vendors"
          subtitle="Assets by vendor (click to filter)"
          loading={vendorLoading}
          isEmpty={vendorData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'bar',
              data: transformToChartData(vendorData),
              height: 350,
              onClick: createClickHandler('vendor_name'),
            }}
          />
        </ChartWidget>

        {/* Building Distribution Treemap */}
        <ChartWidget
          key={`${chartKey}-building`}
          title="Asset Distribution by Building"
          subtitle="Hierarchical view of asset locations"
          loading={buildingLoading}
          isEmpty={buildingData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'treemap',
              data: transformToChartData(buildingData),
              height: 350,
            }}
          />
        </ChartWidget>
      </div>

    </div>
  );
});
