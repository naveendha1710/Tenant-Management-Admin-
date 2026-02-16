import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  MessageSquare,
  AlertCircle,
  FileText,
  Users
} from 'lucide-react';
import { invoiceApprovalService, type InvoiceApproval, type SelectiveInvoice } from '@/data/invoiceApprovalData';
import { useToast } from '@/hooks/use-toast';

interface InvoiceApprovalTabProps {
  currentUserId?: string;
  isAdmin?: boolean;
}

export function InvoiceApprovalTab({ currentUserId = 'user-1', isAdmin = false }: InvoiceApprovalTabProps) {
  const [pendingApprovals, setPendingApprovals] = useState<InvoiceApproval[]>([]);
  const [allApprovals, setAllApprovals] = useState<InvoiceApproval[]>([]);
  const [invoices, setInvoices] = useState<SelectiveInvoice[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<InvoiceApproval | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isActionOpen, setIsActionOpen] = useState(false);
  const [actionType, setActionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [comments, setComments] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const unsubscribe = invoiceApprovalService.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [currentUserId, isAdmin]);

  const loadData = () => {
    const allApprovalsData = invoiceApprovalService.getApprovals();
    const invoicesData = invoiceApprovalService.getInvoices();
    
    if (isAdmin) {
      setPendingApprovals(allApprovalsData.filter(a => a.status === 'Pending' || a.status === 'Partially Approved'));
      setAllApprovals(allApprovalsData);
    } else {
      const userPending = invoiceApprovalService.getPendingApprovalsForUser(currentUserId);
      setPendingApprovals(userPending);
      setAllApprovals(allApprovalsData.filter(a => 
        a.approvers.some(approver => approver.userId === currentUserId)
      ));
    }
    
    setInvoices(invoicesData);
  };

  const handleView = (approval: InvoiceApproval) => {
    setSelectedApproval(approval);
    setIsViewOpen(true);
  };

  const handleAction = (approval: InvoiceApproval, action: 'Approved' | 'Rejected') => {
    setSelectedApproval(approval);
    setActionType(action);
    setIsActionOpen(true);
  };

  const submitAction = () => {
    if (!selectedApproval) return;
    
    invoiceApprovalService.processApproval(
      selectedApproval.id,
      currentUserId,
      actionType,
      comments
    );
    
    setIsActionOpen(false);
    setSelectedApproval(null);
    setComments('');
    
    toast({
      title: "Success",
      description: `Invoice ${actionType.toLowerCase()} successfully`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Partially Approved': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4" />;
      case 'Rejected': return <XCircle className="h-4 w-4" />;
      case 'Pending': return <Clock className="h-4 w-4" />;
      case 'Partially Approved': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getInvoiceDetails = (invoiceId: string) => {
    return invoices.find(inv => inv.invoiceId === invoiceId);
  };

  const canUserApprove = (approval: InvoiceApproval) => {
    if (isAdmin) return true;
    const userApprover = approval.approvers.find(a => a.userId === currentUserId);
    return userApprover && userApprover.status === 'Pending';
  };

  // Calculate stats
  const stats = {
    pendingCount: pendingApprovals.length,
    approvedToday: allApprovals.filter(a => 
      a.status === 'Approved' && 
      new Date(a.completedAt || '').toDateString() === new Date().toDateString()
    ).length,
    totalAssigned: allApprovals.length,
    avgProcessingTime: 1.5
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.approvedToday}</div>
            <p className="text-xs text-muted-foreground">Processed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.totalAssigned}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">{stats.avgProcessingTime}d</div>
            <p className="text-xs text-muted-foreground">Days per approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({stats.pendingCount})</TabsTrigger>
          <TabsTrigger value="all">All Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No pending approvals</p>
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Tenant/Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Assigned Approvers</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((approval) => {
                      const invoice = getInvoiceDetails(approval.invoiceId);
                      const canApprove = canUserApprove(approval);
                      return (
                        <TableRow key={approval.id}>
                          <TableCell className="font-medium">{approval.invoiceId}</TableCell>
                          <TableCell>{invoice?.tenantName || '-'}</TableCell>
                          <TableCell className="font-medium">₹{invoice?.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invoice?.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={invoice?.type === 'Manual' ? 'default' : 'secondary'}>
                              {invoice?.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(approval.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(approval.status)}
                                {approval.status}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {approval.approvers.map((approver, index) => (
                                <Badge 
                                  key={index} 
                                  variant={approver.status === 'Approved' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {approver.userName}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => handleView(approval)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canApprove && (
                                <>
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    onClick={() => handleAction(approval, 'Approved')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleAction(approval, 'Rejected')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Approvals
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
            <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Tenant/Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allApprovals.map((approval) => {
                    const invoice = getInvoiceDetails(approval.invoiceId);
                    return (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">{approval.invoiceId}</TableCell>
                        <TableCell>{invoice?.tenantName || '-'}</TableCell>
                        <TableCell className="font-medium">₹{invoice?.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(approval.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(approval.status)}
                              {approval.status}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(approval.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {approval.completedAt ? new Date(approval.completedAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleView(approval)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Approval Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Approval Details - {selectedApproval?.invoiceId}</DialogTitle>
            <DialogDescription>
              Complete approval workflow information
            </DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4 sm:space-y-6">
              {/* Invoice Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const invoice = getInvoiceDetails(selectedApproval.invoiceId);
                    return invoice ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Tenant/Vendor</label>
                          <p className="text-sm">{invoice.tenantName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Amount</label>
                          <p className="text-sm font-medium">₹{invoice.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Category</label>
                          <Badge variant="outline">{invoice.category}</Badge>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Type</label>
                          <Badge variant={invoice.type === 'Manual' ? 'default' : 'secondary'}>
                            {invoice.type}
                          </Badge>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </CardContent>
              </Card>

              {/* Approval Flow */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval Flow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedApproval.approvers.map((approver, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                            {approver.order}
                          </div>
                          <div>
                            <p className="font-medium">{approver.userName}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedApproval.approvalType} Approval
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(approver.status)}>
                            {approver.status}
                          </Badge>
                          {approver.approvedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(approver.approvedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Approval History */}
              {selectedApproval.approvalHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Approval History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedApproval.approvalHistory.map((action, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                          <div className="flex-shrink-0">
                            {getStatusIcon(action.action)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{action.userName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(action.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <Badge className={getStatusColor(action.action)}>
                                {action.action}
                              </Badge>
                            </div>
                            {action.comments && (
                              <p className="text-sm mt-2 p-2 bg-white rounded border">
                                {action.comments}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={isActionOpen} onOpenChange={setIsActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'Approved' ? 'Approve' : 'Reject'} Invoice
            </DialogTitle>
            <DialogDescription>
              {selectedApproval?.invoiceId} - Add comments for this action
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={`Add comments for ${actionType.toLowerCase()} this invoice...`}
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsActionOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={submitAction}
                className="flex-1"
                variant={actionType === 'Approved' ? 'default' : 'destructive'}
              >
                {actionType === 'Approved' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Invoice
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}