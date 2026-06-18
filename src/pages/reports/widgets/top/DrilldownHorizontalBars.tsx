import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useFilteredAssets } from '../../hooks/useAnalytics';
import { useFilterStore } from '../../store/filterStore';

type DrillParent = {
  category?: string;
  subCategory?: string;
};

type DrillItem = {
  key: string;
  label: string;
  path: string[];
  value: number;
};

function aggregateLevel(
  assets: any[],
  level: number,
  parent?: DrillParent
): DrillItem[] {
  const map = new Map<string, number>();

  assets.forEach((asset) => {
    const category = asset.asset_category || 'Unknown';
    const subCategory = asset.asset_sub_category || 'Unknown';
    const assetType = asset.asset_type || 'Unknown';

    // FILTERS
    if (parent?.category && category !== parent.category) return;

    if (parent?.subCategory && subCategory !== parent.subCategory) return;

    let key = category;

    // LEVEL 2
    if (level === 2) {
      key = `${category}|||${subCategory}`;
    }

    // LEVEL 3
    if (level === 3) {
      key = `${category}|||${subCategory}|||${assetType}`;
    }

    map.set(key, (map.get(key) || 0) + 1);
  });

  const result = Array.from(map.entries()).map(([key, value]) => {
    const path = key.split('|||');

    return {
      key,
      value,
      path,
      label: path[path.length - 1],
    };
  });

  result.sort((a, b) => b.value - a.value);

  return result;
}

export function DrilldownHorizontalBars() {
  const chartRef = useRef<HTMLDivElement | null>(null);

  const chartInstance = useRef<echarts.ECharts | null>(null);

  const { assets, loading } = useFilteredAssets();

  const { setFilter } = useFilterStore();

  const [level, setLevel] = useState(1);

  const [parent, setParent] = useState<DrillParent | null>(null);

  const totalAssets = assets?.length || 0;

  // AGGREGATED DATA
  const chartData = useMemo(() => {
    if (!assets) return [];

    return aggregateLevel(assets, level, parent || undefined);
  }, [assets, level, parent]);

  // DYNAMIC HEIGHT
  const dynamicHeight = useMemo(() => {
    return Math.max(chartData.length * 42, 480);
  }, [chartData]);

  // TITLE
  const title = useMemo(() => {
    if (level === 1) {
      return 'Asset Categories';
    }

    if (level === 2) {
      return `Subcategories • ${parent?.category}`;
    }

    return `Asset Types • ${parent?.subCategory}`;
  }, [level, parent]);

  // OPTION
  const option = useMemo(() => {
    return {
      backgroundColor: 'transparent',

      animationDuration: 500,

      tooltip: {
        trigger: 'item',

        backgroundColor: '#0f172a',

        borderWidth: 0,

        textStyle: {
          color: '#fff',
        },

        formatter: (params: any) => {
          const percentage = totalAssets
            ? ((params.value / totalAssets) * 100).toFixed(1)
            : 0;

          return `
            <div style="padding:6px 8px">
              <div style="font-weight:600;margin-bottom:6px">
                ${params.name}
              </div>

              <div>Assets: ${params.value}</div>
              <div>Share: ${percentage}%</div>
            </div>
          `;
        },
      },

      grid: {
        top: 20,
        left: 280,
        right: 60,
        bottom: 20,
      },

      xAxis: {
        type: 'value',
        show: false,
      },

      yAxis: {
        type: 'category',

        inverse: true,

        data: chartData.map((item) => item.label),

        axisLine: {
          show: false,
        },

        axisTick: {
          show: false,
        },

        axisLabel: {
          color: '#64748b',

          fontSize: 12,

          width: 240,

          overflow: 'truncate',

          formatter: (value: string) => {
            if (value.length > 34) {
              return value.slice(0, 34) + '...';
            }

            return value;
          },
        },
      },

      series: [
        {
          type: 'bar',

          data: chartData.map((item) => ({
            value: item.value,
            name: item.label,
          })),

          cursor: 'pointer',

          barWidth: 18,

          roundCap: true,

          showBackground: true,

          backgroundStyle: {
            color: 'rgba(148,163,184,0.06)',
            borderRadius: 999,
          },

          itemStyle: {
            borderRadius: 999,

            color: (params: any) => {
              const colors = [
                '#3b82f6',
                '#06b6d4',
                '#8b5cf6',
                '#10b981',
                '#f59e0b',
                '#ef4444',
                '#6366f1',
              ];

              return colors[params.dataIndex % colors.length];
            },
          },

          label: {
            show: true,

            position: 'right',

            color: '#0f172a',

            fontWeight: 600,

            fontSize: 11,
          },

          emphasis: {
            focus: 'series',

            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(0,0,0,0.18)',
            },
          },
        },
      ],
    };
  }, [chartData, totalAssets]);

  // INIT CHART
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    chartInstance.current = chart;

    return () => {
      chart.dispose();
    };
  }, []);

  // SET OPTION
  useEffect(() => {
    if (!chartInstance.current) return;

    chartInstance.current.setOption(option, true);

    chartInstance.current.resize();
  }, [option]);

  // CLICK EVENTS
  useEffect(() => {
    if (!chartInstance.current) return;

    const chart = chartInstance.current;

    const handleClick = (params: any) => {
      const item = chartData.find((d) => d.label === params.name);

      if (!item) return;

      // LEVEL 1 -> LEVEL 2
      if (level === 1) {
        setParent({
          category: item.path[0],
        });

        setLevel(2);

        return;
      }

      // LEVEL 2 -> LEVEL 3
      if (level === 2) {
        setParent({
          category: item.path[0],
          subCategory: item.path[1],
        });

        setLevel(3);

        return;
      }

      // LEVEL 3 -> APPLY FILTERS
      if (level === 3) {
        const [category, subCategory, assetType] = item.path;

        if (category) {
          setFilter('category', category);
        }

        if (subCategory) {
          setFilter('subCategory', subCategory);
        }

        if (assetType) {
          setFilter('type', assetType);
        }
      }
    };

    chart.on('click', handleClick);

    return () => {
      chart.off('click', handleClick);
    };
  }, [chartData, level, setFilter]);

  // RESPONSIVE
  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // BACK
  const handleBack = () => {
    // LEVEL 3 -> LEVEL 2
    if (level === 3) {
      setLevel(2);

      setParent((prev) => ({
        category: prev?.category,
      }));

      return;
    }

    // LEVEL 2 -> LEVEL 1
    if (level === 2) {
      setLevel(1);

      setParent(null);
    }
  };

  // Listen for global reset events from the dashboard header
  useEffect(() => {
    const onReset = () => {
      setLevel(1);

      setParent(null);
    };

    window.addEventListener('reports:resetDrill', onReset as EventListener);

    return () => {
      window.removeEventListener('reports:resetDrill', onReset as EventListener);
    };
  }, []);

  return (
    <div className="w-full rounded-2xl border bg-background/70 p-5 shadow-sm backdrop-blur-sm">
      {/* HEADER */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {level > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              {title}
            </h3>

            <p className="text-xs text-muted-foreground">
              Click bars to drill down
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            Total Assets: {totalAssets}
          </div>
        </div>
      </div>

      {/* CHART CONTAINER */}
      <div className="max-h-[720px] overflow-y-auto pr-2">
        <div
          className="relative w-full"
          style={{
            height: `${dynamicHeight}px`,
          }}
        >
          {/* (overlay back button removed — header Back is primary) */}
          {/* LOADING */}
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="text-sm text-muted-foreground">
                Loading...
              </div>
            </div>
          )}

          {/* CHART */}
          <div
            ref={chartRef}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}