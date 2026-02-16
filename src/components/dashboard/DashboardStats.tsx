import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockTenants, mockInvoices, mockLeads, mockSpaces, mockTickets } from '@/data/mockData';
import { Building2, Users, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react';

interface DashboardStatsProps {
  userRole: string;
}

interface Stats {
  totalTenants: number;
  activeTenants: number;
  pendingApplications: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  newLeads: number;
  qualifiedLeads: number;
  openTickets: number;
  resolvedTickets: number;
}

export function DashboardStats({ userRole }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    activeTenants: 0,
    pendingApplications: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalSpaces: 0,
    occupiedSpaces: 0,
    availableSpaces: 0,
    occupancyRate: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    openTickets: 0,
    resolvedTickets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userRole]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Use mock data
      const totalTenants = mockTenants.length;
      const activeTenants = mockTenants.filter(t => t.status === 'Active').length;
      const pendingApplications = mockTenants.filter(t => t.status === 'Pending Approval').length;

      const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
      const pendingInvoices = mockInvoices.filter(inv => ['Sent', 'Approved'].includes(inv.status)).length;
      const overdueInvoices = mockInvoices.filter(inv => 
        inv.status === 'Overdue' || 
        (inv.status === 'Sent' && new Date(inv.due_date) < new Date())
      ).length;

      const totalSpaces = mockSpaces.length;
      const occupiedSpaces = mockSpaces.filter(s => s.status === 'Occupied').length;
      const availableSpaces = mockSpaces.filter(s => s.status === 'Available').length;
      const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0;

      const newLeads = mockLeads.filter(l => l.status === 'New').length;
      const qualifiedLeads = mockLeads.filter(l => l.status === 'Qualified').length;

      const openTickets = mockTickets.filter(t => ['Open', 'In Progress'].includes(t.status)).length;
      const resolvedTickets = mockTickets.filter(t => t.status === 'Resolved').length;

      setStats({
        totalTenants,
        activeTenants,
        pendingApplications,
        totalRevenue,
        pendingInvoices,
        overdueInvoices,
        totalSpaces,
        occupiedSpaces,
        availableSpaces,
        occupancyRate,
        newLeads,
        qualifiedLeads,
        openTickets,
        resolvedTickets,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSuperAdminStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Tenants</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalTenants}</p>
              <p className="text-xs text-green-600">{stats.activeTenants} active</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-yellow-600">{stats.pendingInvoices} pending</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Occupancy Rate</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.occupancyRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{stats.occupiedSpaces}/{stats.totalSpaces} spaces</p>
            </div>
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">New Leads</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.newLeads}</p>
              <p className="text-xs text-blue-600">{stats.qualifiedLeads} qualified</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAdminStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Active Tenants</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.activeTenants}</p>
              <Badge variant="secondary" className="text-xs">
                {stats.pendingApplications} pending
              </Badge>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Space Utilization</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.occupancyRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{stats.availableSpaces} available</p>
            </div>
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Open Tickets</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.openTickets}</p>
              <p className="text-xs text-green-600">{stats.resolvedTickets} resolved</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{(stats.totalRevenue / 12).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">avg per month</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFinanceStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-green-600">All time</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Pending Invoices</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.pendingInvoices}</p>
              <p className="text-xs text-yellow-600">Awaiting payment</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Overdue Invoices</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{stats.overdueInvoices}</p>
              <p className="text-xs text-red-600">Requires attention</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Collection Rate</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">
                {stats.totalRevenue > 0 ? (((stats.totalRevenue - (stats.pendingInvoices * 50000)) / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-green-600">This month</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCrmStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">New Leads</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.newLeads}</p>
              <p className="text-xs text-blue-600">This month</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Qualified Leads</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.qualifiedLeads}</p>
              <p className="text-xs text-green-600">Ready for proposal</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Conversion Rate</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">
                {stats.newLeads > 0 ? ((stats.activeTenants / (stats.newLeads + stats.activeTenants)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Lead to tenant</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Pipeline Value</p>
              <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{(stats.qualifiedLeads * 75000).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Estimated</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  switch (userRole) {
    case 'super_admin':
      return renderSuperAdminStats();
    case 'admin':
      return renderAdminStats();
    case 'finance':
      return renderFinanceStats();
    case 'crm':
      return renderCrmStats();
    default:
      return renderAdminStats();
  }
}