import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { MaintenanceTicketForm } from '@/components/tenant/MaintenanceTicketForm';
import { AssetInfo } from '@/components/tenant/AssetInfo';
import { getStatusColor, getStatusLabel } from '@/utils/ticketStatus';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Upload,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MaintenanceService, MaintenanceTicket } from '@/services/maintenanceService';
import { supabase } from '@/lib/supabaseClient';
import { sendTicketNotification } from '@/services/ticketNotifications';

export default function MaintenanceRequestsPage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [ticketAssets, setTicketAssets] = useState<Record<string, string[]>>({});
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSatisfactionDialogOpen, setIsSatisfactionDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComments, setFeedbackComments] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTickets = async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const tenant = await MaintenanceService.getTenantByEmail(user.email);
      if (!tenant) {
        console.warn('Tenant not found');
        setTickets([]);
        return;
      }
      
      const ticketData = await MaintenanceService.getTenantTickets(tenant.id);
      setTickets(ticketData);
      
      // Fetch assets for all tickets
      const ticketIds = ticketData.map(t => t.id);
      if (ticketIds.length > 0) {
        const { data: assetLinks } = await supabase
          .from('ticket_assets')
          .select('ticket_id, asset_id')
          .in('ticket_id', ticketIds);
        
        const assetsMap: Record<string, string[]> = {};
        assetLinks?.forEach(link => {
          if (!assetsMap[link.ticket_id]) assetsMap[link.ticket_id] = [];
          assetsMap[link.ticket_id].push(link.asset_id);
        });
        setTicketAssets(assetsMap);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.email]);

  const handleCreateTicket = () => {
    setIsTicketFormOpen(true);
  };

  const handleTicketSuccess = () => {
    fetchTickets();
    toast({ title: "Success", description: "Maintenance request submitted successfully" });
  };

  const handleViewTicket = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setActiveTab('details');
    setIsDetailDialogOpen(true);
  };

  const handleAcceptEstimation = async () => {
    if (!selectedTicket) return;
    try {
      const historyEntry = `[${new Date().toLocaleString()}] TENANT APPROVED`;
      await MaintenanceService.updateTicket(selectedTicket.id, { 
        status: 'approved',
        status_history: `${selectedTicket.status_history || ''}\n${historyEntry}`
      });
      
      sendTicketNotification('ticket.estimation_approved_by_tenant', { ...selectedTicket, status: 'approved' }).catch(console.error);
      
      toast({ title: "Success", description: "Estimation accepted. Work can now start." });
      setIsDetailDialogOpen(false);
      fetchTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionField, setShowRejectionField] = useState(false);

  const handleRejectEstimation = async () => {
    if (!selectedTicket || !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide rejection reason", variant: "destructive" });
      return;
    }
    try {
      // Load existing previous_submissions array
      let previousSubmissions = [];
      if (selectedTicket.previous_submissions) {
        try {
          const parsed = JSON.parse(selectedTicket.previous_submissions);
          previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {}
      }
      
      // Append current submission to array
      previousSubmissions.push({
        technicians: selectedTicket.assigned_technicians,
        rca: selectedTicket.resolution_notes?.includes('=== RCA ==='),
        estimation: selectedTicket.cost,
        opex_code: selectedTicket.opex_code,
        resolution_notes: selectedTicket.resolution_notes,
        rejection_reason: rejectionReason,
        rejected_at: new Date().toISOString(),
        rejected_by: 'Tenant'
      });
      
      const historyEntry = `[${new Date().toLocaleString()}] TENANT REJECTED: ${rejectionReason}`;
      await MaintenanceService.updateTicket(selectedTicket.id, { 
        status: 'tenant_rejected',
        status_history: `${selectedTicket.status_history || ''}\n${historyEntry}`,
        previous_submissions: JSON.stringify(previousSubmissions)
      });
      
      sendTicketNotification('ticket.estimation_rejected_by_tenant', { ...selectedTicket, status: 'tenant_rejected' }).catch(console.error);
      
      toast({ title: "Success", description: "Estimation rejected. Re-estimation requested." });
      setIsDetailDialogOpen(false);
      setShowRejectionField(false);
      setRejectionReason('');
      fetchTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };



  const handleSatisfactionSubmit = async (action: 'close' | 'reopen' | 'submit') => {
    if (!selectedTicket || !feedbackRating) {
      toast({ title: "Error", description: "Please provide a rating", variant: "destructive" });
      return;
    }
    
    try {
      let updates: any = {};
      let successMessage = '';
      
      if (action === 'close') {
        updates = { 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          tenant_satisfaction: `${feedbackRating}/10`,
          tenant_feedback: feedbackComments || null
        };
        successMessage = `Thank you for your ${feedbackRating}/10 star rating! Ticket has been closed.`;
      } else if (action === 'reopen') {
        updates = { 
          status: 'reopened',
          tenant_satisfaction: `${feedbackRating}/10`,
          tenant_feedback: feedbackComments || null
        };
        successMessage = `Ticket has been reopened based on your ${feedbackRating}/10 star rating. Our team will review it again.`;
      } else {
        updates = { 
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          tenant_satisfaction: `${feedbackRating}/10`,
          tenant_feedback: feedbackComments || null
        };
        successMessage = `Thank you for your ${feedbackRating}/10 star rating! Ticket has been closed.`;
      }
      
      await MaintenanceService.updateTicket(selectedTicket.id, updates);
      
      const notifEvent = action === 'reopen' ? 'ticket.reopened' : 'ticket.resolved';
      sendTicketNotification(notifEvent, { ...selectedTicket, ...updates }).catch(console.error);
      
      toast({ 
        title: "Success", 
        description: successMessage
      });
      
      setIsSatisfactionDialogOpen(false);
      setFeedbackRating(0);
      setFeedbackComments('');
      setIsDetailDialogOpen(false);
      fetchTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || 'Failed to submit feedback', variant: "destructive" });
    }
  };

  const exportTickets = async (format: 'excel' | 'pdf') => {
    try {
      if (format === 'excel') {
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Maintenance Tickets');
        worksheet.columns = [
          { header: 'Ticket ID', key: 'id', width: 15 },
          { header: 'Title', key: 'title', width: 30 },
          { header: 'Category', key: 'category', width: 15 },
          { header: 'Priority', key: 'priority', width: 12 },
          { header: 'Status', key: 'status', width: 15 },
          { header: 'Created Date', key: 'created_at', width: 15 },
          { header: 'Cost', key: 'cost', width: 12 }
        ];
        filteredTickets.forEach(ticket => {
          worksheet.addRow({
            id: ticket.id.slice(0, 8),
            title: ticket.title,
            category: ticket.category,
            priority: ticket.priority,
            status: ticket.status.replace('_', ' ').toUpperCase(),
            created_at: new Date(ticket.created_at).toLocaleDateString(),
            cost: ticket.cost || 0
          });
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maintenance_tickets.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      }
      toast({ title: "Success", description: `Tickets exported as ${format.toUpperCase()} successfully` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Error", description: `Failed to export as ${format.toUpperCase()}`, variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'actioned': return <CheckCircle className="h-4 w-4 text-indigo-500" />;
      case 'pending_tenant_approval': return <Clock className="h-4 w-4 text-purple-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'in_progress': return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'reopened': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTenantDisplayStatus = (status: string) => {
    if (['assigned', 'rca_added', 'pending_approval', 'rejected'].includes(status)) {
      return 'actioned';
    }
    return status;
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const displayStatus = getTenantDisplayStatus(ticket.status);
    const matchesStatus = statusFilter === 'all' || displayStatus === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority.toLowerCase() === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'pending').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  return (
    <DashboardLayout title="Maintenance Requests" subtitle="Submit and track your maintenance requests">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Request Form Card */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isTicketFormOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        }`}>
        {isTicketFormOpen && (
          <Card className="animate-in slide-in-from-top-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance Request Form</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setIsTicketFormOpen(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <MaintenanceTicketForm
                isOpen={true}
                onClose={() => setIsTicketFormOpen(false)}
                onSuccess={handleTicketSuccess}
              />
            </CardContent>
          </Card>
        )}
        </div>

        {/* Maintenance Requests Table */}
        {!isDetailDialogOpen && !isTicketFormOpen && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>My Maintenance Requests</CardTitle>
                <CardDescription>Track all your submitted maintenance requests</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => exportTickets('excel')}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={handleCreateTicket}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
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
                  <SelectItem value="actioned">Actioned</SelectItem>
                  <SelectItem value="pending_tenant_approval">Awaiting Your Approval</SelectItem>
                  <SelectItem value="tenant_rejected">Rejected by You</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="work_started">Work Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="work_completed">Work Completed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
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
                  <SelectItem value="AC">Air Conditioning</SelectItem>
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
                    <TableHead>Issue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submission Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground">Loading tickets...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">No maintenance requests found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="cursor-pointer" onDoubleClick={() => handleViewTicket(ticket)}>
                        <TableCell className="font-medium">{ticket.ticket_number || ticket.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ticket.title}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {ticket.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(getTenantDisplayStatus(ticket.status))}
                            <Badge className={['assigned', 'rca_added', 'pending_approval', 'rejected'].includes(ticket.status) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : getStatusColor(ticket.status)}>
                              {['assigned', 'rca_added', 'pending_approval', 'rejected'].includes(ticket.status) ? 'ACTIONED' : getStatusLabel(ticket.status).toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewTicket(ticket)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  const ExcelJS = (await import('exceljs')).default;
                                  const workbook = new ExcelJS.Workbook();
                                  const worksheet = workbook.addWorksheet('Ticket Details');
                                  
                                  worksheet.columns = [
                                    { header: 'Field', key: 'field', width: 30 },
                                    { header: 'Value', key: 'value', width: 50 }
                                  ];
                                  
                                  worksheet.addRow({ field: 'Ticket Number', value: ticket.ticket_number || ticket.id.slice(0, 8) });
                                  worksheet.addRow({ field: 'Title', value: ticket.title });
                                  worksheet.addRow({ field: 'Description', value: ticket.description });
                                  worksheet.addRow({ field: 'Category', value: ticket.category });
                                  worksheet.addRow({ field: 'Priority', value: ticket.priority });
                                  worksheet.addRow({ field: 'Status', value: getStatusLabel(ticket.status) });
                                  worksheet.addRow({ field: 'Location', value: ticket.location || 'N/A' });
                                  worksheet.addRow({ field: 'Building', value: ticket.building || 'N/A' });
                                  worksheet.addRow({ field: 'Floor', value: ticket.floor || 'N/A' });
                                  worksheet.addRow({ field: 'Room', value: ticket.room || 'N/A' });
                                  worksheet.addRow({ field: 'Estimated Cost', value: ticket.cost ? `₹${ticket.cost}` : '₹0' });
                                  worksheet.addRow({ field: 'Created Date', value: new Date(ticket.created_at).toLocaleString() });
                                  worksheet.addRow({ field: 'Preferred Date', value: ticket.preferred_date ? new Date(ticket.preferred_date).toLocaleDateString() : 'N/A' });
                                  worksheet.addRow({ field: 'Preferred Time', value: ticket.preferred_time || 'N/A' });
                                  worksheet.addRow({ field: 'Safety Risk', value: ticket.safety_risk ? 'Yes' : 'No' });
                                  worksheet.addRow({ field: 'Previous Occurrence', value: ticket.previous_occurrence ? 'Yes' : 'No' });
                                  worksheet.addRow({ field: 'SLA Hours', value: ticket.sla_hours || 'N/A' });
                                  worksheet.addRow({ field: 'Work Started', value: ticket.work_started_at ? new Date(ticket.work_started_at).toLocaleString() : 'N/A' });
                                  worksheet.addRow({ field: 'Work Completed', value: ticket.work_completed_at ? new Date(ticket.work_completed_at).toLocaleString() : 'N/A' });
                                  worksheet.addRow({ field: 'Work Duration (Hours)', value: ticket.work_duration_hours || 'N/A' });
                                  
                                  if (ticket.assigned_technicians?.length > 0) {
                                    worksheet.addRow({ field: '', value: '' });
                                    worksheet.addRow({ field: 'Assigned Technicians', value: '' });
                                    ticket.assigned_technicians.forEach((tech: any) => {
                                      worksheet.addRow({ field: `  ${tech.name}`, value: `${tech.contact} - ${tech.specialization}` });
                                    });
                                  }
                                  
                                  if (ticket.tenant_satisfaction) {
                                    worksheet.addRow({ field: '', value: '' });
                                    worksheet.addRow({ field: 'Tenant Satisfaction', value: ticket.tenant_satisfaction });
                                    worksheet.addRow({ field: 'Tenant Feedback', value: ticket.tenant_feedback || 'N/A' });
                                  }
                                  
                                  const buffer = await workbook.xlsx.writeBuffer();
                                  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `ticket_${ticket.ticket_number || ticket.id.slice(0, 8)}.xlsx`;
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  toast({ title: "Success", description: "Ticket downloaded successfully" });
                                } catch (error) {
                                  toast({ title: "Error", description: "Failed to download ticket", variant: "destructive" });
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        )}



        {/* Ticket Detail Section */}
        {isDetailDialogOpen && selectedTicket && (
          <Card className="border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h1>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Ticket #{selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsDetailDialogOpen(false)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </CardHeader>
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'files'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Files
                  </button>
                  <button
                    onClick={() => setActiveTab('feedback')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'feedback'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Feedback
                  </button>
                </div>
              </div>
              
              {activeTab === 'details' && (
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Main Content - Left 70% */}
                  <div className="lg:col-span-2 space-y-3">
                    {/* Location & Visit Preferences - Side by Side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Location Details */}
                      {(selectedTicket.building || selectedTicket.floor || selectedTicket.location) && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Location Details</Label>
                          <div className="space-y-1 text-sm text-gray-700">
                            {selectedTicket.building && <p><span className="font-medium">Building:</span> {selectedTicket.building}</p>}
                            {selectedTicket.floor && <p><span className="font-medium">Floor:</span> {selectedTicket.floor}</p>}
                            {selectedTicket.room && <p><span className="font-medium">Room:</span> {selectedTicket.room}</p>}
                            {selectedTicket.spot_description && <p><span className="font-medium">Exact Spot:</span> {selectedTicket.spot_description}</p>}
                            {selectedTicket.location && !selectedTicket.building && <p>{selectedTicket.location}</p>}
                          </div>
                        </div>
                      )}
                      
                      {/* Visit Preferences */}
                      {(selectedTicket.preferred_date || selectedTicket.preferred_time || selectedTicket.target_date) && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Visit Preferences</Label>
                          <div className="space-y-1.5 text-sm">
                            {selectedTicket.preferred_date && (
                              <div>
                                <p className="text-gray-500 text-xs">Preferred Date</p>
                                <p className="text-gray-900 font-medium">{new Date(selectedTicket.preferred_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {selectedTicket.preferred_time && (
                              <div>
                                <p className="text-gray-500 text-xs">Preferred Time</p>
                                <p className="text-gray-900 font-medium">{selectedTicket.preferred_time}</p>
                              </div>
                            )}
                            {selectedTicket.target_date && (
                              <div>
                                <p className="text-gray-500 text-xs">Target Date</p>
                                <p className="text-gray-900 font-medium">{new Date(selectedTicket.target_date).toLocaleDateString()}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Important Information */}
                    {(selectedTicket.safety_risk || selectedTicket.previous_occurrence) && (
                      <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
                        <Label className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2 block">Important Information</Label>
                        <div className="space-y-1.5 text-sm">
                          {selectedTicket.safety_risk && (
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Safety Risk Identified</span>
                            </div>
                          )}
                          {selectedTicket.previous_occurrence && (
                            <div>
                              <div className="flex items-center gap-2 text-orange-700">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">Previous Occurrence Reported</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Description */}
                    <div className="bg-white rounded-lg border border-gray-200 p-3">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</Label>
                      <p className="mt-2 text-sm text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                    </div>
                    
                    {/* Changes Requested Badge */}
                    {selectedTicket.status_history?.includes('CHANGES REQUESTED BY HELPDESK') && (
                      <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <Label className="text-sm font-semibold text-orange-900">Re-submitted Estimation</Label>
                        </div>
                        <p className="text-sm text-orange-700 mt-1">This estimation has been modified by helpdesk after previous approval.</p>
                      </div>
                    )}
                    
                    {/* Status Messages */}
                    {['pending', 'assigned', 'rca_added', 'pending_approval', 'rejected'].includes(selectedTicket.status) && (
                      <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Status:</strong> Your request is being reviewed by our maintenance team. You will be notified once the estimation is ready for your approval.
                        </p>
                      </div>
                    )}

                    {/* Work Details */}
                    {selectedTicket.resolution_notes && ['pending_tenant_approval', 'approved', 'in_progress', 'work_completed', 'completed', 'resolved'].includes(selectedTicket.status) && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Work Details</Label>
                        <div className="space-y-4">
                          {(() => {
                            const notes = selectedTicket.resolution_notes;
                            const techMatch = notes.match(/Technician: (.+?)\nContact: (.+?)\nSpecialization: (.+?)\n/);
                            const rcaMatch = notes.match(/=== RCA ===\nRoot Cause: (.+?)\nFindings: (.+?)\n/);
                            
                            return (
                              <>
                                {techMatch && (
                                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                                      {techMatch[1].split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">{techMatch[1]}</p>
                                      <p className="text-sm text-gray-600">{techMatch[2]}</p>
                                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{techMatch[3]}</span>
                                    </div>
                                  </div>
                                )}
                                {rcaMatch && (
                                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                                    <p className="text-xs font-semibold text-purple-900 mb-2">Root Cause Analysis</p>
                                    <div className="space-y-2">
                                      <div>
                                        <span className="text-xs text-gray-600">Root Cause:</span>
                                        <p className="text-sm font-medium text-gray-900">{rcaMatch[1]}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-gray-600">Findings:</span>
                                        <p className="text-sm font-medium text-gray-900">{rcaMatch[2]}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Materials & Cost Breakdown */}
                    {selectedTicket.resolution_notes && ['pending_tenant_approval', 'approved', 'in_progress', 'work_completed', 'completed', 'resolved'].includes(selectedTicket.status) && (() => {
                      const notes = selectedTicket.resolution_notes;
                      const materialsMatch = notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                      const costMatch = notes.match(/Material Cost \(without GST\): ₹(.+?)\nTotal GST: ₹(.+?)\nMaterial Cost \(with GST\): ₹(.+?)\nLabor Hours: (.+?)\nLabor Cost: ₹(.+?)\nTotal: ₹(.+?)\nNotes: (.+)/);
                      
                      return (
                        <>
                          {materialsMatch && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Materials Required</Label>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                      <th className="text-left p-3 font-semibold text-gray-700">Item</th>
                                      <th className="text-right p-3 font-semibold text-gray-700">Qty</th>
                                      <th className="text-right p-3 font-semibold text-gray-700">Rate</th>
                                      <th className="text-right p-3 font-semibold text-gray-700">GST%</th>
                                      <th className="text-right p-3 font-semibold text-gray-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {materialsMatch[1].split('\n').map((line, i) => {
                                      const parts = line.split(' | ');
                                      return parts.length === 6 ? (
                                        <tr key={i} className="border-b border-gray-100">
                                          <td className="p-3 text-gray-900">{parts[0]}</td>
                                          <td className="text-right p-3 text-gray-700">{parts[1]}</td>
                                          <td className="text-right p-3 text-gray-700">{parts[2]}</td>
                                          <td className="text-right p-3 text-gray-700">{parts[3]}</td>
                                          <td className="text-right p-3 font-semibold text-gray-900">{parts[5]}</td>
                                        </tr>
                                      ) : null;
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {costMatch && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Cost Breakdown</Label>
                              <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Material Cost (without GST)</span>
                                  <span className="font-semibold text-gray-900">₹{costMatch[1]}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Total GST</span>
                                  <span className="font-semibold text-gray-900">₹{costMatch[2]}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Material Cost (with GST)</span>
                                  <span className="font-semibold text-gray-900">₹{costMatch[3]}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Labor Hours</span>
                                  <span className="font-semibold text-gray-900">{costMatch[4]}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Labor Cost</span>
                                  <span className="font-semibold text-gray-900">₹{costMatch[5]}</span>
                                </div>
                                <div className="flex justify-between py-3 bg-blue-50 -mx-5 px-5 mt-3">
                                  <span className="font-bold text-gray-900">Total Estimation</span>
                                  <span className="font-bold text-blue-600 text-xl">₹{costMatch[6]}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Approval Actions */}
                    {selectedTicket.status === 'pending_tenant_approval' && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Your Decision</Label>
                        {showRejectionField && (
                          <div className="mb-4">
                            <Label className="text-sm mb-2 block">Rejection Reason *</Label>
                            <Textarea 
                              value={rejectionReason} 
                              onChange={(e) => setRejectionReason(e.target.value)} 
                              rows={3} 
                              placeholder="Please provide reason for rejection..."
                              className="resize-none"
                            />
                          </div>
                        )}
                        <div className="flex gap-3">
                          {showRejectionField ? (
                            <>
                              <Button variant="outline" onClick={() => { setShowRejectionField(false); setRejectionReason(''); }} className="flex-1">
                                Cancel
                              </Button>
                              <Button variant="destructive" onClick={handleRejectEstimation} className="flex-1">
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Submit Rejection
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="outline" onClick={() => setShowRejectionField(true)} className="flex-1 border-red-200 text-red-700 hover:bg-red-50">
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Request Re-estimation
                              </Button>
                              <Button onClick={handleAcceptEstimation} className="flex-1 bg-green-600 hover:bg-green-700">
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Accept Estimation
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {(selectedTicket.status === 'completed' || selectedTicket.status === 'work_completed') && (
                      <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <Button onClick={() => {
                          setIsDetailDialogOpen(false);
                          setIsSatisfactionDialogOpen(true);
                        }} className="w-full">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Provide Feedback
                        </Button>
                      </div>
                    )}

                    {selectedTicket.tenant_rejected_submissions && ['tenant_rejected', 'pending_tenant_approval', 'approved', 'in_progress', 'completed', 'resolved'].includes(selectedTicket.status) && (
                      <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
                        <Label className="text-sm font-semibold text-orange-900 mb-2 block">Previous Submissions (For Reference)</Label>
                        <pre className="text-xs whitespace-pre-wrap font-mono text-orange-800">{selectedTicket.tenant_rejected_submissions}</pre>
                      </div>
                    )}
                  </div>

                  {/* Sidebar - Right 30% */}
                  <div className="space-y-3">
                    <div className="bg-white rounded-lg border border-gray-200 p-3 sticky top-6">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Ticket Information</Label>
                      <div className="space-y-2.5">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(getTenantDisplayStatus(selectedTicket.status))}
                            <Badge className={['assigned', 'rca_added', 'pending_approval', 'rejected'].includes(selectedTicket.status) ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : getStatusColor(selectedTicket.status)}>
                              {['assigned', 'rca_added', 'pending_approval', 'rejected'].includes(selectedTicket.status) ? 'ACTIONED' : getStatusLabel(selectedTicket.status).toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="border-t border-gray-200 pt-4">
                          <Label className="text-xs text-gray-500 mb-1 block">Priority</Label>
                          <Badge className={getPriorityColor(selectedTicket.priority)}>
                            {selectedTicket.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="border-t border-gray-200 pt-4">
                          <Label className="text-xs text-gray-500 mb-1 block">Category</Label>
                          <p className="font-medium text-gray-900">{selectedTicket.category}</p>
                        </div>
                        {(ticketAssets[selectedTicket.id]?.length > 0 || selectedTicket.asset_id) && (
                          <div className="border-t border-gray-200 pt-4">
                            <Label className="text-xs text-gray-500 mb-2 block">Related Assets ({ticketAssets[selectedTicket.id]?.length || 1})</Label>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const assets = ticketAssets[selectedTicket.id] || (selectedTicket.asset_id ? [selectedTicket.asset_id] : []);
                                const isExpanded = expandedAssets[selectedTicket.id];
                                const displayAssets = isExpanded ? assets : assets.slice(0, 3);
                                return (
                                  <>
                                    {displayAssets.map(assetId => (
                                      <AssetInfo key={assetId} assetId={assetId} />
                                    ))}
                                    {assets.length > 3 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setExpandedAssets(prev => ({ ...prev, [selectedTicket.id]: !prev[selectedTicket.id] }))}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                      >
                                        {isExpanded ? 'Show Less' : `+${assets.length - 3} More`}
                                      </Button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        <div className="border-t border-gray-200 pt-4">
                          <Label className="text-xs text-gray-500 mb-1 block">Submitted</Label>
                          <p className="text-sm text-gray-700">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                        </div>
                        {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && selectedTicket.resolved_at && (
                          <div className="border-t border-gray-200 pt-4">
                            <Label className="text-xs text-gray-500 mb-1 block">Resolved</Label>
                            <p className="text-sm text-gray-700">{new Date(selectedTicket.resolved_at).toLocaleString()}</p>
                          </div>
                        )}
                        {selectedTicket.cost > 0 && ['pending_tenant_approval', 'approved', 'in_progress', 'work_completed', 'completed', 'resolved'].includes(selectedTicket.status) && (
                          <div className="border-t border-gray-200 pt-4">
                            <Label className="text-xs text-gray-500 mb-2 block">Estimated Cost</Label>
                            <p className="text-2xl font-bold text-blue-600">₹{selectedTicket.cost.toLocaleString()}</p>
                          </div>
                        )}
                        {selectedTicket.assigned_technicians && selectedTicket.assigned_technicians.length > 0 && (
                          <div className="border-t border-gray-200 pt-4">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Technician Details</Label>
                            <div className="space-y-2">
                              {selectedTicket.assigned_technicians.map((tech: any) => (
                                <div key={tech.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                      {tech.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900 text-sm">{tech.name}</p>
                                      <p className="text-xs text-gray-600">{tech.contact}</p>
                                      <p className="text-xs text-blue-600">{tech.specialization}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(selectedTicket.sla_hours || selectedTicket.work_started_at || selectedTicket.work_completed_at || selectedTicket.work_duration_hours) && (
                          <div className="border-t border-gray-200 pt-4">
                            <Label className="text-xs font-semibold text-gray-700 mb-3 block">Work Tracking</Label>
                            <div className="space-y-3">
                              {selectedTicket.sla_hours && (
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1 block">SLA Time</Label>
                                  <p className="text-sm font-medium text-gray-900">{selectedTicket.sla_hours} hours</p>
                                </div>
                              )}
                              {selectedTicket.work_started_at && (
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1 block">Work Started</Label>
                                  <p className="text-sm text-gray-700">{new Date(selectedTicket.work_started_at).toLocaleString()}</p>
                                </div>
                              )}
                              {selectedTicket.work_completed_at && (
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1 block">Work Ended</Label>
                                  <p className="text-sm text-gray-700">{new Date(selectedTicket.work_completed_at).toLocaleString()}</p>
                                </div>
                              )}
                              {selectedTicket.work_duration_hours && (
                                <div>
                                  <Label className="text-xs text-gray-500 mb-1 block">Work Duration</Label>
                                  <p className="text-sm font-bold text-blue-600">{selectedTicket.work_duration_hours.toFixed(2)} hours</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>


                  </div>
                </div>
              </CardContent>
              )}
              
              {activeTab === 'files' && (
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold text-gray-700">Uploaded Files</Label>
                    {((selectedTicket.photos && selectedTicket.photos.length > 0) || selectedTicket.video) ? (
                      <div className="space-y-6">
                        {/* Display Photos */}
                        {selectedTicket.photos && selectedTicket.photos.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Photos</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {selectedTicket.photos.map((photoUrl: string, index: number) => (
                                <div key={`photo-${index}`} className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 transition-all cursor-pointer">
                                  <img 
                                    src={photoUrl} 
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    onClick={() => window.open(photoUrl, '_blank')}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                    <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Display Video */}
                        {selectedTicket.video && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Video</h3>
                            <div className="rounded-lg overflow-hidden border border-gray-200">
                              <video 
                                controls 
                                className="w-full max-h-96"
                                src={selectedTicket.video}
                              >
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No files uploaded for this ticket</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
              
              {activeTab === 'feedback' && (
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <Label className="text-sm font-semibold text-gray-700">Tenant Feedback</Label>
                    {selectedTicket.tenant_satisfaction ? (
                      <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center">
                              {[...Array(10)].map((_, i) => (
                                <span key={i} className={`text-lg ${
                                  i < parseInt(selectedTicket.tenant_satisfaction?.split('/')[0] || '0') ? 'text-yellow-400' : 'text-gray-300'
                                }`}>
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="font-semibold text-gray-800">
                              {selectedTicket.tenant_satisfaction} stars
                            </span>
                          </div>
                          <Badge className="bg-green-100 text-green-800">FEEDBACK</Badge>
                        </div>
                        {selectedTicket.tenant_feedback && (
                          <p className="text-sm text-gray-700 mb-2">{selectedTicket.tenant_feedback}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No feedback provided yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
        )}

        {/* Satisfaction Dialog */}
        <Dialog open={isSatisfactionDialogOpen} onOpenChange={setIsSatisfactionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Work Completion Feedback</DialogTitle>
              <DialogDescription>Please rate your satisfaction with the completed work</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="text-center">
                <Label className="text-sm font-medium mb-4 block">Rate your experience (1-10 stars)</Label>
                <StarRating 
                  rating={feedbackRating}
                  onRatingChange={setFeedbackRating}
                  maxRating={10}
                  size="lg"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Additional Comments (Optional)</Label>
                <Textarea
                  placeholder="Tell us about your experience..."
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter className="flex-col space-y-2">
              <Button variant="outline" onClick={() => {
                setIsSatisfactionDialogOpen(false);
                setFeedbackRating(0);
                setFeedbackComments('');
              }} className="w-full">
                Cancel
              </Button>
              
              {feedbackRating > 0 && feedbackRating <= 5 ? (
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSatisfactionSubmit('close')} 
                    className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                  >
                    Close Ticket
                  </Button>
                  <Button 
                    onClick={() => handleSatisfactionSubmit('reopen')} 
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    Reopen Ticket
                  </Button>
                </div>
              ) : feedbackRating > 5 ? (
                <Button onClick={() => handleSatisfactionSubmit('submit')} disabled={!feedbackRating} className="w-full">
                  Submit Feedback
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
