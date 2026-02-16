import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data for charts
const occupancyData = [
  { name: 'Occupied', value: 67, color: '#3b82f6' },
  { name: 'Vacant', value: 33, color: '#e5e7eb' }
];

const monthlyRentData = [
  { month: 'Jan', collected: 850000, pending: 150000 },
  { month: 'Feb', collected: 920000, pending: 80000 },
  { month: 'Mar', collected: 780000, pending: 220000 },
  { month: 'Apr', collected: 950000, pending: 50000 },
  { month: 'May', collected: 880000, pending: 120000 },
  { month: 'Jun', collected: 1020000, pending: 30000 }
];



const pendingPaymentsData = [
  { range: '0-15 days', count: 12 },
  { range: '15-30 days', count: 8 },
  { range: '30+ days', count: 3 }
];

const tenantDistributionData = [
  { type: 'Commercial', value: 65, color: '#10b981' },
  { type: 'Residential', value: 35, color: '#f59e0b' }
];



export function OccupancyChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Occupancy Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={occupancyData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              dataKey="value"
            >
              {occupancyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {occupancyData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{item.name}: {item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlyRentChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Monthly Rent Collection</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyRentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `₹${value/1000}K`} />
            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
            <Line type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2} name="Collected" />
            <Line type="monotone" dataKey="pending" stroke="#ef4444" strokeWidth={2} name="Pending" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueByPropertyChart({ data }: { data: { property: string; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>💰 Revenue by Property</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="property" />
            <YAxis tickFormatter={(value) => `₹${value/1000}K`} />
            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PendingPaymentsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🧾 Pending Payments Status</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={pendingPaymentsData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="range" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="count" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TenantDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🧍♂️ Tenant Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={tenantDistributionData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
            >
              {tenantDistributionData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {tenantDistributionData.map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm">{item.type}: {item.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueByTenantsChart({ data }: { data: { tenant: string; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>👥 Revenue by Tenants</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 35)}>
          <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `₹${value/1000}K`} />
            <YAxis dataKey="tenant" type="category" width={200} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueByCompaniesChart({ data }: { data: { company: string; revenue: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>🏢 Revenue by Companies</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="company" />
            <YAxis tickFormatter={(value) => `₹${value/1000}K`} />
            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}