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
  FileText,
  Calendar
} from 'lucide-react';

interface PaymentData {
  invoiceId: string;
  amount: number;
  paymentMode: 'UPI' | 'Bank Transfer' | 'Cheque' | 'Cash' | 'Online Payment';
  transactionId: string;
  paymentDate: string;
  notes: string;
  receiptFile?: File;
  status: 'Paid' | 'Partial' | 'Pending' | 'Failed';
  partialAmount?: number;
}

interface PaymentManagementProps {
  invoice: {
    id: string;
    invoiceId: string;
    tenantName: string;
    amount: number;
    status: string;
    dueDate: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onPaymentUpdate: (paymentData: PaymentData) => void;
}

export function PaymentManagement({ invoice, isOpen, onClose, onPaymentUpdate }: PaymentManagementProps) {
  const [paymentData, setPaymentData] = useState<PaymentData>({
    invoiceId: invoice.invoiceId,
    amount: invoice.amount,
    paymentMode: 'Bank Transfer',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'Paid'
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPaymentUpdate({
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Partial': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'Pending': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const isOverdue = new Date(invoice.dueDate) < new Date() && invoice.status !== 'Paid';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Management - {invoice.invoiceId}
          </DialogTitle>
          <DialogDescription>
            Record payment details for {invoice.tenantName}
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                <p className="text-sm font-medium">{invoice.tenantName}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Invoice Amount</Label>
                <p className="text-sm font-medium">₹{invoice.amount.toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                  {new Date(invoice.dueDate).toLocaleDateString()}
                  {isOverdue && <span className="ml-2 text-xs">(Overdue)</span>}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Current Status</Label>
                <Badge className="mt-1">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(invoice.status)}
                    {invoice.status}
                  </div>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select 
                    value={paymentData.status} 
                    onValueChange={(value: PaymentData['status']) => 
                      setPaymentData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">✅ Paid (Full)</SelectItem>
                      <SelectItem value="Partial">⚠️ Partial Payment</SelectItem>
                      <SelectItem value="Pending">🕒 Pending</SelectItem>
                      <SelectItem value="Failed">❌ Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">
                    {paymentData.status === 'Partial' ? 'Partial Amount (₹)' : 'Amount (₹)'}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentData.status === 'Partial' ? paymentData.partialAmount || '' : paymentData.amount}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (paymentData.status === 'Partial') {
                        setPaymentData(prev => ({ ...prev, partialAmount: value }));
                      } else {
                        setPaymentData(prev => ({ ...prev, amount: value }));
                      }
                    }}
                    placeholder="Enter amount"
                    required
                  />
                  {paymentData.status === 'Partial' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Remaining: ₹{(invoice.amount - (paymentData.partialAmount || 0)).toLocaleString()}
                    </p>
                  )}
                </div>
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
              </div>

              <div>
                <Label htmlFor="transactionId">Transaction ID / Reference Number</Label>
                <Input
                  id="transactionId"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                  placeholder="TXN123456789 or Cheque Number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="receipt">Receipt / Proof Upload</Label>
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
                <Label htmlFor="notes">Notes / Comments</Label>
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

          {/* Payment Summary */}
          {paymentData.status === 'Paid' && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Payment Confirmation</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  This will mark the invoice as fully paid and update the tenant's rent status.
                </p>
              </CardContent>
            </Card>
          )}

          {paymentData.status === 'Partial' && paymentData.partialAmount && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Partial Payment</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Remaining amount: ₹{(invoice.amount - paymentData.partialAmount).toLocaleString()} will still be pending.
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
              {paymentData.status === 'Paid' ? 'Mark as Paid' : 
               paymentData.status === 'Partial' ? 'Record Partial Payment' :
               'Update Payment Status'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}