import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useGlobalReportFilterStore } from '@/store/useGlobalReportFilterStore';
import { useReportSheetStore } from '@/store/useReportSheetStore';
import { useFilterStore } from '@/pages/reports/store/filterStore';
import { ReportType } from '@/types/report';
import { normalizeHelpdeskFieldKey } from '@/utils/reports/helpdeskReportFields';
import { normalizeTenantFieldKey } from '@/utils/reports/tenantReportFields';

interface SavedTemplatesTabProps {
  onTemplateLoaded?: () => void;
  reloadKey?: number;
  reportType: ReportType;
}

type ReportTemplate = {
  id: string;
  template_name: string;
  report_type: string;
  is_public: boolean;
  global_filters: any;
  sheet_configs: any;
  created_at: string;
};

export function SavedTemplatesTab({ onTemplateLoaded, reloadKey, reportType }: SavedTemplatesTabProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);

  const globalFilters = useGlobalReportFilterStore((state) => state.filters);
  const setGlobalFilters = useGlobalReportFilterStore((state) => state.setFilters);
  const setSheets = useReportSheetStore((state) => state.setSheets);
  const setLoadedTemplateId = useReportSheetStore((state) => state.setLoadedTemplateId);
  const sheets = useReportSheetStore((state) => state.sheets);
  const setAnalyticsFilters = useFilterStore((state) => state.setFilters);

  const loadTemplates = async () => {
    setLoading(true);
    const reportTypes = reportType === 'asset'
      ? ['asset', 'custom']
      : reportType === 'helpdesk'
        ? ['helpdesk']
        : ['tenant'];
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .in('report_type', reportTypes)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    // reload when parent signals a new template saved
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  const loadTemplate = (template: ReportTemplate) => {
    setGlobalFilters(template.global_filters || {});
    setSheets((template.sheet_configs || []).map((sheet: any) => ({
      ...sheet,
      fields: template.report_type === 'helpdesk'
        ? (sheet.fields || []).map((field: string) => normalizeHelpdeskFieldKey(field))
        : template.report_type === 'tenant'
          ? (sheet.fields || []).map((field: string) => normalizeTenantFieldKey(field))
        : sheet.fields || [],
      additionalFilters: sheet.additionalFilters ?? sheet.filters ?? {},
      sortOrder: sheet.sortOrder ? {
        ...sheet.sortOrder,
        field: template.report_type === 'helpdesk'
          ? normalizeHelpdeskFieldKey(sheet.sortOrder.field)
          : template.report_type === 'tenant'
            ? normalizeTenantFieldKey(sheet.sortOrder.field)
          : sheet.sortOrder.field,
      } : (sheet.sort ? {
        ...sheet.sort,
        field: template.report_type === 'helpdesk'
          ? normalizeHelpdeskFieldKey(sheet.sort.field)
          : template.report_type === 'tenant'
            ? normalizeTenantFieldKey(sheet.sort.field)
          : sheet.sort.field,
      } : undefined),
    })));
    if (template.report_type !== 'tenant') {
      setAnalyticsFilters({
        category: template.global_filters?.category || 'all',
        subCategory: template.global_filters?.subCategory || 'all',
        type: template.global_filters?.assetType || 'all',
        status: template.global_filters?.status || 'all',
        building: template.global_filters?.building || 'all',
        floor: template.global_filters?.floor || 'all',
        room: template.global_filters?.room || 'all',
        tenant: template.global_filters?.tenant || 'all',
        sortOrder: template.global_filters?.sortOrder || 'asc',
      });
    }
    // store the loaded template id so export history can reference it
    try {
      setLoadedTemplateId(template.id);
    } catch (e) {
      // ignore
    }

    if (onTemplateLoaded) onTemplateLoaded();
  };

  const duplicateTemplate = async (template: ReportTemplate) => {
    const { error } = await supabase
      .from('report_templates')
      .insert({
        template_name: `Copy of ${template.template_name}`,
        report_type: template.report_type,
        is_public: template.is_public,
        global_filters: template.global_filters,
        sheet_configs: template.sheet_configs,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Template duplicated' });
    loadTemplates();
  };

  const deleteTemplate = async (template: ReportTemplate) => {
    const { error } = await supabase
      .from('report_templates')
      .delete()
      .eq('id', template.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Template deleted' });
    loadTemplates();
  };

  const viewConfig = (template: ReportTemplate) => {
    setActiveTemplate(template);
    setViewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Template</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Visibility</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{template.template_name}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{template.report_type}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{template.is_public ? 'Public' : 'Private'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">{template.created_at ? new Date(template.created_at).toLocaleString() : '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => loadTemplate(template)}>Load</Button>
                    <Button size="sm" variant="outline" onClick={() => viewConfig(template)}>View Config</Button>
                    
                    <Button size="sm" variant="destructive" onClick={() => deleteTemplate(template)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}

            {templates.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No templates saved yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template JSON</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded bg-muted p-4 text-sm">
            {activeTemplate ? JSON.stringify(activeTemplate, null, 2) : ''}
          </pre>
          <DialogFooter>
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
