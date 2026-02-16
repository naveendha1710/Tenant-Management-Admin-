import { UseFormReturn } from 'react-hook-form';
import { TenantProfileFormData } from '@/schemas/tenantProfileSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Building2 } from 'lucide-react';
import { useState } from 'react';
import { tenantProfileService } from '@/services/tenantProfileService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  form: UseFormReturn<TenantProfileFormData>;
  profileData: any;
}

export default function BasicInfoSection({ form, profileData }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(profileData?.logo_url || '');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await tenantProfileService.uploadFile(file, 'tenant-logos');
      form.setValue('logo_url', url);
      setLogoPreview(url);
      toast({ title: 'Logo uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Company Information</CardTitle>
        <CardDescription>Update your company's basic details and branding</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-2">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 border-2 border-dashed rounded-full flex items-center justify-center bg-muted overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
                id="logo-upload"
              />
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Uploading...' : 'Upload Logo'}
                </div>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              {...form.register('company_name')}
              placeholder="Enter company name"
            />
            {form.formState.errors.company_name && (
              <p className="text-sm text-destructive">{form.formState.errors.company_name.message}</p>
            )}
          </div>

          {/* Tenant ID */}
          <div className="space-y-2">
            <Label>Tenant ID</Label>
            <div className="flex items-center gap-2">
              <Input value={profileData?.tenant_id || 'N/A'} disabled className="bg-muted" />
              <Badge variant="secondary">Read-only</Badge>
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Select
              value={form.watch('industry')}
              onValueChange={(value) => form.setValue('industry', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee Count */}
          <div className="space-y-2">
            <Label htmlFor="employee_count">Employee Count</Label>
            <Input
              id="employee_count"
              type="number"
              {...form.register('employee_count', { valueAsNumber: true })}
              placeholder="Number of employees"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              {...form.register('website')}
              placeholder="https://example.com"
            />
            {form.formState.errors.website && (
              <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Account Status</Label>
            <div className="flex items-center gap-2">
              <Badge variant={profileData?.status === 'Active' ? 'default' : 'secondary'}>
                {profileData?.status || 'Unknown'}
              </Badge>
              <span className="text-sm text-muted-foreground">Read-only</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Company Description</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="Brief description of your company"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {form.watch('description')?.length || 0}/500
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
