import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchExportHistory } from '@/utils/reports/reportHistory';
import { useToast } from '@/hooks/use-toast';
import { ReportType } from '@/types/report';

interface ExportHistoryTabProps {
  reportType: ReportType;
}

export function ExportHistoryTab({ reportType }: ExportHistoryTabProps) {
  const { toast } = useToast();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchExportHistory(reportType);
      setHistory(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [reportType]);

  if (!loading && history.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button variant="outline" onClick={loadHistory}>Refresh</Button>
        </div>
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No export history yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={loadHistory} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Report Name</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Sheets</TableHead>
            <TableHead>Rows</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.report_name}</TableCell>
              <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
              <TableCell>{item.total_sheets}</TableCell>
              <TableCell>{item.total_rows}</TableCell>
              <TableCell>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  item.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.status}
                </span>
              </TableCell>
              <TableCell>
                {item.file_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}