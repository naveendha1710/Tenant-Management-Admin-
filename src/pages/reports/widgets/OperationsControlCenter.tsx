import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';
import { useFilterStore } from '../store/filterStore';
import { useGlobalReportFilterStore } from '@/store/useGlobalReportFilterStore';
import { TopVisuals } from './top/TopVisuals';
import { MiddleAnalytics } from './middle/MiddleAnalytics';
import { BottomTables } from './bottom/BottomTables';
import { useFilteredAssets } from '../hooks/useAnalytics';

import { DrilldownHorizontalBars } from './top/DrilldownHorizontalBars';

interface OperationsControlCenterProps {
  onOpenReportWorkspace?: () => void;
  activeFilterCount?: number;
}

export function OperationsControlCenter({ onOpenReportWorkspace, activeFilterCount }: OperationsControlCenterProps) {
  const { assets } = useFilteredAssets();
  const { setFilter, resetFilters } = useFilterStore();
  const { clearFilters: clearGlobalFilters } = useGlobalReportFilterStore();
  
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-12">
      {/* Dynamic Header if needed */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Active Operational Floor</h2>
          <p className="text-muted-foreground text-sm">Real-time asset telemetry and movement tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold px-4 py-2 border rounded-md shadow-sm bg-background">
            Tracking <span className="text-primary">{assets?.length || 0}</span> Filtered Assets
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                // Reset the analytics filters store to defaults
                resetFilters();

                // Also clear global report filters (if any)
                clearGlobalFilters();
              } catch (e) {
                // noop
              }

              // notify drill widgets to reset their local state
              window.dispatchEvent(new CustomEvent('reports:resetDrill'));
            }}
          >
            Reset
          </Button>

          {onOpenReportWorkspace && (
            <Button
              variant="outline"
              onClick={onOpenReportWorkspace}
              className="h-11"
            >
              <Filter className="mr-2 h-4 w-4" />

              Reports Workspace

              {(activeFilterCount || 0) > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* 1. TOP SECTION (Hierarchies) */}
      <section className="space-y-2">
        <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground ml-1">Volume & Allocation</h3>
        <TopVisuals />
        <DrilldownHorizontalBars />
      </section>

      {/* 2. MIDDLE SECTION (Tickets, Movements) */}
      <section className="space-y-2 pt-4">
        <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground ml-1">Flow & Diagnostics</h3>
        <MiddleAnalytics />
      </section>

      {/* 3. BOTTOM SECTION (Tables) */}
      <section className="space-y-2 pt-4">
        <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground ml-1">Operational Manifest</h3>
        <BottomTables />
      </section>
    </div>
  );
}
