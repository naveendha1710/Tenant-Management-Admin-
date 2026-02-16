import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  RefreshCw, 
  Clock, 
  TrendingUp
} from 'lucide-react';

interface DepositsStats {
  totalSecurityDepositsHeld: number;
  refundableAmount: number;
  depositsCollectedThisMonth: number;
  pendingRefundRequests: number;
}

interface DepositsOverviewProps {
  stats: DepositsStats;
}

export function DepositsOverview({ stats }: DepositsOverviewProps) {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Security Deposits Held */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Security Deposits Held</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSecurityDepositsHeld)}</div>
          <p className="text-xs text-muted-foreground">Currently held from all tenants</p>
        </CardContent>
      </Card>

      {/* Refundable Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Refundable Amount</CardTitle>
          <RefreshCw className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{formatCurrency(stats.refundableAmount)}</div>
          <p className="text-xs text-muted-foreground">Eligible for refund (vacated tenants)</p>
        </CardContent>
      </Card>

      {/* Deposits Collected This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Deposits Collected This Month</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">{formatCurrency(stats.depositsCollectedThisMonth)}</div>
          <p className="text-xs text-muted-foreground">Recent additions</p>
        </CardContent>
      </Card>

      {/* Pending Refund Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Refund Requests</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.pendingRefundRequests}</div>
          <p className="text-xs text-muted-foreground">Tenants awaiting refunds</p>
        </CardContent>
      </Card>
    </div>
  );
}