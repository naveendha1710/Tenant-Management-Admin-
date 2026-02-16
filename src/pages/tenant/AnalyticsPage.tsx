
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  FileText, 
  Wrench,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface TenantAnalyticsProps {
  data: {
    monthlySpend: number;
    yearlySpend: number;
    paymentHistory: Array<{
      month: string;
      amount: number;
      status: string;
    }>;
    maintenanceStats: {
      totalTickets: number;
      resolvedTickets: number;
      avgResolutionTime: number;
    };
    documentCompliance: {
      total: number;
      verified: number;
      expiring: number;
    };
    spaceUtilization: {
      allocatedSeats: number;
      occupiedSeats: number;
      utilizationRate: number;
    };
  };
}

export function TenantAnalytics({ data }: TenantAnalyticsProps) {
  const {
    monthlySpend,
    yearlySpend,
    paymentHistory,
    maintenanceStats,
    documentCompliance,
    spaceUtilization
  } = data;

  const paymentTrend = paymentHistory.length >= 2 
    ? paymentHistory[paymentHistory.length - 1].amount - paymentHistory[paymentHistory.length - 2].amount
    : 0;

  const complianceRate = (documentCompliance.verified / documentCompliance.total) * 100;
  const maintenanceResolutionRate = (maintenanceStats.resolvedTickets / maintenanceStats.totalTickets) * 100;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{monthlySpend.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {paymentTrend >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={paymentTrend >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(paymentTrend).toLocaleString()} from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yearly Spend</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{yearlySpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ₹{Math.round(yearlySpend / 12).toLocaleString()}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Space Utilization</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{spaceUtilization.utilizationRate}%</div>
            <div className="text-xs text-muted-foreground">
              {spaceUtilization.occupiedSeats}/{spaceUtilization.allocatedSeats} seats occupied
            </div>
            <Progress value={spaceUtilization.utilizationRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{Math.round(complianceRate)}%</div>
            <div className="text-xs text-muted-foreground">
              {documentCompliance.verified}/{documentCompliance.total} documents verified
            </div>
            <Progress value={complianceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Last 6 months payment trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentHistory.slice(-6).map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.month}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{payment.amount.toLocaleString()}
                    </p>
                  </div>
                  <Badge 
                    className={
                      payment.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : payment.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {payment.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Overview</CardTitle>
            <CardDescription>Service request statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">
                    {maintenanceStats.totalTickets}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Tickets</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                    {maintenanceStats.resolvedTickets}
                  </div>
                  <div className="text-sm text-muted-foreground">Resolved</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Resolution Rate</span>
                  <span className="font-medium">{Math.round(maintenanceResolutionRate)}%</span>
                </div>
                <Progress value={maintenanceResolutionRate} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Avg Resolution Time</span>
                </div>
                <span className="font-medium">{maintenanceStats.avgResolutionTime} hours</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Document Compliance Status</CardTitle>
          <CardDescription>Track your document verification and expiry status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{documentCompliance.verified}</p>
                <p className="text-sm text-muted-foreground">Verified Documents</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{documentCompliance.expiring}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{documentCompliance.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Overall Compliance</span>
              <span className="font-medium">{Math.round(complianceRate)}%</span>
            </div>
            <Progress value={complianceRate} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Space Utilization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Space Utilization Insights</CardTitle>
          <CardDescription>Optimize your workspace efficiency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Current Allocation</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Allocated Seats</span>
                  <span className="font-medium">{spaceUtilization.allocatedSeats}</span>
                </div>
                <div className="flex justify-between">
                  <span>Occupied Seats</span>
                  <span className="font-medium">{spaceUtilization.occupiedSeats}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Seats</span>
                  <span className="font-medium">
                    {spaceUtilization.allocatedSeats - spaceUtilization.occupiedSeats}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Utilization Metrics</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Peak Utilization</span>
                    <span>95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Utilization</span>
                    <span>{spaceUtilization.utilizationRate}%</span>
                  </div>
                  <Progress value={spaceUtilization.utilizationRate} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Off-peak Utilization</span>
                    <span>45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const mockTenantData = {
    id: '1',
    tenant_id: 'TNT-001',
    company_name: 'TechStart Solutions',
    email: 'contact@techstart.com',
    phone: '+91 9876543210',
    monthly_rent: 25000,
    lease_start_date: '2024-01-01',
    lease_end_date: '2024-12-31',
    status: 'active',
    space: {
      name: 'Office Suite 201',
      area: 500,
      floor: 2,
      building: 'Building A'
    }
  };

  const mockTickets = [
    {
      id: '1',
      ticket_number: 'TKT-001',
      title: 'AC not working in office',
      description: 'The air conditioning unit is not cooling properly',
      priority: 'high',
      status: 'in_progress',
      created_at: '2024-01-20',
      updated_at: '2024-01-21',
      attachments: ['ac-photo.jpg'],
      comments: [
        {
          id: '1',
          message: 'Technician assigned, will visit tomorrow',
          created_at: '2024-01-21',
          author: 'Maintenance Team'
        }
      ]
    },
    {
      id: '2',
      ticket_number: 'TKT-002',
      title: 'Internet connectivity issues',
      description: 'Slow internet speed affecting work',
      priority: 'medium',
      status: 'resolved',
      created_at: '2024-01-18',
      updated_at: '2024-01-19',
      attachments: [],
      comments: []
    }
  ];

  const mockDocuments = [
    {
      id: '1',
      document_type: 'gst_certificate',
      document_name: 'GST Certificate 2024',
      expiry_date: '2024-12-31',
      status: 'verified',
      uploaded_date: '2024-01-15',
      file_url: '/documents/gst-cert.pdf'
    },
    {
      id: '2',
      document_type: 'pan_card',
      document_name: 'PAN Card',
      expiry_date: null,
      status: 'verified',
      uploaded_date: '2024-01-15',
      file_url: '/documents/pan-card.pdf'
    },
    {
      id: '3',
      document_type: 'id_proof',
      document_name: 'Company Registration Certificate',
      expiry_date: '2024-06-30',
      status: 'expiring_soon',
      uploaded_date: '2024-01-15',
      file_url: '/documents/company-reg.pdf'
    }
  ];

export default function AnalyticsPage() {
    const analyticsData = {
        monthlySpend: mockTenantData.monthly_rent + 4500,
        yearlySpend: (mockTenantData.monthly_rent + 4500) * 12,
        paymentHistory: [
          { month: 'Jan 2024', amount: 29500, status: 'paid' },
          { month: 'Feb 2024', amount: 29500, status: 'paid' },
          { month: 'Mar 2024', amount: 29500, status: 'pending' },
          { month: 'Apr 2024', amount: 32000, status: 'pending' }
        ],
        maintenanceStats: {
          totalTickets: mockTickets.length,
          resolvedTickets: mockTickets.filter(t => t.status === 'resolved').length,
          avgResolutionTime: 24
        },
        documentCompliance: {
          total: mockDocuments.length,
          verified: mockDocuments.filter(d => d.status === 'verified').length,
          expiring: mockDocuments.filter(d => d.status === 'expiring_soon').length
        },
        spaceUtilization: {
          allocatedSeats: 12,
          occupiedSeats: 10,
          utilizationRate: 83
        }
      };

  return (
    <DashboardLayout title="Tenant Analytics" subtitle="Detailed insights into your tenancy">
      <TenantAnalytics data={analyticsData} />
    </DashboardLayout>
  );
}
