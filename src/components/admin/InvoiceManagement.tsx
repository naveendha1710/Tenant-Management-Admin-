import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Download, 
  Mail, 
  Trash2,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  Settings,
  BarChart3,
  Lock
} from 'lucide-react';
import { InvoiceDashboard } from './InvoiceDashboard';
import { InvoiceForm } from './InvoiceForm';
import { PaymentManagement } from './PaymentManagement';
import { InvoiceTemplate } from './InvoiceTemplate';
import { InvoiceReports } from './InvoiceReports';

import { SelectiveInvoiceForm } from './SelectiveInvoiceForm';
import { ApprovalSettings } from './ApprovalSettings';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

interface Invoice {
  id: string;
  invoiceId: string;
  tenantName: string;
  tenantId: string;
  propertySpace?: string;
  amount: number;
  dateIssued: string;
  dueDate: string;
  paymentDate?: string;
  paymentMode?: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  editedBy?: string;
  lastModified?: string;
  transactionId?: string;
  notes?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceId: 'INV-2024-001',
    tenantName: 'TechStart Solutions',
    tenantId: 'TNT-001',
    propertySpace: 'Block A - Floor 2',
    amount: 75000,
    dateIssued: '2024-01-01',
    dueDate: '2024-01-10',
    paymentDate: '2024-01-08',
    paymentMode: 'Bank Transfer',
    status: 'Paid',
    transactionId: 'TXN123456789',
    notes: 'Paid on time'
  },
  {
    id: '2',
    invoiceId: 'INV-2024-002',
    tenantName: 'Innovate Labs',
    tenantId: 'TNT-002',
    propertySpace: 'Block B - Floor 1',
    amount: 85000,
    dateIssued: '2024-01-01',
    dueDate: '2024-01-10',
    status: 'Pending'
  },
  {
    id: '3',
    invoiceId: 'INV-2024-003',
    tenantName: 'Digital Dynamics',
    tenantId: 'TNT-003',
    propertySpace: 'Block A - Floor 3',
    amount: 65000,
    dateIssued: '2023-12-01',
    dueDate: '2023-12-10',
    status: 'Overdue'
  },
  {
    id: '4',
    invoiceId: 'INV-2024-004',
    tenantName: 'SPAN Edutech Ventures Pvt Ltd',
    tenantId: 'TNT-004',
    propertySpace: 'Block C - Floor 2',
    amount: 95000,
    dateIssued: '2024-01-01',
    dueDate: '2024-01-10',
    paymentDate: '2024-01-09',
    paymentMode: 'UPI',
    status: 'Paid',
    transactionId: 'UPI987654321'
  }
];

