import { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, FileSpreadsheet, Download } from 'lucide-react';
import { TenantReportFilters } from './TenantReportFilters';
import { getTenantReport } from '@/services/tenantReportService';
import { exportTenantReport } from '@/services/tenantExcelExportService';
import type { TenantReportFilters as FilterType } from '@/types/tenantReports';

interface TenantReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TenantReportModal({ isOpen, onClose }: TenantReportModalProps) {
  const [filters, setFilters] = useState<FilterType>({});
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await getTenantReport(filters);
      exportTenantReport(data);
      onClose();
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(err.message || 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setFilters({});
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tenant Report</h2>
              <p className="text-xs text-gray-600">Comprehensive tenant, agreement, and financial analysis</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TenantReportFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-300 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors duration-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 rounded-md flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
