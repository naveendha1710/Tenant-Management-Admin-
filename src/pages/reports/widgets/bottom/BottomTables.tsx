import React, { useMemo, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getPaginationRowModel,
  flexRender, 
  SortingState
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useOperationalData } from '../../hooks/useOperationalData';
import { useFilteredAssets } from '../../hooks/useAnalytics';
import { useMetadataMaps } from '../../hooks/useMetadataMaps';

// Custom Table Renderer
function OperationalTable({ data, columns, title }: { data: any[], columns: any[], title: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 5 }
    }
  });

  return (
    <Card className="flex flex-col shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="bg-slate-50 dark:bg-slate-900 border-b px-4 py-3">
        <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
      </div>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-slate-100/50 dark:bg-slate-800/50 sticky top-0 z-10">
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => (
                    <TableHead 
                      key={h.id} 
                      className="cursor-pointer select-none text-xs"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{
                          asc: <ChevronUp className="w-3 h-3" />,
                          desc: <ChevronDown className="w-3 h-3" />,
                        }[h.column.getIsSorted() as string] ?? null}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-b-slate-100 dark:border-b-slate-800 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-2 px-4 text-sm whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-6 text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t mt-auto text-xs">
          <span className="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BottomTables() {
  const { assets } = useFilteredAssets();
  const { history, tickets, loading } = useOperationalData();
  const { buildingMap, tenantMap } = useMetadataMaps();

  // 1. ASSETS PER TENANT
  const tenantData = useMemo(() => {
    if (!assets) return [];
    const tMap: Record<string, { count: number, buildings: Set<string>, cats: Set<string> }> = {};
    assets.forEach(a => {
      const t = a.handover_to ? (tenantMap[a.handover_to] || a.handover_to) : 'Unassigned';
      if (!tMap[t]) tMap[t] = { count: 0, buildings: new Set(), cats: new Set() };
      tMap[t].count++;
      if (a.building) tMap[t].buildings.add(buildingMap[a.building] || a.building);
      if (a.asset_category) tMap[t].cats.add(a.asset_category);
    });
    return Object.entries(tMap).map(([name, v]) => ({
      tenant: name,
      count: v.count,
      buildings: v.buildings.size,
      cats: v.cats.size
    })).sort((a,b) => b.count - a.count);
  }, [assets, tenantMap, buildingMap]);

  // 2. RECENTLY MOVED ASSETS
  const recentMoves = useMemo(() => {
    if (!history) return [];
    return history.filter(h => h.field_name === 'building').map(h => ({
      asset: h.assets?.asset_name || h.asset_id,
      prev: h.old_value ? buildingMap[h.old_value] || h.old_value : 'Unknown',
      newLoc: h.new_value ? buildingMap[h.new_value] || h.new_value : 'Unknown',
      date: new Date(h.changed_at).toLocaleDateString(),
    })).slice(0, 50);
  }, [history, buildingMap]);

  // 3. MOST TICKETED ASSETS
  const ticketedData = useMemo(() => {
    if (!tickets) return [];
    const map: Record<string, { count: number, name: string, b: string, t: string }> = {};
    tickets.forEach(t => {
       const juncs = Array.isArray(t.ticket_assets) ? t.ticket_assets : (t.ticket_assets ? [t.ticket_assets] : []);
       juncs.forEach((j: any) => {
         const id = j.asset_id;
         if (!id) return;
         if (!map[id]) {
           const aItem = Array.isArray(t.assets) ? t.assets.find((x:any) => x.asset_id === id)?.assets : t.assets;
           map[id] = {
             count: 0, 
             name: aItem?.asset_name || id,
             b: aItem?.building ? (buildingMap[aItem.building] || aItem.building) : 'Unknown',
             t: aItem?.handover_to ? (tenantMap[aItem.handover_to] || aItem.handover_to) : 'Unknown'
           };
         }
         map[id].count++;
       });
    });
    return Object.values(map).sort((a,b) => b.count - a.count);
  }, [tickets, buildingMap, tenantMap]);

  // 4. ASSETS BY STATUS
  const statusData = useMemo(() => {
    if (!assets) return [];
    const sMap: Record<string, { count: number, valueSum: number }> = {};
    assets.forEach(a => {
      const s = a.asset_status || 'Unknown';
      if (!sMap[s]) sMap[s] = { count: 0, valueSum: 0 };
      sMap[s].count++;
      if (a.asset_value) sMap[s].valueSum += Number(a.asset_value);
    });
    return Object.entries(sMap).map(([s, v]) => ({
      status: s,
      count: v.count,
      val: `$${v.valueSum.toLocaleString()}`
    })).sort((a,b) => b.count - a.count);
  }, [assets]);

  if (loading) {
    return <div className="flex justify-center my-6"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <OperationalTable 
        title="Assets By Tenant"
        data={tenantData}
        columns={[
          { accessorKey: 'tenant', header: 'Tenant' },
          { accessorKey: 'count', header: 'Assets' },
          { accessorKey: 'buildings', header: 'Buildings span' },
          { accessorKey: 'cats', header: 'Categories' },
        ]}
      />
      <OperationalTable 
        title="Most Ticketed Assets"
        data={ticketedData}
        columns={[
          { accessorKey: 'name', header: 'Asset' },
          { accessorKey: 'count', header: 'Tickets' },
          { accessorKey: 'b', header: 'Building' },
          { accessorKey: 't', header: 'Tenant' },
        ]}
      />
      <OperationalTable 
        title="Recently Moved Assets"
        data={recentMoves}
        columns={[
          { accessorKey: 'asset', header: 'Asset Name' },
          { accessorKey: 'prev', header: 'Previous Location' },
          { accessorKey: 'newLoc', header: 'New Location' },
          { accessorKey: 'date', header: 'Date moved' },
        ]}
      />
      <OperationalTable 
        title="Assets by Status"
        data={statusData}
        columns={[
          { accessorKey: 'status', header: 'Status' },
          { accessorKey: 'count', header: 'Count' },
          { accessorKey: 'val', header: 'Est. Value' },
        ]}
      />
    </div>
  );
}