import { memo } from 'react';
import { useAggregatedData } from '../hooks/useAnalytics';
import { KPICard } from '../components/KPICard';
import { ChartWidget } from '../components/ChartWidget';
import { ChartRenderer } from '../charts/ChartRenderer';
import { transformToChartData } from '../utils/chartUtils';

export const MaintenanceHealth = memo(function MaintenanceHealth() {
  const { data: statusData, loading: statusLoading } = useAggregatedData('status', 10);
  const { data: assetStatusData, loading: assetStatusLoading } = useAggregatedData('asset_status', 10);
  const { data: conditionData, loading: conditionLoading } = useAggregatedData('condition', 10);

  const kpiCards = [
    {
      label: 'Working Assets',
      value: 850,
      format: 'number' as const,
      change: 2.5,
      changeType: 'increase' as const,
      color: 'bg-green-100',
    },
    {
      label: 'Not Working',
      value: 45,
      format: 'number' as const,
      change: 1.2,
      changeType: 'decrease' as const,
      color: 'bg-red-100',
    },
    {
      label: 'Under Maintenance',
      value: 28,
      format: 'number' as const,
      color: 'bg-orange-100',
    },
    {
      label: 'Health Score',
      value: 87,
      format: 'percentage' as const,
      change: 3.1,
      changeType: 'increase' as const,
      color: 'bg-blue-100',
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
        {/* Working vs Not Working */}
        <ChartWidget
          title="Asset Status Overview"
          subtitle="Current operational status"
          loading={statusLoading}
          isEmpty={statusData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'donut',
              data: transformToChartData(statusData),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Detailed Asset Status */}
        <ChartWidget
          title="Detailed Asset Status"
          subtitle="Breakdown by status type"
          loading={assetStatusLoading}
          isEmpty={assetStatusData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'bar',
              data: transformToChartData(assetStatusData),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Asset Condition Matrix */}
        <ChartWidget
          title="Asset Condition Distribution"
          subtitle="Physical condition assessment"
          loading={conditionLoading}
          isEmpty={conditionData.length === 0}
        >
          <ChartRenderer
            config={{
              type: 'treemap',
              data: transformToChartData(conditionData),
              height: 350,
            }}
          />
        </ChartWidget>

        {/* Maintenance Health Gauge */}
        <ChartWidget
          title="Overall Maintenance Health"
          subtitle="System health indicator"
          loading={false}
          isEmpty={false}
        >
          <ChartRenderer
            config={{
              type: 'gauge',
              data: {
                labels: ['Health Score'],
                series: [87],
              },
              height: 350,
            }}
          />
        </ChartWidget>
      </div>
    </div>
  );
});
