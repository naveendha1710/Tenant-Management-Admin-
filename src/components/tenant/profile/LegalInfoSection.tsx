import { UseFormReturn } from 'react-hook-form';
import { TenantProfileFormData } from '@/schemas/tenantProfileSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Upload, FileText, X } from 'lucide-react';
import { useState } from 'react';
import { tenantProfileService } from '@/services/tenantProfileService';
import { useToast } from '@/hooks/use-toast';

interface Props {
  form: UseFormReturn<TenantProfileFormData>;
}

export default function LegalInfoSection({ form }: Props) {
  const { toast } = useToast();
  const [uploadingGst, setUploadingGst] = useState(false);
  const [uploadingInc, setUploadingInc] = useState(false);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'gst_certificate_url' | 'incorporation_certificate_url',
    setUploading: (val: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const url = await tenantProfileService.uploadFile(file, 'tenant-documents');
      form.setValue(field, url);
      toast({ title: 'Document uploaded successfully' });
    } catch (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Legal & Tax Information</CardTitle>
        <CardDescription>Manage your company's legal and tax compliance details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* GST Number */}
          <div className="space-y-2">
            <Label htmlFor="gst_number">GST Number</Label>
            <Input
              id="gst_number"
              {...form.register('gst_number')}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className="uppercase"
            />
            {form.formState.errors.gst_number && (
              <p className="text-sm text-destructive">{form.formState.errors.gst_number.message}</p>
            )}
          </div>

          {/* PAN Number */}
          <div className="space-y-2">
            <Label htmlFor="pan_number">PAN Number</Label>
            <Input
              id="pan_number"
              {...form.register('pan_number')}
              placeholder="ABCDE1234F"
              maxLength={10}
              className="uppercase"
            />
            {form.formState.errors.pan_number && (
              <p className="text-sm text-destructive">{form.formState.errors.pan_number.message}</p>
            )}
          </div>

          {/* CIN */}
          <div className="space-y-2">
            <Label htmlFor="cin">CIN (Corporate Identification Number)</Label>
            <Input
              id="cin"
              {...form.register('cin')}
              placeholder="U12345MH2020PTC123456"
              className="uppercase"
            />
          </div>

          {/* TAN */}
          <div className="space-y-2">
            <Label htmlFor="tan">TAN (Tax Deduction Account Number)</Label>
            <Input
              id="tan"
              {...form.register('tan')}
              placeholder="ABCD12345E"
              maxLength={10}
              className="uppercase"
            />
          </div>

          {/* SEZ Status */}
          <div className="space-y-2">
            <Label htmlFor="sez_status">SEZ / DTA Status</Label>
            <Select
              value={form.watch('sez_status')}
              onValueChange={(value: any) => form.setValue('sez_status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEZ">SEZ (Special Economic Zone)</SelectItem>
                <SelectItem value="DTA">DTA (Domestic Tariff Area)</SelectItem>
                <SelectItem value="Non-SEZ">Non-SEZ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Document Uploads */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold">Document Uploads</h3>

          {/* GST Certificate */}
          <div className="space-y-2">
            <Label>GST Certificate</Label>
            <div className="flex items-center gap-3">
              {form.watch('gst_certificate_url') ? (
                <div className="flex items-center gap-2 flex-1 p-3 border rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">GST Certificate Uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue('gst_certificate_url', '')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, 'gst_certificate_url', setUploadingGst)}
                    disabled={uploadingGst}
                    className="hidden"
                    id="gst-upload"
                  />
                  <Label htmlFor="gst-upload" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      {uploadingGst ? 'Uploading...' : 'Upload GST Certificate'}
                    </div>
                  </Label>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 5MB</p>
          </div>

          {/* Incorporation Certificate */}
          <div className="space-y-2">
            <Label>Incorporation Certificate</Label>
            <div className="flex items-center gap-3">
              {form.watch('incorporation_certificate_url') ? (
                <div className="flex items-center gap-2 flex-1 p-3 border rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm flex-1 truncate">Incorporation Certificate Uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setValue('incorporation_certificate_url', '')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, 'incorporation_certificate_url', setUploadingInc)}
                    disabled={uploadingInc}
                    className="hidden"
                    id="inc-upload"
                  />
                  <Label htmlFor="inc-upload" className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent">
                      <Upload className="h-4 w-4" />
                      {uploadingInc ? 'Uploading...' : 'Upload Incorporation Certificate'}
                    </div>
                  </Label>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG up to 5MB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
