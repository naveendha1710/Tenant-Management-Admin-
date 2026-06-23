import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportBuilderTab } from './report-builder/ReportBuilderTab';
import { SavedTemplatesTab } from './templates/SavedTemplatesTab';
import { ExportHistoryTab } from './history/ExportHistoryTab';
import { GlobalFiltersTab } from './global-filters/GlobalFiltersTab';
import { GenerateFlexibleReportInput } from '@/utils/reports/generateFlexibleReport';
import { ReportType } from '@/types/report';

export type ReportTabValue =
  | 'report-builder'
  | 'global-filters'
  | 'saved-templates'
  // | 'scheduled-reports'
  | 'export-history';

interface ReportTabsProps {
  activeTab: ReportTabValue;
  onTabChange: (tab: ReportTabValue) => void;
  filtersApplied: boolean;
  onFiltersApplied: () => void;
  onGenerateReport: (input?: GenerateFlexibleReportInput) => Promise<void>;
  isGenerating: boolean;
  reportType: ReportType;
}

export function ReportTabs({
  activeTab,
  onTabChange,
  filtersApplied,
  onFiltersApplied,
  onGenerateReport,
  isGenerating,
  reportType,
}: ReportTabsProps) {
  const [templatesReloadKey, setTemplatesReloadKey] = useState(0);
  const currentTab: ReportTabValue = activeTab;

  return (
    <Tabs
      key={reportType}
      value={currentTab}
      onValueChange={(value) => onTabChange(value as ReportTabValue)}
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="global-filters">Global Filters</TabsTrigger>
        <TabsTrigger
          value="report-builder"
          className={!filtersApplied ? 'opacity-50' : undefined}
        >
          Report Builder
        </TabsTrigger>
        <TabsTrigger value="saved-templates">Saved Templates</TabsTrigger>
        <TabsTrigger value="export-history">Export History</TabsTrigger>
      </TabsList>

      <TabsContent value="global-filters" className="mt-6">
        <GlobalFiltersTab 
          onApply={() => {
            onFiltersApplied();
            onTabChange('report-builder');
          }} 
          reportType={reportType}
        />
      </TabsContent>
      <TabsContent value="report-builder" className="mt-6">
        <ReportBuilderTab
          filtersApplied={filtersApplied}
          onGenerateReport={onGenerateReport}
          isGenerating={isGenerating}
          onTemplateSaved={() => setTemplatesReloadKey((k) => k + 1)}
          reportType={reportType}
        />
      </TabsContent>
      <TabsContent value="saved-templates" className="mt-6">
        <SavedTemplatesTab
          reloadKey={templatesReloadKey}
          onTemplateLoaded={() => {
            onFiltersApplied();
            onTabChange('report-builder');
          }}
          reportType={reportType}
        />
      </TabsContent>
      <TabsContent value="export-history" className="mt-6">
        <ExportHistoryTab reportType={reportType} />
      </TabsContent>
    </Tabs>
  );
}

