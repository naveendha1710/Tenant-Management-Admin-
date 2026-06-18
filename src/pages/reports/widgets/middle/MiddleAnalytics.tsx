import React, { useMemo } from 'react';
import { BaseChart } from '../../charts/BaseChart';
import { useFilteredAssets } from '../../hooks/useAnalytics';
import { useOperationalData } from '../../hooks/useOperationalData';
import { useMetadataMaps } from '../../hooks/useMetadataMaps';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function MiddleAnalytics() {
  const { assets } = useFilteredAssets();
  const { history, tickets, loading } = useOperationalData();
  const { buildingMap, tenantMap } = useMetadataMaps();

  // 1. MOVEMENT SANKEY
  const sankeyOption = useMemo(() => {
    if (!history) return {};
    
    // Process top location movements
    const movements = history.filter(h => h.field_name === 'building');
    const flowCount: Record<string, number> = {};
    const nodesSet = new Set<string>();

    movements.forEach(m => {
      let oldV = m.old_value ? (buildingMap[m.old_value] || m.old_value) : 'Unknown';
      let newV = m.new_value ? (buildingMap[m.new_value] || m.new_value) : 'Unknown';
      if (oldV === newV) return;
      
      // Prevent cyclic links for Sankey (DAG constraint)
      oldV = `${oldV} (Source)`;
      newV = `${newV} (Dest)`;

      const key = `${oldV}|||${newV}`;
      flowCount[key] = (flowCount[key] || 0) + 1;
      nodesSet.add(oldV);
      nodesSet.add(newV);
    });

    const nodes = Array.from(nodesSet).map(n => ({ name: n }));
    const links = Object.entries(flowCount).map(([key, val]) => {
      const [source, target] = key.split('|||');
      return { source, target, value: val };
    });

    return {
      tooltip: { trigger: 'item', triggerOn: 'mousemove' },
      series: {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: nodes,
        links: links,
        lineStyle: {
          color: 'gradient',
          curveness: 0.5
        }
      }
    };
  }, [history, buildingMap]);

  // 2. TICKET DISTRIBUTION (Category Horizontal & Status Donut Combined)
  const ticketCategoryOption = useMemo(() => {
    if (!tickets) return {};

    // Only consider tickets that are related to assets (have ticket_assets with asset_id)
    const assetTickets = tickets.filter((t: any) => {
      if (!t) return false;
      if (!t.ticket_assets) return false;
      if (!Array.isArray(t.ticket_assets)) return false;
      return t.ticket_assets.some((ta: any) => ta && (ta.asset_id || ta.asset_id === 0));
    });

    const catCounts = assetTickets.reduce((acc, t) => {
      const c = t.category || 'Unknown';
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort
    const data = Object.entries(catCounts).sort((a, b) => a[1] - b[1]);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: data.map(d => d[0]) },
      series: [
        {
          type: 'bar',
          data: data.map(d => d[1]),
          itemStyle: { borderRadius: 4, color: '#3b82f6' }
        }
      ]
    };
  }, [tickets]);

  // 3. BUILDING VS TENANT HEATMAP
  const heatmapOption = useMemo(() => {
    if (!assets) return {};
    const matrix: Record<string, Record<string, number>> = {};
    const bSet = new Set<string>();
    const tSet = new Set<string>();

    assets.forEach(a => {
      const b = a.building ? (buildingMap[a.building] || a.building) : 'Unknown';
      const t = a.handover_to ? (tenantMap[a.handover_to] || a.handover_to) : 'Unknown';
      bSet.add(b);
      tSet.add(t);
      if (!matrix[b]) matrix[b] = {};
      matrix[b][t] = (matrix[b][t] || 0) + 1;
    });

    const bArray = Array.from(bSet);
    const tArray = Array.from(tSet);
    const data: [number, number, number][] = [];

    bArray.forEach((b, i) => {
      tArray.forEach((t, j) => {
        const val = matrix[b]?.[t] || 0;
        if (val > 0) data.push([i, j, val]);
      });
    });

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const b = bArray[params.data[0]];
          const t = tArray[params.data[1]];
          return `${b} <br/> Tenant: ${t} <br/> Count: ${params.data[2]}`;
        }
      },
      grid: { height: '70%', top: '10%', right: '5%' },
      xAxis: { type: 'category', data: bArray, splitArea: { show: true } },
      yAxis: { type: 'category', data: tArray, splitArea: { show: true } },
      visualMap: {
        min: 0,
        max: Math.max(1, ...data.map(d => d[2])),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%'
      },
      series: [
        {
          name: 'Allocations',
          type: 'heatmap',
          data,
          label: { show: true },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        }
      ]
    };
  }, [assets, buildingMap, tenantMap]);

  // 4. VENDOR DISTRIBUTION (Polar Bar)
  const vendorOption = useMemo(() => {
    if (!assets) return {};
    const vCounts = assets.reduce((acc, a) => {
      const v = a.vendor_name || 'Unknown';
      acc[v] = (acc[v] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(vCounts).sort((a, b) => b[1] - a[1]);

    return {
      tooltip: { trigger: 'item' },
      angleAxis: {},
      radiusAxis: {
        type: 'category',
        data: data.map(d => d[0]).slice(0, 10), // top 10
        z: 10
      },
      polar: {},
      series: [
        {
          type: 'bar',
          data: data.map(d => d[1]).slice(0, 10),
          coordinateSystem: 'polar',
          itemStyle: { color: '#10b981' }
        }
      ]
    };
  }, [assets]);

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      {/* 1. Movement Sankey */}
      <Card className="col-span-full lg:col-span-2 overflow-hidden shadow-sm">
        <CardContent className="p-0 h-[350px] relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border">
            Location Flow Analytics
          </div>
          <BaseChart option={sankeyOption} height="100%" />
        </CardContent>
      </Card>

      {/* 2. Ticket Distribution */}
      <Card className="lg:col-span-1 overflow-hidden shadow-sm">
        <CardContent className="p-0 h-[350px] relative">
          <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border">
            Helpdesk Load (Assets)
          </div>
          <div className="pt-12 px-2 h-full">
             <BaseChart option={ticketCategoryOption} height="100%" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Vendor Distribution Polar */}
      <Card className="lg:col-span-1 overflow-hidden shadow-sm">
        <CardContent className="p-0 h-[350px] relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border">
            Top Vendors Focus
          </div>
          <BaseChart option={vendorOption} height="100%" />
        </CardContent>
      </Card>

      {/* 3. Building vs Tenant Heatmap */}
      <Card className="col-span-full overflow-hidden shadow-sm bg-slate-50 dark:bg-slate-900/50">
        <CardContent className="p-0 h-[500px] relative">
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1.5 rounded text-sm font-semibold border shadow-sm">
            Building ⨯ Tenant Matrix
          </div>
          <div className="w-full h-full pt-16 px-4">
            <BaseChart option={heatmapOption} height="100%" />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
