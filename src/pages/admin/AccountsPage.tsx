import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InvoiceManagement } from '@/components/admin/InvoiceManagement';
import { RentCollectionManagement } from '@/components/admin/RentCollectionManagement';
import { DepositsManagement } from '@/components/admin/DepositsManagement';
import { ExpensesManagement } from '@/components/admin/ExpensesManagement';
import { 
  DollarSign, 
  Calendar, 
  FileText, 
  Wrench, 
  TrendingUp, 
  Vault,
  Plus,
  Eye,
  Download,
  Mail,
  Filter,
  Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/utils/permissions';
import { hasPermission } from '@/utils/permissionUtils';

export default function AccountsPage() {
  const { user } = useAuth();
  const permissions = usePermissions(user?.appUser?.permissions || []);
  
  // Check permissions for Rent Collection module
  const canView = permissions.hasPermission('Rent Collection', 'view');
  const canAdd = permissions.hasPermission('Rent Collection', 'add');
  const canEdit = permissions.hasPermission('Rent Collection', 'edit');
  const canDelete = permissions.hasPermission('Rent Collection', 'delete');
  
  // Check permission for Financial Reports module
  const canViewFinancialReports = hasPermission(user?.appUser, 'Financial Reports', 'view');
  
  // Mock financial data
  const [financialStats] = useState({
    totalMonthlyRevenue: 2850000,
    pendingRent: 450000,
    totalInvoices: { count: 45, value: 3200000 },
    maintenanceCost: 180000,
    netProfit: 2670000,
    securityDeposits: 1250000
  });

  // Mock invoices data
  const [invoices] = useState([
    {
      id: 'INV-2024-001',
      tenant: 'TechStart Solutions',
      amount: 75000,
      dateIssued: '2024-01-01',
      dueDate: '2024-01-10',
      status: 'Paid',
      paidDate: '2024-01-08'
    },
    {
      id: 'INV-2024-002',
      tenant: 'Innovate Labs',
      amount: 85000,
      dateIssued: '2024-01-01',
      dueDate: '2024-01-10',
      status: 'Pending',
      paidDate: null
    },
    {
      id: 'INV-2024-003',
      tenant: 'Digital Dynamics',
      amount: 65000,
      dateIssued: '2023-12-01',
      dueDate: '2023-12-10',
      status: 'Overdue',
      paidDate: null
    },
    {
      id: 'INV-2024-004',
      tenant: 'SPAN Edutech Ventures Pvt Ltd',
      amount: 95000,
      dateIssued: '2024-01-01',
      dueDate: '2024-01-10',
      status: 'Paid',
      paidDate: '2024-01-09'
    }
  ]);

  // Mock security deposits data
  const [deposits] = useState([
    {
      id: 'DEP-001',
      tenant: 'TechStart Solutions',
      space: '1A01 - Office',
      depositAmount: 150000,
      receivedDate: '2023-06-15',
      refundStatus: 'Active',
      refundDate: null,
      notes: 'Initial security deposit for 2-year lease'
    },
    {
      id: 'DEP-002',
      tenant: 'Innovate Labs',
      space: '2A01 - Office',
      depositAmount: 180000,
      receivedDate: '2023-08-20',
      refundStatus: 'Active',
      refundDate: null,
      notes: 'Security deposit for AI lab setup'
    },
    {
      id: 'DEP-003',
      tenant: 'Digital Dynamics',
      space: '1B01 - Office',
      depositAmount: 120000,
      receivedDate: '2023-05-10',
      refundStatus: 'Refunded',
      refundDate: '2024-01-15',
      notes: 'Refunded after lease completion - no damages'
    },
    {
      id: 'DEP-004',
      tenant: 'SPAN Edutech Ventures Pvt Ltd',
      space: '3A01 - Office',
      depositAmount: 200000,
      receivedDate: '2023-09-01',
      refundStatus: 'Active',
      refundDate: null,
      notes: 'Premium space security deposit'
    }
  ]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDepositStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-100 text-blue-800';
      case 'Refunded':
        return 'bg-green-100 text-green-800';
      case 'Pending Refund':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <DashboardLayout title="Accounts" subtitle="Financial management and tracking">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Lock className="h-16 w-16 text-gray-400" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view Rent Collection.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Accounts" subtitle="Financial management and tracking">
      <div className="space-y-4 sm:space-y-6">
        {/* Top Cards - Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                {formatCurrency(financialStats.totalMonthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Rent (This Month)</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">
                {formatCurrency(financialStats.pendingRent)}
              </div>
              <p className="text-xs text-muted-foreground">
                8 tenants pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices Issued</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">
                {financialStats.totalInvoices.count}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(financialStats.totalInvoices.value)} total value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
              <Wrench className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">
                {formatCurrency(financialStats.maintenanceCost)}
              </div>
              <p className="text-xs text-muted-foreground">
                This month expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-emerald-600">
                {formatCurrency(financialStats.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue - Expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Deposits Held</CardTitle>
              <Vault className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">
                {formatCurrency(financialStats.securityDeposits)}
              </div>
              <p className="text-xs text-muted-foreground">
                From all tenants
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="rent-collection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rent-collection">Rent Collection</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="rent-collection" className="space-y-4">
            <RentCollectionManagement />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <InvoiceManagement />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <ExpensesManagement />
          </TabsContent>

          <TabsContent value="deposits" className="space-y-4">
            <DepositsManagement />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            {!canViewFinancialReports ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="max-w-md">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center space-y-4">
                      <Lock className="h-16 w-16 text-gray-400" />
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600">Access Denied</h3>
                      <p className="text-gray-500 text-center">You don't have permission to view Financial Reports. Please contact your administrator.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
            {/* Advanced Filters & Controls */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🔍 Report Filters & Controls
                  <Badge variant="secondary">Interactive</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">📅 Date Range</h4>
                    <select className="w-full p-2 border rounded">
                      <option>Today</option>
                      <option>This Week</option>
                      <option selected>This Month</option>
                      <option>Last 3 Months</option>
                      <option>This Year</option>
                      <option>Custom Range</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">🏢 Tenant/Property</h4>
                    <select className="w-full p-2 border rounded">
                      <option>All Tenants</option>
                      <option>TechStart Solutions</option>
                      <option>Innovate Labs</option>
                      <option>SPAN Edutech</option>
                      <option>Digital Dynamics</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">💳 Payment Status</h4>
                    <select className="w-full p-2 border rounded">
                      <option>All Status</option>
                      <option>Paid</option>
                      <option>Pending</option>
                      <option>Overdue</option>
                    </select>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">📊 Report Type</h4>
                    <select className="w-full p-2 border rounded">
                      <option>Summary</option>
                      <option>Detailed</option>
                      <option>Tenant-wise</option>
                      <option>Property-wise</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">Show rent collection trend for last 6 months</Button>
                  <Button variant="outline" size="sm">Filter tenants with overdue rent above ₹10,000</Button>
                  <Button variant="outline" size="sm">Show revenue by building in current month</Button>
                  <Button variant="outline" size="sm">Compare 2024 vs 2025 rent growth</Button>
                </div>
              </CardContent>
            </Card>

            {/* Charts and Graphs Section */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    📈 Charts and Graphs
                    <Badge className="bg-green-600">Live Data</Badge>
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm">
                      <Calendar className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Charts
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  
                  {/* 1. Revenue Overview - Line Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          📈 Revenue Overview
                          <Badge variant="outline" className="text-xs">Line Chart</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg relative">
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-blue-600">Hover Tooltips</Badge>
                        </div>
                        <div className="text-center">
                          <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-blue-800">Monthly/Quarterly Revenue Trends</p>
                          <p className="text-xs text-muted-foreground mb-2">Jan: ₹25L → Dec: ₹28.5L (+14%)</p>
                          <div className="text-xs text-blue-600">Compare with previous year data</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 2. Collection vs Pending - Donut Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          🍩 Collection vs Pending
                          <Badge variant="outline" className="text-xs">Donut Chart</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Filter className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-green-50 to-orange-100 rounded-lg relative">
                        <div className="absolute top-4 left-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Collected: ₹24L</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span>Pending: ₹4.5L</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>Overdue: ₹1.2L</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-400 to-orange-400 mx-auto mb-2 shadow-lg"></div>
                          <p className="text-sm font-medium text-gray-800">Collection Status</p>
                          <div className="text-xs text-green-600">84.2% Collection Rate</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 3. Rent Collection by Property - Horizontal Bar Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          🏢 Collection by Property
                          <Badge variant="outline" className="text-xs">Bar Chart</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-indigo-50 to-cyan-100 rounded-lg relative">
                        <div className="absolute top-4 left-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                            <span>SPAN Venture: ₹8L</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                            <span>K.Palaniappa: ₹7.5L</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-teal-500 rounded"></div>
                            <span>Innovation Hub: ₹6L</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
                            <span>Tech Park: ₹7L</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex justify-center gap-2 mb-2">
                            <div className="w-6 h-8 bg-indigo-500 rounded shadow-sm"></div>
                            <div className="w-6 h-12 bg-cyan-500 rounded shadow-sm"></div>
                            <div className="w-6 h-6 bg-teal-500 rounded shadow-sm"></div>
                            <div className="w-6 h-10 bg-blue-500 rounded shadow-sm"></div>
                          </div>
                          <p className="text-sm font-medium text-indigo-800">Property Revenue Comparison</p>
                          <div className="text-xs text-indigo-600">Top Performer: K.Palaniappa</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 4. Expense Breakdown - Pie Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          🧾 Expense Breakdown
                          <Badge variant="outline" className="text-xs">Doughnut Chart</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-purple-50 to-pink-100 rounded-lg relative">
                        <div className="absolute top-4 right-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span>Maintenance: 60%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                            <span>Utilities: 25%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                            <span>Taxes: 10%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>Others: 5%</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 mx-auto mb-2 shadow-lg"></div>
                          <p className="text-sm font-medium text-purple-800">Expense Analysis</p>
                          <div className="text-xs text-purple-600">Total: ₹1.8L | Budget: ₹2L</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 5. Profit vs Expense Over Time - Dual Line Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          📊 Profit vs Expense Trend
                          <Badge variant="outline" className="text-xs">Dual Line</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-emerald-50 to-red-100 rounded-lg relative">
                        <div className="absolute top-4 left-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                            <span>Revenue Line</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Expense Line</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex justify-center gap-4 mb-2">
                            <TrendingUp className="h-8 w-8 text-emerald-600" />
                            <TrendingUp className="h-6 w-6 text-red-600 transform rotate-180" />
                          </div>
                          <p className="text-sm font-medium text-gray-800">Monthly Comparison</p>
                          <div className="text-xs text-emerald-600">Net Gain: ₹25.5L this month</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 6. Outstanding Rent by Tenant - Bar Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          ⚠️ Outstanding by Tenant
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Alert</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-red-50 to-orange-100 rounded-lg relative">
                        <div className="absolute top-4 left-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>Digital Dynamics: ₹65K</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            <span>Innovate Labs: ₹85K</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>Others: ₹25K</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex justify-center gap-2 mb-2">
                            <div className="w-6 h-10 bg-red-500 rounded shadow-sm"></div>
                            <div className="w-6 h-12 bg-orange-500 rounded shadow-sm"></div>
                            <div className="w-6 h-4 bg-yellow-500 rounded shadow-sm"></div>
                          </div>
                          <p className="text-sm font-medium text-red-800">Pending Dues Analysis</p>
                          <div className="text-xs text-red-600">Total Outstanding: ₹1.75L</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 7. Payment Mode Distribution - Pie Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          💳 Payment Mode Distribution
                          <Badge variant="outline" className="text-xs">Pie Chart</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-green-100 rounded-lg relative">
                        <div className="absolute top-4 right-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>UPI: 45%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>Bank Transfer: 35%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span>Cash: 15%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span>Cheque: 5%</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-400 to-green-400 mx-auto mb-2 shadow-lg"></div>
                          <p className="text-sm font-medium text-blue-800">Payment Methods</p>
                          <div className="text-xs text-blue-600">Digital: 80% | Traditional: 20%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 8. Top Paying Tenants - Horizontal Bar Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          🏆 Top Paying Tenants
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">Premium</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-yellow-50 to-amber-100 rounded-lg relative">
                        <div className="absolute top-4 left-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>SPAN Edutech: ₹95K</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-amber-500 rounded"></div>
                            <span>Innovate Labs: ₹85K</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-orange-500 rounded"></div>
                            <span>TechStart: ₹75K</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex justify-center gap-2 mb-2">
                            <div className="w-6 h-12 bg-yellow-500 rounded shadow-sm"></div>
                            <div className="w-6 h-10 bg-amber-500 rounded shadow-sm"></div>
                            <div className="w-6 h-8 bg-orange-500 rounded shadow-sm"></div>
                          </div>
                          <p className="text-sm font-medium text-yellow-800">Revenue Contributors</p>
                          <div className="text-xs text-yellow-600">Click tenant → detailed statement</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 9. Rent Due Timeline - Calendar Heatmap */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          📅 Rent Due Timeline
                          <Badge variant="outline" className="text-xs">Heatmap</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-slate-50 to-gray-100 rounded-lg relative">
                        <div className="absolute top-4 right-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded"></div>
                            <span>High Due</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                            <span>Medium Due</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded"></div>
                            <span>Low Due</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            <div className="w-3 h-3 rounded bg-red-400"></div>
                            <div className="w-3 h-3 rounded bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded bg-green-400"></div>
                            <div className="w-3 h-3 rounded bg-gray-200"></div>
                            <div className="w-3 h-3 rounded bg-red-400"></div>
                            <div className="w-3 h-3 rounded bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded bg-green-400"></div>
                            <div className="w-3 h-3 rounded bg-gray-200"></div>
                            <div className="w-3 h-3 rounded bg-red-400"></div>
                            <div className="w-3 h-3 rounded bg-yellow-400"></div>
                            <div className="w-3 h-3 rounded bg-green-400"></div>
                            <div className="w-3 h-3 rounded bg-gray-200"></div>
                            <div className="w-3 h-3 rounded bg-red-400"></div>
                            <div className="w-3 h-3 rounded bg-yellow-400"></div>
                          </div>
                          <p className="text-sm font-medium text-gray-800">Monthly Due Calendar</p>
                          <div className="text-xs text-gray-600">Peak collection days: 1st, 10th, 15th</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 10. Yearly Financial Summary - Combined Chart */}
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          📊 Yearly Financial Summary
                          <Badge variant="outline" className="text-xs">Column + Line</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="sm">
                          <TrendingUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center bg-gradient-to-r from-indigo-50 to-purple-100 rounded-lg relative">
                        <div className="absolute top-4 left-4 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                            <span>Income (Bars)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded"></div>
                            <span>Expenses (Line)</span>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="flex justify-center items-end gap-2 mb-2">
                            <div className="w-4 h-12 bg-indigo-500 rounded shadow-sm"></div>
                            <div className="w-4 h-10 bg-indigo-500 rounded shadow-sm"></div>
                            <div className="w-4 h-14 bg-indigo-500 rounded shadow-sm"></div>
                            <div className="w-4 h-11 bg-indigo-500 rounded shadow-sm"></div>
                          </div>
                          <p className="text-sm font-medium text-indigo-800">Annual Performance</p>
                          <div className="text-xs text-indigo-600">YoY Growth: +18.3%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📂 Export Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">📄 Document Formats</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Excel (XLSX) - For Accountants
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        CSV - Data Processing
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        PDF - Branded Reports
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">🖼️ Visual Formats</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Eye className="h-4 w-4 mr-2" />
                        Print View - Paper Optimized
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Image (PNG/JPEG) - Charts
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        Full Report (ZIP) - Bundle
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">⚡ Quick Actions</h4>
                    <div className="space-y-2">
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4 mr-2" />
                        Export This Quarter's Report
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Email to Stakeholders
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Auto-Reports
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}