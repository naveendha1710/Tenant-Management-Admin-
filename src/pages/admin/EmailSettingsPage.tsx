import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Loader2, RotateCcw, Bell, FileText, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { renderTemplate } from '@/utils/templateRenderer';

// ─── SMTP SCHEMA ──────────────────────────────────────────────────────────────

const smtpSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.string().regex(/^\d+$/, 'Port must be a number').refine(val => {
    const num = parseInt(val);
    return num >= 1 && num <= 65535;
  }, 'Port must be between 1 and 65535'),
  secure: z.boolean(),
  user: z.string().min(1, 'Username is required'),
  pass: z.string().min(1, 'Password is required'),
  from: z.string().email('Invalid email format').or(z.string().regex(/^.+<.+@.+\..+>$/, 'Invalid email format')),
  testEmail: z.string().email('Invalid email format').optional().or(z.literal(''))
});

type SMTPFormData = z.infer<typeof smtpSchema>;

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface EmailLog {
  to: string;
  subject: string;
  timestamp: string;
  status: string;
  messageId: string | null;
  error: string | null;
}

interface NotifSetting {
  id: string;
  event: string;
  enabled: boolean;
  notify_creator: boolean;
  notify_manager: boolean;
  notify_helpdesk: boolean;
}

interface EmailTemplate {
  id?: string;
  event: string;
  role: string;
  subject: string;
  html_body: string;
  is_active: boolean;
}

interface Branding {
  id?: string;
  company_name: string;
  footer_text: string;
  logo_url: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  'ticket.created': 'Ticket Created',
  'ticket.assigned': 'Ticket Assigned',
  'ticket.estimation_submitted': 'Estimation Submitted',
  'ticket.estimation_approved_by_manager': 'Estimation Approved by Manager',
  'ticket.estimation_rejected_by_manager': 'Estimation Rejected by Manager',
  'ticket.estimation_approved_by_tenant': 'Estimation Approved by Tenant',
  'ticket.estimation_rejected_by_tenant': 'Estimation Rejected by Tenant',
  'ticket.work_started': 'Work Started',
  'ticket.work_completed': 'Work Completed',
  'ticket.reopened': 'Ticket Reopened',
  'ticket.resolved': 'Ticket Resolved',
  'ticket.request_changes': 'Request Changes',
};

const ROLES = ['creator', 'manager', 'helpdesk'] as const;

