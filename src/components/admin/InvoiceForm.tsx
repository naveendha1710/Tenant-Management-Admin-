import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calculator, Plus, Minus, Edit } from 'lucide-react';

// Mock tenants data with assigned spaces
const mockTenants = [
  { id: 'TNT-001', name: 'TechStart Solutions', assignedSpace: 'Block A - Floor 2' },
  { id: 'TNT-002', name: 'Innovate Labs', assignedSpace: 'Block B - Floor 1' },
  { id: 'TNT-003', name: 'Digital Dynamics', assignedSpace: 'Block A - Floor 3' },
  { id: 'TNT-004', name: 'SPAN Edutech Ventures Pvt Ltd', assignedSpace: 'Block C - Floor 2' },
  { id: 'TNT-005', name: 'Alpha Technologies', assignedSpace: 'Block A - Floor 1' },
  { id: 'TNT-006', name: 'Beta Solutions', assignedSpace: 'Block B - Floor 2' }
];

interface InvoiceFormData {
  tenantId: string;
  tenantName: string;
  propertySpace: string;
  baseRent: number;
  baseRentGst: number;
  maintenanceCharges: number;
  maintenanceGst: number;
  customCharges: Array<{ description: string; amount: number; gst: number }>;
  discounts: Array<{ description: string; amount: number }>;
  dueDate: string;
  notes: string;
}

interface InvoiceFormProps {
  onSubmit: (data: InvoiceFormData & { totalAmount: number }) => void;
  onCancel: () => void;
  initialData?: Partial<InvoiceFormData>;
  isEdit?: boolean;
}

