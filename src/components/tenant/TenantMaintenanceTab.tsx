import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Eye, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService, MaintenanceTicket } from '@/services/maintenanceService';

export function TenantMaintenanceTab() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEstimationOpen, setIsEstimationOpen] = useState(false);
  const [isSatisfactionOpen, setIsSatisfactionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [satisfactionOk, setSatisfactionOk] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const data = await MaintenanceService.getTenantTickets('6'); // Demo tenant ID
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await MaintenanceService.createTicket('6', {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        category: formData.get('category') as string,
        priority: formData.get('priority') as string,
      });
      
      toast({ title: "Success", description: "Ticket created successfully" });
      setIsNewTicketOpen(false);
      loadTickets();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleApproveEstimation = async () => {
    if (!selectedTicket) return;
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, { status: 'in_progress' });
      toast({ title: "Success", description: "Estimation approved" });
      setIsEstimationOpen(false);
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectEstimation = async () => {
    if (!selectedTicket || !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide rejection reason", variant: "destructive" });
      return;
    }
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, {
        status: 'pending',
        resolution_notes: `Estimation rejected: ${rejectionReason}`
      });
      toast({ title: "Success", description: "Estimation rejected" });
      setIsEstimationOpen(false);
      setRejectionReason('');
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSatisfaction = async () => {
    if (!selectedTicket) return;
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, {
        status: satisfactionOk ? 'closed' : 'pending',
        resolution_notes: `${selectedTicket.resolution_notes || ''}\nSatisfaction: ${satisfactionOk ? 'OK - Closed' : 'Not OK - On Hold'}`
      });
      toast({ title: "Success", description: satisfactionOk ? "Ticket closed" : "Ticket on hold" });
      setIsSatisfactionOpen(false);
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>{status.toUpperCase()}</Badge>;
  };

  const needsEstimationApproval = (ticket: MaintenanceTicket) => {
    return ticket.status === 'pending' && ticket.cost > 0;
  };

  const needsSatisfaction = (ticket: MaintenanceTicket) => {
    return ticket.status === 'resolved';
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Requests</p>
            <p className="text-2xl font-bold">{tickets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{tickets.filter(t => t.status === 'pending').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{tickets.filter(t => t.status === 'in_progress').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Maintenance Requests</CardTitle>
            <Button onClick={() => setIsNewTicketOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />New Request
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{ticket.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Ticket #{ticket.id.slice(-6)} • {new Date(ticket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(ticket.status)}
                  <Button size="sm" variant="outline" onClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }}>
                    <Eye className="h-4 w-4 mr-1" />View
                  </Button>
                  {needsEstimationApproval(ticket) && (
                    <Button size="sm" onClick={() => { setSelectedTicket(ticket); setIsEstimationOpen(true); }}>
                      Approve Estimation
                    </Button>
                  )}
                  {needsSatisfaction(ticket) && (
                    <Button size="sm" variant="secondary" onClick={() => { setSelectedTicket(ticket); setIsSatisfactionOpen(true); }}>
                      <CheckCircle className="h-4 w-4 mr-1" />Satisfaction
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Ticket Dialog */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Maintenance Request</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input name="title" required placeholder="Brief description" />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea name="description" required rows={4} placeholder="Detailed description..." />
            </div>
            <div>
              <Label>Category *</Label>
              <Select name="category" required>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
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
            <div>
              <Label>Priority</Label>
              <Select name="priority" defaultValue="Medium">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ticket Details</DialogTitle></DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div><Label>Status</Label>{getStatusBadge(selectedTicket.status)}</div>
              <div><Label>Title</Label><p className="text-sm mt-1">{selectedTicket.title}</p></div>
              <div><Label>Description</Label><p className="text-sm mt-1">{selectedTicket.description}</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Category</Label><p className="text-sm mt-1">{selectedTicket.category}</p></div>
                <div><Label>Priority</Label><p className="text-sm mt-1">{selectedTicket.priority}</p></div>
              </div>
              {selectedTicket.cost > 0 && (
                <div><Label>Estimated Cost</Label><p className="text-sm mt-1">₹{selectedTicket.cost.toLocaleString()}</p></div>
              )}
              {selectedTicket.resolution_notes && (
                <div><Label>Notes</Label><p className="text-sm mt-1">{selectedTicket.resolution_notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Estimation Approval Dialog */}
      <Dialog open={isEstimationOpen} onOpenChange={setIsEstimationOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Estimation</DialogTitle></DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-semibold">Estimated Cost: ₹{selectedTicket.cost?.toLocaleString() || 0}</p>
                <p className="text-sm mt-1">{selectedTicket.resolution_notes || 'No details provided'}</p>
              </div>
              <div>
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} placeholder="Provide reason..." />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleRejectEstimation}>
              <ThumbsDown className="h-4 w-4 mr-1" />Reject
            </Button>
            <Button onClick={handleApproveEstimation}>
              <ThumbsUp className="h-4 w-4 mr-1" />Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Satisfaction Dialog */}
      <Dialog open={isSatisfactionOpen} onOpenChange={setIsSatisfactionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Work Satisfaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Is the work completed to your satisfaction?</p>
            <div className="flex gap-4">
              <Button variant={satisfactionOk ? "default" : "outline"} onClick={() => setSatisfactionOk(true)} className="flex-1">
                <ThumbsUp className="h-4 w-4 mr-2" />OK - Close Ticket
              </Button>
              <Button variant={!satisfactionOk ? "default" : "outline"} onClick={() => setSatisfactionOk(false)} className="flex-1">
                <ThumbsDown className="h-4 w-4 mr-2" />Not OK - Hold
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSatisfaction} className="w-full">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
