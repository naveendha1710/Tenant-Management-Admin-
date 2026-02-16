import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wrench, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Search,
  Filter,
  User,
  Building,
  DollarSign,
  Calendar,
  FileImage,
  Video,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService, MaintenanceTicket, UpdateTicketData } from '@/services/maintenanceService';

export function AdminMaintenanceModule() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState<Array<{id: string, full_name: string, email: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    resolved: 0,
    total_cost: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const subscription = MaintenanceService.subscribeToTickets((payload) => {
      console.log('Real-time update:', payload);
      loadData(); // Reload data when changes occur
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsData, staffData, statsData] = await Promise.all([
        MaintenanceService.getAllTickets(),
        MaintenanceService.getMaintenanceStaff(),
        MaintenanceService.getTicketStats()
      ]);
      
      setTickets(ticketsData);
      setMaintenanceStaff(staffData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load maintenance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const formData = new FormData(e.currentTarget);
    
    try {
      const updates: UpdateTicketData = {
        status: formData.get('status') as string,
        assigned_to: formData.get('assigned_to') as string || undefined,
        resolution_notes: formData.get('resolution_notes') as string || undefined,
        cost: parseFloat(formData.get('cost') as string) || 0
      };

      await MaintenanceService.updateTicket(selectedTicket.id, updates);
      
      setIsUpdateOpen(false);
      setSelectedTicket(null);
      loadData(); // Reload data
      
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      Low: 'bg-gray-100 text-gray-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-orange-100 text-orange-800',
      Urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.tenant?.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading maintenance data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All requests</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting work</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">Active work</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.total_cost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle>All Maintenance Tickets</CardTitle>
              <CardDescription>Manage maintenance requests from all tenants</CardDescription>
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
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AC">AC</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Cleaning">Cleaning</SelectItem>
                <SelectItem value="IT Support">IT Support</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket ID</TableHead>
                  <TableHead>Tenant Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Work Started</TableHead>
                  <TableHead>Work Ended</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      TKT-{ticket.id.slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{ticket.tenant?.company_name}</div>
                        <div className="text-sm text-muted-foreground">{ticket.tenant?.contact_person}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate font-medium">{ticket.title}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {ticket.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.category}</Badge>
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
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="text-sm">
                          {ticket.assigned_user?.full_name || 'Unassigned'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {ticket.work_started_at ? (
                          <div>
                            <div className="font-medium">{new Date(ticket.work_started_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">{new Date(ticket.work_started_at).toLocaleTimeString()}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {ticket.work_completed_at ? (
                          <div>
                            <div className="font-medium">{new Date(ticket.work_completed_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">{new Date(ticket.work_completed_at).toLocaleTimeString()}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ticket.sla_hours ? (
                        <Badge variant="outline" className="text-xs">{ticket.sla_hours}h</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {ticket.work_duration_hours ? (
                        <Badge variant="secondary" className="text-xs font-bold">{ticket.work_duration_hours.toFixed(2)}h</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsUpdateOpen(true);
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

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Ticket Details - TKT-{selectedTicket?.id.slice(-6).toUpperCase()}
            </DialogTitle>
            <DialogDescription>Complete ticket information</DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tenant</Label>
                  <p className="mt-1 text-sm">{selectedTicket.tenant?.company_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.tenant?.contact_person}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Contact</Label>
                  <p className="mt-1 text-sm">{selectedTicket.tenant?.phone}</p>
                  <p className="text-xs text-muted-foreground">{selectedTicket.tenant?.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedTicket.status)}
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Priority</Label>
                  <div className="mt-1">
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Title</Label>
                <p className="mt-1 text-sm">{selectedTicket.title}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm">{selectedTicket.description}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="mt-1 text-sm">{selectedTicket.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created</Label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && selectedTicket.resolved_at && (
                <div>
                  <Label className="text-sm font-medium">Resolved</Label>
                  <p className="mt-1 text-sm">{new Date(selectedTicket.resolved_at).toLocaleString()}</p>
                </div>
              )}
              
              {selectedTicket.assigned_user && (
                <div>
                  <Label className="text-sm font-medium">Assigned To</Label>
                  <p className="mt-1 text-sm">{selectedTicket.assigned_user.full_name}</p>
                </div>
              )}
              
              {selectedTicket.resolution_notes && (
                <div>
                  <Label className="text-sm font-medium">Resolution Notes</Label>
                  <p className="mt-1 text-sm">{selectedTicket.resolution_notes}</p>
                </div>
              )}
              
              {selectedTicket.cost > 0 && (
                <div>
                  <Label className="text-sm font-medium">Cost</Label>
                  <p className="mt-1 text-sm">₹{selectedTicket.cost.toLocaleString()}</p>
                </div>
              )}
              
              {(selectedTicket.sla_hours || selectedTicket.work_started_at || selectedTicket.work_duration_hours) && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <Label className="text-xs font-semibold text-blue-900 mb-2 block">Work Tracking</Label>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    {selectedTicket.sla_hours && (
                      <div>
                        <Label className="text-xs text-muted-foreground">SLA</Label>
                        <p className="font-medium">{selectedTicket.sla_hours}h</p>
                      </div>
                    )}
                    {selectedTicket.work_started_at && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Started</Label>
                        <p>{new Date(selectedTicket.work_started_at).toLocaleTimeString()}</p>
                      </div>
                    )}
                    {selectedTicket.work_completed_at && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Completed</Label>
                        <p>{new Date(selectedTicket.work_completed_at).toLocaleTimeString()}</p>
                      </div>
                    )}
                    {selectedTicket.work_duration_hours && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <p className="font-bold text-blue-900">{selectedTicket.work_duration_hours.toFixed(2)}h</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Ticket Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Update Ticket - TKT-{selectedTicket?.id.slice(-6).toUpperCase()}
            </DialogTitle>
            <DialogDescription>Update ticket status and assignment</DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <form onSubmit={handleUpdateTicket} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedTicket.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select name="assigned_to" defaultValue={selectedTicket.assigned_to || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {maintenanceStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (₹)</Label>
                <Input 
                  name="cost" 
                  type="number" 
                  step="0.01" 
                  defaultValue={selectedTicket.cost}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resolution_notes">Resolution Notes</Label>
                <Textarea 
                  name="resolution_notes" 
                  placeholder="Describe the work performed..."
                  defaultValue={selectedTicket.resolution_notes || ''}
                  rows={4}
                />
              </div>
              
              <Button type="submit" className="w-full">
                Update Ticket
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}   <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedTicket.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assign To</Label>
                  <Select name="assigned_to" defaultValue={selectedTicket.assigned_to || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {maintenanceStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost">Cost (₹)</Label>
                <Input 
                  name="cost" 
                  type="number" 
                  step="0.01" 
                  defaultValue={selectedTicket.cost}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resolution_notes">Resolution Notes</Label>
                <Textarea 
                  name="resolution_notes" 
                  placeholder="Describe the work performed..."
                  defaultValue={selectedTicket.resolution_notes || ''}
                  rows={4}
                />
              </div>
              
              <Button type="submit" className="w-full">
                Update Ticket
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}