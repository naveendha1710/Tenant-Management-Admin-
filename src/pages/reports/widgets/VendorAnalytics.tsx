import { memo, useState, useEffect } from 'react';
import { useAggregatedData, useFilteredAssets } from '../hooks/useAnalytics';
import { KPICard } from '../components/KPICard';
import { ChartWidget } from '../components/ChartWidget';
import { ChartRenderer } from '../charts/ChartRenderer';
import { transformToChartData } from '../utils/chartUtils';

export const VendorAnalytics = memo(function VendorAnalytics() {
  const { data: vendorData, loading: vendorLoading } = useAggregatedData('vendor_name', 15);
  const { assets, loading: assetsLoading } = useFilteredAssets();
  const [vendorSpendData, setVendorSpendData] = useState<{ label: string; value: number }[]>([]);

  // Calculate vendor spend
  useEffect(() => {
    if (assets.length > 0) {
      const spendByVendor = assets.reduce((acc, asset) => {
        const vendor = asset.vendor_name || 'Unknown';
        const value = Number(asset.asset_value) || 0;
        acc[vendor] = (acc[vendor] || 0) + value;
        return acc;
      }, {} as Record<string, number>);

      const spendData = Object.entries(spendByVendor)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      setVendorSpendData(spendData);
    }
  }, [assets]);

  const kpiCards = [
    {
      label: 'Total Vendors',
      value: vendorData.length,
      format: 'number' as const,
      color: 'bg-purple-100',
    },
    {
      label: 'Top Vendor Assets',
      value: vendorData[0]?.value || 0,
      format: 'number' as const,
      color: 'bg-blue-100',
    },
    {
      label: 'Total Vendor Spend',
      value: vendorSpendData.reduce((sum, v) => sum + v.value, 0),
      format: 'currency' as const,
      color: 'bg-green-100',
    },
    {
      label: 'Avg Assets per Vendor',
      value: vendorData.length > 0 
        ? Math.round(vendorData.reduce((sum, v) => sum + v.value, 0) / vendorData.length)
        : 0,
      format: 'number' as const,
      color: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <KPICard key={index} data={kpi} loading={vendorLoading || assetsLoading} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Vendor Asset Distribution */}
        <ChartWidget
          title="Top Vendors by Asset Count"
          subtitle="Number of assets per vendor"
          loading={vendorLoading}
          isEmpty={vendorData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'bar',
              data: transformToChartData(vendorData.slice(0, 10)),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Vendor Spend Analysis */}
        <ChartWidget
          title="Vendor Spend Distribution"
          subtitle="Total asset value by vendor"
          loading={assetsLoading}
          isEmpty={vendorSpendData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'donut',
              data: transformToChartData(vendorSpendData),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Vendor Performance Treemap */}
        <ChartWidget
          title="Vendor Portfolio Overview"
          subtitle="Hierarchical view of vendor assets"
          loading={vendorLoading}
          isEmpty={vendorData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'treemap',
              data: transformToChartData(vendorData.slice(0, 15)),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Top Vendors Bar */}
        <ChartWidget
          title="Vendor Comparison"
          subtitle="Side-by-side vendor analysis"
          loading={vendorLoading}
          isEmpty={vendorData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'bar',
              data: transformToChartData(vendorData.slice(0, 8)),
              height: 350,
            }}
          />
        </ChartWidget>
      </div>
    </div>
  );
});
