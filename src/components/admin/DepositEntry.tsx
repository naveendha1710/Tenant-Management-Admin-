import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Upload, 
  Save, 
  RefreshCw,
  Calculator,
  Vault
} from 'lucide-react';

interface DepositFormData {
  tenantId: string;
  tenantName: string;
  propertySpace: string;
  depositType: 'Security' | 'Advance Rent' | 'Maintenance';
  depositAmount: number;
  paymentMode: string;
  transactionId: string;
  dateReceived: string;
  notes: string;
  receiptFile?: File;
}

interface RefundData {
  refundType: 'Full' | 'Partial';
  refundAmount: number;
  refundMode: string;
  refundDate: string;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  refundNotes: string;
}

interface DepositEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepositFormData) => void;
  initialData?: Partial<DepositFormData>;
  isEdit?: boolean;
}

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RefundData) => void;
  depositRecord: {
    tenantName: string;
    depositAmount: number;
    adjustedAmount?: number;
  } | null;
}

// Mock tenants data
const mockTenants = [
  { id: 'TNT-001', name: 'TechStart Solutions', space: 'Block A - Floor 2' },
  { id: 'TNT-002', name: 'Innovate Labs', space: 'Block B - Floor 1' },
  { id: 'TNT-003', name: 'Digital Dynamics', space: 'Block A - Floor 3' },
  { id: 'TNT-004', name: 'SPAN Edutech Ventures', space: 'Block C - Floor 2' },
  { id: 'TNT-005', name: 'Alpha Technologies', space: 'Block A - Floor 1' }
];

