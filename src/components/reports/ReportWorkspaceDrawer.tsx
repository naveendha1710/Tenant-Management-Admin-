import { useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ReportTabs, ReportTabValue } from './ReportTabs';
import { GenerateFlexibleReportInput } from '@/utils/reports/generateFlexibleReport';
import { ReportType } from '@/types/report';

interface ReportWorkspaceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: ReportTabValue;
  onTabChange: (tab: ReportTabValue) => void;
  filtersApplied: boolean;
  onFiltersApplied: () => void;
  onGenerateReport: (input?: GenerateFlexibleReportInput) => Promise<void>;
  isGenerating: boolean;
  reportType: ReportType;
}

export function ReportWorkspaceDrawer({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  filtersApplied,
  onFiltersApplied,
  onGenerateReport,
  isGenerating,
  reportType,
}: ReportWorkspaceDrawerProps) {
  useEffect(() => {
    if (open) {
      onTabChange('global-filters');
    }
  }, [open, onTabChange]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className='w-[840px] max-w-[98vw] min-w-[630px] overflow-hidden border-l bg-background p-0 shadow-2xl'
      >
        <div className='flex h-full flex-col'>
          {/* Header */}
          <SheetHeader className='border-b px-6 py-5'>
            <SheetTitle className='text-2xl font-semibold tracking-tight'>
              {reportType === 'asset'
                ? 'Asset Reports Workspace'
                : reportType === 'helpdesk'
                  ? 'Helpdesk Reports Workspace'
                  : 'Tenant Management Reports Workspace'}
            </SheetTitle>
            <SheetDescription>
              Configure filters and generate reports for your data.
            </SheetDescription>
          </SheetHeader>

          {/* Body */}
          <div className='flex-1 overflow-hidden'>
            <div className='h-full overflow-y-auto px-6 py-5'>
              <ReportTabs
                activeTab={activeTab}
                onTabChange={onTabChange}
                filtersApplied={filtersApplied}
                onFiltersApplied={onFiltersApplied}
                onGenerateReport={onGenerateReport}
                isGenerating={isGenerating}
                reportType={reportType}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
