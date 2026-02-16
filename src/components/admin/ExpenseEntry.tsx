import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Upload, 
  Save, 
  CreditCard,
  Calculator
} from 'lucide-react';

interface ExpenseFormData {
  category: 'Maintenance' | 'Utilities' | 'Salaries' | 'Supplies' | 'Insurance' | 'Transportation' | 'Office' | 'Others';
  description: string;
  date: string;
  amount: number;
  paidTo: string;
  paymentMode: string;
  status: 'Paid' | 'Pending';
  notes: string;
  receiptFile?: File;
}

interface ExpenseEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => void;
  initialData?: Partial<ExpenseFormData>;
  isEdit?: boolean;
}

export function ExpenseEntry({ isOpen, onClose, onSubmit, initialData, isEdit = false }: ExpenseEntryProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: initialData?.category || 'Maintenance',
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    amount: initialData?.amount || 0,
    paidTo: initialData?.paidTo || '',
    paymentMode: initialData?.paymentMode || 'Bank Transfer',
    status: initialData?.status || 'Paid',
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {isEdit ? 'Edit Expense' : 'Add New Expense'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update expense details' : 'Record a new business expense'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value: ExpenseFormData['category']) => 
                      setFormData(prev => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maintenance">🔧 Maintenance & Repairs</SelectItem>
                      <SelectItem value="Utilities">⚡ Utilities</SelectItem>
                      <SelectItem value="Salaries">👥 Staff Salaries</SelectItem>
                      <SelectItem value="Supplies">📦 Supplies & Materials</SelectItem>
                      <SelectItem value="Insurance">🛡️ Insurance & Licenses</SelectItem>
                      <SelectItem value="Transportation">🚗 Transportation</SelectItem>
                      <SelectItem value="Office">🏢 Office & Admin</SelectItem>
                      <SelectItem value="Others">📋 Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the expense"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paidTo">Paid To</Label>
                  <Input
                    id="paidTo"
                    value={formData.paidTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                    placeholder="Vendor/Service provider name"
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
                      <SelectItem value="Credit Card">💳 Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Payment Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: ExpenseFormData['status']) => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">✅ Paid</SelectItem>
                      <SelectItem value="Pending">⏳ Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="receipt">Upload Bill/Invoice (Optional)</Label>
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
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any additional notes about this expense..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Expense Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Calculator className="h-5 w-5" />
                Expense Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-blue-800">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium">{formData.category}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">₹{formData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid To:</span>
                  <span className="font-medium">{formData.paidTo || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium">{formData.status}</span>
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
              <Save className="h-4 w-4 mr-2" />
              {isEdit ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}