export function DepositEntry({ isOpen, onClose, onSubmit, initialData, isEdit = false }: DepositEntryProps) {
  const [formData, setFormData] = useState<DepositFormData>({
    tenantId: initialData?.tenantId || '',
    tenantName: initialData?.tenantName || '',
    propertySpace: initialData?.propertySpace || '',
    depositType: initialData?.depositType || 'Security',
    depositAmount: initialData?.depositAmount || 0,
    paymentMode: initialData?.paymentMode || 'Bank Transfer',
    transactionId: initialData?.transactionId || '',
    dateReceived: initialData?.dateReceived || new Date().toISOString().split('T')[0],
    notes: initialData?.notes || ''
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      receiptFile: receiptFile || undefined
    });
    onClose();
  };

  const handleTenantChange = (tenantId: string) => {
    const selectedTenant = mockTenants.find(t => t.id === tenantId);
    if (selectedTenant) {
      setFormData(prev => ({
        ...prev,
        tenantId,
        tenantName: selectedTenant.name,
        propertySpace: selectedTenant.space
      }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            {isEdit ? 'Edit Deposit' : 'Add New Deposit'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update deposit details' : 'Record a new security or advance deposit'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tenant">Select Tenant</Label>
                  <Select value={formData.tenantId} onValueChange={handleTenantChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockTenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="propertySpace">Property/Space</Label>
                  <Input
                    id="propertySpace"
                    value={formData.propertySpace}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertySpace: e.target.value }))}
                    placeholder="Block A - Floor 2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="depositType">Deposit Type</Label>
                  <Select 
                    value={formData.depositType} 
                    onValueChange={(value: DepositFormData['depositType']) => 
                      setFormData(prev => ({ ...prev, depositType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Security">🔒 Security Deposit</SelectItem>
                      <SelectItem value="Advance Rent">💰 Advance Rent</SelectItem>
                      <SelectItem value="Maintenance">🔧 Maintenance Deposit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="depositAmount">Deposit Amount (₹)</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, depositAmount: Number(e.target.value) }))}
                    placeholder="150000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select 
                    value={formData.paymentMode} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="UPI">📱 UPI</SelectItem>
                      <SelectItem value="Cheque">📄 Cheque</SelectItem>
                      <SelectItem value="Cash">💵 Cash</SelectItem>
                      <SelectItem value="Online Payment">💳 Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="transactionId">Transaction ID</Label>
                  <Input
                    id="transactionId"
                    value={formData.transactionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="TXN123456789"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dateReceived">Date Received</Label>
                <Input
                  id="dateReceived"
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateReceived: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="receipt">Upload Receipt (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {receiptFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {receiptFile.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes about this deposit..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Update Deposit' : 'Add Deposit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RefundDialog({ isOpen, onClose, onSubmit, depositRecord }: RefundDialogProps) {
  const [refundData, setRefundData] = useState<RefundData>({
    refundType: 'Full',
    refundAmount: depositRecord?.depositAmount || 0,
    refundMode: 'Bank Transfer',
    refundDate: new Date().toISOString().split('T')[0],
    adjustmentAmount: 0,
    adjustmentReason: '',
    refundNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(refundData);
    onClose();
  };

  const availableAmount = (depositRecord?.depositAmount || 0) - (depositRecord?.adjustedAmount || 0);
  const finalRefundAmount = refundData.refundAmount - (refundData.adjustmentAmount || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Process Deposit Refund - {depositRecord?.tenantName}
          </DialogTitle>
          <DialogDescription>
            Process full or partial refund for security deposit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Deposit Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Deposit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Original Deposit:</span>
                  <span className="ml-2">₹{depositRecord?.depositAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Previously Adjusted:</span>
                  <span className="ml-2">₹{(depositRecord?.adjustedAmount || 0).toLocaleString()}</span>
                </div>
                <div className="col-span-2 pt-2 border-t">
                  <span className="font-medium">Available for Refund:</span>
                  <span className="ml-2 text-lg font-bold text-green-600">₹{availableAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Refund Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={refundData.refundType.toLowerCase()} onValueChange={(value) => 
                setRefundData(prev => ({ 
                  ...prev, 
                  refundType: value === 'full' ? 'Full' : 'Partial',
                  refundAmount: value === 'full' ? availableAmount : prev.refundAmount
                }))
              }>
                <TabsList>
                  <TabsTrigger value="full">Full Refund</TabsTrigger>
                  <TabsTrigger value="partial">Partial Refund</TabsTrigger>
                </TabsList>

                <TabsContent value="full" className="space-y-4">
                  <div className="p-4 bg-green-50 rounded border border-green-200">
                    <p className="text-green-800 font-medium">
                      Full refund of ₹{availableAmount.toLocaleString()} will be processed
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="partial" className="space-y-4">
                  <div>
                    <Label htmlFor="refundAmount">Refund Amount (₹)</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      value={refundData.refundAmount}
                      onChange={(e) => setRefundData(prev => ({ ...prev, refundAmount: Number(e.target.value) }))}
                      max={availableAmount}
                      required
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Adjustments */}
              <div>
                <Label htmlFor="adjustmentAmount">Adjustment Amount (₹)</Label>
                <Input
                  id="adjustmentAmount"
                  type="number"
                  value={refundData.adjustmentAmount}
                  onChange={(e) => setRefundData(prev => ({ ...prev, adjustmentAmount: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>

              {refundData.adjustmentAmount && refundData.adjustmentAmount > 0 && (
                <div>
                  <Label htmlFor="adjustmentReason">Adjustment Reason</Label>
                  <Textarea
                    id="adjustmentReason"
                    value={refundData.adjustmentReason}
                    onChange={(e) => setRefundData(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                    placeholder="Reason for adjustment (e.g., damages, unpaid dues)"
                    rows={2}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="refundMode">Refund Mode</Label>
                  <Select 
                    value={refundData.refundMode} 
                    onValueChange={(value) => setRefundData(prev => ({ ...prev, refundMode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="UPI">📱 UPI</SelectItem>
                      <SelectItem value="Cheque">📄 Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="refundDate">Refund Date</Label>
                  <Input
                    id="refundDate"
                    type="date"
                    value={refundData.refundDate}
                    onChange={(e) => setRefundData(prev => ({ ...prev, refundDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="refundNotes">Refund Notes</Label>
                <Textarea
                  id="refundNotes"
                  value={refundData.refundNotes}
                  onChange={(e) => setRefundData(prev => ({ ...prev, refundNotes: e.target.value }))}
                  placeholder="Add any notes about the refund process..."
                  rows={3}
                />
              </div>

              {/* Final Amount Summary */}
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Refund Amount:</span>
                    <span>₹{refundData.refundAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Less: Adjustments:</span>
                    <span>-₹{(refundData.adjustmentAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Final Refund Amount:</span>
                    <span>₹{finalRefundAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <RefreshCw className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}