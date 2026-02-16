import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { FileText, Calendar, AlertTriangle, Filter, XCircle, Download } from 'lucide-react';
import { generateOverallReport, generatePDFReport, generateVisualReport } from '@/utils/reportGenerator';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: any[];
}

export function ReportDialog({ open, onOpenChange, tickets }: ReportDialogProps) {
  const [reportType, setReportType] = useState<'overall' | 'tenant'>('overall');
  const [reportFormat, setReportFormat] = useState<'excel' | 'pdf' | 'visual'>('excel');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [reportFilters, setReportFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    category: [] as string[],
    tenant: [] as string[],
    assignedTo: [] as string[]
  });
  const { toast } = useToast();

  const uniqueTenants = Array.from(new Set(tickets.map(t => t.tenant?.company_name).filter(Boolean)));
  const activeFilterCount = reportFilters.status.length + reportFilters.priority.length + reportFilters.category.length + reportFilters.tenant.length;

  const handleGenerate = async () => {
    if (reportStartDate && reportEndDate && new Date(reportStartDate) > new Date(reportEndDate)) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    try {
      const filters = { startDate: reportStartDate, endDate: reportEndDate, ...reportFilters };
      if (reportType === 'overall') {
        if (reportFormat === 'excel') {
          await generateOverallReport(tickets, filters);
        } else if (reportFormat === 'pdf') {
          await generatePDFReport(tickets, filters);
        } else {
          await generateVisualReport(tickets, filters);
        }
      } else {
        const { generateTenantWiseReport, generateTenantWisePDF, generateTenantWiseVisual } = await import('@/utils/reportGenerator');
        if (reportFormat === 'excel') {
          await generateTenantWiseReport(tickets, filters);
        } else if (reportFormat === 'pdf') {
          await generateTenantWisePDF(tickets, filters);
        } else {
          await generateTenantWiseVisual(tickets, filters);
        }
      }
      toast({ title: "Success", description: "Report generated successfully" });
      onOpenChange(false);
      setReportStartDate('');
      setReportEndDate('');
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate report", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Generate Report
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Create comprehensive maintenance reports with custom filters</p>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Report Type
              </Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <SelectTrigger className="h-11 border-gray-200 hover:border-gray-300 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">📊 Overall Report</SelectItem>
                  <SelectItem value="tenant">👥 Tenant-wise Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                Format
              </Label>
              <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as any)}>
                <SelectTrigger className="h-11 border-gray-200 hover:border-gray-300 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">📊 Excel</SelectItem>
                  <SelectItem value="pdf">📄 PDF</SelectItem>
                  <SelectItem value="visual">📈 Visual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start Date</Label>
                <Input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">End Date</Label>
                <Input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} min={reportStartDate} className="h-10" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Leave dates empty for all-time report
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Label>
            <Button 
              variant={showAdvancedFilters ? "secondary" : "outline"} 
              size="sm" 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} 
              className="h-9 px-4 text-xs font-medium"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              {showAdvancedFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showAdvancedFilters && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">Status</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['pending', 'in_progress', 'completed', 'resolved'].map(s => (
                      <button
                        key={s}
                        onClick={() => setReportFilters(prev => ({
                          ...prev,
                          status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s]
                        }))}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          reportFilters.status.includes(s)
                            ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-600">Priority</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                      <button
                        key={p}
                        onClick={() => setReportFilters(prev => ({
                          ...prev,
                          priority: prev.priority.includes(p) ? prev.priority.filter(x => x !== p) : [...prev.priority, p]
                        }))}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          reportFilters.priority.includes(p)
                            ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {['AC', 'Electrical', 'Plumbing', 'Cleaning', 'IT Support', 'Other'].map(c => (
                    <button
                      key={c}
                      onClick={() => setReportFilters(prev => ({
                        ...prev,
                        category: prev.category.includes(c) ? prev.category.filter(x => x !== c) : [...prev.category, c]
                      }))}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                        reportFilters.category.includes(c)
                          ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Tenant</Label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {uniqueTenants.map(t => (
                    <button
                      key={t}
                      onClick={() => setReportFilters(prev => ({
                        ...prev,
                        tenant: prev.tenant.includes(t) ? prev.tenant.filter(x => x !== t) : [...prev.tenant, t]
                      }))}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                        reportFilters.tenant.includes(t)
                          ? 'bg-blue-100 border-blue-300 text-blue-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setReportFilters({ status: [], priority: [], category: [], tenant: [], assignedTo: [] })}
                className="h-8 text-xs w-full mt-2"
              >
                <XCircle className="h-3 w-3 mr-1.5" />
                Clear All Filters
              </Button>
            </div>
          )}

          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  {reportType === 'overall' ? 'Overall' : 'Tenant-wise'} {reportFormat === 'excel' ? 'Excel' : reportFormat === 'pdf' ? 'PDF' : 'Visual'} Report will include:
                </p>
                <ul className="text-xs text-blue-800 space-y-0.5 ml-1">
                  {reportType === 'overall' ? (
                    reportFormat === 'excel' ? (
                      <>
                        <li>• Summary statistics (status, priority, category)</li>
                        <li>• Detailed ticket list</li>
                        <li>• Cost breakdown by category</li>
                        <li>• Tenant-wise analysis</li>
                        <li>• Performance metrics (SLA, approvals, technicians)</li>
                        <li>• Trend analysis (6-month trend)</li>
                      </>
                    ) : reportFormat === 'pdf' ? (
                      <>
                        <li>• Summary statistics with visual cards</li>
                        <li>• Cost summary</li>
                        <li>• Recent tickets (top 20)</li>
                        <li>• Print-friendly format</li>
                      </>
                    ) : (
                      <>
                        <li>• Interactive visual charts</li>
                        <li>• Status distribution (pie chart)</li>
                        <li>• Priority & category breakdown (bar charts)</li>
                        <li>• Monthly trend analysis</li>
                        <li>• Gradient stat cards</li>
                      </>
                    )
                  ) : (
                    reportFormat === 'excel' ? (
                      <>
                        <li>• Separate sheet for each tenant</li>
                        <li>• Tenant summary (tickets, cost, status breakdown)</li>
                        <li>• Detailed ticket list per tenant</li>
                        <li>• Category-wise analysis per tenant</li>
                      </>
                    ) : reportFormat === 'pdf' ? (
                      <>
                        <li>• Separate page for each tenant</li>
                        <li>• Tenant summary cards</li>
                        <li>• Status and priority breakdown</li>
                        <li>• Recent tickets per tenant</li>
                      </>
                    ) : (
                      <>
                        <li>• Visual charts for each tenant</li>
                        <li>• Tenant comparison charts</li>
                        <li>• Status and priority distribution</li>
                        <li>• Cost analysis per tenant</li>
                      </>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>

          {reportStartDate && reportEndDate && new Date(reportStartDate) > new Date(reportEndDate) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-900">End date must be after start date</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-6">
            Cancel
          </Button>
          <Button onClick={handleGenerate} className="h-10 px-6 bg-blue-600 hover:bg-blue-700">
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
