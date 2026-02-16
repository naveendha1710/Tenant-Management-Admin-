import { UseFormReturn } from 'react-hook-form';
import { TenantProfileFormData } from '@/schemas/tenantProfileSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X, Bell, Mail, Calendar } from 'lucide-react';
import { useState } from 'react';
import { tenantProfileService } from '@/services/tenantProfileService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  form: UseFormReturn<TenantProfileFormData>;
}

export default function PortalSettingsSection({ form }: Props) {
  const { toast } = useToast();
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingSignature(true);
      const url = await tenantProfileService.uploadFile(file, 'tenant-signatures');
      form.setValue('digital_signature_url', url);
      toast({ title: 'Signature uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingSignature(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portal Settings</CardTitle>
        <CardDescription>Configure your notification preferences and portal settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Preferences */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Invoice Email Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive email alerts when new invoices are generated
                </p>
              </div>
              <Switch
                checked={form.watch('invoice_email_enabled')}
                onCheckedChange={(checked) => form.setValue('invoice_email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Ticket Update Notifications</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get notified when maintenance tickets are updated
                </p>
              </div>
              <Switch
                checked={form.watch('ticket_update_enabled')}
                onCheckedChange={(checked) => form.setValue('ticket_update_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="font-medium">Lease Renewal Reminders</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive reminders before lease expiration (30, 60, 90 days)
                </p>
              </div>
              <Switch
                checked={form.watch('lease_reminder_enabled')}
                onCheckedChange={(checked) => form.setValue('lease_reminder_enabled', checked)}
              />
            </div>
          </div>
        </div>

        {/* Communication Settings */}
        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Communication Settings</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default_communication_email">Default Communication Email</Label>
              <Input
                id="default_communication_email"
                type="email"
                {...form.register('default_communication_email')}
                placeholder="primary@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Primary email for all system communications
              </p>
              {form.formState.errors.default_communication_email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.default_communication_email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="authorized_signatory">Authorized Signatory Name</Label>
              <Input
                id="authorized_signatory"
                {...form.register('authorized_signatory')}
                placeholder="Full name of authorized person"
              />
              <p className="text-xs text-muted-foreground">
                Name to appear on official documents and agreements
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
