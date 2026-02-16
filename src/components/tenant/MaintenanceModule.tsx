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
import { 
  Wrench, 
  Plus, 
  Eye, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService, MaintenanceTicket, CreateTicketData } from '@/services/maintenanceService';
import { useAuth } from '@/contexts/AuthContext';

interface MaintenanceModuleProps {
  tenantId?: string;
}

export function MaintenanceModule({ tenantId }: MaintenanceModuleProps) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  // Load tickets on component mount
  useEffect(() => {
    loadTickets();
    
    // Subscribe to real-time updates
    const subscription = MaintenanceService.subscribeToTickets((payload) => {
      console.log('Real-time update:', payload);
      loadTickets(); // Always reload on any change
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [tenantId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      let ticketsData: MaintenanceTicket[] = [];
      
      if (tenantId) {
        ticketsData = await MaintenanceService.getTenantTickets(tenantId);
      } else if (user?.email) {
        const tenant = await MaintenanceService.getTenantByEmail(user.email);
        if (tenant) {
          ticketsData = await MaintenanceService.getTenantTickets(tenant.id);
        }
      }
      
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      let currentTenantId = tenantId;
      
      if (!currentTenantId && user?.email) {
        const tenant = await MaintenanceService.getTenantByEmail(user.email);
        if (!tenant) {
          throw new Error('Tenant not found');
        }
        currentTenantId = tenant.id;
      }

      if (!currentTenantId) {
        throw new Error('No tenant ID available');
      }

      const ticketData = {
        tenant_id: currentTenantId,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        priority: formData.get('priority') as string,
        image_url: formData.get('imageUrl') as string || null,
        status: 'pending',
        cost: 0
      };

      await MaintenanceService.createTicket(ticketData);
      await loadTickets();
      
      setIsNewRequestOpen(false);
      
      toast({
        title: "Success",
        description: "Maintenance request submitted successfully",
      });
      
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create maintenance request: " + error.message,
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading maintenance tickets...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Maintenance Requests</CardTitle>
              <CardDescription>Submit and track maintenance tickets</CardDescription>
            </div>
            <Button onClick={() => setIsNewRequestOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Maintenance Requests</h3>
              <p className="text-muted-foreground mb-4">
                You haven't submitted any maintenance requests yet.
              </p>
              <Button onClick={() => setIsNewRequestOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Request
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        TKT-{ticket.id.slice(-6).toUpperCase()}
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
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Request Dialog */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Maintenance Request</DialogTitle>
            <DialogDescription>Submit a new maintenance or support request</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title" 
                name="title" 
                required 
                placeholder="Brief description of the issue" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea 
                id="description" 
                name="description" 
                required 
                placeholder="Detailed description of the issue..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AC">AC</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="Cleaning">Cleaning</SelectItem>
                  <SelectItem value="IT Support">IT Support</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="Medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Add Image
                </Button>
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  Upload File
                </Button>
              </div>
              <Input 
                name="imageUrl" 
                placeholder="Image URL (optional)" 
                className="text-sm"
              />
            </div>
            
            <Button type="submit" className="w-full">
              Submit Request
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
                    {new Date(selectedTicket.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {selectedTicket.assigned_user && (
                <div>
                  <Label className="text-sm font-medium">Assigned To</Label>
                  <p className="mt-1 text-sm">{selectedTicket.assigned_user.full_name}</p>
                </div>
              )}
              
              {selectedTicket.work_started_at && (
                <div>
                  <Label className="text-sm font-medium">Work Started</Label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTicket.work_started_at).toLocaleString()}
                  </p>
                </div>
              )}
              
              {selectedTicket.work_completed_at && (
                <div>
                  <Label className="text-sm font-medium">Work Completed</Label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedTicket.work_completed_at).toLocaleString()}
                  </p>
                </div>
              )}
              
              {selectedTicket.sla_hours && (
                <div>
                  <Label className="text-sm font-medium">SLA Hours</Label>
                  <p className="mt-1 text-sm">{selectedTicket.sla_hours} hours</p>
                </div>
              )}
              
              {selectedTicket.work_duration_hours && (
                <div>
                  <Label className="text-sm font-medium">Work Duration</Label>
                  <p className="mt-1 text-sm">{selectedTicket.work_duration_hours.toFixed(2)} hours</p>
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
              
              {selectedTicket.image_url && (
                <div>
                  <Label className="text-sm font-medium">Attachment</Label>
                  <div className="mt-1">
                    <img 
                      src={selectedTicket.image_url} 
                      alt="Ticket attachment" 
                      className="max-w-full h-auto rounded border"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}