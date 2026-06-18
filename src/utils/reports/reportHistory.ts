import { supabase } from '@/lib/supabaseClient';
import { ReportType } from '@/types/report';

export type ReportHistoryRecord = {
  templateId?: string | null;
  reportName: string;
  reportType: string;
  totalSheets: number;
  totalRows: number;
  generationTimeMs: number;
  status: 'Success' | 'Failed';
  errorMessage?: string;
  generatedBy?: string;
};

export async function recordExportHistory(record: ReportHistoryRecord) {
  let generatedBy = record.generatedBy || null;
  // `generatedBy` should be provided by the caller (app auth layer).
  // Do not read localStorage or Supabase Auth here — keep this utility decoupled.

  const payload = {
    template_id: record.templateId || null,
    report_name: record.reportName,
    report_type: record.reportType,
    total_sheets: record.totalSheets,
    total_rows: record.totalRows,
    generation_time_ms: record.generationTimeMs,
    status: record.status,
    error_message: record.errorMessage || null,
    generated_by: generatedBy,
  };

  const { error } = await supabase
    .from('report_export_history')
    .insert(payload);

  if (error) throw error;
}

export async function fetchExportHistory(reportType?: ReportType) {
  let query = supabase
    .from('report_export_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
    
  if (reportType) {
    query = query.eq('report_type', reportType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
