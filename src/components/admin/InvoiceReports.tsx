import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Users,
  BarChart3,
  PieChart,
  Mail
} from 'lucide-react';

interface ReportFilters {
  dateRange: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';
  startDate: string;
  endDate: string;
  status: 'all' | 'paid' | 'pending' | 'overdue';
  tenant: string;
  exportFormat: 'pdf' | 'excel' | 'csv';
}

export function InvoiceReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'thisMonth',
    startDate: '',
    endDate: '',
    status: 'all',
    tenant: 'all',
    exportFormat: 'pdf'
  });

  // Mock report data
  const reportData = {
    monthlyRevenue: [
      { month: 'Jan', revenue: 2500000, collected: 2300000 },
      { month: 'Feb', revenue: 2650000, collected: 2500000 },
      { month: 'Mar', revenue: 2800000, collected: 2650000 },
      { month: 'Apr', revenue: 2750000, collected: 2600000 },
      { month: 'May', revenue: 2900000, collected: 2750000 }
    ],
    overdueInvoices: [
      { tenant: 'Digital Dynamics', amount: 65000, daysOverdue: 25, invoiceId: 'INV-2024-003' },
      { tenant: 'StartUp Hub', amount: 45000, daysOverdue: 15, invoiceId: 'INV-2024-007' },
      { tenant: 'Code Craft', amount: 38000, daysOverdue: 8, invoiceId: 'INV-2024-012' }
    ],
    paymentTrends: {
      onTime: 75,
      late: 20,
      veryLate: 5
    },
    topTenants: [
      { name: 'SPAN Edutech Ventures', revenue: 380000, invoices: 4 },
      { name: 'TechStart Solutions', revenue: 300000, invoices: 4 },
      { name: 'Innovate Labs', revenue: 340000, invoices: 4 },
      { name: 'Digital Dynamics', revenue: 260000, invoices: 4 }
    ]
  };

  const handleExport = (reportType: string) => {
    // Mock export functionality
    console.log(`Exporting ${reportType} as ${filters.exportFormat}`);
    alert(`Exporting ${reportType} report as ${filters.exportFormat.toUpperCase()}`);
  };

  const handleEmailReport = (reportType: string) => {
    console.log(`Emailing ${reportType} report`);
    alert(`${reportType} report will be emailed to the configured recipients`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Report Filters & Export Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={filters.dateRange} onValueChange={(value: ReportFilters['dateRange']) => setFilters(prev => ({ ...prev, dateRange: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisQuarter">This Quarter</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {filters.dateRange === 'custom' && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="status">Status Filter</Label>
              <Select value={filters.status} onValueChange={(value: ReportFilters['status']) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid Only</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="overdue">Overdue Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select value={filters.exportFormat} onValueChange={(value: ReportFilters['exportFormat']) => setFilters(prev => ({ ...prev, exportFormat: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">📄 PDF Report</SelectItem>
                  <SelectItem value="excel">📊 Excel Spreadsheet</SelectItem>
                  <SelectItem value="csv">📋 CSV Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Reports</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Analysis</TabsTrigger>
          <TabsTrigger value="trends">Payment Trends</TabsTrigger>
          <TabsTrigger value="financial">Financial Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Revenue Trend
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleExport('Monthly Revenue')}>
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEmailReport('Monthly Revenue')}>
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full overflow-hidden">
                  <div className="h-full flex items-end justify-between gap-2 p-4 bg-gradient-to-t from-blue-50 to-transparent rounded">
                    {reportData.monthlyRevenue.map((data, index) => (
                      <div key={index} className="flex flex-col items-center flex-1 max-w-16">
                        <div className="flex flex-col items-center gap-1 w-full">
                          <div 
                            className="w-6 bg-blue-500 rounded-t mx-auto"
                            style={{ height: `${Math.min((data.revenue / 3000000) * 120, 120)}px` }}
                          ></div>
                          <div 
                            className="w-6 bg-green-500 rounded-t mx-auto"
                            style={{ height: `${Math.min((data.collected / 3000000) * 120, 120)}px` }}
                          ></div>
                        </div>
                        <span className="text-xs mt-2 truncate">{data.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Invoiced</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Collected</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Tenants */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Revenue Tenants
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => handleExport('Top Tenants')}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.topTenants.map((tenant, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">{tenant.invoices} invoices</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{tenant.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Overdue Invoices Analysis
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('Overdue Analysis')}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEmailReport('Overdue Analysis')}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">
                          ₹{reportData.overdueInvoices.reduce((sum, inv) => sum + inv.amount, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-red-700">Total Overdue Amount</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{reportData.overdueInvoices.length}</div>
                        <div className="text-sm text-orange-700">Overdue Invoices</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">
                          {Math.round(reportData.overdueInvoices.reduce((sum, inv) => sum + inv.daysOverdue, 0) / reportData.overdueInvoices.length)}
                        </div>
                        <div className="text-sm text-yellow-700">Avg Days Overdue</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Overdue List */}
                <div className="space-y-2">
                  {reportData.overdueInvoices.map((invoice, index) => (
                    <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.tenant}</p>
                        <p className="text-sm text-muted-foreground">Invoice: {invoice.invoiceId}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{invoice.amount.toLocaleString()}</p>
                        <Badge variant="destructive">
                          {invoice.daysOverdue} days overdue
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Payment Trends Pie Chart */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Payment Behavior Analysis
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={() => handleExport('Payment Trends')}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">100%</div>
                        <div className="text-xs">Payments</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 text-sm">
                  <div className="text-center">
                    <div className="w-4 h-4 bg-green-500 rounded mx-auto mb-1"></div>
                    <div className="font-medium">{reportData.paymentTrends.onTime}%</div>
                    <div className="text-muted-foreground">On Time</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mx-auto mb-1"></div>
                    <div className="font-medium">{reportData.paymentTrends.late}%</div>
                    <div className="text-muted-foreground">Late (1-15 days)</div>
                  </div>
                  <div className="text-center">
                    <div className="w-4 h-4 bg-red-500 rounded mx-auto mb-1"></div>
                    <div className="font-medium">{reportData.paymentTrends.veryLate}%</div>
                    <div className="text-muted-foreground">Very Late (15+ days)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collection Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Collection Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Collection Rate</span>
                    <span className="font-bold text-green-600">92.3%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '92.3%' }}></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Average Collection Time</span>
                    <span className="font-bold">8.5 days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span>Outstanding Amount</span>
                    <span className="font-bold text-red-600">₹1,48,000</span>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Send payment reminders 3 days before due date</li>
                      <li>• Implement early payment discounts</li>
                      <li>• Follow up on overdue accounts weekly</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Financial Summary Report
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('Financial Summary')}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleEmailReport('Financial Summary')}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">₹28.5L</div>
                      <div className="text-sm text-blue-700">Total Revenue</div>
                      <div className="text-xs text-muted-foreground mt-1">This Month</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">₹26.3L</div>
                      <div className="text-sm text-green-700">Collected</div>
                      <div className="text-xs text-muted-foreground mt-1">92.3% of total</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">₹1.5L</div>
                      <div className="text-sm text-yellow-700">Pending</div>
                      <div className="text-xs text-muted-foreground mt-1">5.3% of total</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">₹0.7L</div>
                      <div className="text-sm text-red-700">Overdue</div>
                      <div className="text-xs text-muted-foreground mt-1">2.4% of total</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Yearly Comparison */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Year-over-Year Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg md:text-xl font-bold">₹3.2Cr</div>
                    <div className="text-sm text-muted-foreground">2024 Revenue</div>
                    <div className="text-xs text-green-600 mt-1">+15% vs 2023</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg md:text-xl font-bold">94.2%</div>
                    <div className="text-sm text-muted-foreground">Collection Rate</div>
                    <div className="text-xs text-green-600 mt-1">+2.1% vs 2023</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-base sm:text-lg md:text-xl font-bold">7.8 days</div>
                    <div className="text-sm text-muted-foreground">Avg Collection Time</div>
                    <div className="text-xs text-green-600 mt-1">-1.2 days vs 2023</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Export Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Export Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" onClick={() => handleExport('All Invoices')}>
              <FileText className="h-4 w-4 mr-2" />
              All Invoices
            </Button>
            <Button variant="outline" onClick={() => handleExport('Overdue Report')}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Overdue Report
            </Button>
            <Button variant="outline" onClick={() => handleExport('Monthly Summary')}>
              <Calendar className="h-4 w-4 mr-2" />
              Monthly Summary
            </Button>
            <Button variant="outline" onClick={() => handleExport('Financial Statement')}>
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Statement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}