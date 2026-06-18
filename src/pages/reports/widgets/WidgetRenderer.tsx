import { memo } from 'react';
import { WidgetConfig } from '../types';
import { ChartWidget } from '../components/ChartWidget';
import { ChartRenderer } from '../charts/ChartRenderer';
import { KPICard } from '../components/KPICard';
import { useAggregatedData, useKPIMetrics } from '../hooks/useAnalytics';
import { transformToChartData } from '../utils/chartUtils';
import { useFilterStore } from '../store/filterStore';

interface WidgetRendererProps {
  widget: WidgetConfig;
  onRemove?: () => void;
}

export const WidgetRenderer = memo(function WidgetRenderer({
  widget,
  onRemove,
}: WidgetRendererProps) {
  // Render based on widget type
  switch (widget.type) {
    case 'chart':
      return <ChartWidgetRenderer widget={widget} onRemove={onRemove} />;
    case 'kpi':
      return <KPIWidgetRenderer widget={widget} onRemove={onRemove} />;
    case 'table':
      return <TableWidgetRenderer widget={widget} onRemove={onRemove} />;
    default:
      return null;
  }
});

function ChartWidgetRenderer({ widget, onRemove }: WidgetRendererProps) {
  const { data, loading, error } = useAggregatedData(widget.dataSource, 10);
  const filters = useFilterStore((state) => state.filters);
  const chartKey = JSON.stringify(filters);

  return (
    <ChartWidget
      key={`${chartKey}-${widget.id}`}
      title={widget.title}
      subtitle={widget.subtitle}
      loading={loading}
      error={error}
      isEmpty={data.length === 0}
    >
      {widget.chartConfig && (
        <ChartRenderer
          config={{
            ...widget.chartConfig,
            data: transformToChartData(data),
          }}
        />
      )}
    </ChartWidget>
  );
}

function KPIWidgetRenderer({ widget }: WidgetRendererProps) {
  const { metrics, loading } = useKPIMetrics();

  const getKPIValue = () => {
    switch (widget.dataSource) {
      case 'totalAssets':
        return metrics?.totalAssets || 0;
      case 'activeAssets':
        return metrics?.activeAssets || 0;
      case 'underRepair':
        return metrics?.underRepair || 0;
      case 'totalValue':
        return metrics?.totalValue || 0;
      default:
        return 0;
    }
  };

  return (
    <KPICard
      data={{
        label: widget.title,
        value: getKPIValue(),
        format: 'number',
      }}
      loading={loading}
    />
  );
}

function TableWidgetRenderer({ widget }: WidgetRendererProps) {
  return (
    <ChartWidget title={widget.title} subtitle={widget.subtitle}>
      <div className="text-center py-8 text-muted-foreground">
        Table widget - Coming soon
      </div>
    </ChartWidget>
  );
}
