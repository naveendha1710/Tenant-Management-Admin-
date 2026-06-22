import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReportBuilderSheetAccordion } from './SheetAccordion';
import { useReportSheetStore } from '@/store/useReportSheetStore';
import { GenerateFlexibleReportInput } from '@/utils/reports/generateFlexibleReport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useGlobalReportFilterStore } from '@/store/useGlobalReportFilterStore';
import { ReportType } from '@/types/report';

interface ReportBuilderTabProps {
  filtersApplied: boolean;
  onGenerateReport: (input?: GenerateFlexibleReportInput) => Promise<void>;
  isGenerating: boolean;
  onTemplateSaved?: () => void;
  reportType: ReportType;
}

export function ReportBuilderTab({
  filtersApplied,
  onGenerateReport,
  isGenerating,
  onTemplateSaved,
  reportType,
}: ReportBuilderTabProps) {
  const sheets = useReportSheetStore((state) => state.sheets);
  const addSheet = useReportSheetStore((state) => state.addSheet);
  const updateSheet = useReportSheetStore((state) => state.updateSheet);
  const removeSheet = useReportSheetStore((state) => state.removeSheet);
  const isValid = useReportSheetStore((state) => state.getIsValid());
  const globalFilters = useGlobalReportFilterStore((state) => state.filters);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Template name required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('report_templates')
      .insert({
        template_name: templateName.trim(),
        report_type: reportType,
        is_public: isPublic,
        global_filters: globalFilters,
        sheet_configs: sheets,
      });

    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Template saved', description: 'Template stored successfully.' });
    setTemplateName('');
    setIsPublic(false);
    setOpen(false);

    if (onTemplateSaved) onTemplateSaved();
  };

  return (
    <div className="space-y-4">
      <ReportBuilderSheetAccordion
        sheets={sheets}
        onUpdateSheet={updateSheet}
        onRemoveSheet={removeSheet}
        reportType={reportType}
      />

      <div className="sticky bottom-0 border-t bg-background pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <div className="flex gap-2">
            <Button variant="outline" onClick={addSheet}>Add Sheet</Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" disabled={!isValid} className={!isValid ? 'opacity-50' : undefined}>Save Template</Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Template</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input value={templateName} onChange={(e) => setTemplateName((e.target as HTMLInputElement).value)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Make Public</Label>
                    <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={saveTemplate} disabled={saving || !isValid || !templateName.trim()}>{saving ? 'Saving...' : 'Save'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Button
            onClick={() => onGenerateReport()}
            disabled={!isValid || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
        {!isValid && (
          <p className="mt-2 text-sm text-muted-foreground">
            Add at least one sheet and select at least one field per sheet to enable export.
          </p>
        )}
      </div>
    </div>
  );
}
