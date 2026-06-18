import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface ScheduleRow {
  id: string;
  template_id: string;
  schedule_type: string;
  cron_expression?: string;
  recipients?: string[];
  is_active: boolean;
  next_run_at?: string;
}

interface TemplateRow {
  id: string;
  template_name: string;
}

export function ScheduledReportsTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [cronExpression, setCronExpression] = useState('');
  const [recipients, setRecipients] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('report_templates')
      .select('id, template_name')
      .order('template_name', { ascending: true });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setTemplates(data || []);
  };

  const loadSchedules = async () => {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setSchedules(data || []);
  };

  useEffect(() => {
    loadTemplates();
    loadSchedules();
  }, []);

  const saveSchedule = async () => {
    if (!templateId) {
      toast({ title: 'Template required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const recipientsArray = recipients
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('scheduled_reports')
      .insert({
        template_id: templateId,
        schedule_type: scheduleType,
        cron_expression: scheduleType === 'cron' ? cronExpression : null,
        recipients: recipientsArray,
        is_active: isActive,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    toast({ title: 'Scheduled report created' });
    setTemplateId('');
    setScheduleType('daily');
    setCronExpression('');
    setRecipients('');
    setIsActive(true);
    setLoading(false);
    loadSchedules();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Schedule a Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.template_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select value={scheduleType} onValueChange={setScheduleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="cron">Cron</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scheduleType === 'cron' && (
            <div className="space-y-2 md:col-span-2">
              <Label>Cron Expression</Label>
              <Input value={cronExpression} onChange={(event) => setCronExpression(event.target.value)} />
            </div>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Recipients (comma separated)</Label>
            <Input value={recipients} onChange={(event) => setRecipients(event.target.value)} />
          </div>
          <div className="flex items-center justify-between md:col-span-2">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={saveSchedule} disabled={loading}>
              {loading ? 'Saving...' : 'Save Schedule'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="text-sm font-semibold">Scheduled Reports</div>
        {schedules.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No scheduled reports yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                const templateName = templates.find((t) => t.id === schedule.template_id)?.template_name;
                return (
                <TableRow key={schedule.id}>
                  <TableCell>{templateName || schedule.template_id}</TableCell>
                  <TableCell>{schedule.schedule_type}</TableCell>
                  <TableCell>{schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>{schedule.is_active ? 'Active' : 'Paused'}</TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
