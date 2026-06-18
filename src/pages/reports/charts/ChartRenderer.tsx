import { memo } from 'react';
import { BaseChart } from './BaseChart';
import { ChartConfig } from '../types';
import {
  buildDonutChart,
  buildBarChart,
  buildLineChart,
  buildStackedBarChart,
  buildTreemapChart,
  buildGaugeChart,
  buildHeatmapChart,
  buildFunnelChart,
  buildHistogramChart,
} from './chartConfigs';
import { useTheme } from 'next-themes';

interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
}

export const ChartRenderer = memo(function ChartRenderer({
  config,
  className,
}: ChartRendererProps) {
  const { theme } = useTheme();
  const chartTheme = (theme as 'light' | 'dark') || 'light';

  const getChartOption = () => {
    switch (config.type) {
      case 'donut':
        return buildDonutChart(config.data, config.title, chartTheme);
      
      case 'bar':
        return buildBarChart(config.data, config.title, chartTheme);
      
      case 'line':
      case 'area':
        return buildLineChart(config.data, config.title, chartTheme);
      
      case 'stackedBar':
        return buildStackedBarChart(config.data, config.title, chartTheme);
      
      case 'treemap':
        return buildTreemapChart(config.data, config.title, chartTheme);
      
      case 'gauge':
        const value = Array.isArray(config.data.series) 
          ? config.data.series[0] as number 
          : 0;
        return buildGaugeChart(value, 100, config.title, chartTheme);
      
      case 'heatmap':
        return buildHeatmapChart([], config.title, chartTheme);
      
      case 'funnel':
        return buildFunnelChart(config.data, config.title, chartTheme);
      
      case 'histogram':
        return buildHistogramChart(config.data, config.title, chartTheme);
      
      default:
        return buildBarChart(config.data, config.title, chartTheme);
    }
  };

  return (
    <BaseChart
      option={getChartOption()}
      height={config.height}
      width={config.width}
      onChartClick={config.onClick}
      className={className}
    />
  );
});
