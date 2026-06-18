import * as echarts from 'echarts';
import { ChartData } from '../types';
import { generateColorPalette } from '../utils/chartUtils';

/**
 * Donut Chart Configuration
 */
export function buildDonutChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(data.labels.length, theme);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      type: 'scroll',
    },
    color: colors,
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: theme === 'dark' ? '#1f2937' : '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        data: data.labels.map((label, index) => ({
          name: label,
          value: Array.isArray(data.series[0]) ? data.series[0][index] : data.series[index],
        })),
      },
    ],
  };
}

/**
 * Bar Chart Configuration
 */
export function buildBarChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(1, theme);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: {
        rotate: data.labels.length > 10 ? 45 : 0,
      },
    },
    yAxis: {
      type: 'value',
    },
    color: colors,
    series: [
      {
        type: 'bar',
        data: data.series,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)',
          },
        },
      },
    ],
  };
}

/**
 * Line Chart Configuration
 */
export function buildLineChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(1, theme);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
    },
    color: colors,
    series: [
      {
        type: 'line',
        data: data.series,
        smooth: true,
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          opacity: 0.2,
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  };
}

/**
 * Stacked Bar Chart Configuration
 */
export function buildStackedBarChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(
    Array.isArray(data.series[0]) ? data.series.length : 1,
    theme
  );

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      top: 30,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
    },
    yAxis: {
      type: 'value',
    },
    color: colors,
    series: Array.isArray(data.series[0])
      ? data.series.map((seriesData: any, index) => ({
          type: 'bar',
          stack: 'total',
          data: seriesData,
          emphasis: {
            focus: 'series',
          },
        }))
      : [
          {
            type: 'bar',
            data: data.series,
          },
        ],
  };
}

/**
 * Treemap Chart Configuration
 */
export function buildTreemapChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(data.labels.length, theme);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      formatter: '{b}: {c}',
    },
    color: colors,
    series: [
      {
        type: 'treemap',
        data: data.labels.map((label, index) => ({
          name: label,
          value: Array.isArray(data.series[0]) ? data.series[0][index] : data.series[index],
        })),
        leafDepth: 1,
        label: {
          show: true,
          formatter: '{b}\n{c}',
        },
        itemStyle: {
          borderColor: theme === 'dark' ? '#1f2937' : '#fff',
          borderWidth: 2,
        },
      },
    ],
  };
}

/**
 * Gauge Chart Configuration
 */
export function buildGaugeChart(
  value: number,
  max: number = 100,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  return {
    title: title ? { text: title, left: 'center' } : undefined,
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max,
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 6,
            color: [
              [0.3, '#67e0e3'],
              [0.7, '#37a2da'],
              [1, '#fd666d'],
            ],
          },
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto',
          },
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2,
          },
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5,
          },
        },
        axisLabel: {
          color: theme === 'dark' ? '#fff' : '#464646',
          fontSize: 12,
          distance: -60,
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}',
          color: 'auto',
          fontSize: 24,
          offsetCenter: [0, '40%'],
        },
        data: [{ value }],
      },
    ],
  };
}

/**
 * Heatmap Chart Configuration
 */
export function buildHeatmapChart(
  data: { x: string; y: string; value: number }[],
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const xCategories = [...new Set(data.map(d => d.x))];
  const yCategories = [...new Set(data.map(d => d.y))];
  
  const heatmapData = data.map(d => [
    xCategories.indexOf(d.x),
    yCategories.indexOf(d.y),
    d.value,
  ]);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      position: 'top',
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xCategories,
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...data.map(d => d.value)),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
    },
    series: [
      {
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}

/**
 * Funnel Chart Configuration
 */
export function buildFunnelChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(data.labels.length, theme);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
    },
    color: colors,
    series: [
      {
        type: 'funnel',
        left: '10%',
        top: 60,
        bottom: 60,
        width: '60%',
        min: 0,
        max: 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
        },
        labelLine: {
          length: 10,
          lineStyle: {
            width: 1,
            type: 'solid',
          },
        },
        itemStyle: {
          borderColor: theme === 'dark' ? '#1f2937' : '#fff',
          borderWidth: 1,
        },
        emphasis: {
          label: {
            fontSize: 20,
          },
        },
        data: data.labels.map((label, index) => ({
          name: label,
          value: Array.isArray(data.series[0]) ? data.series[0][index] : data.series[index],
        })),
      },
    ],
  };
}

/**
 * Histogram Chart Configuration
 */
export function buildHistogramChart(
  data: ChartData,
  title?: string,
  theme: 'light' | 'dark' = 'light'
): echarts.EChartsOption {
  const colors = data.colors || generateColorPalette(1, theme);

  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.labels,
      axisLabel: {
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
    },
    color: colors,
    series: [
      {
        type: 'bar',
        data: data.series,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
        barWidth: '90%',
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)',
          },
        },
      },
    ],
  };
}
