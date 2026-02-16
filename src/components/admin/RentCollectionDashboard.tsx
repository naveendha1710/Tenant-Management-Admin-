import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface RentCollectionStats {
  totalRentDue: number;
  totalRentCollected: number;
  pendingRent: number;
  overdueRent: number;
  tenantsPaid: number;
  tenantsPending: number;
  collectionRate: number;
  averagePaymentDelay: number;
}

interface RentCollectionDashboardProps {
  stats: RentCollectionStats;
}

export function RentCollectionDashboard({ stats }: RentCollectionDashboardProps) {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Rent Due */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rent Due (This Month)</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{formatCurrency(stats.totalRentDue)}</div>
          <p className="text-xs text-muted-foreground">All invoices this month</p>
        </CardContent>
      </Card>

      {/* Total Rent Collected */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rent Collected</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{formatCurrency(stats.totalRentCollected)}</div>
          <p className="text-xs text-muted-foreground">
            {((stats.totalRentCollected / stats.totalRentDue) * 100).toFixed(1)}% of total due
          </p>
        </CardContent>
      </Card>

      {/* Pending Rent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Rent</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingRent)}</div>
          <p className="text-xs text-muted-foreground">Before due date</p>
        </CardContent>
      </Card>

      {/* Overdue Rent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Rent</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{formatCurrency(stats.overdueRent)}</div>
          <p className="text-xs text-muted-foreground">Past due date</p>
        </CardContent>
      </Card>

      {/* Tenants Paid/Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tenants Paid / Pending</CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">
            {stats.tenantsPaid} / {stats.tenantsPending}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.tenantsPaid + stats.tenantsPending} total tenants
          </p>
        </CardContent>
      </Card>

      {/* Collection Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-emerald-600">{stats.collectionRate.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">This month</p>
        </CardContent>
      </Card>

      {/* Average Payment Delay */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Payment Delay</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.averagePaymentDelay}</div>
          <p className="text-xs text-muted-foreground">days late average</p>
        </CardContent>
      </Card>

      {/* Collection Progress */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Collection Progress</CardTitle>
          <div className="text-sm font-medium text-emerald-600">{stats.collectionRate.toFixed(0)}%</div>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${stats.collectionRate}%` }}
            ></div>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(stats.totalRentCollected)} of {formatCurrency(stats.totalRentDue)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}