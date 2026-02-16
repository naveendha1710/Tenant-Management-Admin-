import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Download, 
  FileText, 
  BarChart3,
  PieChart,
  Eye,
  CreditCard,
  Lock
} from 'lucide-react';
import { ExpensesOverview } from './ExpensesOverview';
import { ExpensesTable } from './ExpensesTable';
import { ExpenseEntry } from './ExpenseEntry';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

interface ExpenseRecord {
  id: string;
  expenseId: string;
  category: 'Maintenance' | 'Utilities' | 'Salaries' | 'Supplies' | 'Insurance' | 'Transportation' | 'Office' | 'Others';
  description: string;
  date: string;
  amount: number;
  paidTo: string;
  paymentMode: string;
  status: 'Paid' | 'Pending';
  receiptFile?: string;
  notes?: string;
}

export function ExpensesManagement() {
  const { user } = useAuth();
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isViewExpenseOpen, setIsViewExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const { toast } = useToast();

  // Check permissions for Expenses module
  const canView = hasPermission(user?.appUser, 'Expenses', 'view');
  const canAdd = hasPermission(user?.appUser, 'Expenses', 'add');
  const canEdit = hasPermission(user?.appUser, 'Expenses', 'edit');
  const canDelete = hasPermission(user?.appUser, 'Expenses', 'delete');

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to view Expenses. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Mock statistics
  const stats = {
    totalExpensesThisMonth: 188500,
    totalAnnualExpenses: 2250000,
    maintenanceCosts: 450000,
    utilityBills: 320000,
    netProfitAfterExpenses: 2461500
  };

  const handleAddExpense = (data: any) => {
    if (!canAdd) {
      toast({ title: "Error", description: "You don't have permission to add expenses", variant: "destructive" });
      return;
    }
    toast({
      title: "Expense Added",
      description: `Expense of ₹${data.amount.toLocaleString()} added for ${data.category}`
    });
    setIsAddExpenseOpen(false);
  };

  const handleEditExpense = (data: any) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit expenses", variant: "destructive" });
      return;
    }
    toast({
      title: "Expense Updated",
      description: `Expense details updated successfully`
    });
    setIsEditExpenseOpen(false);
    setEditingExpense(null);
  };

  const handleView = (record: ExpenseRecord) => {
    setSelectedExpense(record);
    setIsViewExpenseOpen(true);
  };

  const handleEdit = (record: ExpenseRecord) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit expenses", variant: "destructive" });
      return;
    }
    setEditingExpense(record);
    setIsEditExpenseOpen(true);
  };

  const handleDelete = (record: ExpenseRecord) => {
    if (!canDelete) {
      toast({ title: "Error", description: "You don't have permission to delete expenses", variant: "destructive" });
      return;
    }
    if (confirm(`Are you sure you want to delete the expense "${record.description}"?`)) {
      toast({
        title: "Expense Deleted",
        description: `Expense record has been deleted successfully`
      });
    }
  };

  const handleViewReceipt = (record: ExpenseRecord) => {
    toast({
      title: "Receipt Viewed",
      description: `Viewing receipt for ${record.description}`
    });
  };

  const handleExportReport = () => {
    toast({
      title: "Export Started",
      description: "Expenses report is being exported to CSV"
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Dashboard Overview */}
      <ExpensesOverview stats={stats} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {canAdd ? (
              <Button onClick={() => setIsAddExpenseOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add expenses">
                <Lock className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">All Expenses</TabsTrigger>
          <TabsTrigger value="analytics">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <ExpensesTable
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewReceipt={handleViewReceipt}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Expense Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Expense Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 p-4 bg-gradient-to-t from-red-50 to-transparent rounded">
                  {[
                    { month: 'Aug', amount: 165000 },
                    { month: 'Sep', amount: 178000 },
                    { month: 'Oct', amount: 192000 },
                    { month: 'Nov', amount: 185000 },
                    { month: 'Dec', amount: 188500 }
                  ].map((data, index) => (
                    <div key={index} className="flex flex-col items-center flex-1 max-w-16">
                      <div 
                        className="w-6 bg-red-500 rounded-t mx-auto"
                        style={{ height: `${Math.min((data.amount / 200000) * 120, 120)}px` }}
                      ></div>
                      <span className="text-xs mt-2 truncate">{data.month}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category-wise Expense Split */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Category-wise Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { category: 'Maintenance', amount: 75000, color: 'bg-orange-500' },
                    { category: 'Utilities', amount: 45000, color: 'bg-blue-500' },
                    { category: 'Salaries', amount: 35000, color: 'bg-purple-500' },
                    { category: 'Insurance', amount: 25000, color: 'bg-red-500' },
                    { category: 'Others', amount: 8500, color: 'bg-gray-500' }
                  ].map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${item.color}`}></div>
                        <span className="text-sm">{item.category}</span>
                      </div>
                      <div className="text-sm font-medium">₹{item.amount.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Vendors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Vendors by Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { vendor: 'Cool Air Services', amount: 75000, category: 'Maintenance' },
                    { vendor: 'TNEB', amount: 45000, category: 'Utilities' },
                    { vendor: 'Security Team', amount: 35000, category: 'Salaries' },
                    { vendor: 'Reliable Insurance Co.', amount: 25000, category: 'Insurance' }
                  ].map((vendor, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{vendor.vendor}</p>
                        <p className="text-sm text-muted-foreground">{vendor.category}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{vendor.amount.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expense Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <h4 className="font-medium text-blue-800">Average Monthly Expense</h4>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">₹187,500</p>
                    <p className="text-xs text-blue-600">Based on last 5 months</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <h4 className="font-medium text-green-800">Highest Expense Category</h4>
                    <p className="text-lg font-bold text-green-600">Maintenance (40%)</p>
                    <p className="text-xs text-green-600">₹75,000 this month</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <h4 className="font-medium text-orange-800">Pending Payments</h4>
                    <p className="text-lg font-bold text-orange-600">₹8,500</p>
                    <p className="text-xs text-orange-600">1 vendor payment pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <ExpenseEntry
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onSubmit={handleAddExpense}
      />

      {/* Edit Expense Dialog */}
      <ExpenseEntry
        isOpen={isEditExpenseOpen}
        onClose={() => {
          setIsEditExpenseOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleEditExpense}
        initialData={editingExpense ? {
          category: editingExpense.category,
          description: editingExpense.description,
          date: editingExpense.date,
          amount: editingExpense.amount,
          paidTo: editingExpense.paidTo,
          paymentMode: editingExpense.paymentMode,
          status: editingExpense.status,
          notes: editingExpense.notes
        } : undefined}
        isEdit={true}
      />

      {/* View Expense Dialog */}
      <Dialog open={isViewExpenseOpen} onOpenChange={setIsViewExpenseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Expense Details - {selectedExpense?.expenseId}
            </DialogTitle>
            <DialogDescription>
              Complete expense information and receipt details
            </DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expense Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="text-sm font-medium">{selectedExpense.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Amount</label>
                      <p className="text-sm font-medium">₹{selectedExpense.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <p className="text-sm">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Paid To</label>
                      <p className="text-sm">{selectedExpense.paidTo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Payment Mode</label>
                      <p className="text-sm">{selectedExpense.paymentMode}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <p className="text-sm">{selectedExpense.status}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-sm">{selectedExpense.description}</p>
                  </div>
                  {selectedExpense.notes && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-muted-foreground">Notes</label>
                      <p className="text-sm">{selectedExpense.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsViewExpenseOpen(false)}>
                  Close
                </Button>
                {canEdit ? (
                  <Button onClick={() => {
                    setIsViewExpenseOpen(false);
                    handleEdit(selectedExpense);
                  }}>
                    Edit Expense
                  </Button>
                ) : (
                  <Button disabled title="You don't have permission to edit expenses">
                    <Lock className="h-4 w-4 mr-2" />
                    Edit Expense
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