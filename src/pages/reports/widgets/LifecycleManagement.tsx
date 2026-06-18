import { memo } from 'react';
import { useKPIMetrics, useAggregatedData, useTimeSeries } from '../hooks/useAnalytics';
import { KPICard } from '../components/KPICard';
import { ChartWidget } from '../components/ChartWidget';
import { ChartRenderer } from '../charts/ChartRenderer';
import { transformToChartData } from '../utils/chartUtils';
import { Clock, AlertTriangle, TrendingDown, Wrench } from 'lucide-react';

export const LifecycleManagement = memo(function LifecycleManagement() {
  const { data: warrantyData, loading: warrantyLoading } = useAggregatedData('warranty_date', 10);
  const { data: purchaseTimeline, loading: purchaseLoading } = useTimeSeries('purchase_date', 'month');
  const { data: conditionData, loading: conditionLoading } = useAggregatedData('condition', 10);
  const { data: pmStatusData, loading: pmLoading } = useAggregatedData('last_pm_date', 10);

  // Calculate lifecycle KPIs
  const calculateLifecycleKPIs = () => {
    // These would be calculated from actual data
    return {
      avgAssetAge: 3.5,
      warrantyActive: 450,
      warrantyExpired: 120,
      pmOverdue: 35,
    };
  };

  const kpis = calculateLifecycleKPIs();

  const kpiCards = [
    {
      label: 'Avg Asset Age',
      value: `${kpis.avgAssetAge} years`,
      format: 'number' as const,
      icon: 'Clock',
      color: 'bg-blue-100',
    },
    {
      label: 'Active Warranties',
      value: kpis.warrantyActive,
      format: 'number' as const,
      icon: 'CheckCircle',
      color: 'bg-green-100',
    },
    {
      label: 'Expired Warranties',
      value: kpis.warrantyExpired,
      format: 'number' as const,
      icon: 'AlertTriangle',
      color: 'bg-red-100',
    },
    {
      label: 'PM Overdue',
      value: kpis.pmOverdue,
      format: 'number' as const,
      icon: 'Wrench',
      color: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => (
          <KPICard key={index} data={kpi} loading={false} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Age Distribution */}
        <ChartWidget
          title="Asset Purchase Timeline"
          subtitle="Monthly asset acquisitions"
          loading={purchaseLoading}
          isEmpty={purchaseTimeline.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'line',
              data: transformToChartData(purchaseTimeline),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Warranty Status */}
        <ChartWidget
          title="Warranty Expiry Distribution"
          subtitle="Assets by warranty status"
          loading={warrantyLoading}
          isEmpty={warrantyData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'donut',
              data: transformToChartData(warrantyData),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Asset Condition */}
        <ChartWidget
          title="Asset Condition Matrix"
          subtitle="Current condition of assets"
          loading={conditionLoading}
          isEmpty={conditionData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'bar',
              data: transformToChartData(conditionData),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* PM Compliance */}
        <ChartWidget
          title="Preventive Maintenance Status"
          subtitle="PM schedule compliance"
          loading={pmLoading}
          isEmpty={pmStatusData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'gauge',
              data: {
                labels: ['PM Compliance'],
                series: [75], // 75% compliance
              },
              height: 350,
            }}
          />
        </ChartWidget>
      </div>
    </div>
  );
});
