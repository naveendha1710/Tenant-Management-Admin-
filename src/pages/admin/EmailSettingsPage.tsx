/**
 * Email Settings Page - SMTP Configuration
 * 
 * Features:
 * - Configure SMTP settings (host, port, credentials)
 * - Test email functionality
 * - View email logs
 * - Reset to default configuration
 */

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
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Mail, Send, Eye, EyeOff, RefreshCw, CheckCircle, XCircle, Loader2, RotateCcw } from 'lucide-react';

// Validation schema
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

interface EmailLog {
  to: string;
  subject: string;
  timestamp: string;
  status: string;
  messageId: string | null;
  error: string | null;
}

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<SMTPFormData>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: '',
      port: '587',
      secure: false,
      user: '',
      pass: '',
      from: '',
      testEmail: ''
    }
  });

  const secure = watch('secure');

  // Load SMTP configuration on mount
  useEffect(() => {
    loadSMTPConfig();
    loadEmailLogs();
  }, []);

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
      toast({
        title: 'Error',
        description: 'Failed to load SMTP configuration',
        variant: 'destructive'
      });
    }
  };

  const loadEmailLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await fetch('/api/admin/smtp/logs?limit=50');
      const data = await response.json();
      
      if (data.success) {
        setEmailLogs(data.logs);
      }
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
        body: JSON.stringify({
          host: data.host,
          port: data.port,
          secure: data.secure,
          user: data.user,
          pass: data.pass,
          from: data.from
        })
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'SMTP configuration saved successfully'
        });
        loadSMTPConfig(); // Reload to get masked password
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save SMTP configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    const testEmail = watch('testEmail');
    
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address',
        variant: 'destructive'
      });
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
        toast({
          title: 'Success',
          description: 'Test email sent successfully! Check your inbox.'
        });
        setValue('testEmail', '');
        loadEmailLogs(); // Refresh logs
      } else {
        throw new Error(result.error || 'Failed to send test email');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email',
        variant: 'destructive'
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset SMTP configuration to default?')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/smtp/reset', {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'SMTP configuration reset to default'
        });
        reset({
          host: '',
          port: '587',
          secure: false,
          user: '',
          pass: '',
          from: '',
          testEmail: ''
        });
      } else {
        throw new Error(result.error || 'Failed to reset configuration');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset SMTP configuration',
        variant: 'destructive'
      });
    }
  };

  return (
    <DashboardLayout title="Email Settings" subtitle="Configure SMTP settings for email notifications">
      <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* SMTP Configuration Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMTP Configuration
              </CardTitle>
              <CardDescription>
                Configure your SMTP server settings for sending emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host *</Label>
                  <Input
                    id="host"
                    placeholder="smtp.gmail.com"
                    {...register('host')}
                  />
                  {errors.host && (
                    <p className="text-sm text-red-500">{errors.host.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">SMTP Port *</Label>
                  <Input
                    id="port"
                    placeholder="587"
                    {...register('port')}
                  />
                  {errors.port && (
                    <p className="text-sm text-red-500">{errors.port.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={secure}
                  onCheckedChange={(checked) => setValue('secure', checked)}
                />
                <Label htmlFor="secure" className="cursor-pointer">
                  Use SSL/TLS (Port 465)
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Enable for secure connections. Use port 465 for SSL or 587 for TLS.
              </p>
            </CardContent>
          </Card>

          {/* Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Credentials</CardTitle>
              <CardDescription>
                Enter your SMTP username and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Username / Email *</Label>
                <Input
                  id="user"
                  type="email"
                  placeholder="your-email@example.com"
                  {...register('user')}
                />
                {errors.user && (
                  <p className="text-sm text-red-500">{errors.user.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pass">Password *</Label>
                <div className="relative">
                  <Input
                    id="pass"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    {...register('pass')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.pass && (
                  <p className="text-sm text-red-500">{errors.pass.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="from">From Email *</Label>
                <Input
                  id="from"
                  placeholder="Rathinam Nexus <noreply@rathinam.com>"
                  {...register('from')}
                />
                {errors.from && (
                  <p className="text-sm text-red-500">{errors.from.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Format: "Display Name &lt;email@example.com&gt;" or just "email@example.com"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Test Email Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test Email
            </CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="test@example.com"
                  {...register('testEmail')}
                />
                {errors.testEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.testEmail.message}</p>
                )}
              </div>
              <Button
                type="button"
                onClick={handleTestEmail}
                disabled={testLoading}
              >
                {testLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Test
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Email Logs</CardTitle>
                <CardDescription>Recent email send history</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadEmailLogs}
                disabled={logsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                Refresh
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
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : emailLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No email logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    emailLogs.map((log, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{log.to}</TableCell>
                        <TableCell>{log.subject}</TableCell>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={log.status === 'success' ? 'default' : 'destructive'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {log.status === 'success' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.messageId || log.error || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
