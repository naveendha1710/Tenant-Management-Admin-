import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar,
  FileText,
  AlertTriangle,
  Download,
  Filter
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import analyticsIllustration from "@/assets/analytics-illustration.jpg";

const revenueData = [
  { month: "Jan", revenue: 890000, tenants: 118, occupancy: 82 },
  { month: "Feb", revenue: 950000, tenants: 122, occupancy: 85 },
  { month: "Mar", revenue: 1020000, tenants: 125, occupancy: 87 },
  { month: "Apr", revenue: 1150000, tenants: 128, occupancy: 89 },
  { month: "May", revenue: 1240000, tenants: 124, occupancy: 87 },
  { month: "Jun", revenue: 1180000, tenants: 120, occupancy: 84 }
];

const buildingPerformance = [
  { building: "Building A", occupancy: 92, revenue: 485000, growth: 8.5 },
  { building: "Building B", revenue: 425000, occupancy: 84, growth: -2.1 },
  { building: "Building C", revenue: 315000, occupancy: 76, growth: 12.3 }
];

const topTenants = [
  { name: "TechStart Solutions", revenue: 45000, spaces: 12, growth: 5.2 },
  { name: "StartUp Hub", revenue: 55000, spaces: 15, growth: 12.8 },
  { name: "Innovate Labs", revenue: 32000, spaces: 8, growth: -1.5 },
  { name: "CloudTech Systems", revenue: 40000, spaces: 10, growth: 8.7 },
  { name: "Digital Dynamics", revenue: 25000, spaces: 6, growth: 3.2 }
];

const upcomingRenewals = [
  { tenant: "Digital Dynamics", expires: "2024-03-01", value: 300000, risk: "high" },
  { tenant: "Innovate Labs", expires: "2024-05-31", value: 384000, risk: "low" },
  { tenant: "CloudTech Systems", expires: "2024-08-15", value: 480000, risk: "medium" },
  { tenant: "StartUp Hub", expires: "2025-01-31", value: 660000, risk: "low" }
];