export function InvoiceForm({ onSubmit, onCancel, initialData, isEdit = false }: InvoiceFormProps) {
  const [formData, setFormData] = useState<InvoiceFormData>({
    tenantId: initialData?.tenantId || '',
    tenantName: initialData?.tenantName || '',
    propertySpace: initialData?.propertySpace || '',
    baseRent: initialData?.baseRent || 0,
    baseRentGst: initialData?.baseRentGst || 18,
    maintenanceCharges: initialData?.maintenanceCharges || 0,
    maintenanceGst: initialData?.maintenanceGst || 18,
    customCharges: initialData?.customCharges || [],
    discounts: initialData?.discounts || [],
    dueDate: initialData?.dueDate || '',
    notes: initialData?.notes || ''
  });

  const addCustomCharge = () => {
    setFormData(prev => ({
      ...prev,
      customCharges: [...prev.customCharges, { description: '', amount: 0, gst: 18 }]
    }));
  };

  const removeCustomCharge = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customCharges: prev.customCharges.filter((_, i) => i !== index)
    }));
  };

  const updateCustomCharge = (index: number, field: 'description' | 'amount' | 'gst', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      customCharges: prev.customCharges.map((charge, i) => 
        i === index ? { ...charge, [field]: value } : charge
      )
    }));
  };

  const addDiscount = () => {
    setFormData(prev => ({
      ...prev,
      discounts: [...prev.discounts, { description: '', amount: 0 }]
    }));
  };

  const removeDiscount = (index: number) => {
    setFormData(prev => ({
      ...prev,
      discounts: prev.discounts.filter((_, i) => i !== index)
    }));
  };

  const updateDiscount = (index: number, field: 'description' | 'amount', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      discounts: prev.discounts.map((discount, i) => 
        i === index ? { ...discount, [field]: value } : discount
      )
    }));
  };

  // Calculate totals with individual GST
  const subtotal = formData.baseRent + formData.maintenanceCharges + 
    formData.customCharges.reduce((sum, charge) => sum + charge.amount, 0);
  
  const totalDiscounts = formData.discounts.reduce((sum, discount) => sum + discount.amount, 0);
  const taxableAmount = subtotal - totalDiscounts;
  
  // Calculate GST for each component
  const baseRentGstAmount = (formData.baseRent * formData.baseRentGst) / 100;
  const maintenanceGstAmount = (formData.maintenanceCharges * formData.maintenanceGst) / 100;
  const customChargesGstAmount = formData.customCharges.reduce((sum, charge) => 
    sum + (charge.amount * charge.gst) / 100, 0
  );
  
  const totalGstAmount = baseRentGstAmount + maintenanceGstAmount + customChargesGstAmount;
  const totalAmount = taxableAmount + totalGstAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, totalAmount });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                value={formData.tenantId}
                onChange={(e) => setFormData(prev => ({ ...prev, tenantId: e.target.value }))}
                placeholder="TNT-001"
                required
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="tenantName">Tenant Name</Label>
              <Select value={formData.tenantName} onValueChange={(value) => {
                const selectedTenant = mockTenants.find(t => t.name === value);
                setFormData(prev => ({ 
                  ...prev, 
                  tenantName: value,
                  tenantId: selectedTenant?.id || '',
                  propertySpace: selectedTenant?.assignedSpace || ''
                }));
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {mockTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.name}>
                      {tenant.name} ({tenant.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="propertySpace">Property/Space</Label>
              <Button type="button" variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" />
                Edit Assignment
              </Button>
            </div>
            <Select value={formData.propertySpace} onValueChange={(value) => setFormData(prev => ({ ...prev, propertySpace: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select property/space" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Block A - Floor 1">Block A - Floor 1</SelectItem>
                <SelectItem value="Block A - Floor 2">Block A - Floor 2</SelectItem>
                <SelectItem value="Block A - Floor 3">Block A - Floor 3</SelectItem>
                <SelectItem value="Block B - Floor 1">Block B - Floor 1</SelectItem>
                <SelectItem value="Block B - Floor 2">Block B - Floor 2</SelectItem>
                <SelectItem value="Block C - Floor 1">Block C - Floor 1</SelectItem>
                <SelectItem value="Block C - Floor 2">Block C - Floor 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Charges */}
      <Card>
        <CardHeader>
          <CardTitle>Charges & Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseRent">Base Rent (₹)</Label>
              <Input
                id="baseRent"
                type="number"
                value={formData.baseRent}
                onChange={(e) => setFormData(prev => ({ ...prev, baseRent: Number(e.target.value) }))}
                placeholder="50000"
                required
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="baseRentGst" className="text-xs">GST (%):</Label>
                <Input
                  id="baseRentGst"
                  type="number"
                  value={formData.baseRentGst}
                  onChange={(e) => setFormData(prev => ({ ...prev, baseRentGst: Number(e.target.value) }))}
                  placeholder="18"
                  min="0"
                  max="100"
                  className="w-20 h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenanceCharges">Maintenance Charges (₹)</Label>
              <Input
                id="maintenanceCharges"
                type="number"
                value={formData.maintenanceCharges}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenanceCharges: Number(e.target.value) }))}
                placeholder="5000"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="maintenanceGst" className="text-xs">GST (%):</Label>
                <Input
                  id="maintenanceGst"
                  type="number"
                  value={formData.maintenanceGst}
                  onChange={(e) => setFormData(prev => ({ ...prev, maintenanceGst: Number(e.target.value) }))}
                  placeholder="18"
                  min="0"
                  max="100"
                  className="w-20 h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Custom Charges */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Custom Charges</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCustomCharge}>
                <Plus className="h-4 w-4 mr-1" />
                Add Charge
              </Button>
            </div>
            {formData.customCharges.map((charge, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Description"
                  value={charge.description}
                  onChange={(e) => updateCustomCharge(index, 'description', e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={charge.amount}
                  onChange={(e) => updateCustomCharge(index, 'amount', Number(e.target.value))}
                  className="w-24"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs">GST:</span>
                  <Input
                    type="number"
                    placeholder="18"
                    value={charge.gst}
                    onChange={(e) => updateCustomCharge(index, 'gst', Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-16 h-8 text-xs"
                  />
                  <span className="text-xs">%</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => removeCustomCharge(index)}>
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Discounts */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Discounts</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDiscount}>
                <Plus className="h-4 w-4 mr-1" />
                Add Discount
              </Button>
            </div>
            {formData.discounts.map((discount, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Description"
                  value={discount.description}
                  onChange={(e) => updateDiscount(index, 'description', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={discount.amount}
                  onChange={(e) => updateDiscount(index, 'amount', Number(e.target.value))}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => removeDiscount(index)}>
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>


        </CardContent>
      </Card>

      {/* Calculation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Invoice Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Base Rent:</span>
              <span>₹{formData.baseRent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>  + GST ({formData.baseRentGst}%):</span>
              <span>₹{baseRentGstAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Maintenance Charges:</span>
              <span>₹{formData.maintenanceCharges.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>  + GST ({formData.maintenanceGst}%):</span>
              <span>₹{maintenanceGstAmount.toLocaleString()}</span>
            </div>
            {formData.customCharges.map((charge, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm">
                  <span>{charge.description || `Custom Charge ${index + 1}`}:</span>
                  <span>₹{charge.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>  + GST ({charge.gst}%):</span>
                  <span>₹{((charge.amount * charge.gst) / 100).toLocaleString()}</span>
                </div>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            {formData.discounts.map((discount, index) => (
              <div key={index} className="flex justify-between text-sm text-green-600">
                <span>- {discount.description || `Discount ${index + 1}`}:</span>
                <span>-₹{discount.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>Taxable Amount:</span>
              <span>₹{taxableAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Total GST:</span>
              <span>₹{totalGstAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount:</span>
              <span>₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional notes or terms..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEdit ? 'Update Invoice' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}