const MOCK_VARS: Record<string, string> = {
  ticketNumber: 'TCK-1024',
  title: 'AC not working',
  status: 'In Progress',
  priority: 'High',
  cost: '₹2500',
  tenantName: 'John Doe',
  assignedTo: 'Technician A',
  companyName: '',   // filled at runtime from branding
  footerText: '',    // filled at runtime from branding
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function EmailSettingsPage() {
  const { toast } = useToast();

  // ── SMTP state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<SMTPFormData>({
    resolver: zodResolver(smtpSchema),
    defaultValues: { host: '', port: '587', secure: false, user: '', pass: '', from: '', testEmail: '' }
  });
  const secure = watch('secure');

  // ── Global email toggle state ────────────────────────────────────────────────
  const [globalEnabled, setGlobalEnabled] = useState(true);

  // ── Notification settings state ─────────────────────────────────────────────
  const [notifSettings, setNotifSettings] = useState<NotifSetting[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Template state ───────────────────────────────────────────────────────────
  const [allTemplates, setAllTemplates] = useState<EmailTemplate[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('ticket.assigned');
  const [selectedRole, setSelectedRole] = useState<'creator' | 'manager' | 'helpdesk'>('creator');
  const [templateForm, setTemplateForm] = useState({ subject: '', html_body: '' });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── Branding state ───────────────────────────────────────────────────────────
  const [branding, setBranding] = useState<Branding>({ id: undefined, company_name: '', footer_text: '', logo_url: '' });
  const [brandingSaving, setBrandingSaving] = useState(false);

  // ── Preview state ─────────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  // ── Test email state ──────────────────────────────────────────────────────────
  const [testTemplateEmail, setTestTemplateEmail] = useState('');
  const [testTemplateSending, setTestTemplateSending] = useState(false);

  // ─── LOAD ON MOUNT ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadSMTPConfig();
    loadEmailLogs();
    loadGlobalSetting();
    loadNotifSettings();
    loadAllTemplates();
    loadBranding();
  }, []);

  // Sync templateForm when event or role changes
  useEffect(() => {
    const tmpl = allTemplates.find(t => t.event === selectedEvent && t.role === selectedRole);
    setTemplateForm({ subject: tmpl?.subject ?? '', html_body: tmpl?.html_body ?? '' });
  }, [selectedEvent, selectedRole, allTemplates]);

  // ─── SMTP METHODS (unchanged) ────────────────────────────────────────────────

  const loadSMTPConfig = async () => {
    try {
      const response = await fetch('/api/admin/smtp/get');
      const data = await response.json();
      if (data) {
        setValue('host', data.host || '');
        setValue('port', data.port || '587');
        setValue('secure', data.secure || false);
        setValue('user', data.user || '');
        setValue('pass', data.pass || '');
        setValue('from', data.from || '');
      }
    } catch (error) {
      console.error('Error loading SMTP config:', error);
    }
  };

  const loadEmailLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await fetch('/api/admin/smtp/logs?limit=50');
      const data = await response.json();
      if (data.success) setEmailLogs(data.logs);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const onSubmit = async (data: SMTPFormData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/smtp/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: data.host, port: data.port, secure: data.secure, user: data.user, pass: data.pass, from: data.from })
      });
      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'SMTP configuration saved successfully' });
        loadSMTPConfig();
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmail = watch('testEmail');
    if (!testEmail) {
      toast({ title: 'Error', description: 'Please enter a test email address', variant: 'destructive' });
      return;
    }
    try {
      setTestLoading(true);
      const response = await fetch('/api/admin/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      });
      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'Test email sent successfully! Check your inbox.' });
        setValue('testEmail', '');
        loadEmailLogs();
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset SMTP configuration to default?')) return;
    try {
      const response = await fetch('/api/admin/smtp/reset', { method: 'POST' });
      const result = await response.json();
      if (response.ok) {
        toast({ title: 'Success', description: 'SMTP configuration reset to default' });
        reset({ host: '', port: '587', secure: false, user: '', pass: '', from: '', testEmail: '' });
      } else {
        throw new Error(result.error || 'Failed to reset configuration');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // ─── GLOBAL TOGGLE ───────────────────────────────────────────────────────────

  const loadGlobalSetting = async () => {
    const { data } = await supabase.from('email_global_settings').select('enabled').limit(1).single();
    if (data) setGlobalEnabled(data.enabled);
  };

  const updateGlobalSetting = async (value: boolean) => {
    setGlobalEnabled(value);
    const { data: row } = await supabase.from('email_global_settings').select('id').limit(1).single();
    if (!row) {
      // No row exists yet — insert one
      const { error } = await supabase.from('email_global_settings').insert({ enabled: value });
      if (error) {
        toast({ title: 'Error', description: 'Failed to update global setting', variant: 'destructive' });
        loadGlobalSetting();
      }
      return;
    }
    const { error } = await supabase
      .from('email_global_settings')
      .update({ enabled: value, updated_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update global setting', variant: 'destructive' });
      loadGlobalSetting();
    }
  };

  // ─── NOTIFICATION SETTINGS ───────────────────────────────────────────────────

  const loadNotifSettings = async () => {
    setNotifLoading(true);
    const { data } = await supabase.from('notification_settings').select('*').order('event');
    if (data) setNotifSettings(data);
    setNotifLoading(false);
  };

  const updateNotifSetting = async (event: string, field: keyof Omit<NotifSetting, 'id' | 'event'>, value: boolean) => {
    // Optimistic update
    setNotifSettings(prev => prev.map(s => s.event === event ? { ...s, [field]: value } : s));
    const { error } = await supabase.from('notification_settings').update({ [field]: value }).eq('event', event);
    if (error) {
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
      loadNotifSettings(); // revert on error
    }
  };

  // ─── TEMPLATES ───────────────────────────────────────────────────────────────

  const loadAllTemplates = async () => {
    setTemplatesLoading(true);
    const { data } = await supabase.from('email_templates').select('*');
    if (data) setAllTemplates(data);
    setTemplatesLoading(false);
  };

  const saveTemplate = async () => {
    if (!templateForm.subject.trim() || !templateForm.html_body.trim()) {
      toast({ title: 'Error', description: 'Subject and body are required', variant: 'destructive' });
      return;
    }
    setTemplateSaving(true);
    const { error } = await supabase.from('email_templates').upsert(
      { event: selectedEvent, role: selectedRole, subject: templateForm.subject, html_body: templateForm.html_body, is_active: true },
      { onConflict: 'event,role' }
    );
    if (error) {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: `Template for ${selectedRole} updated` });
      loadAllTemplates();
    }
    setTemplateSaving(false);
  };

  // ─── BRANDING ────────────────────────────────────────────────────────────────

  const loadBranding = async () => {
    const { data } = await supabase.from('email_branding').select('*').limit(1).single();
    if (data) setBranding({ id: data.id, company_name: data.company_name || '', footer_text: data.footer_text || '', logo_url: data.logo_url || '' });
  };

  const saveBranding = async () => {
    setBrandingSaving(true);
    const { error } = branding.id
      ? await supabase.from('email_branding').update({ company_name: branding.company_name, footer_text: branding.footer_text, logo_url: branding.logo_url, updated_at: new Date().toISOString() }).eq('id', branding.id)
      : await supabase.from('email_branding').insert({ company_name: branding.company_name, footer_text: branding.footer_text, logo_url: branding.logo_url });
    if (error) {
      toast({ title: 'Error', description: 'Failed to save branding', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Branding updated successfully' });
      loadBranding();
    }
    setBrandingSaving(false);
  };

  // ─── PREVIEW ─────────────────────────────────────────────────────────────────

  const handlePreview = () => {
    if (!templateForm.subject && !templateForm.html_body) {
      toast({ title: 'No template', description: 'Subject and body are empty', variant: 'destructive' });
      return;
    }
    
    const vars = {
      ...MOCK_VARS,
      companyName: branding.company_name || 'Rathinam Nexus Suite',
      footerText: branding.footer_text || 'This is an automated notification.',
    };
    
    setPreviewSubject(renderTemplate(templateForm.subject, vars));
    setPreviewHtml(renderTemplate(templateForm.html_body, vars));
    setPreviewOpen(true);
  };

  // ─── TEST EMAIL SEND ──────────────────────────────────────────────────────────

  const handleSendTestTemplate = async () => {
    if (!testTemplateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTemplateEmail)) {
      toast({ title: 'Invalid email', description: 'Enter a valid email address', variant: 'destructive' });
      return;
    }
    if (!templateForm.subject.trim() || !templateForm.html_body.trim()) {
      toast({ title: 'No template', description: 'Subject and body must not be empty', variant: 'destructive' });
      return;
    }
    const vars = {
      ...MOCK_VARS,
      companyName: branding.company_name || 'Rathinam Nexus Suite',
      footerText: branding.footer_text || 'This is an automated notification.',
    };
    const subject = renderTemplate(templateForm.subject, vars);
    const html = renderTemplate(templateForm.html_body, vars);
    try {
      setTestTemplateSending(true);
      const res = await fetch('/api/admin/smtp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTemplateEmail, subject, html }),
      });
      if (res.ok) {
        toast({ title: 'Test email sent', description: `Sent to ${testTemplateEmail}` });
        setTestTemplateEmail('');
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send test email');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setTestTemplateSending(false);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Email Settings" subtitle="Configure SMTP, notification rules, templates and branding">
      <Tabs defaultValue="smtp" className="space-y-4">
        <TabsList>
          <TabsTrigger value="smtp" className="flex items-center gap-1"><Mail className="h-4 w-4" />SMTP</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1"><FileText className="h-4 w-4" />Templates</TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-1"><Palette className="h-4 w-4" />Branding</TabsTrigger>
        </TabsList>

        {/* ── SMTP TAB ────────────────────────────────────────────────────────── */}
        <TabsContent value="smtp" className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" />SMTP Configuration</CardTitle>
                <CardDescription>Configure your SMTP server settings for sending emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="host">SMTP Host *</Label>
                    <Input id="host" placeholder="smtp.gmail.com" {...register('host')} />
                    {errors.host && <p className="text-sm text-red-500">{errors.host.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">SMTP Port *</Label>
                    <Input id="port" placeholder="587" {...register('port')} />
                    {errors.port && <p className="text-sm text-red-500">{errors.port.message}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="secure" checked={secure} onCheckedChange={(checked) => setValue('secure', checked)} />
                  <Label htmlFor="secure" className="cursor-pointer">Use SSL/TLS (Port 465)</Label>
                </div>
                <p className="text-sm text-muted-foreground">Enable for secure connections. Use port 465 for SSL or 587 for TLS.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentication Credentials</CardTitle>
                <CardDescription>Enter your SMTP username and password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Username / Email *</Label>
                  <Input id="user" type="text" placeholder="your-email@example.com or SMTP username" {...register('user')} />
                  {errors.user && <p className="text-sm text-red-500">{errors.user.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">Password *</Label>
                  <div className="relative">
                    <Input id="pass" type={showPassword ? 'text' : 'password'} placeholder="Enter password" {...register('pass')} />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.pass && <p className="text-sm text-red-500">{errors.pass.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from">From Email *</Label>
                  <Input id="from" placeholder='Rathinam Nexus <noreply@rathinam.com>' {...register('from')} />
                  {errors.from && <p className="text-sm text-red-500">{errors.from.message}</p>}
                  <p className="text-sm text-muted-foreground">Format: "Display Name &lt;email@example.com&gt;" or just "email@example.com"</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle className="mr-2 h-4 w-4" />Save Settings</>}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset}>
                    <RotateCcw className="mr-2 h-4 w-4" />Reset to Default
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Test Email</CardTitle>
              <CardDescription>Send a test email to verify your SMTP configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="test@example.com" {...register('testEmail')} />
                  {errors.testEmail && <p className="text-sm text-red-500 mt-1">{errors.testEmail.message}</p>}
                </div>
                <Button type="button" onClick={handleTestEmail} disabled={testLoading}>
                  {testLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Test</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Logs</CardTitle>
                  <CardDescription>Recent email send history</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadEmailLogs} disabled={logsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>To</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : emailLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No email logs found</TableCell></TableRow>
                    ) : (
                      emailLogs.map((log, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{log.to}</TableCell>
                          <TableCell>{log.subject}</TableCell>
                          <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="flex items-center gap-1 w-fit">
                              {log.status === 'success' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.messageId || log.error || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ────────────────────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Global toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Global Email Control</CardTitle>
              <CardDescription>System-wide override. When disabled, no emails are sent regardless of individual event settings.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  {globalEnabled ? 'Emails are active and will fire based on event settings below.' : 'All emails are currently disabled system-wide.'}
                </p>
              </div>
              <Switch checked={globalEnabled} onCheckedChange={updateGlobalSetting} />
            </CardContent>
          </Card>

          {/* Per-event table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Rules</CardTitle>
              <CardDescription>Control which events trigger emails and who receives them. Changes apply instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              {notifLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className={`rounded-md border transition-opacity ${!globalEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[280px]">Event</TableHead>
                        <TableHead className="text-center w-[90px]">Enabled</TableHead>
                        <TableHead className="text-center w-[90px]">Creator</TableHead>
                        <TableHead className="text-center w-[90px]">Manager</TableHead>
                        <TableHead className="text-center w-[90px]">Helpdesk</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifSettings.map(s => (
                        <TableRow key={s.event}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{EVENT_LABELS[s.event] || s.event}</p>
                              <p className="text-xs text-muted-foreground font-mono">{s.event}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={s.enabled} onCheckedChange={v => updateNotifSetting(s.event, 'enabled', v)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={s.notify_creator} disabled={!s.enabled} onCheckedChange={v => updateNotifSetting(s.event, 'notify_creator', v)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={s.notify_manager} disabled={!s.enabled} onCheckedChange={v => updateNotifSetting(s.event, 'notify_manager', v)} />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch checked={s.notify_helpdesk} disabled={!s.enabled} onCheckedChange={v => updateNotifSetting(s.event, 'notify_helpdesk', v)} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEMPLATES TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Email Templates</CardTitle>
              <CardDescription>
                Edit subject and HTML body per event and recipient role. Variables: {'{{ticketNumber}} {{title}} {{status}} {{priority}} {{cost}} {{tenantName}} {{assignedTo}} {{companyName}} {{footerText}}'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="shrink-0">Event</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-[320px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs value={selectedRole} onValueChange={v => setSelectedRole(v as typeof selectedRole)}>
                <TabsList>
                  {ROLES.map(r => (
                    <TabsTrigger key={r} value={r} className="capitalize">{r}</TabsTrigger>
                  ))}
                </TabsList>
                {ROLES.map(r => (
                  <TabsContent key={r} value={r} className="space-y-4 pt-4">
                    {templatesLoading ? (
                      <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input
                            value={templateForm.subject}
                            onChange={e => setTemplateForm(f => ({ ...f, subject: e.target.value }))}
                            placeholder="e.g. [{{companyName}}] Ticket #{{ticketNumber}} assigned"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>HTML Body</Label>
                          <Textarea
                            value={templateForm.html_body}
                            onChange={e => setTemplateForm(f => ({ ...f, html_body: e.target.value }))}
                            rows={16}
                            className="font-mono text-sm"
                            placeholder="<div>Hello {{tenantName}}, your ticket #{{ticketNumber}} ...</div>"
                          />
                        </div>
                        <div className="flex flex-wrap items-end gap-3 pt-2">
                          <Button onClick={saveTemplate} disabled={templateSaving}>
                            {templateSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle className="mr-2 h-4 w-4" />Save Template</>}
                          </Button>
                          <Button type="button" variant="outline" onClick={handlePreview}>
                            <Eye className="mr-2 h-4 w-4" />Preview Email
                          </Button>
                        </div>

                        {/* Test email send */}
                        <div className="border rounded-md p-4 space-y-3 bg-muted/30">
                          <p className="text-sm font-medium">Send Test Email</p>
                          <p className="text-xs text-muted-foreground">Sends the current template with sample data to a real address. Does not log or trigger the ticket workflow.</p>
                          <div className="flex gap-2">
                            <Input
                              type="email"
                              placeholder="test@example.com"
                              value={testTemplateEmail}
                              onChange={e => setTestTemplateEmail(e.target.value)}
                              className="max-w-sm"
                            />
                            <Button type="button" variant="secondary" onClick={handleSendTestTemplate} disabled={testTemplateSending}>
                              {testTemplateSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Test Email</>}
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BRANDING TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Email Branding</CardTitle>
              <CardDescription>These values are injected as {'{{companyName}}'} and {'{{footerText}}'} in all email templates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={branding.company_name}
                  onChange={e => setBranding(b => ({ ...b, company_name: e.target.value }))}
                  placeholder="Rathinam Nexus Suite"
                />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Textarea
                  value={branding.footer_text}
                  onChange={e => setBranding(b => ({ ...b, footer_text: e.target.value }))}
                  rows={3}
                  placeholder="This is an automated notification. Please do not reply."
                />
              </div>
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  value={branding.logo_url}
                  onChange={e => setBranding(b => ({ ...b, logo_url: e.target.value }))}
                  placeholder="https://your-domain.com/logo.png"
                />
                <p className="text-xs text-muted-foreground">Accessible public URL for your company logo (used in email headers)</p>
              </div>
              <Button onClick={saveBranding} disabled={brandingSaving}>
                {brandingSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><CheckCircle className="mr-2 h-4 w-4" />Save Branding</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ── PREVIEW MODAL ──────────────────────────────────────────────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Subject:</Label>
              <p className="text-sm mt-1 p-2 bg-muted rounded">{previewSubject}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Body:</Label>
              <div className="mt-2 border rounded p-4 bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
