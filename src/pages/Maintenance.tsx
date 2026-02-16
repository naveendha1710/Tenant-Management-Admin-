import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Plus, 
  Filter, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  User,
  Calendar,
  Building2
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const maintenanceTickets = [
  {
    id: "MNT001",
    title: "AC not working in Room A2-201",
    description: "Air conditioning unit stopped working, room temperature too high",
    tenant: "TechStart Solutions",
    building: "Building A",
    location: "A2-201",
    priority: "High",
    status: "In Progress",
    created: "2024-02-08",
    assignedTo: "Maintenance Team A",
    estimatedCost: 5000,
    category: "HVAC"
  },
  {
    id: "MNT002", 
    title: "Internet connectivity issues",
    description: "Slow internet speed, frequent disconnections in Building B",
    tenant: "CloudTech Systems",
    building: "Building B",
    location: "B2-205",
    priority: "Medium",
    status: "Pending",
    created: "2024-02-07",
    assignedTo: "Network Team",
    estimatedCost: 2000,
    category: "Network"
  },
  {
    id: "MNT003",
    title: "Water leakage in washroom",
    description: "Ceiling water leakage in floor 1 washroom area",
    tenant: "Common Area",
    building: "Building C",
    location: "C1-Washroom",
    priority: "High",
    status: "Resolved",
    created: "2024-02-05",
    assignedTo: "Plumbing Team",
    estimatedCost: 8000,
    category: "Plumbing"
  },
  {
    id: "MNT004",
    title: "Elevator maintenance required",
    description: "Elevator making unusual sounds, needs inspection",
    tenant: "Common Area",
    building: "Building A",
    location: "A-Elevator-1",
    priority: "Medium",
    status: "Scheduled",
    created: "2024-02-06",
    assignedTo: "Elevator Service Co.",
    estimatedCost: 15000,
    category: "Elevator"
  },
  {
    id: "MNT005",
    title: "Broken window glass",
    description: "Window glass cracked in meeting room, needs replacement",
    tenant: "Innovate Labs",
    building: "Building B",
    location: "B1-Meeting Room",
    priority: "Low",
    status: "Pending",
    created: "2024-02-04",
    assignedTo: "Glass & Glazing Team",
    estimatedCost: 3000,
    category: "General"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "In Progress":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Scheduled":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Resolved":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-800 border-red-200";
    case "Medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Low":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "In Progress":
      return <Wrench className="h-4 w-4 text-blue-500" />;
    case "Scheduled":
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case "Resolved":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  }
};

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredTickets = maintenanceTickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.building.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || ticket.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      title: "Total Tickets",
      value: maintenanceTickets.length.toString(),
      icon: Wrench,
      color: "text-blue-600"
    },
    {
      title: "Pending",
      value: maintenanceTickets.filter(t => t.status === "Pending").length.toString(),
      icon: Clock,
      color: "text-yellow-600"
    },
    {
      title: "In Progress",
      value: maintenanceTickets.filter(t => t.status === "In Progress").length.toString(),
      icon: Wrench,
      color: "text-blue-600"
    },
    {
      title: "Resolved",
      value: maintenanceTickets.filter(t => t.status === "Resolved").length.toString(),
      icon: CheckCircle,
      color: "text-green-600"
    }
  ];

  const totalCost = maintenanceTickets.reduce((sum, ticket) => sum + ticket.estimatedCost, 0);

  return (
    <DashboardLayout 
      title="Maintenance Management" 
      subtitle="Track and manage maintenance requests and tickets"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
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
              </CardContent>
            </Card>
          ))}
          
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cost
              </CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{totalCost.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Maintenance Tickets</CardTitle>
                <CardDescription>Manage all maintenance requests and work orders</CardDescription>
              </div>
              <Button className="bg-primary hover:bg-primary-hover">
                <Plus className="mr-2 h-4 w-4" />
                Create Ticket
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="tickets">
              <TabsList>
                <TabsTrigger value="tickets">All Tickets</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="tickets" className="space-y-4">
                {/* Search and Filters */}
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" />
                      More Filters
                    </Button>
                  </div>
                </div>

                {/* Tickets Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Tenant</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Est. Cost</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.id}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{ticket.title}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-xs">
                                {ticket.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm">{ticket.building}</div>
                                <div className="text-sm text-muted-foreground">{ticket.location}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{ticket.tenant}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(ticket.status)}
                              <Badge className={getStatusColor(ticket.status)}>
                                {ticket.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{ticket.assignedTo}</div>
                          </TableCell>
                          <TableCell>₹{ticket.estimatedCost.toLocaleString()}</TableCell>
                          <TableCell>{new Date(ticket.created).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="schedule">
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Maintenance Schedule</h3>
                  <p className="text-muted-foreground">
                    Scheduled maintenance calendar view coming soon
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="reports">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Category Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(
                          maintenanceTickets.reduce((acc, ticket) => {
                            acc[ticket.category] = (acc[ticket.category] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([category, count]) => (
                          <div key={category} className="flex justify-between">
                            <span className="text-sm">{category}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Cost Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Total Cost</span>
                          <span className="font-medium">₹{totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Average Cost</span>
                          <span className="font-medium">₹{Math.round(totalCost / maintenanceTickets.length).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Highest Cost</span>
                          <span className="font-medium">₹{Math.max(...maintenanceTickets.map(t => t.estimatedCost)).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardHeader>
                      <CardTitle className="text-lg">Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Response</span>
                          <span className="font-medium">4.2 hrs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Resolution</span>
                          <span className="font-medium">2.1 days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">SLA Compliance</span>
                          <span className="font-medium text-green-600">94%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}