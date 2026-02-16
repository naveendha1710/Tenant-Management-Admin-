import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Download, 
  FileText, 
  RefreshCw,
  Vault,
  Eye,
  Lock
} from 'lucide-react';
import { DepositsOverview } from './DepositsOverview';
import { DepositsTable } from './DepositsTable';
import { DepositEntry, RefundDialog } from './DepositEntry';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

interface DepositRecord {
  id: string;
  tenantName: string;
  tenantId: string;
  propertySpace: string;
  depositType: 'Security' | 'Advance Rent' | 'Maintenance';
  depositAmount: number;
  dateReceived: string;
  paymentMode: string;
  transactionId: string;
  currentStatus: 'Held' | 'Adjusted' | 'Refunded' | 'Partial Refund' | 'Pending Refund';
  refundAmount?: number;
  refundDate?: string;
  notes?: string;
  adjustedAmount?: number;
}

export function DepositsManagement() {
  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [isEditDepositOpen, setIsEditDepositOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRecord | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<DepositRecord | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check permissions for Deposits module
  const canView = hasPermission(user?.appUser, 'Deposits', 'view');
  const canAdd = hasPermission(user?.appUser, 'Deposits', 'add');
  const canEdit = hasPermission(user?.appUser, 'Deposits', 'edit');
  const canDelete = hasPermission(user?.appUser, 'Deposits', 'delete');

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view Deposits. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mock statistics
  const stats = {
    totalSecurityDepositsHeld: 1250000,
    refundableAmount: 320000,
    depositsCollectedThisMonth: 180000,
    pendingRefundRequests: 8
  };

  const handleAddDeposit = (data: any) => {
    if (!canAdd) {
      toast({ title: "Error", description: "You don't have permission to add deposits", variant: "destructive" });
      return;
    }
    toast({
      title: "Deposit Added",
      description: `Security deposit of ₹${data.depositAmount.toLocaleString()} added for ${data.tenantName}`
    });
    setIsAddDepositOpen(false);
  };

  const handleEditDeposit = (data: any) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit deposits", variant: "destructive" });
      return;
    }
    toast({
      title: "Deposit Updated",
      description: `Deposit details updated for ${data.tenantName}`
    });
    setIsEditDepositOpen(false);
    setEditingDeposit(null);
  };

  const handleView = (record: DepositRecord) => {
    setSelectedDeposit(record);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (record: DepositRecord) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit deposits", variant: "destructive" });
      return;
    }
    setEditingDeposit(record);
    setIsEditDepositOpen(true);
  };

  const handleRefund = (record: DepositRecord) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to process refunds", variant: "destructive" });
      return;
    }
    setSelectedDeposit(record);
    setIsRefundDialogOpen(true);
  };

  const handleRefundSubmit = (refundData: any) => {
    toast({
      title: "Refund Processed",
      description: `Refund of ₹${refundData.refundAmount.toLocaleString()} processed for ${selectedDeposit?.tenantName}`
    });
    setIsRefundDialogOpen(false);
    setSelectedDeposit(null);
  };

  const handleDelete = (record: DepositRecord) => {
    if (!canDelete) {
      toast({ title: "Error", description: "You don't have permission to delete deposits", variant: "destructive" });
      return;
    }
    if (confirm(`Are you sure you want to delete the deposit record for ${record.tenantName}?`)) {
      toast({
        title: "Deposit Deleted",
        description: `Deposit record for ${record.tenantName} has been deleted`
      });
    }
  };

  const handleExportSummary = () => {
    toast({
      title: "Export Started",
      description: "Deposits summary is being exported to CSV"
    });
  };

  const handleGenerateReport = () => {
    toast({
      title: "Report Generated",
      description: "Deposits report has been generated successfully"
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard Overview */}
      <DepositsOverview stats={stats} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {canAdd ? (
              <Button onClick={() => setIsAddDepositOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Deposit
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add deposits">
                <Lock className="h-4 w-4 mr-2" />
                Add Deposit
              </Button>
            )}
            <Button variant="outline" onClick={handleExportSummary}>
              <Download className="h-4 w-4 mr-2" />
              Export Summary
            </Button>
            <Button variant="outline" onClick={handleGenerateReport}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            {canEdit ? (
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync with Contracts
              </Button>
            ) : (
              <Button variant="outline" disabled title="You don't have permission to sync contracts">
                <Lock className="h-4 w-4 mr-2" />
                Sync with Contracts
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Deposits Table */}
      <DepositsTable
        onView={handleView}
        onEdit={handleEdit}
        onRefund={handleRefund}
        onDelete={handleDelete}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {/* Add Deposit Dialog */}
      <DepositEntry
        isOpen={isAddDepositOpen}
        onClose={() => setIsAddDepositOpen(false)}
        onSubmit={handleAddDeposit}
      />

      {/* Edit Deposit Dialog */}
      <DepositEntry
        isOpen={isEditDepositOpen}
        onClose={() => {
          setIsEditDepositOpen(false);
          setEditingDeposit(null);
        }}
        onSubmit={handleEditDeposit}
        initialData={editingDeposit ? {
          tenantId: editingDeposit.tenantId,
          tenantName: editingDeposit.tenantName,
          propertySpace: editingDeposit.propertySpace,
          depositType: editingDeposit.depositType,
          depositAmount: editingDeposit.depositAmount,
          paymentMode: editingDeposit.paymentMode,
          transactionId: editingDeposit.transactionId,
          dateReceived: editingDeposit.dateReceived,
          notes: editingDeposit.notes
        } : undefined}
        isEdit={true}
      />

      {/* Refund Dialog */}
      <RefundDialog
        isOpen={isRefundDialogOpen}
        onClose={() => {
          setIsRefundDialogOpen(false);
          setSelectedDeposit(null);
        }}
        onSubmit={handleRefundSubmit}
        depositRecord={selectedDeposit ? {
          tenantName: selectedDeposit.tenantName,
          depositAmount: selectedDeposit.depositAmount,
          adjustedAmount: selectedDeposit.adjustedAmount
        } : null}
      />

      {/* View Deposit Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Deposit Details - {selectedDeposit?.tenantName}
            </DialogTitle>
            <DialogDescription>
              Complete deposit information and transaction history
            </DialogDescription>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deposit Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tenant</label>
                      <p className="text-sm font-medium">{selectedDeposit.tenantName}</p>
                      <p className="text-xs text-muted-foreground">{selectedDeposit.tenantId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Property</label>
                      <p className="text-sm">{selectedDeposit.propertySpace}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Deposit Type</label>
                      <p className="text-sm">{selectedDeposit.depositType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Amount</label>
                      <p className="text-sm font-medium">₹{selectedDeposit.depositAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date Received</label>
                      <p className="text-sm">{new Date(selectedDeposit.dateReceived).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Mode</label>
                      <p className="text-sm">{selectedDeposit.paymentMode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                      <p className="text-sm font-mono">{selectedDeposit.transactionId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Current Status</label>
                      <p className="text-sm">{selectedDeposit.currentStatus}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Refund Information */}
              {(selectedDeposit.refundAmount || selectedDeposit.adjustedAmount) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Refund/Adjustment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedDeposit.refundAmount && (
                        <>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Refund Amount</label>
                            <p className="text-sm font-medium text-green-600">₹{selectedDeposit.refundAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Refund Date</label>
                            <p className="text-sm">{selectedDeposit.refundDate ? new Date(selectedDeposit.refundDate).toLocaleDateString() : '-'}</p>
                          </div>
                        </>
                      )}
                      {selectedDeposit.adjustedAmount && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Adjusted Amount</label>
                          <p className="text-sm font-medium text-yellow-600">₹{selectedDeposit.adjustedAmount.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedDeposit.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedDeposit.notes}</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                {canEdit ? (
                  <Button onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEdit(selectedDeposit);
                  }}>
                    Edit Deposit
                  </Button>
                ) : (
                  <Button disabled title="You don't have permission to edit deposits">
                    <Lock className="h-4 w-4 mr-2" />
                    Edit Deposit
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}