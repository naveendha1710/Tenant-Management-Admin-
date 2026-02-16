import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, PieChart, BarChart3, Activity, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const mockReportsData = {
  spaceUtilization: {
    totalSqft: 500,
    occupiedDesks: 8,
    totalDesks: 10,
    utilizationRate: 80
  },
  paymentAnalytics: {
    monthlyTrends: [
      { month: 'Jan', amount: 25000 },
      { month: 'Feb', amount: 25000 },
      { month: 'Mar', amount: 25000 },
      { month: 'Apr', amount: 25000 },
      { month: 'May', amount: 25000 },
      { month: 'Jun', amount: 25000 }
    ],
    invoiceStatus: [
      { status: 'Paid', count: 5, amount: 125000 },
      { status: 'Pending', count: 1, amount: 25000 }
    ]
  },
  maintenanceStats: [
    { status: 'Resolved', count: 8, color: '#22c55e' },
    { status: 'Pending', count: 2, color: '#f59e0b' },
    { status: 'In Progress', count: 1, color: '#3b82f6' }
  ],
  compliance: {
    leaseAgreement: { status: 'Valid', progress: 85, daysRemaining: 180 },
    insurance: { status: 'Valid', progress: 95, daysRemaining: 45 },
    fireCompliance: { status: 'Expiring Soon', progress: 15, daysRemaining: 15 }
  }
};

export default function ReportsPage() {
  const [data, setData] = useState(mockReportsData);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // In demo mode, use mock data
    setData(mockReportsData);
  }, []);

  const handleDownloadReport = async () => {
    const input = reportRef.current;
    if (input) {
      try {
        // Dynamic import for html2canvas
        const html2canvas = (await import('html2canvas')).default;
        
        const canvas = await html2canvas(input, {
          scale: 2,
          useCORS: true,
          allowTaint: true
        });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('Tenant_Report.pdf');
        
        toast({ title: "Success", description: "Report downloaded successfully" });
      } catch (error) {
        console.error('PDF generation error:', error);
        toast({ title: "Error", description: "Failed to generate PDF. Please try again.", variant: "destructive" });
      }
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <DashboardLayout title="Tenant Reports" subtitle="Comprehensive analytics and insights for your account">
      <div className="space-y-4 sm:space-y-6">
        {/* Header with Download Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">Analytics Dashboard</h2>
            <p className="text-muted-foreground">Data-driven insights for your tenancy</p>
          </div>
          <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>

        {/* Reports Grid */}
        <div ref={reportRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Space Utilization Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Space Utilization
              </CardTitle>
              <CardDescription>Desk occupancy and space allocation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{data.spaceUtilization.totalSqft}</p>
                    <p className="text-sm text-muted-foreground">Total Sq Ft</p>
                  </div>
                  <div>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{data.spaceUtilization.utilizationRate}%</p>
                    <p className="text-sm text-muted-foreground">Utilization</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Occupied', value: data.spaceUtilization.occupiedDesks },
                        { name: 'Available', value: data.spaceUtilization.totalDesks - data.spaceUtilization.occupiedDesks }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {[
                        { name: 'Occupied', value: data.spaceUtilization.occupiedDesks },
                        { name: 'Available', value: data.spaceUtilization.totalDesks - data.spaceUtilization.occupiedDesks }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Occupied ({data.spaceUtilization.occupiedDesks})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Available ({data.spaceUtilization.totalDesks - data.spaceUtilization.occupiedDesks})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Analytics Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Payment Analytics
              </CardTitle>
              <CardDescription>Monthly payment trends and invoice status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={data.paymentAnalytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {data.paymentAnalytics.invoiceStatus.map((item, index) => (
                    <div key={index} className="text-center p-3 border rounded-lg">
                      <p className="text-lg font-bold">{item.count}</p>
                      <p className="text-sm text-muted-foreground">{item.status}</p>
                      <p className="text-xs">₹{item.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Statistics Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Maintenance Statistics
              </CardTitle>
              <CardDescription>Breakdown of maintenance tickets by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={data.maintenanceStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {data.maintenanceStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.maintenanceStats.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm">{item.status}</span>
                      </div>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Tracking Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Compliance Tracking
              </CardTitle>
              <CardDescription>Document validity and compliance status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Lease Agreement</span>
                      <Badge variant={data.compliance.leaseAgreement.status === 'Valid' ? 'default' : 'destructive'}>
                        {data.compliance.leaseAgreement.status}
                      </Badge>
                    </div>
                    <Progress value={data.compliance.leaseAgreement.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.compliance.leaseAgreement.daysRemaining} days remaining
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Insurance Certificate</span>
                      <Badge variant={data.compliance.insurance.status === 'Valid' ? 'default' : 'destructive'}>
                        {data.compliance.insurance.status}
                      </Badge>
                    </div>
                    <Progress value={data.compliance.insurance.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.compliance.insurance.daysRemaining} days remaining
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Fire Safety Compliance</span>
                      <Badge variant={data.compliance.fireCompliance.status === 'Valid' ? 'default' : 'destructive'}>
                        {data.compliance.fireCompliance.status}
                      </Badge>
                    </div>
                    <Progress value={data.compliance.fireCompliance.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.compliance.fireCompliance.daysRemaining} days remaining
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}