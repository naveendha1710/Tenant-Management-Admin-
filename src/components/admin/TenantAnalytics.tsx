import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, AlertTriangle } from 'lucide-react';

interface TenantAnalyticsProps {
  tenants: any[];
}

export const TenantAnalytics: React.FC<TenantAnalyticsProps> = ({ tenants }) => {
  // Calculate analytics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'Active').length;
  const pendingTenants = tenants.filter(t => t.status === 'Pending Move-In').length;
  const vacatedTenants = tenants.filter(t => t.status === 'Vacated').length;
  
  const totalRent = tenants
    .filter(t => t.status === 'Active')
    .reduce((sum, t) => sum + t.rentAmount, 0);
  
  const occupancyRate = totalTenants > 0 ? (activeTenants / totalTenants) * 100 : 0;
  
  // Upcoming due dates (next 7 days)
  const upcomingDues = tenants.filter(t => {
    if (t.status !== 'Active') return false;
    const dueDate = new Date(t.nextDueDate);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= today && dueDate <= nextWeek;
  }).length;

  // Overdue payments
  const overdueTenants = tenants.filter(t => {
    if (t.status !== 'Active') return false;
    const dueDate = new Date(t.nextDueDate);
    const today = new Date();
    return dueDate < today;
  }).length;

  const analytics = [
    {
      title: 'Occupancy Rate',
      value: `${occupancyRate.toFixed(1)}%`,
      change: '+2.5%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${totalRent.toLocaleString()}`,
      change: '+12.3%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Upcoming Dues',
      value: upcomingDues.toString(),
      change: 'Next 7 days',
      trend: 'neutral',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Overdue Payments',
      value: overdueTenants.toString(),
      change: 'Requires attention',
      trend: overdueTenants > 0 ? 'down' : 'neutral',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{metric.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {metric.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                      {metric.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                      <span className={`text-xs ${
                        metric.trend === 'up' ? 'text-green-600' : 
                        metric.trend === 'down' ? 'text-red-600' : 
                        'text-muted-foreground'
                      }`}>
                        {metric.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tenant Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Active</Badge>
                  <span className="text-sm">{activeTenants} tenants</span>
                </div>
                <span className="text-sm font-medium">
                  {totalTenants > 0 ? ((activeTenants / totalTenants) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress value={totalTenants > 0 ? (activeTenants / totalTenants) * 100 : 0} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Pending Move-In</Badge>
                  <span className="text-sm">{pendingTenants} tenants</span>
                </div>
                <span className="text-sm font-medium">
                  {totalTenants > 0 ? ((pendingTenants / totalTenants) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress value={totalTenants > 0 ? (pendingTenants / totalTenants) * 100 : 0} className="h-2" />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Vacated</Badge>
                  <span className="text-sm">{vacatedTenants} tenants</span>
                </div>
                <span className="text-sm font-medium">
                  {totalTenants > 0 ? ((vacatedTenants / totalTenants) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress value={totalTenants > 0 ? (vacatedTenants / totalTenants) * 100 : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                  {activeTenants - overdueTenants}
                </p>
                <p className="text-sm text-green-700">Up to Date</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{overdueTenants}</p>
                <p className="text-sm text-red-700">Overdue</p>
              </div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{upcomingDues}</p>
              <p className="text-sm text-orange-700">Due This Week</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};