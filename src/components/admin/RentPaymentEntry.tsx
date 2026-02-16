import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Upload, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Calculator
} from 'lucide-react';

interface RentRecord {
  id: string;
  tenantName: string;
  tenantId: string;
  propertySpace: string;
  rentAmount: number;
  maintenance: number;
  totalAmount: number;
  dueDate: string;
  status: string;
  partialAmount?: number;
}

interface PaymentData {
  paymentDate: string;
  amountReceived: number;
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cheque' | 'Cash' | 'Online Payment';
  transactionId: string;
  notes: string;
  receiptFile?: File;
  isPartialPayment: boolean;
}

interface RentPaymentEntryProps {
  rentRecord: RentRecord;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSubmit: (paymentData: PaymentData) => void;
}

export function RentPaymentEntry({ rentRecord, isOpen, onClose, onPaymentSubmit }: RentPaymentEntryProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    paymentDate: new Date().toISOString().split('T')[0],
    amountReceived: rentRecord.totalAmount || 0,
    paymentMode: 'Bank Transfer',
    transactionId: '',
    notes: '',
    isPartialPayment: false
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPaymentSubmit({
      ...paymentData,
      receiptFile: receiptFile || undefined
    });
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const isOverdue = new Date(rentRecord.dueDate) < new Date();
  const remainingAmount = rentRecord.totalAmount - (rentRecord.partialAmount || 0);
  const isPartialPayment = paymentData.amountReceived < remainingAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {rentRecord.tenantName ? `Mark Rent Payment - ${rentRecord.tenantName}` : 'Add Rent Payment'}
          </DialogTitle>
          <DialogDescription>
            {rentRecord.tenantName ? `Record rent payment for ${rentRecord.propertySpace}` : 'Record a new rent payment manually'}
          </DialogDescription>
        </DialogHeader>

        {/* Rent Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{rentRecord.tenantName ? 'Rent Summary' : 'Manual Payment Entry'}</CardTitle>
          </CardHeader>
          <CardContent>
            {rentRecord.tenantName ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                  <p className="text-sm font-medium">{rentRecord.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{rentRecord.tenantId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Property</Label>
                  <p className="text-sm">{rentRecord.propertySpace}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                  <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                    {new Date(rentRecord.dueDate).toLocaleDateString()}
                    {isOverdue && <span className="ml-2 text-xs">(Overdue)</span>}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Current Status</Label>
                  <Badge className="mt-1">
                    {rentRecord.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Select tenant and enter payment details below</p>
              </div>
            )}

            {/* Amount Breakdown - Only show if tenant is selected */}
            {rentRecord.tenantName && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="flex justify-between text-sm">
                  <span>Base Rent:</span>
                  <span>₹{rentRecord.rentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Maintenance:</span>
                  <span>₹{rentRecord.maintenance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%):</span>
                  <span>₹{((rentRecord.rentAmount + rentRecord.maintenance) * 0.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2 mt-2">
                  <span>Total Amount:</span>
                  <span>₹{rentRecord.totalAmount.toLocaleString()}</span>
                </div>
                {rentRecord.partialAmount && (
                  <>
                    <div className="flex justify-between text-sm text-blue-600">
                      <span>Already Paid:</span>
                      <span>₹{rentRecord.partialAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium text-orange-600">
                      <span>Remaining:</span>
                      <span>₹{remainingAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!rentRecord.tenantName && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <div>
                    <Label htmlFor="tenantName">Tenant Name</Label>
                    <Input
                      id="tenantName"
                      placeholder="Enter tenant name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertySpace">Property/Space</Label>
                    <Input
                      id="propertySpace"
                      placeholder="Block A - Floor 2"
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amountReceived">Amount Received (₹)</Label>
                  <Input
                    id="amountReceived"
                    type="number"
                    value={paymentData.amountReceived}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, amountReceived: Number(e.target.value) }))}
                    max={rentRecord.tenantName ? remainingAmount : undefined}
                    required
                  />
                  {rentRecord.tenantName && isPartialPayment && (
                    <p className="text-xs text-orange-600 mt-1">
                      Partial payment - Remaining: ₹{(remainingAmount - paymentData.amountReceived).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select 
                    value={paymentData.paymentMode} 
                    onValueChange={(value: PaymentData['paymentMode']) => 
                      setPaymentData(prev => ({ ...prev, paymentMode: value }))
                    }
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
                  <Label htmlFor="transactionId">Transaction ID / Reference</Label>
                  <Input
                    id="transactionId"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="TXN123456789 or Cheque Number"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="receipt">Upload Receipt / Proof (Optional)</Label>
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
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes about the payment..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Confirmation */}
          {paymentData.amountReceived === remainingAmount ? (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Full Payment Confirmation</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  This will mark the rent as fully paid and update the tenant's status.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Partial Payment</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Remaining amount: ₹{(remainingAmount - paymentData.amountReceived).toLocaleString()} will still be pending.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {paymentData.amountReceived === remainingAmount ? 'Mark as Paid' : 'Record Partial Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}