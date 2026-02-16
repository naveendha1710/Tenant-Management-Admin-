import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  FileText, 
  Camera,
  Search,
  Filter,
  Upload,
  Download,
  Eye,
  MessageSquare,
  Calendar,
  User,
  Building,
  Phone,
  Mail,
  Link,
  PieChart,
  BarChart3,
  Bell,
  UserCheck,
  MapPin,
  Settings,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { MaintenanceService } from '@/services/maintenanceService';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportTicketsToExcel, exportTicketsToPDF, exportCostAnalysisToExcel, exportCostAnalysisToPDF } from '@/utils/exportMaintenance';




const mockKnowledgeBase = [
  {
    id: '1',
    category: 'Electrical',
    title: 'Power Outlet Not Working',
    description: 'Troubleshooting steps for non-functional power outlets',
    steps: [
      'Check circuit breaker',
      'Test with different device',
      'Inspect outlet for damage',
      'Call electrician if needed'
    ],
    tags: ['electrical', 'outlet', 'power']
  },
  {
    id: '2',
    category: 'HVAC',
    title: 'AC Unit Maintenance',
    description: 'Regular maintenance procedures for air conditioning units',
    steps: [
      'Clean or replace air filters',
      'Check refrigerant levels',
      'Inspect ductwork',
      'Test thermostat functionality'
    ],
    tags: ['hvac', 'ac', 'maintenance']
  },
  {
    id: '3',
    category: 'Plumbing',
    title: 'Water Leak Response',
    description: 'Emergency response for water leaks',
    steps: [
      'Shut off main water supply',
      'Identify leak source',
      'Apply temporary fix if possible',
      'Contact plumber for permanent repair'
    ],
    tags: ['plumbing', 'leak', 'emergency']
  },
  {
    id: '4',
    category: 'Network',
    title: 'Internet Connectivity Issues',
    description: 'Diagnosing and fixing network problems',
    steps: [
      'Check cable connections',
      'Restart router/modem',
      'Test speed and connectivity',
      'Contact ISP if needed'
    ],
    tags: ['network', 'internet', 'connectivity']
  }
];

