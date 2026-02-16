import { UseFormReturn } from 'react-hook-form';
import { TenantProfileFormData } from '@/schemas/tenantProfileSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  form: UseFormReturn<TenantProfileFormData>;
}

export default function ContactInfoSection({ form }: Props) {
  const [showSecondary, setShowSecondary] = useState(!!form.watch('secondary_contact_name'));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>Manage primary and secondary contact details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Contact */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Primary Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person *</Label>
              <Input
                id="contact_person"
                {...form.register('contact_person')}
                placeholder="Full name"
              />
              {form.formState.errors.contact_person && (
                <p className="text-sm text-destructive">{form.formState.errors.contact_person.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                {...form.register('designation')}
                placeholder="e.g., CEO, Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="email@company.com"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="+91 1234567890"
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                {...form.register('mobile')}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternate_phone">Alternate Phone</Label>
              <Input
                id="alternate_phone"
                {...form.register('alternate_phone')}
                placeholder="+91 1234567890"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Department Emails */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Department Emails</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accounts_email">Accounts Email</Label>
              <Input
                id="accounts_email"
                type="email"
                {...form.register('accounts_email')}
                placeholder="accounts@company.com"
              />
              {form.formState.errors.accounts_email && (
                <p className="text-sm text-destructive">{form.formState.errors.accounts_email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                {...form.register('support_email')}
                placeholder="support@company.com"
              />
              {form.formState.errors.support_email && (
                <p className="text-sm text-destructive">{form.formState.errors.support_email.message}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Secondary Contact */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Secondary Contact</h3>
            {!showSecondary ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSecondary(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Secondary Contact
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowSecondary(false);
                  form.setValue('secondary_contact_name', '');
                  form.setValue('secondary_contact_email', '');
                  form.setValue('secondary_contact_phone', '');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>

          {showSecondary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondary_contact_name">Name</Label>
                <Input
                  id="secondary_contact_name"
                  {...form.register('secondary_contact_name')}
                  placeholder="Full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_contact_email">Email</Label>
                <Input
                  id="secondary_contact_email"
                  type="email"
                  {...form.register('secondary_contact_email')}
                  placeholder="email@company.com"
                />
                {form.formState.errors.secondary_contact_email && (
                  <p className="text-sm text-destructive">{form.formState.errors.secondary_contact_email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_contact_phone">Phone</Label>
                <Input
                  id="secondary_contact_phone"
                  {...form.register('secondary_contact_phone')}
                  placeholder="+91 1234567890"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
