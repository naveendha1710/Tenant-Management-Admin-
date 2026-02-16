import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Eye, Calendar, FileText, Lock, Users } from 'lucide-react';
import { invoiceDataService, type Invoice } from '@/data/invoiceData';
import { useAuth } from '@/contexts/AuthContext';

const ApprovalsPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectingInvoice, setRejectingInvoice] = useState<Invoice | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isApprover = user?.appUser?.isApprover || false;

  useEffect(() => {
    setInvoices(invoiceDataService.getAllInvoices());
    
    const unsubscribe = invoiceDataService.subscribe((updatedInvoices) => {
      setInvoices(updatedInvoices);
    });
    
    return unsubscribe;
  }, []);

  const autoInvoices = invoices.filter(inv => inv.type === 'auto');
  const manualInvoices = invoices.filter(inv => inv.type === 'manual');

  const handleSelectInvoice = (invoiceId: string, checked: boolean, type: 'auto' | 'manual') => {
    const key = `${type}-${invoiceId}`;
    if (checked) {
      setSelectedInvoices(prev => [...prev, key]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== key));
    }
  };

  const handleSelectAll = (checked: boolean, type: 'auto' | 'manual') => {
    const invoiceList = type === 'auto' ? autoInvoices : manualInvoices;
    const pendingInvoices = invoiceList.filter(inv => inv.status === 'pending');
    
    if (checked) {
      const newSelections = pendingInvoices.map(inv => `${type}-${inv.id}`);
      setSelectedInvoices(prev => [...prev.filter(id => !id.startsWith(`${type}-`)), ...newSelections]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => !id.startsWith(`${type}-`)));
    }
  };

  const handleApproveInvoice = (invoice: Invoice) => {
    if (isApprover) {
      invoiceDataService.approveInvoice(invoice.id, user?.appUser?.name || 'Unknown');
    }
  };

  const handleRejectInvoice = (invoice: Invoice) => {
    setRejectingInvoice(invoice);
    setIsRejectOpen(true);
  };

  const confirmReject = () => {
    if (rejectingInvoice && isApprover) {
      invoiceDataService.rejectInvoice(rejectingInvoice.id, user?.appUser?.name || 'Unknown', rejectionReason);
      setIsRejectOpen(false);
      setRejectingInvoice(null);
      setRejectionReason('');
    }
  };

  const handleBulkApprove = (type: 'auto' | 'manual') => {
    if (!isApprover) return;
    
    const typeSelectedInvoices = selectedInvoices
      .filter(id => id.startsWith(`${type}-`))
      .map(id => id.replace(`${type}-`, ''));
    
    if (typeSelectedInvoices.length > 0) {
      invoiceDataService.bulkApprove(typeSelectedInvoices, user?.appUser?.name || 'Unknown');
      setSelectedInvoices(prev => prev.filter(id => !id.startsWith(`${type}-`)));
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setIsViewOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const renderInvoiceTable = (invoiceList: Invoice[], type: 'auto' | 'manual') => {
    const pendingInvoices = invoiceList.filter(inv => inv.status === 'pending');
    const typeSelectedCount = selectedInvoices.filter(id => id.startsWith(`${type}-`)).length;

    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <CardTitle>
              {type === 'auto' ? 'Auto-Generated Invoices' : 'Manual Invoices'}
              <Badge variant="outline" className="ml-2">
                {pendingInvoices.length} Pending
              </Badge>
            </CardTitle>
            {typeSelectedCount > 0 && isApprover && (
              <Button onClick={() => handleBulkApprove(type)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk Approve ({typeSelectedCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
            <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={typeSelectedCount === pendingInvoices.length && pendingInvoices.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(checked as boolean, type)}
                    disabled={!isApprover}
                  />
                </TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceList.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoices.includes(`${type}-${invoice.id}`)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean, type)}
                      disabled={!isApprover || invoice.status !== 'pending'}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.tenantCompany}</div>
                      <div className="text-sm text-muted-foreground">{invoice.tenantName}</div>
                    </div>
                  </TableCell>
                  <TableCell>₹{invoice.amount.toLocaleString()}</TableCell>
                  <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(invoice.status) as any}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'pending' && isApprover && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleApproveInvoice(invoice)}>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleRejectInvoice(invoice)}>
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {invoice.status !== 'pending' && !isApprover && (
                        <Button variant="ghost" size="sm" disabled title="You don't have approval permissions">
                          <Lock className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  if (!isApprover) {
    return (
      <DashboardLayout title="Approvals" subtitle="Invoice approval management">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Lock className="h-16 w-16 text-gray-400" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600">Access Denied</h3>
          <p className="text-gray-500">You don't have approver permissions.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Approvals" subtitle="Invoice approval management">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pending</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{invoices.filter(inv => inv.status === 'pending').length}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Auto Generated</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{autoInvoices.filter(inv => inv.status === 'pending').length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Manual Created</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{manualInvoices.filter(inv => inv.status === 'pending').length}</p>
                </div>
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Tables */}
        <Tabs defaultValue="auto" className="space-y-4">
          <TabsList>
            <TabsTrigger value="auto">Auto-Generated Invoices</TabsTrigger>
            <TabsTrigger value="manual">Manual Invoices</TabsTrigger>
          </TabsList>
          
          <TabsContent value="auto">
            {renderInvoiceTable(autoInvoices, 'auto')}
          </TabsContent>
          
          <TabsContent value="manual">
            {renderInvoiceTable(manualInvoices, 'manual')}
          </TabsContent>
        </Tabs>

        {/* View Invoice Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details - {viewingInvoice?.invoiceNumber}</DialogTitle>
              <DialogDescription>
                {viewingInvoice?.type === 'auto' ? 'Auto-generated' : 'Manual'} invoice for {viewingInvoice?.tenantCompany}
              </DialogDescription>
            </DialogHeader>
            {viewingInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tenant</Label>
                    <p className="text-sm">{viewingInvoice.tenantCompany}</p>
                    <p className="text-xs text-muted-foreground">{viewingInvoice.tenantName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <p className="text-sm font-bold">₹{viewingInvoice.amount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                    <p className="text-sm">{new Date(viewingInvoice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <Badge variant={getStatusColor(viewingInvoice.status) as any}>
                      {viewingInvoice.status.charAt(0).toUpperCase() + viewingInvoice.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="text-sm">{viewingInvoice.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Items</Label>
                  <div className="space-y-2">
                    {viewingInvoice.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.description}</span>
                        <span>₹{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewOpen(false)} className="flex-1">
                    Close
                  </Button>
                  {viewingInvoice.status === 'pending' && (
                    <>
                      <Button onClick={() => handleApproveInvoice(viewingInvoice)} className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button variant="destructive" onClick={() => handleRejectInvoice(viewingInvoice)} className="flex-1">
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Invoice Dialog */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Invoice</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting invoice {rejectingInvoice?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsRejectOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmReject} className="flex-1" disabled={!rejectionReason.trim()}>
                  Reject Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ApprovalsPage;