import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TrendingUp, TrendingDown, Users, Building2, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { overviewDataService, DashboardStats, RevenueByProperty, RevenueByTenant, RevenueByCompany, TenantWithCompany } from '@/data/overviewData';
import LoadingScreen from '@/components/LoadingScreen';

// StatCard Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, subtitle }) => (
  <div className="group relative bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-sm text-slate-600 font-medium">{label}</p>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
      <p className="font-medium">{payload[0].payload.property || payload[0].payload.name}</p>
      <p className="text-emerald-400">₹{(payload[0].value / 1000000).toFixed(1)}M</p>
    </div>
  );
};

const Overview: React.FC = () => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalTenants: 0,
    activeTenants: 0,
    totalBuildings: 0,
    totalSpaces: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    maintenanceTickets: 0,
    occupancyRate: 0,
    collectionRate: 0
  });
  const [revenueByProperty, setRevenueByProperty] = useState<RevenueByProperty[]>([]);
  const [revenueByTenants, setRevenueByTenants] = useState<RevenueByTenant[]>([]);
  const [revenueByCompanies, setRevenueByCompanies] = useState<RevenueByCompany[]>([]);
  const [tenantsWithCompany, setTenantsWithCompany] = useState<TenantWithCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const [stats, propertyData, tenantsData, companiesData, tenantsCompanyData] = await Promise.all([
      overviewDataService.getDashboardStats(),
      overviewDataService.getRevenueByProperty(),
      overviewDataService.getRevenueByTenants(),
      overviewDataService.getRevenueByCompanies(),
      overviewDataService.getTenantsWithCompany()
    ]);
    setDashboardStats(stats);
    setRevenueByProperty(propertyData);
    setRevenueByTenants(tenantsData);
    setRevenueByCompanies(companiesData);
    setTenantsWithCompany(tenantsCompanyData);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount / 1000000).toFixed(1)}M`;
  };

  return (
    <DashboardLayout title="Dashboard" subtitle="Rathinam Techpark Overview">
      <div className="min-h-screen bg-slate-50/50 -m-6 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingScreen />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
            
            {/* Stats Row */}
            <StatCard
              label="Total Tenants"
              value={dashboardStats.totalTenants}
              icon={<Users className="h-5 w-5 text-blue-600" />}
              subtitle={`${dashboardStats.activeTenants} active`}
            />
            
            <StatCard
              label="Total Buildings"
              value={dashboardStats.totalBuildings}
              icon={<Building2 className="h-5 w-5 text-purple-600" />}
              subtitle={`${dashboardStats.totalSpaces} floors`}
            />
            
            <StatCard
              label="Monthly Revenue"
              value={formatCurrency(dashboardStats.monthlyRevenue)}
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              subtitle="This month"
            />

            {/* Revenue by Property */}
            <div className="md:col-span-2 lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Revenue by Property</h3>
                  <p className="text-sm text-slate-600 mt-1">Monthly breakdown</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400" />
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByProperty}>
                  <XAxis 
                    dataKey="property" 
                    axisLine={false}
                    tickLine={false}
                    tick={false}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Bar 
                    dataKey="revenue" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-slate-600" />
                <h3 className="font-semibold">Quick Stats</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Occupancy Rate</span>
                    <span className="font-semibold">{dashboardStats.occupancyRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${dashboardStats.occupancyRate}%` }} />
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm text-slate-600">Maintenance Tickets</p>
                  <p className="text-2xl font-bold mt-1">{dashboardStats.maintenanceTickets}</p>
                </div>
              </div>
            </div>

            {/* Top Companies by Revenue */}
            <div className="md:col-span-2 lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all">
              <div className="mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Statistics</p>
                <h3 className="text-xl font-semibold text-slate-900">Top Companies by Revenue</h3>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueByCompanies.slice(0, 8)} layout="vertical">
                  <XAxis 
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="company"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    width={120}
                  />
                  <Tooltip content={({ active, payload }: any) => {
                    if (!active || !payload?.[0]) return null;
                    return (
                      <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
                        <p className="font-medium">{payload[0].payload.company}</p>
                        <p className="text-emerald-400">₹{(payload[0].value / 1000000).toFixed(2)}M</p>
                      </div>
                    );
                  }} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
                  <Bar 
                    dataKey="revenue" 
                    fill="#3b82f6" 
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Companies */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-all">
              <h3 className="font-semibold mb-4">Top Tenants</h3>
              <div className="space-y-3">
                {tenantsWithCompany.slice(0, 5).map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-900 font-medium">{item.company} : {item.tenant}</span>
                      <span className="text-emerald-600 font-semibold">₹{(item.revenue / 1000000).toFixed(1)}M</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(item.revenue / tenantsWithCompany[0]?.revenue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Overview;