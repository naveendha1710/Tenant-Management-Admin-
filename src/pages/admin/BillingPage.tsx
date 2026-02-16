import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, Eye, Plus, DollarSign, Calendar, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel, exportToPDF } from '@/utils/exportBilling';

const mockBillingData = [
  {
    id: 'BILL001',
    tenant_name: 'TechStart Solutions',
    space: 'Tech Park Block A - A102',
    monthly_rent: 25000,
    addon_services: {
      wifi: 2000,
      electricity: 3000,
      maintenance: 1500
    },
    total_amount: 31500,
    status: 'paid',
    due_date: '2024-01-31',
    paid_date: '2024-01-28',
    billing_period: '2024-01'
  },
  {
    id: 'BILL002',
    tenant_name: 'Creative Agency',
    space: 'Innovation Center - B101',
    monthly_rent: 15000,
    addon_services: {
      wifi: 1500,
      electricity: 2000,
      maintenance: 1000
    },
    total_amount: 19500,
    status: 'pending',
    due_date: '2024-02-15',
    paid_date: null,
    billing_period: '2024-02'
  },
  {
    id: 'BILL003',
    tenant_name: 'Innovate Labs',
    space: 'Co-working Hub - C101',
    monthly_rent: 12000,
    addon_services: {
      wifi: 1000,
      electricity: 1500,
      maintenance: 800
    },
    total_amount: 15300,
    status: 'overdue',
    due_date: '2024-01-20',
    paid_date: null,
    billing_period: '2024-01'
  }
];

const mockPaymentHistory = [
  {
    id: 'PAY001',
    tenant_name: 'TechStart Solutions',
    amount: 31500,
    payment_date: '2024-01-28',
    payment_method: 'Bank Transfer',
    transaction_id: 'TXN123456789',
    status: 'completed'
  },
  {
    id: 'PAY002',
    tenant_name: 'Creative Agency',
    amount: 18000,
    payment_date: '2024-01-15',
    payment_method: 'UPI',
    transaction_id: 'UPI987654321',
    status: 'completed'
  }
];

export default function BillingPage() {
  const [billingData, setBillingData] = useState(mockBillingData);
  const [selectedBill, setSelectedBill] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(filteredBillingData);
      toast({
        title: "Export Successful",
        description: "Billing data exported to Excel file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(filteredBillingData);
      toast({
        title: "Export Successful",
        description: "Billing data exported to PDF file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file",
        variant: "destructive",
      });
    }
  };

  const handleBillingAdjustment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    toast({
      title: "Success",
      description: "Billing adjustment applied successfully",
    });
    setIsAdjustmentDialogOpen(false);
  };

  const filteredBillingData = billingData.filter(bill => {
    const matchesSearch = bill.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bill.space.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRevenue: billingData.reduce((sum, bill) => sum + bill.total_amount, 0),
    paidAmount: billingData.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.total_amount, 0),
    pendingAmount: billingData.filter(bill => bill.status === 'pending').reduce((sum, bill) => sum + bill.total_amount, 0),
    overdueAmount: billingData.filter(bill => bill.status === 'overdue').reduce((sum, bill) => sum + bill.total_amount, 0)
  };

  return (
    <DashboardLayout title="Billing Management" subtitle="Manage tenant billing and payments">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">₹{stats.paidAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">₹{stats.pendingAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">₹{stats.overdueAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="billing" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="billing">Billing Summary</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="adjustments">Billing Adjustments</TabsTrigger>
          </TabsList>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle>Tenant Billing Summary</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleExportExcel} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                      <Download className="mr-2 h-4 w-4" />
                      Export Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF} className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200">
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search billing records..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill ID</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Space</TableHead>
                        <TableHead>Monthly Rent</TableHead>
                        <TableHead>Add-ons</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBillingData.map((bill: any) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">{bill.id}</TableCell>
                          <TableCell>{bill.tenant_name}</TableCell>
                          <TableCell className="max-w-xs truncate">{bill.space}</TableCell>
                          <TableCell>₹{bill.monthly_rent.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              ₹{(bill.addon_services.wifi + bill.addon_services.electricity + bill.addon_services.maintenance).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">₹{bill.total_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(bill.status)}>
                              {bill.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedBill(bill);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockPaymentHistory.map((payment: any) => (
                    <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="font-medium">{payment.tenant_name}</span>
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {payment.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Amount</div>
                          <div className="text-lg font-bold text-green-600">₹{payment.amount.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Payment Date</div>
                          <div>{new Date(payment.payment_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Transaction ID</div>
                          <div className="font-mono text-xs">{payment.transaction_id}</div>
                        </div>
                        <div>
                          <div className="font-medium">Method</div>
                          <div>{payment.payment_method}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Adjustments Tab */}
          <TabsContent value="adjustments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Billing Adjustments</CardTitle>
                  <Button onClick={() => setIsAdjustmentDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Adjustment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Adjustments Yet</h3>
                  <p>Create billing adjustments for special cases or corrections</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Billing Details - {selectedBill?.id}</DialogTitle>
              <DialogDescription>Complete billing information</DialogDescription>
            </DialogHeader>
            {selectedBill && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Tenant Information</h4>
                    <div className="text-sm space-y-1 mt-2">
                      <div>Name: {selectedBill.tenant_name}</div>
                      <div>Space: {selectedBill.space}</div>
                      <div>Billing Period: {selectedBill.billing_period}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Payment Information</h4>
                    <div className="text-sm space-y-1 mt-2">
                      <div>Status: <Badge className={getStatusColor(selectedBill.status)}>{selectedBill.status}</Badge></div>
                      <div>Due Date: {new Date(selectedBill.due_date).toLocaleDateString()}</div>
                      {selectedBill.paid_date && <div>Paid Date: {new Date(selectedBill.paid_date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Billing Breakdown</h4>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Monthly Rent</span>
                      <span>₹{selectedBill.monthly_rent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>WiFi</span>
                      <span>₹{selectedBill.addon_services.wifi.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Electricity</span>
                      <span>₹{selectedBill.addon_services.electricity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Maintenance</span>
                      <span>₹{selectedBill.addon_services.maintenance.toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-medium">
                      <span>Total Amount</span>
                      <span>₹{selectedBill.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Adjustment Dialog */}
        <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Billing Adjustment</DialogTitle>
              <DialogDescription>Apply manual billing adjustments</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBillingAdjustment} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant">Tenant *</Label>
                <Select name="tenant" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {billingData.map(bill => (
                      <SelectItem key={bill.id} value={bill.tenant_name}>{bill.tenant_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment_type">Adjustment Type *</Label>
                <Select name="adjustment_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">Discount</SelectItem>
                    <SelectItem value="penalty">Penalty</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Input id="reason" name="reason" placeholder="Reason for adjustment" required />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">Create Adjustment</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}