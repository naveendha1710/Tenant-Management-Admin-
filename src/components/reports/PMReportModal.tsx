import { useState } from 'react';
import { X, BarChart3 } from 'lucide-react';
import type { PMReportType, PMReportFilters, PMReportResponse } from '@/types/pmReports';
import { getPMScheduleReport, getPMTaskReport, getPMAuditReport } from '@/services/pmReportService';
import PMReportFilters from './PMReportFilters';

interface PMReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (reportType: PMReportType, data: PMReportResponse<any>) => void;
}

export default function PMReportModal({ isOpen, onClose, onExport }: PMReportModalProps) {
  const [reportType, setReportType] = useState<PMReportType>('task');
  const [filters, setFilters] = useState<PMReportFilters>({
    dateRange: {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  if (!isOpen) return null;

  async function handleExportClick() {
    setLoading(true);
    setError(null);
    try {
      let data;
      if (reportType === 'schedule') {
        data = await getPMScheduleReport(filters);
      } else if (reportType === 'task') {
        data = await getPMTaskReport(filters);
      } else {
        data = await getPMAuditReport(filters);
      }
      onExport(reportType, data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to export report');
    } finally {
      setLoading(false);
    }
  }

  const isExportDisabled = !filters.dateRange.startDate || !filters.dateRange.endDate || loading;

  return (
    <>
      <div className="bg-white w-full max-w-5xl max-h-[90vh] flex flex-col">
          <div className="h-14 border-b border-gray-300 flex items-center justify-between px-6">
            <h1 className="text-lg font-bold text-gray-900">PM Reports</h1>
            <button
              onClick={onClose}
              className="h-9 w-9 border border-gray-300 hover:bg-gray-50 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <PMReportFilters 
              reportType={reportType}
              setReportType={setReportType}
              filters={filters} 
              onChange={setFilters} 
            />

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleExportClick}
                disabled={isExportDisabled}
                className="h-9 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors duration-200"
              >
                <BarChart3 className="w-4 h-4" />
                {loading ? 'Exporting...' : 'Export to Excel'}
              </button>
            </div>

            {error && (
              <div className="mt-4 text-sm text-red-600 border-l-2 border-red-600 pl-3 py-2">
                {error}
              </div>
            )}
          </div>
        </div>


    </>
  );
}
