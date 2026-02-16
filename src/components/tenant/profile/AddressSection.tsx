import { UseFormReturn } from 'react-hook-form';
import { TenantProfileFormData } from '@/schemas/tenantProfileSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

interface Props {
  form: UseFormReturn<TenantProfileFormData>;
}

export default function AddressSection({ form }: Props) {
  const billingSameAsRegistered = form.watch('billing_same_as_registered');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Address</CardTitle>
        <CardDescription>Update your company's registered and billing address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Registered Address */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Registered Address</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address Line 1 *</Label>
              <Input
                id="address"
                {...form.register('address')}
                placeholder="Street address, building name"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                {...form.register('address_line2')}
                placeholder="Apartment, suite, floor (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="City"
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  {...form.register('state')}
                  placeholder="State"
                />
                {form.formState.errors.state && (
                  <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  {...form.register('pincode')}
                  placeholder="123456"
                  maxLength={6}
                />
                {form.formState.errors.pincode && (
                  <p className="text-sm text-destructive">{form.formState.errors.pincode.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...form.register('country')}
                placeholder="India"
                defaultValue="India"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Billing Address */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Billing Address</h3>
            <div className="flex items-center gap-2">
              <Switch
                checked={billingSameAsRegistered}
                onCheckedChange={(checked) => form.setValue('billing_same_as_registered', checked)}
              />
              <Label className="cursor-pointer">Same as registered address</Label>
            </div>
          </div>

          {!billingSameAsRegistered && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billing_address">Billing Address Line 1</Label>
                <Input
                  id="billing_address"
                  {...form.register('billing_address')}
                  placeholder="Street address, building name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billing_city">City</Label>
                  <Input
                    id="billing_city"
                    {...form.register('billing_city')}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_state">State</Label>
                  <Input
                    id="billing_state"
                    {...form.register('billing_state')}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_pincode">Pincode</Label>
                  <Input
                    id="billing_pincode"
                    {...form.register('billing_pincode')}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
