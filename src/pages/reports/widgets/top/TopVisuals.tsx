import React, { useMemo } from 'react';
import { BaseChart } from '../../charts/BaseChart';
import { useFilteredAssets } from '../../hooks/useAnalytics';
import { useMetadataMaps } from '../../hooks/useMetadataMaps';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function TopVisuals() {
  const { assets, loading } = useFilteredAssets();
  const { buildingMap, tenantMap } = useMetadataMaps();

  // 1. BUILDING TREEMAP
  const buildingTreemapOption = useMemo(() => {
    if (!assets) return {};
    const buildingCounts = assets.reduce((acc, a) => {
      const bRaw = a.building;
      const b = bRaw ? (buildingMap[bRaw] || bRaw) : 'Unknown Building';
      acc[b] = (acc[b] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      tooltip: { formatter: '{b}: {c} assets' },
      series: [
        {
          type: 'treemap',
          name: 'Buildings',
          roam: 'scale',
          nodeClick: 'zoomToNode',
          breadcrumb: { show: false },
          itemStyle: { borderColor: '#fff' },
          data: Object.entries(buildingCounts).map(([name, value]) => ({
            name,
            value,
          })),
        },
      ],
    };
  }, [assets]);

  // 2. TENANT NESTED TREEMAP
  const tenantTreemapOption = useMemo(() => {
    if (!assets) return {};
    const tenantCounts = assets.reduce((acc, a) => {
      const tRaw = a.handover_to;
      const t = tRaw ? (tenantMap[tRaw] || tRaw) : 'Unassigned';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      tooltip: { formatter: '{b}: {c} assets' },
      series: [
        {
          type: 'treemap',
          name: 'Tenants',
          roam: 'scale',
          nodeClick: 'zoomToNode',
          data: Object.entries(tenantCounts).map(([name, value]) => ({
            name,
            value,
          })),
        },
      ],
    };
  }, [assets]);

  // 4. ASSET STATUS DISTRIBUTION
  const statusOption = useMemo(() => {
    if (!assets) return {};
    const statusCounts = assets.reduce((acc, a) => {
      const s = a.asset_status || 'Unknown';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 20, fontWeight: 'bold' }
          },
          labelLine: { show: false },
          data: Object.entries(statusCounts).map(([name, value]) => ({ name, value })),
        }
      ]
    };
  }, [assets]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Immersive Building Block */}
      <Card className="md:col-span-2 row-span-2 overflow-hidden shadow-md">
        <CardContent className="p-0 h-[600px] relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border">
            Building Density
          </div>
          <BaseChart option={buildingTreemapOption} height="100%" />
        </CardContent>
      </Card>

      {/* Tenant Analytics */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0 h-[288px] relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border">
            Tenant Allocation
          </div>
          <BaseChart option={tenantTreemapOption} height="100%" />
        </CardContent>
      </Card>

      {/* Operational Status */}
      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0 h-[288px] relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border">
            Operational Status
          </div>
          <BaseChart option={statusOption} height="100%" />
        </CardContent>
      </Card>
    </div>
  );
}
