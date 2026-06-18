import { useEffect, useRef, memo } from 'react';
import * as echarts from 'echarts';
import { useTheme } from 'next-themes';

interface BaseChartProps {
  option: echarts.EChartsOption;
  height?: number | string;
  width?: number | string;
  loading?: boolean;
  onChartClick?: (params: any) => void;
  className?: string;
}

export const BaseChart = memo(function BaseChart({
  option,
  height = '100%',
  width = '100%',
  loading = false,
  onChartClick,
  className = '',
}: BaseChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined);
    chartInstanceRef.current = chart;

    // Set option
    chart.setOption(option);

    // Handle click events
    if (onChartClick) {
      chart.on('click', onChartClick);
    }

    // Handle resize (window + container)
    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    let ro: ResizeObserver | undefined;
    try {
      ro = new ResizeObserver(() => {
        chartInstanceRef.current?.resize();
      });
      if (chartRef.current) ro.observe(chartRef.current);
    } catch (e) {
      // ResizeObserver may not be available in some environments; fallback to window resize only
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  // Update chart when option changes
  useEffect(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.setOption(option, { notMerge: true });
    }
  }, [option]);

  // Update loading state
  useEffect(() => {
    if (chartInstanceRef.current) {
      if (loading) {
        chartInstanceRef.current.showLoading();
      } else {
        chartInstanceRef.current.hideLoading();
      }
    }
  }, [loading]);

  // Update theme
  useEffect(() => {
    if (chartRef.current && chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined);
      chartInstanceRef.current = chart;
      chart.setOption(option);
      
      if (onChartClick) {
        chart.on('click', onChartClick);
      }
    }
  }, [theme]);

  return (
    <div
      ref={chartRef}
      className={className}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: typeof width === 'number' ? `${width}px` : width,
      }}
    />
  );
});