const getRiskColor = (risk: string) => {
  switch (risk) {
    case "high":
      return "bg-red-100 text-red-800 border-red-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Analytics() {
  const currentMonth = revenueData[revenueData.length - 1];
  const previousMonth = revenueData[revenueData.length - 2];
  const revenueGrowth = ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue * 100).toFixed(1);
  const occupancyGrowth = (currentMonth.occupancy - previousMonth.occupancy);

  return (
    <DashboardLayout 
      title="Analytics & Reports" 
      subtitle="Insights into performance, revenue, and occupancy trends"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Analytics Card */}
        <Card className="shadow-card bg-gradient-primary text-white overflow-hidden">
          <div className="absolute right-0 top-0 opacity-20">
            <img 
              src={analyticsIllustration} 
              alt="Analytics illustration" 
              className="w-80 h-full object-cover"
            />
          </div>
          <CardHeader className="relative">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl text-white">Performance Overview</CardTitle>
                <CardDescription className="text-white/80">
                  June 2024 • Rathinam Tech Park Analytics
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
                <Button variant="outline" className="text-white border-white hover:bg-white hover:text-primary">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <div className="text-3xl font-bold">₹{(currentMonth.revenue / 100000).toFixed(1)}L</div>
                <div className="text-white/80">Monthly Revenue</div>
                <div className="flex items-center gap-1 text-green-200">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-sm">+{revenueGrowth}%</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold">{currentMonth.occupancy}%</div>
                <div className="text-white/80">Occupancy Rate</div>
                <div className="flex items-center gap-1 text-green-200">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-sm">+{occupancyGrowth}%</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold">{currentMonth.tenants}</div>
                <div className="text-white/80">Active Tenants</div>
                <div className="flex items-center gap-1 text-green-200">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-sm">+{currentMonth.tenants - previousMonth.tenants}</span>
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold">₹{((currentMonth.revenue / currentMonth.tenants) / 1000).toFixed(0)}K</div>
                <div className="text-white/80">Avg Revenue/Tenant</div>
                <div className="flex items-center gap-1 text-green-200">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-sm">+5.2%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Tabs */}
        <Tabs defaultValue="revenue" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
            <TabsTrigger value="occupancy">Occupancy Trends</TabsTrigger>
            <TabsTrigger value="performance">Building Performance</TabsTrigger>
            <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Revenue Trend */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Revenue Trend (6 Months)
                  </CardTitle>
                  <CardDescription>Monthly revenue performance and growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueData.map((data, index) => (
                      <div key={data.month} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 text-sm font-medium">{data.month}</div>
                          <div className="flex-1">
                            <Progress 
                              value={(data.revenue / 1400000) * 100} 
                              className="h-2" 
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{(data.revenue / 100000).toFixed(1)}L</div>
                          {index > 0 && (
                            <div className={`text-xs flex items-center gap-1 ${
                              data.revenue > revenueData[index-1].revenue ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {data.revenue > revenueData[index-1].revenue ? 
                                <TrendingUp className="h-3 w-3" /> : 
                                <TrendingDown className="h-3 w-3" />
                              }
                              {(((data.revenue - revenueData[index-1].revenue) / revenueData[index-1].revenue) * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Tenants */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Top Revenue Contributors
                  </CardTitle>
                  <CardDescription>Highest revenue generating tenants</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topTenants.map((tenant, index) => (
                      <div key={tenant.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{tenant.name}</div>
                            <div className="text-sm text-muted-foreground">{tenant.spaces} spaces</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{tenant.revenue.toLocaleString()}</div>
                          <div className={`text-xs flex items-center gap-1 ${
                            tenant.growth > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tenant.growth > 0 ? 
                              <TrendingUp className="h-3 w-3" /> : 
                              <TrendingDown className="h-3 w-3" />
                            }
                            {Math.abs(tenant.growth)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="occupancy" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {buildingPerformance.map((building) => (
                <Card key={building.building} className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {building.building}
                    </CardTitle>
                    <CardDescription>Occupancy and performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Occupancy Rate</span>
                        <span className="font-medium">{building.occupancy}%</span>
                      </div>
                      <Progress value={building.occupancy} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted">
                        <div className="text-lg font-bold">₹{(building.revenue / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-muted-foreground">Monthly Revenue</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted">
                        <div className={`text-lg font-bold flex items-center justify-center gap-1 ${
                          building.growth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {building.growth > 0 ? 
                            <TrendingUp className="h-4 w-4" /> : 
                            <TrendingDown className="h-4 w-4" />
                          }
                          {Math.abs(building.growth)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Growth Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 sm:space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Building Performance Comparison
                </CardTitle>
                <CardDescription>Detailed performance metrics across all buildings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 sm:space-y-6">
                  {buildingPerformance.map((building) => (
                    <div key={building.building} className="p-4 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{building.building}</h3>
                        <Badge className={building.growth > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {building.growth > 0 ? '+' : ''}{building.growth}% Growth
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Occupancy Rate</div>
                          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{building.occupancy}%</div>
                          <Progress value={building.occupancy} className="mt-2 h-2" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{(building.revenue / 100000).toFixed(1)}L</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Revenue/SqFt</div>
                          <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{Math.round(building.revenue / 1000)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecasting" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Lease Renewals */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Upcoming Lease Renewals
                  </CardTitle>
                  <CardDescription>Tenants with expiring leases in next 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingRenewals.map((renewal) => (
                      <div key={renewal.tenant} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div>
                          <div className="font-medium">{renewal.tenant}</div>
                          <div className="text-sm text-muted-foreground">
                            Expires: {new Date(renewal.expires).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{(renewal.value / 100000).toFixed(1)}L</div>
                          <Badge className={getRiskColor(renewal.risk)}>
                            {renewal.risk} risk
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Forecast */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Revenue Forecast
                  </CardTitle>
                  <CardDescription>Projected revenue for next 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Optimistic Scenario</span>
                      </div>
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-800">₹15.2L</div>
                      <div className="text-sm text-green-600">+22% growth projected</div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Realistic Scenario</span>
                      </div>
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-800">₹13.8L</div>
                      <div className="text-sm text-blue-600">+12% growth projected</div>
                    </div>

                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium text-yellow-800">Conservative Scenario</span>
                      </div>
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-800">₹12.1L</div>
                      <div className="text-sm text-yellow-600">-2% decline projected</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}