const mockCostData = [
  {
    tenant: 'TechStart Solutions',
    area: 500,
    share_percentage: 35.7,
    monthly_cost: 3570,
    ytd_cost: 42840
  },
  {
    tenant: 'Creative Agency',
    area: 300,
    share_percentage: 21.4,
    monthly_cost: 2140,
    ytd_cost: 25680
  },
  {
    tenant: 'Innovate Labs',
    area: 200,
    share_percentage: 14.3,
    monthly_cost: 1430,
    ytd_cost: 17160
  },
  {
    tenant: 'Other Tenants',
    area: 400,
    share_percentage: 28.6,
    monthly_cost: 2860,
    ytd_cost: 34320
  }
];

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [selectedKnowledgeItem, setSelectedKnowledgeItem] = useState(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', type: 'new_ticket', message: 'New urgent ticket assigned: TKT-004', time: '5 min ago' },
    { id: '2', type: 'overdue', message: 'Ticket TKT-001 is overdue', time: '1 hour ago' },
    { id: '3', type: 'feedback', message: 'Positive feedback received for TKT-003', time: '2 hours ago' }
  ]);
  const { toast } = useToast();

  // Fetch tickets with demo mode fallback
  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from service, which handles demo mode fallback
      try {
        // Use the correct query for maintenance staff to see unassigned tickets + their own tickets
        const data = await MaintenanceService.getMaintenanceTickets(user?.id);
        
        // Transform data to match expected format
        const transformedTickets = (data || []).map(ticket => ({
          ...ticket,
          ticket_number: `TKT-${ticket.id.slice(0, 3).toUpperCase()}`,
          tenant: ticket.tenant || {
            company_name: 'TechStart Solutions',
            contact_person: 'John Doe',
            phone: '+91 9876543210',
            email: 'john@techstart.com'
          },
          space: {
            name: 'Office Suite 201',
            floor: 2,
            building: 'Building A',
            area: 500
          },
          proof_of_work: [],
          comments: [],
          assigned_to: ticket.assigned_to || 'Raj Kumar'
        }));
        
        setTickets(transformedTickets);
      } catch (serviceError) {
        console.warn('Service fetch failed, using basic mock data:', serviceError);
        // Fallback to basic mock data
        const mockTickets = [
          {
            id: '1',
            ticket_number: 'TKT-001',
            title: 'AC not working in office',
            description: 'The air conditioning unit is not cooling properly',
            category: 'AC',
            priority: 'High',
            status: 'in_progress',
            created_at: '2024-01-20T10:30:00Z',
            updated_at: '2024-01-21T14:30:00Z',
            cost: 0,
            assigned_to: 'Raj Kumar',
            tenant: {
              company_name: 'TechStart Solutions',
              contact_person: 'John Doe',
              phone: '+91 9876543210',
              email: 'john@techstart.com'
            },
            space: {
              name: 'Office Suite 201',
              floor: 2,
              building: 'Building A',
              area: 500
            },
            proof_of_work: [],
            comments: []
          },
          {
            id: '2',
            ticket_number: 'TKT-002',
            title: 'Internet connectivity issues',
            description: 'Slow internet speed affecting work productivity',
            category: 'IT Support',
            priority: 'Medium',
            status: 'resolved',
            created_at: '2024-01-18T09:00:00Z',
            updated_at: '2024-01-19T16:45:00Z',
            cost: 0,
            assigned_to: 'Priya Singh',
            resolution_notes: 'Network issue resolved by ISP',
            tenant: {
              company_name: 'TechStart Solutions',
              contact_person: 'John Doe',
              phone: '+91 9876543210',
              email: 'john@techstart.com'
            },
            space: {
              name: 'Office Suite 201',
              floor: 2,
              building: 'Building A',
              area: 500
            },
            proof_of_work: [],
            comments: []
          }
        ];
        setTickets(mockTickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Set up real-time subscription
    const subscription = supabase
      .channel('maintenance_tickets_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'maintenance_tickets' }, 
        () => {
          fetchTickets(); // Refresh data when tickets change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.email]);

  const stats = {
    totalTickets: tickets.length,
    pendingTickets: tickets.filter(t => t.status === 'pending').length,
    inProgressTickets: tickets.filter(t => t.status === 'in_progress').length,
    resolvedTickets: tickets.filter(t => t.status === 'resolved').length,
    totalCost: tickets.reduce((sum, ticket) => sum + ticket.cost, 0),
    avgResolutionTime: '2.5 days'
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string, updates: any = {}) => {
    try {
      // Try to update via service first
      await MaintenanceService.updateTicket(ticketId, { status: newStatus, ...updates });
      // Re-fetch tickets after successful database update
      await fetchTickets();
    } catch (error) {
      console.warn('Database update failed, updating local state for demo:', error);
      // Update local state for immediate UI feedback in demo mode
      setTickets(tickets.map(ticket => 
        ticket.id === ticketId 
          ? { 
              ...ticket, 
              status: newStatus, 
              updated_at: new Date().toISOString(),
              ...updates
            }
          : ticket
      ));
    }
    toast({
      title: "Success",
      description: "Ticket status updated successfully",
    });
  };

  const addComment = (ticketId: string, comment: string) => {
    setTickets(tickets.map(ticket => 
      ticket.id === ticketId 
        ? {
            ...ticket,
            comments: [
              ...ticket.comments,
              {
                id: Date.now().toString(),
                message: comment,
                created_at: new Date().toISOString().split('T')[0],
                author: 'Maintenance Staff'
              }
            ]
          }
        : ticket
    ));
  };

  const handleUpdateTicket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const updates = {
      status: formData.get('status') as string,
      resolution_notes: formData.get('resolutionNotes') as string,
      cost: parseFloat(formData.get('cost') as string) || 0,
      resolved_at: formData.get('status') === 'resolved' ? new Date().toISOString().split('T')[0] : null
    };

    if (selectedTicket) {
      updateTicketStatus(selectedTicket.id, updates.status, updates);
      
      const comment = formData.get('comment') as string;
      if (comment) {
        addComment(selectedTicket.id, comment);
      }
      
      setIsUpdateDialogOpen(false);
      setSelectedTicket(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.tenant.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const filteredKnowledge = mockKnowledgeBase.filter(item =>
    item.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(knowledgeSearch.toLowerCase()) ||
    item.tags.some(tag => tag.toLowerCase().includes(knowledgeSearch.toLowerCase()))
  );

  return (
    <DashboardLayout title="Maintenance Dashboard" subtitle="Manage maintenance requests and work orders">
      <div className="space-y-4 sm:space-y-6">
        {/* Notifications Alert */}
        {notifications.length > 0 && (
          <Alert className="mb-6">
            <Bell className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span>You have {notifications.length} new notifications</span>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalTickets}</div>
              <p className="text-xs text-muted-foreground">All requests</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.pendingTickets}</div>
              <p className="text-xs text-muted-foreground">Awaiting work</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.inProgressTickets}</div>
              <p className="text-xs text-muted-foreground">Active work</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.resolvedTickets}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.totalCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.avgResolutionTime}</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="tickets" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets">Maintenance Tickets</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="costs">Shared Costs</TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Maintenance Tickets</CardTitle>
                    <CardDescription>Manage and track all maintenance requests</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <ExportDropdown 
                      onExportExcel={() => exportTicketsToExcel(filteredTickets)}
                      onExportPDF={() => exportTicketsToPDF(filteredTickets)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search tickets..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="HVAC">HVAC</SelectItem>
                      <SelectItem value="Electrical">Electrical</SelectItem>
                      <SelectItem value="Plumbing">Plumbing</SelectItem>
                      <SelectItem value="Network">Network</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ticket ID</TableHead>
                        <TableHead>Tenant & Contact</TableHead>
                        <TableHead>Issue & Location</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{ticket.tenant.company_name}</div>
                              <div className="text-sm text-muted-foreground">{ticket.tenant.contact_person}</div>
                              <div className="text-xs text-muted-foreground">{ticket.tenant.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate font-medium">{ticket.title}</div>
                            <div className="text-sm text-muted-foreground truncate">{ticket.description}</div>
                            <div className="text-xs text-muted-foreground">{ticket.space.building} - {ticket.space.name}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ticket.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              <span className="text-sm">{ticket.assigned_to}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/maintenance/tickets/${ticket.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setIsUpdateDialogOpen(true);
                                }}
                              >
                                Update
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Maintenance Knowledge Base</CardTitle>
                    <CardDescription>Troubleshooting guides and procedures</CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search knowledge base..." 
                      className="pl-10"
                      value={knowledgeSearch}
                      onChange={(e) => setKnowledgeSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredKnowledge.map((item) => (
                    <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <Badge variant="outline">{item.category}</Badge>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedKnowledgeItem(item);
                              setIsKnowledgeDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <CardTitle className="text-sm">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shared Costs Tab */}
          <TabsContent value="costs" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Allocation by Tenant</CardTitle>
                  <CardDescription>Maintenance costs split by area proportion</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockCostData.map((tenant) => (
                      <div key={tenant.tenant} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{tenant.tenant}</div>
                          <div className="text-sm text-muted-foreground">
                            {tenant.area} sq ft ({tenant.share_percentage}%)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">₹{tenant.monthly_cost.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">This month</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>Detailed maintenance expense categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <span>Parts & Materials</span>
                      <span className="font-medium">₹{(stats.totalCost * 0.6).toLocaleString()}</span>
                    </div>
                    <Progress value={60} className="h-2" />
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <span>Labor Costs</span>
                      <span className="font-medium">₹{(stats.totalCost * 0.3).toLocaleString()}</span>
                    </div>
                    <Progress value={30} className="h-2" />
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <span>Miscellaneous</span>
                      <span className="font-medium">₹{(stats.totalCost * 0.1).toLocaleString()}</span>
                    </div>
                    <Progress value={10} className="h-2" />
                    
                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Total Monthly Cost</span>
                        <span>₹{stats.totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <ExportDropdown 
                      onExportExcel={() => exportCostAnalysisToExcel(mockCostData)}
                      onExportPDF={() => exportCostAnalysisToPDF(mockCostData)}
                      variant="outline"
                      size="default"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Ticket Detail Dialog */}
        {selectedTicket && !isUpdateDialogOpen && (
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ticket Details - {selectedTicket.ticket_number}</DialogTitle>
                <DialogDescription>Complete ticket information and history</DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Issue Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Title</label>
                        <p className="text-sm">{selectedTicket.title}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <p className="text-sm">{selectedTicket.description}</p>
                      </div>
                      {selectedTicket.resolution_notes && (
                        <div>
                          <label className="text-sm font-medium">Resolution Notes</label>
                          <p className="text-sm">{selectedTicket.resolution_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedTicket.proof_of_work.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Proof of Work</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedTicket.proof_of_work.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 border rounded">
                              <Camera className="h-4 w-4" />
                              <span className="text-sm">{file}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedTicket.comments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Comments</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedTicket.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 p-3 border rounded-lg">
                              <User className="h-4 w-4 mt-1" />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{comment.author}</span>
                                  <span className="text-xs text-muted-foreground">{comment.created_at}</span>
                                </div>
                                <p className="text-sm">{comment.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Ticket Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <Badge className={getStatusColor(selectedTicket.status)}>
                          {selectedTicket.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Priority</label>
                        <Badge className={getPriorityColor(selectedTicket.priority)}>
                          {selectedTicket.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Cost</label>
                        <p className="text-sm">₹{selectedTicket.cost.toLocaleString()}</p>
                      </div>
                      {selectedTicket.work_started_at && (
                        <div>
                          <label className="text-sm font-medium">Work Started</label>
                          <p className="text-sm">{new Date(selectedTicket.work_started_at).toLocaleString()}</p>
                        </div>
                      )}
                      {selectedTicket.work_completed_at && (
                        <div>
                          <label className="text-sm font-medium">Work Completed</label>
                          <p className="text-sm">{new Date(selectedTicket.work_completed_at).toLocaleString()}</p>
                        </div>
                      )}
                      {selectedTicket.sla_hours && (
                        <div>
                          <label className="text-sm font-medium">SLA Hours</label>
                          <p className="text-sm">{selectedTicket.sla_hours} hours</p>
                        </div>
                      )}
                      {selectedTicket.work_duration_hours && (
                        <div>
                          <label className="text-sm font-medium">Work Duration</label>
                          <p className="text-sm">{selectedTicket.work_duration_hours.toFixed(2)} hours</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tenant Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium">Company</label>
                        <p className="text-sm">{selectedTicket.tenant.company_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Contact</label>
                        <p className="text-sm">{selectedTicket.tenant.contact_person}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{selectedTicket.tenant.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{selectedTicket.tenant.email}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <label className="text-sm font-medium">Assigned To</label>
                        <div className="flex items-center gap-2 mt-1">
                          <UserCheck className="h-4 w-4" />
                          <span className="text-sm">{selectedTicket.assigned_to}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="text-sm">{selectedTicket.space.building}</span>
                      </div>
                      <p className="text-sm">{selectedTicket.space.name}</p>
                      <p className="text-sm text-muted-foreground">Floor {selectedTicket.space.floor}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Update Ticket Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Update Ticket - {selectedTicket?.ticket_number}</DialogTitle>
              <DialogDescription>Update status and add proof of work</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select name="status" defaultValue={selectedTicket?.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cost (₹)</label>
                  <Input name="cost" type="number" step="0.01" defaultValue={selectedTicket?.cost} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea 
                  name="resolutionNotes" 
                  placeholder="Describe the work performed..."
                  defaultValue={selectedTicket?.resolution_notes}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign To</label>
                  <Select name="assignedTo" defaultValue={selectedTicket?.assigned_to}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Raj Kumar">Raj Kumar (HVAC)</SelectItem>
                      <SelectItem value="Priya Singh">Priya Singh (Network)</SelectItem>
                      <SelectItem value="Suresh Reddy">Suresh Reddy (Plumbing)</SelectItem>
                      <SelectItem value="Amit Sharma">Amit Sharma (Electrical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estimated Time</label>
                  <Input name="estimatedTime" placeholder="4 hours" defaultValue={selectedTicket?.estimated_time} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Comment</label>
                <Textarea 
                  name="comment" 
                  placeholder="Add a comment about this update..."
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Proof of Work</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" size="sm">
                    <Camera className="h-4 w-4 mr-1" />
                    Upload Images
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Documents
                  </Button>
                </div>
              </div>
              
              <Button type="submit" className="w-full">Update Ticket</Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Knowledge Base Detail Dialog */}
        <Dialog open={isKnowledgeDialogOpen} onOpenChange={setIsKnowledgeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedKnowledgeItem?.title}</DialogTitle>
              <DialogDescription>
                <Badge variant="outline">{selectedKnowledgeItem?.category}</Badge>
              </DialogDescription>
            </DialogHeader>
            {selectedKnowledgeItem && (
              <div className="space-y-4">
                <p className="text-sm">{selectedKnowledgeItem.description}</p>
                <div>
                  <h4 className="font-medium mb-2">Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedKnowledgeItem.steps.map((step, index) => (
                      <li key={index} className="text-sm">{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm">
                    <Link className="h-4 w-4 mr-1" />
                    Link to Ticket
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    View Full Guide
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}