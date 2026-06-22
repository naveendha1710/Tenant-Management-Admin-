import { useState } from 'react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';

import { OperationsControlCenter } from './widgets/OperationsControlCenter';

import { useFilterStore } from './store/filterStore';
import { useReportSheetStore } from '@/store/useReportSheetStore';
import { useAuth } from '@/contexts/AuthContext';

import { ReportWorkspaceDrawer } from '@/components/reports/ReportWorkspaceDrawer';
import { ReportTabValue } from '@/components/reports/ReportTabs';

import { useGlobalReportFilterStore } from '@/store/useGlobalReportFilterStore';

import {
  generateFlexibleReport,
  GenerateFlexibleReportInput,
} from '@/utils/reports/generateFlexibleReport';

import { recordExportHistory } from '@/utils/reports/reportHistory';
import { ReportType } from '@/types/report';

export default function Reports() {
  const { toast } = useToast();

  /* Drawer State */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Active Report Workspace Tab */
  const [activeTab, setActiveTab] =
    useState<ReportTabValue>('report-builder');

  /* Filters Applied State */
  const [filtersApplied, setFiltersApplied] =
    useState(false);

  /* Report Generation State */
  const [isGenerating, setIsGenerating] =
    useState(false);

  /* Report Type State */
  const [reportType, setReportType] = useState<ReportType>('asset');

  /* Filter Store */
  const activeFilterCount = useFilterStore(
    (state) => state.activeFilters
  );
  const resetFilters = useFilterStore((state) => state.resetFilters);

  /* Global Report Filters */
  const globalFilters = useGlobalReportFilterStore(
    (state) => state.filters
  );
  const clearGlobalFilters = useGlobalReportFilterStore((state) => state.clearFilters);

  /* Report Sheets */
  const sheets = useReportSheetStore((state) => state.sheets);
  const loadedTemplateId = useReportSheetStore((state) => state.loadedTemplateId);
  const clearAllSheets = useReportSheetStore((state) => state.clearAllSheets);
  const setLoadedTemplateId = useReportSheetStore((state) => state.setLoadedTemplateId);

  /* Current App User */
  const { user: currentUser } = useAuth();

  /* Generate Report */
  const handleGenerateReport = async (
    input?: GenerateFlexibleReportInput
  ) => {
    const reportInput: GenerateFlexibleReportInput =
      input || {
        globalFilters,
        sheets,
        reportName: `${reportType === 'asset' ? 'Asset' : reportType === 'helpdesk' ? 'Helpdesk' : 'Tenant'}_Report`,
        reportType, // NEW - pass report type to RPC
      };

    /* Validation */
    if (!reportInput.sheets || reportInput.sheets.length === 0) {
      toast({
        title: 'Add sheets',
        description:
          'Create at least one sheet before exporting.',
        variant: 'destructive',
      });

      return;
    }

    setIsGenerating(true);

    try {
      // Ensure templateId and generatedBy are set from app state if missing
      if (!reportInput.templateId && loadedTemplateId) {
        (reportInput as any).templateId = loadedTemplateId;
      }

      if (!reportInput.generatedBy && currentUser) {
        (reportInput as any).generatedBy = currentUser.full_name || (currentUser.appUser && currentUser.appUser.name) || currentUser.email || null;
      }

      const result = await generateFlexibleReport(reportInput);

      /* Save History */
      await recordExportHistory({
        templateId: reportInput.templateId || null,
        reportName:
          reportInput.reportName || result.filename,
        reportType:
          reportInput.reportType || 'custom',
        totalSheets: result.totalSheets,
        totalRows: result.totalRows,
        generationTimeMs: result.generationTimeMs,
        status: 'Success',
        generatedBy: reportInput.generatedBy,
      });

      toast({
        title: 'Report generated successfully',
        description: `${result.totalSheets} sheet(s), ${result.totalRows} row(s) exported.`,
      });
    } catch (error: any) {
      try {
        await recordExportHistory({
          templateId: reportInput.templateId || null,
          reportName:
            reportInput.reportName || (reportInput.reportType === 'tenant' ? 'Tenant_Report' : 'Asset_Report'),
          reportType:
            reportInput.reportType || 'custom',
          totalSheets:
            reportInput.sheets?.length || 0,
          totalRows: 0,
          generationTimeMs: 0,
          status: 'Failed',
          errorMessage:
            error.message ||
            'Failed to generate report',
          generatedBy: reportInput.generatedBy,
        });
      } catch {
        /* Prevent UI Failure */
      }

      toast({
        title: 'Report generation failed',
        description:
          error.message ||
          'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  /* Apply Filters */
  const handleFiltersApplied = () => {
    setFiltersApplied(true);

    toast({
      title: 'Filters Applied',
      description:
        'Report filters updated successfully.',
    });

    /* Stay Inside Report Builder */
    setActiveTab('report-builder');
  };

  const handleReportTypeChange = (nextType: ReportType) => {
    if (nextType === reportType) {
      return;
    }

    setReportType(nextType);
    setActiveTab('global-filters');
    setFiltersApplied(false);
    clearAllSheets();
    clearGlobalFilters();
    resetFilters();
    setLoadedTemplateId(null);
  };

  return (
    <DashboardLayout
      title="Analytics Dashboard"
      subtitle="Enterprise asset management insights"
    >
      <div className="space-y-6">
        {/* Dashboard Widgets */}
        <OperationsControlCenter
          onOpenReportWorkspace={() => setDrawerOpen(true)}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Reports Workspace Drawer */}
      <ReportWorkspaceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReportTypeChange={handleReportTypeChange}
        filtersApplied={filtersApplied}
        onFiltersApplied={handleFiltersApplied}
        onGenerateReport={handleGenerateReport}
        isGenerating={isGenerating}
        reportType={reportType}
      />
    </DashboardLayout>
  );
}
