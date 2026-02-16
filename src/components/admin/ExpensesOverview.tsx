import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CreditCard, 
  Calendar, 
  Wrench, 
  Zap,
  TrendingUp
} from 'lucide-react';

interface ExpensesStats {
  totalExpensesThisMonth: number;
  totalAnnualExpenses: number;
  maintenanceCosts: number;
  utilityBills: number;
  netProfitAfterExpenses: number;
}

interface ExpensesOverviewProps {
  stats: ExpensesStats;
}

export function ExpensesOverview({ stats }: ExpensesOverviewProps) {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Expenses This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
          <CreditCard className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpensesThisMonth)}</div>
          <p className="text-xs text-muted-foreground">Current month spending</p>
        </CardContent>
      </Card>

      {/* Total Annual Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Annual Expenses</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{formatCurrency(stats.totalAnnualExpenses)}</div>
          <p className="text-xs text-muted-foreground">Year-to-date spending</p>
        </CardContent>
      </Card>

      {/* Maintenance Costs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maintenance Costs</CardTitle>
          <Wrench className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{formatCurrency(stats.maintenanceCosts)}</div>
          <p className="text-xs text-muted-foreground">Property maintenance total</p>
        </CardContent>
      </Card>

      {/* Utility Bills */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utility Bills</CardTitle>
          <Zap className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(stats.utilityBills)}</div>
          <p className="text-xs text-muted-foreground">Electricity, water, internet</p>
        </CardContent>
      </Card>

      {/* Net Profit After Expenses */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit (After Expenses)</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{formatCurrency(stats.netProfitAfterExpenses)}</div>
          <p className="text-xs text-muted-foreground">Auto-calculated (Revenue - Expenses)</p>
        </CardContent>
      </Card>
    </div>
  );
}