export function InvoiceManagement() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isSelectiveInvoiceOpen, setIsSelectiveInvoiceOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  // Check permissions for Invoices module
  const canView = hasPermission(user?.appUser, 'Invoices', 'view');
  const canAdd = hasPermission(user?.appUser, 'Invoices', 'add');
  const canEdit = hasPermission(user?.appUser, 'Invoices', 'edit');
  const canDelete = hasPermission(user?.appUser, 'Invoices', 'delete');

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view Invoices. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate dashboard stats
  const stats = {
    totalInvoicesThisMonth: invoices.filter(inv => 
      new Date(inv.dateIssued).getMonth() === new Date().getMonth()
    ).length,
    totalAmountInvoiced: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    totalAmountCollected: invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0),
    pendingAmount: invoices.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0),
    overdueAmount: invoices.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0),
    netProfit: invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0) * 0.85, // Assuming 15% expenses
    averagePaymentDelay: 3 // Mock data
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Partial': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'Overdue': return <AlertTriangle className="h-4 w-4" />;
      case 'Partial': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenantId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPaymentMode = paymentModeFilter === 'all' || invoice.paymentMode === paymentModeFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentMode;
  });

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewDialogOpen(true);
  };

  const handleMarkAsPaid = (invoiceId: string) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId 
        ? { ...inv, status: 'Paid' as const, paymentDate: new Date().toISOString().split('T')[0] }
        : inv
    ));
  };

  const handleDelete = (invoiceId: string) => {
    if (!canDelete) {
      toast({ title: "Error", description: "You don't have permission to delete invoices", variant: "destructive" });
      return;
    }
    if (confirm('Are you sure you want to delete this invoice?')) {
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsEditDialogOpen(true);
  };

  const handlePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const handleCreateInvoice = (data: any) => {
    if (!canAdd) {
      toast({ title: "Error", description: "You don't have permission to create invoices", variant: "destructive" });
      return;
    }
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceId: `INV-2024-${String(invoices.length + 1).padStart(3, '0')}`,
      tenantName: data.tenantName,
      tenantId: data.tenantId,
      propertySpace: data.propertySpace,
      amount: data.totalAmount,
      dateIssued: new Date().toISOString().split('T')[0],
      dueDate: data.dueDate,
      status: 'Pending'
    };
    setInvoices(prev => [newInvoice, ...prev]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateInvoice = (data: any) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit invoices", variant: "destructive" });
      return;
    }
    if (!editingInvoice) return;
    setInvoices(prev => prev.map(inv => 
      inv.id === editingInvoice.id 
        ? { ...inv, ...data, amount: data.totalAmount }
        : inv
    ));
    setIsEditDialogOpen(false);
    setEditingInvoice(null);
  };

  const handlePaymentUpdate = (paymentData: any) => {
    if (!selectedInvoice) return;
    setInvoices(prev => prev.map(inv => 
      inv.id === selectedInvoice.id 
        ? { 
            ...inv, 
            status: paymentData.status,
            paymentDate: paymentData.paymentDate,
            paymentMode: paymentData.paymentMode,
            transactionId: paymentData.transactionId,
            notes: paymentData.notes
          }
        : inv
    ));
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleTemplateSettings = (settings: any) => {
    console.log('Template settings saved:', settings);
    // Save template settings to backend or local storage
  };

  const handleBulkGenerate = () => {
    // Mock bulk invoice generation
    alert('Bulk invoice generation started. This will generate monthly rent invoices for all active tenants.');
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    alert(`Invoice ${invoice.invoiceId} will be emailed to ${invoice.tenantName}`);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    alert(`Downloading invoice ${invoice.invoiceId} as PDF`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard Overview */}
      <InvoiceDashboard stats={stats} />

      {/* Main Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoice Management</TabsTrigger>
          <TabsTrigger value="settings">Approval Settings</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage all invoices and payments
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {canAdd ? (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              ) : (
                <Button disabled title="You don't have permission to create invoices">
                  <Lock className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              )}

              <Button variant="outline" onClick={handleBulkGenerate}>
                <FileText className="h-4 w-4 mr-2" />
                Bulk Generate
              </Button>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Template Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search invoices, tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Partial">Partial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
          </div>

          {/* Invoice Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>Property/Space</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceId}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{invoice.tenantName}</div>
                        <div className="text-sm text-muted-foreground">{invoice.tenantId}</div>
                      </div>
                    </TableCell>
                    <TableCell>{invoice.propertySpace || '-'}</TableCell>
                    <TableCell className="font-medium">₹{invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>{new Date(invoice.dateIssued).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>{invoice.paymentMode || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(invoice.status)}
                          {invoice.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleView(invoice)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit ? (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(invoice)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled title="You don't have permission to edit invoices">
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(invoice)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEmailInvoice(invoice)}>
                          <Mail className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'Paid' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePayment(invoice)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Payment
                          </Button>
                        )}
                        {canDelete ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleDelete(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            disabled
                            title="You don't have permission to delete invoices"
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>



        <TabsContent value="settings" className="space-y-4">
          <ApprovalSettings />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <InvoiceReports />
        </TabsContent>
      </Tabs>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice Details - {selectedInvoice?.invoiceId}</DialogTitle>
            <DialogDescription>
              Complete invoice information and payment details
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tenant</label>
                  <p className="text-sm">{selectedInvoice.tenantName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="text-sm font-medium">₹{selectedInvoice.amount.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={getStatusColor(selectedInvoice.status)}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Mode</label>
                  <p className="text-sm">{selectedInvoice.paymentMode || 'Not specified'}</p>
                </div>
              </div>
              {selectedInvoice.transactionId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                  <p className="text-sm font-mono">{selectedInvoice.transactionId}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Generate a new invoice for a tenant
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm 
            onSubmit={handleCreateInvoice}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Invoice</DialogTitle>
            <DialogDescription>
              Update invoice details
            </DialogDescription>
          </DialogHeader>
          {editingInvoice && (
            <InvoiceForm 
              onSubmit={handleUpdateInvoice}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingInvoice(null);
              }}
              initialData={{
                tenantId: editingInvoice.tenantId,
                tenantName: editingInvoice.tenantName,
                propertySpace: editingInvoice.propertySpace,
                baseRent: editingInvoice.amount * 0.8, // Mock calculation
                maintenanceCharges: editingInvoice.amount * 0.1,
                dueDate: editingInvoice.dueDate,
                notes: editingInvoice.notes
              }}
              isEdit={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Management Dialog */}
      {selectedInvoice && (
        <PaymentManagement
          invoice={{
            id: selectedInvoice.id,
            invoiceId: selectedInvoice.invoiceId,
            tenantName: selectedInvoice.tenantName,
            amount: selectedInvoice.amount,
            status: selectedInvoice.status,
            dueDate: selectedInvoice.dueDate
          }}
          isOpen={isPaymentDialogOpen}
          onClose={() => {
            setIsPaymentDialogOpen(false);
            setSelectedInvoice(null);
          }}
          onPaymentUpdate={handlePaymentUpdate}
        />
      )}

      {/* Invoice Template Dialog */}
      <InvoiceTemplate
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSave={handleTemplateSettings}
      />


    </div>
  );
}