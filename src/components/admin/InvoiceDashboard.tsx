import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  BarChart3,
  Timer
} from 'lucide-react';

interface InvoiceStats {
  totalInvoicesThisMonth: number;
  totalAmountInvoiced: number;
  totalAmountCollected: number;
  pendingAmount: number;
  overdueAmount: number;
  netProfit: number;
  averagePaymentDelay: number;
}

interface InvoiceDashboardProps {
  stats: InvoiceStats;
}

export function InvoiceDashboard({ stats }: InvoiceDashboardProps) {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices This Month</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.totalInvoicesThisMonth}</div>
            <p className="text-xs text-muted-foreground">+5 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">{formatCurrency(stats.totalAmountInvoiced)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount Collected</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{formatCurrency(stats.totalAmountCollected)}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.totalAmountCollected / stats.totalAmountInvoiced) * 100).toFixed(1)}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit / Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-emerald-600">{formatCurrency(stats.netProfit)}</div>
            <p className="text-xs text-muted-foreground">After expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-indigo-600">+12%</div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment Delay</CardTitle>
            <Timer className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.averagePaymentDelay}</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}