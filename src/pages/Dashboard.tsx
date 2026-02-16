import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import heroCampus from "@/assets/hero-campus.jpg";
import coworkingSpace from "@/assets/coworking-space.jpg";

const stats = [
  {
    title: "Total Tenants",
    value: "124",
    change: "+12%",
    trend: "up",
    icon: Users,
    color: "text-blue-600"
  },
  {
    title: "Occupancy Rate",
    value: "87%",
    change: "+5%",
    trend: "up",
    icon: Building2,
    color: "text-green-600"
  },
  {
    title: "Monthly Revenue",
    value: "₹12.4L",
    change: "+8%",
    trend: "up",
    icon: DollarSign,
    color: "text-emerald-600"
  },
  {
    title: "Pending Issues",
    value: "7",
    change: "-3",
    trend: "down",
    icon: AlertTriangle,
    color: "text-orange-600"
  }
];

const recentActivities = [
  {
    id: 1,
    type: "tenant",
    title: "New tenant registration",
    description: "TechStart Solutions registered for Building A - Floor 2",
    time: "2 hours ago",
    status: "success"
  },
  {
    id: 2,
    type: "payment",
    title: "Payment received",
    description: "₹45,000 from Innovate Labs for Q1 2024",
    time: "4 hours ago",
    status: "success"
  },
  {
    id: 3,
    type: "maintenance",
    title: "Maintenance request",
    description: "AC repair needed in Building B - Room 304",
    time: "6 hours ago",
    status: "pending"
  },
  {
    id: 4,
    type: "document",
    title: "Document expiry alert",
    description: "GST certificate expires in 15 days for 3 tenants",
    time: "1 day ago",
    status: "warning"
  }
];

const upcomingTasks = [
  {
    id: 1,
    title: "Review lease renewal applications",
    due: "Today",
    priority: "high"
  },
  {
    id: 2,
    title: "Conduct building inspection",
    due: "Tomorrow",
    priority: "medium"
  },
  {
    id: 3,
    title: "Generate monthly reports",
    due: "3 days",
    priority: "low"
  }
];

export default function Dashboard() {
  return (
    <DashboardLayout 
      title="Dashboard Overview" 
      subtitle="Welcome back! Here's what's happening at Rathinam Tech Park"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Section */}
        <div className="relative rounded-xl overflow-hidden bg-gradient-primary">
          <div className="absolute inset-0">
            <img 
              src={heroCampus} 
              alt="Rathinam College Tech Park" 
              className="w-full h-full object-cover opacity-20"
            />
          </div>
          <div className="relative p-8 text-white">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold mb-2">Rathinam Tech Park</h1>
              <p className="text-lg opacity-90 mb-6">
                Managing 450+ seats across 12 buildings with 124 active tenants
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button variant="outline" size="lg" className="text-white border-white hover:bg-white hover:text-primary">
                  View Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>
                    {stat.change}
                  </span>
                  <span>from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Activities */}
          <Card className="lg:col-span-2 shadow-card">
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Latest updates from your tenant management system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 rounded-lg border border-border/50">
                  <div className="flex-shrink-0">
                    {activity.status === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {activity.status === "pending" && (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    {activity.status === "warning" && (
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-medium">{activity.title}</h4>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activity.time}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sidebar Content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Upcoming Tasks */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Upcoming Tasks</CardTitle>
                <CardDescription>Things that need your attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div className="flex-grow">
                      <h4 className="text-sm font-medium">{task.title}</h4>
                      <p className="text-xs text-muted-foreground">Due: {task.due}</p>
                    </div>
                    <Badge 
                      variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Occupancy Overview */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Space Utilization</CardTitle>
                <CardDescription>Current occupancy across buildings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <img 
                    src={coworkingSpace} 
                    alt="Co-working space" 
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">87%</div>
                      <div className="text-sm">Occupied</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Building A</span>
                    <span>92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>Building B</span>
                    <span>84%</span>
                  </div>
                  <Progress value={84} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span>Building C</span>
                    <span>76%</span>
                  </div>
                  <Progress value={76} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}