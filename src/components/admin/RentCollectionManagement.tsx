import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  RefreshCw, 
  Mail, 
  Download, 
  FileText,
  BarChart3,
  Users,
  TrendingUp,
  Lock
} from 'lucide-react';
import { RentCollectionDashboard } from './RentCollectionDashboard';
import { RentCollectionTable } from './RentCollectionTable';
import { RentPaymentEntry } from './RentPaymentEntry';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

interface RentRecord {
  id: string;
  tenantName: string;
  tenantId: string;
  propertySpace: string;
  rentAmount: number;
  maintenance: number;
  totalAmount: number;
  dueDate: string;
  paidDate?: string;
  paymentMode?: string;
  transactionId?: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  partialAmount?: number;
  notes?: string;
}

export function RentCollectionManagement() {
  const [isPaymentEntryOpen, setIsPaymentEntryOpen] = useState(false);
  const [selectedRentRecord, setSelectedRentRecord] = useState<RentRecord | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check permissions
  const canView = hasPermission(user?.appUser, 'Rent Collection', 'view');
  const canAdd = hasPermission(user?.appUser, 'Rent Collection', 'add');
  const canEdit = hasPermission(user?.appUser, 'Rent Collection', 'edit');
  const canDelete = hasPermission(user?.appUser, 'Rent Collection', 'delete');

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view Rent Collection. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mock statistics
  const stats = {
    totalRentDue: 2850000,
    totalRentCollected: 2630000,
    pendingRent: 150000,
    overdueRent: 70000,
    tenantsPaid: 42,
    tenantsPending: 8,
    collectionRate: 92.3,
    averagePaymentDelay: 2.5
  };

  const handleMarkPaid = (record: RentRecord) => {
    if (!canEdit) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to edit rent payments.",
        variant: "destructive"
      });
      return;
    }
    setSelectedRentRecord(record);
    setIsPaymentEntryOpen(true);
  };

  const handleViewReceipt = (record: RentRecord) => {
    toast({
      title: "Receipt Viewed",
      description: `Viewing receipt for ${record.tenantName} - ${record.propertySpace}`
    });
  };

  const handleSendReminder = (record: RentRecord) => {
    toast({
      title: "Reminder Sent",
      description: `Payment reminder sent to ${record.tenantName}`
    });
  };

  const handlePaymentSubmit = (paymentData: any) => {
    toast({
      title: "Payment Recorded",
      description: `Payment of ₹${paymentData.amountReceived.toLocaleString()} recorded successfully`
    });
    setIsPaymentEntryOpen(false);
    setSelectedRentRecord(null);
  };

  const handleBulkReminders = () => {
    if (!canEdit) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to send reminders.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Bulk Reminders Sent",
      description: "Payment reminders sent to all pending tenants"
    });
  };

  const handleSyncInvoices = () => {
    if (!canEdit) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to sync invoices.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Sync Complete",
      description: "Rent collection data synced with invoices"
    });
  };

  const handleExportSummary = () => {
    toast({
      title: "Export Started",
      description: "Rent summary is being exported to CSV"
    });
  };

  const handleGenerateReceipts = () => {
    if (!canAdd) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to generate receipts.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Receipts Generated",
      description: "Bulk rent receipts generated for all paid tenants"
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard Overview */}
      <RentCollectionDashboard stats={stats} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {canAdd ? (
              <Button onClick={() => {
                // Create a mock rent record for manual payment entry
                const mockRecord: RentRecord = {
                  id: 'manual',
                  tenantName: '',
                  tenantId: '',
                  propertySpace: '',
                  rentAmount: 0,
                  maintenance: 0,
                  totalAmount: 0,
                  dueDate: new Date().toISOString().split('T')[0],
                  status: 'Pending'
                };
                setSelectedRentRecord(mockRecord);
                setIsPaymentEntryOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rent Payment
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add rent payments">
                <Lock className="h-4 w-4 mr-2" />
                Add Rent Payment
              </Button>
            )}
            {canEdit ? (
              <Button variant="outline" onClick={handleSyncInvoices}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync With Invoices
              </Button>
            ) : (
              <Button variant="outline" disabled title="You don't have permission to sync invoices">
                <Lock className="h-4 w-4 mr-2" />
                Sync With Invoices
              </Button>
            )}
            {canEdit ? (
              <Button variant="outline" onClick={handleBulkReminders}>
                <Mail className="h-4 w-4 mr-2" />
                Send Payment Reminders
              </Button>
            ) : (
              <Button variant="outline" disabled title="You don't have permission to send reminders">
                <Lock className="h-4 w-4 mr-2" />
                Send Payment Reminders
              </Button>
            )}
            <Button variant="outline" onClick={handleExportSummary}>
              <Download className="h-4 w-4 mr-2" />
              Download Rent Summary
            </Button>
            {canAdd ? (
              <Button variant="outline" onClick={handleGenerateReceipts}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Rent Receipts
              </Button>
            ) : (
              <Button variant="outline" disabled title="You don't have permission to generate receipts">
                <Lock className="h-4 w-4 mr-2" />
                Generate Rent Receipts
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="collection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="collection">Rent Collection</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="space-y-4">
          <RentCollectionTable
            onMarkPaid={handleMarkPaid}
            onViewReceipt={handleViewReceipt}
            onSendReminder={handleSendReminder}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Collection Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Collection Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 p-4 bg-gradient-to-t from-green-50 to-transparent rounded">
                  {[
                    { month: 'Aug', collected: 2400000, due: 2500000 },
                    { month: 'Sep', collected: 2550000, due: 2600000 },
                    { month: 'Oct', collected: 2650000, due: 2700000 },
                    { month: 'Nov', collected: 2580000, due: 2750000 },
                    { month: 'Dec', collected: 2630000, due: 2850000 }
                  ].map((data, index) => (
                    <div key={index} className="flex flex-col items-center flex-1 max-w-16">
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div 
                          className="w-6 bg-gray-300 rounded-t mx-auto"
                          style={{ height: `${Math.min((data.due / 3000000) * 120, 120)}px` }}
                        ></div>
                        <div 
                          className="w-6 bg-green-500 rounded-t mx-auto -mt-1"
                          style={{ height: `${Math.min((data.collected / 3000000) * 120, 120)}px` }}
                        ></div>
                      </div>
                      <span className="text-xs mt-2 truncate">{data.month}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-300 rounded"></div>
                    <span>Due</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Collected</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top On-Time Payers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top On-Time Payers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'TechStart Solutions', onTimePayments: 12, totalPayments: 12 },
                    { name: 'SPAN Edutech Ventures', onTimePayments: 11, totalPayments: 12 },
                    { name: 'Alpha Technologies', onTimePayments: 10, totalPayments: 12 },
                    { name: 'Innovate Labs', onTimePayments: 9, totalPayments: 12 }
                  ].map((tenant, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.onTimePayments}/{tenant.totalPayments} on-time payments
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          {((tenant.onTimePayments / tenant.totalPayments) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Collection Rate by Building */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Collection Rate by Building
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { building: 'Block A', rate: 95.2, collected: 850000, due: 890000 },
                    { building: 'Block B', rate: 91.8, collected: 920000, due: 1002000 },
                    { building: 'Block C', rate: 88.5, collected: 860000, due: 972000 }
                  ].map((data, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{data.building}</span>
                        <span className="text-sm font-medium">{data.rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${data.rate}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>₹{data.collected.toLocaleString()} collected</span>
                        <span>₹{data.due.toLocaleString()} due</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Frequent Late Payers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Frequent Late Payers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Digital Dynamics', latePayments: 4, avgDelay: 8 },
                    { name: 'Beta Solutions', latePayments: 3, avgDelay: 5 },
                    { name: 'Gamma Innovations', latePayments: 2, avgDelay: 12 }
                  ].map((tenant, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.latePayments} late payments
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600">
                          {tenant.avgDelay} days avg delay
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Entry Dialog */}
      <RentPaymentEntry
        rentRecord={selectedRentRecord || {
          id: 'manual',
          tenantName: '',
          tenantId: '',
          propertySpace: '',
          rentAmount: 0,
          maintenance: 0,
          totalAmount: 0,
          dueDate: new Date().toISOString().split('T')[0],
          status: 'Pending'
        }}
        isOpen={isPaymentEntryOpen}
        onClose={() => {
          setIsPaymentEntryOpen(false);
          setSelectedRentRecord(null);
        }}
        onPaymentSubmit={handlePaymentSubmit}
      />
    </div>
  );
}