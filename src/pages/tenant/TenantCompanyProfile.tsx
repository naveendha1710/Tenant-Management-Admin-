import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { tenantProfileSchema, TenantProfileFormData } from '@/schemas/tenantProfileSchema';
import { tenantProfileService } from '@/services/tenantProfileService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import BasicInfoSection from '@/components/tenant/profile/BasicInfoSection';
import ContactInfoSection from '@/components/tenant/profile/ContactInfoSection';
import AddressSection from '@/components/tenant/profile/AddressSection';
import LegalInfoSection from '@/components/tenant/profile/LegalInfoSection';
import PortalSettingsSection from '@/components/tenant/profile/PortalSettingsSection';
import SecuritySection from '@/components/tenant/profile/SecuritySection';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function TenantCompanyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const form = useForm<TenantProfileFormData>({
    resolver: zodResolver(tenantProfileSchema),
    defaultValues: {
      billing_same_as_registered: true,
      invoice_email_enabled: true,
      ticket_update_enabled: true,
      lease_reminder_enabled: true,
    },
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await tenantProfileService.getProfile(user?.id || '');
      setProfileData(data);
      if (data) {
        form.reset(data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: TenantProfileFormData) => {
    try {
      setSaving(true);
      await tenantProfileService.updateProfile(user?.id || '', data);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      loadProfile();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Company Profile" subtitle="Loading...">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Company Profile" subtitle="Manage your company information and portal settings">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="legal">Legal & Tax</TabsTrigger>
            <TabsTrigger value="settings">Portal Settings</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoSection form={form} profileData={profileData} />
          </TabsContent>

          <TabsContent value="contact">
            <ContactInfoSection form={form} />
          </TabsContent>

          <TabsContent value="address">
            <AddressSection form={form} />
          </TabsContent>

          <TabsContent value="legal">
            <LegalInfoSection form={form} />
          </TabsContent>

          <TabsContent value="settings">
            <PortalSettingsSection form={form} />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySection profileData={profileData} />
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 bg-background border-t mt-6 py-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={saving}
          >
            Reset
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
