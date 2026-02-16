import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, Filter, Download, Eye, CheckCircle, XCircle, ThumbsUp, ThumbsDown, FileText, Plus, CircleX, TriangleAlert, MapPin, Calendar, Camera, Video, Upload, Cloud, Building2, Layers, Clock, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService } from '@/services/maintenanceService';
import { getStatusColor, getStatusLabel } from '@/utils/ticketStatus';
import { ReportDialog } from '@/components/reports/ReportDialog';
import { buildingService } from '@/services/buildingService';
import { useAuth } from '@/contexts/AuthContext';
import { AssetInfo } from '@/components/tenant/AssetInfo';
import { MaintenanceTicketForm } from '@/components/tenant/MaintenanceTicketForm';

const mockTickets = [
  {
    id: 'MT001',
    ticket_number: 'MT001',
    tenant_name: 'TechStart Solutions',
    title: 'AC not working in conference room',
    description: 'Air conditioning unit in conference room is not cooling properly',
    status: 'pending_approval',
    priority: 'high',
    category: 'electrical',
    assigned_to: 'John Maintenance',
    estimated_cost: 5000,
    resolution_notes: 'Technician: John Maintenance\nRCA: Compressor failure\nEstimation: ₹5,000',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'MT002',
    ticket_number: 'MT002',
    tenant_name: 'Creative Agency',
    title: 'Water leakage in washroom',
    description: 'Water leaking from pipes in the main washroom',
    status: 'approved',
    priority: 'urgent',
    category: 'plumbing',
    assigned_to: 'Mike Plumber',
    estimated_cost: 3000,
    resolution_notes: 'Approved by manager',
    created_at: '2024-01-12T00:00:00Z'
  },
  {
    id: 'MT003',
    ticket_number: 'MT003',
    tenant_name: 'Innovate Labs',
    title: 'Broken chair needs replacement',
    description: 'Office chair is broken and needs immediate replacement',
    status: 'in_progress',
    priority: 'low',
    category: 'furniture',
    assigned_to: 'Sarah Furniture',
    estimated_cost: 2000,
    created_at: '2024-01-10T00:00:00Z'
  }
];

export default function ManageTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [relatedTicketNumber, setRelatedTicketNumber] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({
    category: '',
    title: '',
    description: '',
    priority: 'Medium',
    safetyRisk: false,
    previousOccurrence: false,
    building_id: '',
    floor_id: '',
    room: '',
    exactSpot: '',
    preferredDate: '',
    preferredTime: '',
    additionalNotes: ''
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTickets();
    loadBuildings();
    const subscription = MaintenanceService.subscribeToTickets(() => loadTickets());
    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (selectedTicket?.related_ticket_id) {
      MaintenanceService.getTicketById(selectedTicket.related_ticket_id)
        .then(ticket => setRelatedTicketNumber(ticket.ticket_number))
        .catch(() => setRelatedTicketNumber(null));
    } else {
      setRelatedTicketNumber(null);
    }
  }, [selectedTicket?.related_ticket_id]);

  const loadBuildings = async () => {
    try {
      const data = await buildingService.getAllBuildings();
      setBuildings(data);
    } catch (error) {
      console.error('Error loading buildings:', error);
    }
  };

  const loadFloors = async (buildingId: string) => {
    try {
      const data = await buildingService.getFloorsByBuilding(buildingId);
      setFloors(data);
    } catch (error) {
      console.error('Error loading floors:', error);
    }
  };

  const handleCreateTicket = async () => {
    console.log('=== handleCreateTicket START ===');
    console.log('ticketForm:', ticketForm);
    console.log('buildings:', buildings);
    console.log('floors:', floors);
    console.log('user:', user);
    
    if (!ticketForm.category || !ticketForm.title || !ticketForm.description || !ticketForm.building_id || !ticketForm.floor_id) {
      console.log('Validation failed');
      toast({ title: "Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    try {
      const building = buildings.find(b => b.id === ticketForm.building_id);
      const floor = floors.find(f => f.id === ticketForm.floor_id);
      console.log('Found building:', building);
      console.log('Found floor:', floor);
      
      const buildingName = building?.name || 'Unknown';
      const floorName = floor?.floor_name || floor?.floor_number || 'Unknown';
      console.log('buildingName:', buildingName);
      console.log('floorName:', floorName);
      
      const ticketData = {
        title: ticketForm.title,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
        tenant_id: user?.id,
        location: `Building: ${buildingName}, Floor: ${floorName}, Room: ${ticketForm.room || 'N/A'}, Spot: ${ticketForm.exactSpot || 'N/A'}`,
        preferred_date: ticketForm.preferredDate || null,
        preferred_time: ticketForm.preferredTime || null,
        additional_notes: `Safety Risk: ${ticketForm.safetyRisk ? 'Yes' : 'No'}\nPrevious Occurrence: ${ticketForm.previousOccurrence ? 'Yes' : 'No'}\n${ticketForm.additionalNotes}`
      };
      console.log('ticketData to create:', ticketData);
      
      await MaintenanceService.createTicket(ticketData);
      console.log('Ticket created successfully');
      
      toast({ title: "Success", description: "Ticket created successfully" });
      setIsCreateTicketOpen(false);
      setTicketForm({
        category: '',
        title: '',
        description: '',
        priority: 'Medium',
        safetyRisk: false,
        previousOccurrence: false,
        building_id: '',
        floor_id: '',
        room: '',
        exactSpot: '',
        preferredDate: '',
        preferredTime: '',
        additionalNotes: ''
      });
      loadTickets();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const data = await MaintenanceService.getAllTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTicket) return;
    try {
      const historyEntry = `[${new Date().toLocaleString()}] MANAGER APPROVED`;
      const newStatus = (!selectedTicket.tenant_id || selectedTicket.skip_tenant_approval) ? 'approved' : 'pending_tenant_approval';
      
      await MaintenanceService.updateTicket(selectedTicket.id, { 
        status: newStatus,
        status_history: `${selectedTicket.status_history || ''}\n${historyEntry}`
      });
      
      // Trigger notification only if going to tenant approval
      if (newStatus === 'pending_tenant_approval' && selectedTicket.tenant_id) {
        const { ticketNotifications } = await import('@/services/ticketNotifications');
        await ticketNotifications.onEstimationReady(
          selectedTicket.id,
          selectedTicket.ticket_number || selectedTicket.id,
          selectedTicket.tenant_id,
          selectedTicket.cost || 0,
          []
        );
      }
      toast({ title: "Success", description: newStatus === 'approved' ? "Estimation approved. Ready for work." : "Estimation approved and sent to tenant for approval" });
      
      setIsDetailOpen(false);
      setSelectedTicket(null);
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    if (!selectedTicket || !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide rejection reason", variant: "destructive" });
      return;
    }
    try {
      const rejectedData = {
        technicians: selectedTicket.assigned_technicians,
        rca: selectedTicket.resolution_notes?.includes('=== RCA ==='),
        estimation: selectedTicket.cost,
        opex_code: selectedTicket.opex_code,
        resolution_notes: selectedTicket.resolution_notes,
        rejection_reason: rejectionReason,
        rejected_at: new Date().toISOString(),
        rejected_by: 'Manager'
      };
      
      // Get existing submissions and add new one
      let submissions = [];
      if (selectedTicket.previous_submissions) {
        try {
          const existing = JSON.parse(selectedTicket.previous_submissions);
          submissions = Array.isArray(existing) ? existing : [existing];
        } catch (e) {
          submissions = [];
        }
      }
      submissions.push(rejectedData);
      
      await MaintenanceService.updateTicket(selectedTicket.id, { 
        status: 'rejected',
        rejection_reason: rejectionReason,
        previous_submissions: JSON.stringify(submissions),
        assigned_technicians: null,
        resolution_notes: null,
        cost: 0,
        opex_code: null
      });
      
      toast({ title: "Success", description: "Estimation rejected. Sent back to helpdesk" });
      setIsDetailOpen(false);
      setSelectedTicket(null);
      setRejectionReason('');
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredTickets = tickets.filter(ticket => {
    const isManagerTicket = !ticket.tenant_id && ticket.created_by_user_id;
    const isSubmitted = ticket.status !== 'pending' || !!ticket.assigned_to || isManagerTicket;
    
    const tenantName = ticket.tenant?.company_name || 'N/A';
    const matchesSearch = tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'all_tickets') {
      matchesStatus = true;
    } else if (statusFilter === 'manager_tickets') {
      matchesStatus = isManagerTicket;
    } else if (statusFilter === 'pending_approval') {
      matchesStatus = ['pending_approval', 'rejected', 'pending_tenant_approval', 'tenant_rejected'].includes(ticket.status);
    } else if (statusFilter === 'in_progress') {
      matchesStatus = ['approved', 'work_started', 'in_progress', 'work_completed'].includes(ticket.status);
    } else if (statusFilter === 'completed') {
      matchesStatus = ['completed', 'resolved', 'closed'].includes(ticket.status);
    } else if (statusFilter !== 'all') {
      matchesStatus = ticket.status === statusFilter;
    }
    
    const matchesPriority = priorityFilter === 'all' || ticket.priority.toLowerCase() === priorityFilter;
    return isSubmitted && matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    totalTickets: tickets.length,
    pendingApproval: tickets.filter(t => t.status === 'pending_approval').length,
    pendingTenantApproval: tickets.filter(t => t.status === 'pending_tenant_approval').length,
    approved: tickets.filter(t => t.status === 'approved' || t.status === 'in_progress').length,
    completed: tickets.filter(t => t.status === 'resolved').length
  };

  return (
    <DashboardLayout title="Manage Tickets" subtitle="Review and approve maintenance estimations">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalTickets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Manager Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.pendingApproval}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tenant Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">{stats.pendingTenantApproval}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Detail Card */}
        {isDetailOpen && selectedTicket && (
          <div className="bg-gray-50 -m-6 p-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-white">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h1>
                </div>
                <p className="text-sm text-gray-500 mt-1">Ticket #{selectedTicket.ticket_number || selectedTicket.id.slice(-6)}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setIsDetailOpen(false); setSelectedTicket(null); setRejectionReason(''); }}>
                <XCircle className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
            {selectedTicket && (
              <Tabs defaultValue="view" className="bg-white">
                <div className="border-b px-6">
                  <TabsList className="bg-transparent">
                    <TabsTrigger value="view">Details</TabsTrigger>
                    <TabsTrigger value="status">Status</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                    <TabsTrigger value="files">Files</TabsTrigger>
                    <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="view" className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* Main Content - Left 70% */}
                    <div className="lg:col-span-2 space-y-3">
                      {/* Location and Visit Preferences - Side by Side */}
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
                                <TriangleAlert className="h-4 w-4" />
                                <span className="font-medium">Safety Risk Identified</span>
                              </div>
                            )}
                            {selectedTicket.previous_occurrence && (
                              <div>
                                <div className="flex items-center gap-2 text-orange-700">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">Previous Occurrence Reported</span>
                                </div>
                                {relatedTicketNumber && (
                                  <p className="text-xs text-gray-600 ml-6 mt-0.5">
                                    Related Ticket: <span className="font-mono font-semibold">{relatedTicketNumber}</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Issue Description */}
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</Label>
                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                      </div>

                      {/* Additional Notes */}
                      {(() => {
                        const additionalNotes = selectedTicket.additional_notes || '';
                        const filteredNotes = additionalNotes.split('\n').filter(line => 
                          !line.includes('Safety Risk:') && 
                          !line.includes('Previous Occurrence:') && 
                          line.trim()
                        ).join('\n');
                        
                        return filteredNotes ? (
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes</Label>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{filteredNotes}</p>
                          </div>
                        ) : null;
                      })()}

                      {/* RCA Section */}
                      {selectedTicket.resolution_notes && (() => {
                        const notes = selectedTicket.resolution_notes;
                        const rcaMatch = notes.match(/=== RCA ===\nRoot Cause: (.+?)\nFindings: (.+?)\n/);
                        
                        return rcaMatch ? (
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Root Cause Analysis</Label>
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
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
                          </div>
                        ) : null;
                      })()}
                      {/* Materials & Cost */}
                      {selectedTicket.resolution_notes && (() => {
                        const notes = selectedTicket.resolution_notes;
                        const materialsMatch = notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                        const costMatch = notes.match(/Material Cost \(without GST\): ₹(.+?)\nTotal GST: ₹(.+?)\nMaterial Cost \(with GST\): ₹(.+?)\nLabor Hours: (.+?)\nLabor Cost: ₹(.+?)\nTotal: ₹(.+?)\nNotes: (.+)/);
                        
                        return (
                          <>
                            {materialsMatch && (
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
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
                              <div className="bg-white rounded-lg border border-gray-200 p-3">
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
                      {/* Manager Decision */}
                      {selectedTicket.status === 'pending_approval' && (
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Manager Decision</Label>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm mb-2 block">Rejection Reason (if rejecting)</Label>
                              <Textarea 
                                value={rejectionReason} 
                                onChange={(e) => setRejectionReason(e.target.value)} 
                                rows={3} 
                                placeholder="Provide reason for rejection..."
                                className="resize-none"
                              />
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" onClick={handleReject} className="flex-1 border-red-200 text-red-700 hover:bg-red-50">
                                <ThumbsDown className="h-4 w-4 mr-2" />Reject
                              </Button>
                              <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700">
                                <ThumbsUp className="h-4 w-4 mr-2" />Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Provide Feedback Button */}
                      {!selectedTicket.tenant_id && selectedTicket.created_by_user_id === user?.id && selectedTicket.status === 'work_completed' && !selectedTicket.creator_satisfaction && (
                        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                            <h2 className="text-base font-semibold text-gray-900">Provide Feedback</h2>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">Work has been completed. Please provide your feedback.</p>
                          <Button size="sm" className="w-full" onClick={() => setIsFeedbackOpen(true)}>
                            <CheckCircle className="mr-2 h-4 w-4" />Provide Feedback
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Sidebar - Right 30% */}
                    <div className="space-y-2.5">
                      {/* Meta Card */}
                      <div className="bg-white rounded-lg border border-gray-200 p-3 sticky top-4">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Ticket Information</Label>
                        <div className="space-y-2.5">
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">Status</Label>
                            <Badge className={getStatusColor(selectedTicket.status)}>{getStatusLabel(selectedTicket.status).toUpperCase()}</Badge>
                          </div>
                          <Separator />
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">Priority</Label>
                            <Badge className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority.toUpperCase()}</Badge>
                          </div>
                          <Separator />
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">Category</Label>
                            <p className="font-medium text-gray-900">{selectedTicket.category}</p>
                          </div>
                          {selectedTicket.asset_id && (
                            <>
                              <Separator />
                              <div>
                                <Label className="text-xs text-gray-500 mb-1 block">Related Asset</Label>
                                <AssetInfo assetId={selectedTicket.asset_id} />
                              </div>
                            </>
                          )}
                          <Separator />
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">Tenant</Label>
                            <p className="font-medium text-gray-900">{selectedTicket.tenant?.company_name || 'N/A'}</p>
                          </div>
                          <Separator />
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">Created</Label>
                            <p className="text-sm text-gray-700">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                          </div>
                          {/* Assigned Technician */}
                          {selectedTicket.resolution_notes && (() => {
                            const notes = selectedTicket.resolution_notes;
                            const techMatch = notes.match(/Technicians?: ([^\n]+)/) || 
                                             notes.match(/assigned_to: ([^\n]+)/) ||
                                             notes.match(/Technician: ([^\n]+)/);
                            return techMatch && techMatch[1] ? (
                              <>
                                <Separator />
                                <div>
                                  <Label className="text-xs text-gray-500 mb-2 block">Assigned Technician</Label>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                      {techMatch[1].split(', ')[0].split(' ').map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900 text-sm">{techMatch[1].split(' (')[0]}</p>
                                      <p className="text-xs text-gray-600">
                                        {techMatch[1].includes('(') ? techMatch[1].split('(')[1]?.replace(')', '') : 'Technician'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : null;
                          })()}
                          <Separator />
                          <div>
                            <Label className="text-xs text-gray-500 mb-1 block">OPEX Code</Label>
                            <p className="font-medium text-gray-900">{selectedTicket.opex_code || 'Not Set'}</p>
                          </div>
                          {selectedTicket.cost > 0 && (
                            <>
                              <Separator />
                              <div>
                                <Label className="text-xs text-gray-500 mb-2 block">Estimated Cost</Label>
                                <p className="text-2xl font-bold text-blue-600">₹{selectedTicket.cost.toLocaleString()}</p>
                              </div>
                            </>
                          )}
                          {selectedTicket.assigned_technicians && selectedTicket.assigned_technicians.length > 0 && (
                            <>
                              <Separator />
                              <div>
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
                            </>
                          )}
                          
                          {/* Work Tracking */}
                          <Separator />
                          <div>
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
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="status" className="p-6">
                  <Card className="border">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-6">Ticket Timeline</h3>
                      <div className="space-y-6">
                        <div className="flex gap-4">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
                          <div className="flex-1">
                            <p className="font-semibold">Ticket Created</p>
                            <p className="text-sm text-gray-600">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {(() => {
                          const events = [];
                          
                          let previousSubmissions = [];
                          if (selectedTicket.previous_submissions) {
                            try {
                              const parsed = JSON.parse(selectedTicket.previous_submissions);
                              previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) {}
                          }
                          
                          previousSubmissions.forEach((sub, idx) => {
                            if (sub.technicians && sub.technicians.length > 0) {
                              events.push({ type: 'technicians', data: sub.technicians, timestamp: sub.timestamp || sub.rejected_at, submissionIndex: idx + 1 });
                            }
                            if (sub.resolution_notes?.includes('=== RCA ===')) {
                              events.push({ type: 'rca', timestamp: sub.timestamp || sub.rejected_at, submissionIndex: idx + 1 });
                            }
                            if (sub.estimation) {
                              events.push({ type: 'estimation', cost: sub.estimation, timestamp: sub.timestamp || sub.rejected_at, submissionIndex: idx + 1 });
                            }
                            events.push({ type: 'rejected', reason: sub.rejection_reason, timestamp: sub.rejected_at || sub.timestamp, submissionIndex: idx + 1 });
                            if (idx < previousSubmissions.length - 1 || selectedTicket.status !== 'rejected') {
                              events.push({ type: 'resubmit', timestamp: sub.rejected_at || sub.timestamp, submissionIndex: idx + 1 });
                            }
                          });
                          
                          // Current submission - only show if not already in history
                          const hasCurrentInHistory = previousSubmissions.some(sub => 
                            sub.technicians?.some((t: any) => 
                              selectedTicket.assigned_technicians?.some((ct: any) => ct.id === t.id)
                            )
                          );
                          
                          if (!hasCurrentInHistory && selectedTicket.assigned_technicians && selectedTicket.assigned_technicians.length > 0) {
                            events.push({ type: 'technicians', data: selectedTicket.assigned_technicians, timestamp: selectedTicket.created_at });
                          }
                          if (!hasCurrentInHistory && selectedTicket.resolution_notes?.includes('=== RCA ===')) {
                            events.push({ type: 'rca', timestamp: selectedTicket.created_at });
                          }
                          if (!hasCurrentInHistory && selectedTicket.resolution_notes?.includes('=== ESTIMATION ===')) {
                            events.push({ type: 'estimation', cost: selectedTicket.cost, timestamp: selectedTicket.created_at });
                          }
                          
                          // Approval events from status_history
                          if (selectedTicket.status_history) {
                            const managerApprovalMatch = selectedTicket.status_history.match(/\[(.*?)\] MANAGER APPROVED/);
                            if (managerApprovalMatch) {
                              events.push({ type: 'manager_approved', timestamp: new Date(managerApprovalMatch[1]).toISOString() });
                            }
                            // Only show tenant approval if ticket has a tenant
                            if (selectedTicket.tenant_id) {
                              const tenantApprovalMatch = selectedTicket.status_history.match(/\[(.*?)\] TENANT APPROVED/);
                              if (tenantApprovalMatch) {
                                events.push({ type: 'tenant_approved', timestamp: new Date(tenantApprovalMatch[1]).toISOString() });
                              }
                            }
                          }
                          if (selectedTicket.work_started_at) {
                            events.push({ type: 'work_started', timestamp: selectedTicket.work_started_at });
                          }
                          if (selectedTicket.work_completed_at) {
                            events.push({ type: 'work_completed', timestamp: selectedTicket.work_completed_at });
                          }
                          
                          // Sort events by timestamp
                          events.sort((a, b) => {
                            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                            return timeA - timeB;
                          });
                          
                          return events.map((event, idx) => {
                            switch (event.type) {
                              case 'technicians':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">Technicians Assigned {event.submissionIndex ? `(Submission ${event.submissionIndex})` : ''}</p>
                                      <p className="text-sm text-gray-600">{event.data.map((t: any) => t.name).join(', ')}</p>
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'rca':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-purple-500 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">RCA Added {event.submissionIndex ? `(Submission ${event.submissionIndex})` : ''}</p>
                                      <p className="text-sm text-gray-600">Root cause analysis completed</p>
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'estimation':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-orange-500 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">Estimation Submitted {event.submissionIndex ? `(Submission ${event.submissionIndex})` : ''}</p>
                                      <p className="text-sm text-gray-600">Cost: ₹{event.cost?.toLocaleString() || 'N/A'}</p>
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'rejected':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-red-600">Manager Rejected {event.submissionIndex ? `(Submission ${event.submissionIndex})` : ''}</p>
                                      <p className="text-sm text-gray-600">Estimation rejected by manager</p>
                                      {event.reason && <p className="text-sm text-gray-700 mt-1">Reason: {event.reason}</p>}
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'resubmit':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-indigo-600">Re-submitted</p>
                                      <p className="text-sm text-gray-600">New estimation submitted after rejection</p>
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'manager_approved':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-green-600 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">Manager Approved</p>
                                      <p className="text-sm text-gray-600">Estimation approved by manager</p>
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'tenant_approved':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-purple-600 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">Tenant Approved</p>
                                      <p className="text-sm text-gray-600">Estimation approved by tenant</p>
                                      <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  </div>
                                );
                              case 'work_started':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-blue-600 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">Work Started</p>
                                      <p className="text-sm text-gray-600">Technician began work</p>
                                      <p className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                                    </div>
                                  </div>
                                );
                              case 'work_completed':
                                return (
                                  <div key={idx} className="flex gap-4">
                                    <div className="w-3 h-3 rounded-full bg-green-700 mt-1"></div>
                                    <div className="flex-1">
                                      <p className="font-semibold">Work Completed</p>
                                      <p className="text-sm text-gray-600">Ticket resolved</p>
                                      <p className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
                                    </div>
                                  </div>
                                );
                              default:
                                return null;
                            }
                          });
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="files" className="p-6">
                  {/* Photos Section */}
                  {selectedTicket.photos && selectedTicket.photos.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        Photos ({selectedTicket.photos.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedTicket.photos.map((photo: string, index: number) => (
                          <div key={index} className="relative group">
                            <img 
                              src={photo.replace('/uploads/', '/api/files/')} 
                              alt={`Photo ${index + 1}`}
                              className="w-full h-40 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(photo.replace('/uploads/', '/api/files/'), '_blank')}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition"
                              onClick={() => window.open(photo.replace('/uploads/', '/api/files/'), '_blank')}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Video Section */}
                  {selectedTicket.video && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video
                      </h4>
                      <div className="relative">
                        <video 
                          controls 
                          className="w-full rounded-lg border"
                          src={selectedTicket.video.replace('/uploads/', '/api/files/')}
                        >
                          Your browser does not support the video tag.
                        </video>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-2"
                          onClick={() => window.open(selectedTicket.video.replace('/uploads/', '/api/files/'), '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Video
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* No Files Message */}
                  {(!selectedTicket.photos || selectedTicket.photos.length === 0) && !selectedTicket.video && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileImage className="mx-auto h-12 w-12 mb-3 opacity-50" />
                      <p>No files attached to this ticket</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="p-6">
                  <div className="space-y-6">
                    {(() => {
                      try {
                        const submissions = selectedTicket.previous_submissions ? JSON.parse(selectedTicket.previous_submissions) : null;
                        
                        if (!submissions) {
                          return <p className="text-center text-gray-500 py-8">No submission history available</p>;
                        }
                        
                        const submissionArray = Array.isArray(submissions) ? submissions : [submissions];
                        
                        // Reverse array to show newest first
                        return submissionArray.reverse().map((sub, idx) => {
                          const rejectedBy = sub.rejected_by || 'Manager';
                          const reopenedBy = sub.reopened_by;
                          const isReopened = !!reopenedBy;
                          const statusLabel = isReopened ? `Reopened by ${reopenedBy}` : `Rejected by ${rejectedBy}`;
                          const statusColor = isReopened ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300';
                          const iconColor = isReopened ? 'text-yellow-600' : 'text-red-600';
                          
                          return (
                            <Card key={idx} className={`${statusColor} border`}>
                              <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  {isReopened ? <TriangleAlert className={`h-5 w-5 ${iconColor}`} /> : <XCircle className={`h-5 w-5 ${iconColor}`} />}
                                  <h3 className="text-lg font-semibold text-gray-900">{statusLabel}</h3>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="bg-white p-3 rounded border">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Submission Date</p>
                                    <p className="text-sm text-gray-900">{sub.timestamp ? new Date(sub.timestamp).toLocaleString() : sub.rejected_at ? new Date(sub.rejected_at).toLocaleString() : 'N/A'}</p>
                                  </div>
                                  
                                  {sub.rejection_reason && (
                                    <div className="bg-white p-3 rounded border border-red-200">
                                      <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                                      <p className="text-sm text-gray-900">{sub.rejection_reason}</p>
                                    </div>
                                  )}
                                  
                                  {sub.technicians && sub.technicians.length > 0 && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Assigned Technicians</p>
                                      <div className="space-y-2">
                                        {sub.technicians.map((tech: any, i: number) => (
                                          <div key={i} className="flex items-center gap-2 text-sm">
                                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                              {tech.name?.charAt(0) || 'T'}
                                            </div>
                                            <div>
                                              <p className="font-medium text-gray-900">{tech.name}</p>
                                              <p className="text-xs text-gray-600">{tech.specialization}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {sub.resolution_notes?.includes('=== RCA ===') && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Root Cause Analysis</p>
                                      {(() => {
                                        const rcaMatch = sub.resolution_notes.match(/=== RCA ===\s*\nRoot Cause: ([^\n]+)\s*\nFindings: ([^\n]+)/);
                                        return rcaMatch ? (
                                          <div className="space-y-2 text-sm">
                                            <div>
                                              <p className="text-xs font-semibold text-gray-700">Root Cause:</p>
                                              <p className="text-gray-900">{rcaMatch[1]}</p>
                                            </div>
                                            <div>
                                              <p className="text-xs font-semibold text-gray-700">Findings:</p>
                                              <p className="text-gray-900">{rcaMatch[2]}</p>
                                            </div>
                                          </div>
                                        ) : <p className="text-sm text-gray-500">RCA data not available</p>;
                                      })()}
                                    </div>
                                  )}
                                  
                                  {sub.resolution_notes?.includes('Materials:') && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Materials Required</p>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b bg-gray-50">
                                              <th className="text-left p-2 font-semibold">Item</th>
                                              <th className="text-right p-2 font-semibold">Qty</th>
                                              <th className="text-right p-2 font-semibold">Rate</th>
                                              <th className="text-right p-2 font-semibold">GST%</th>
                                              <th className="text-right p-2 font-semibold">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(() => {
                                              const materialsMatch = sub.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                                              return materialsMatch ? materialsMatch[1].split('\n').map((line: string, i: number) => {
                                                const parts = line.split(' | ');
                                                return parts.length === 6 ? (
                                                  <tr key={i} className="border-b">
                                                    <td className="p-2">{parts[0]}</td>
                                                    <td className="text-right p-2">{parts[1]}</td>
                                                    <td className="text-right p-2">{parts[2]}</td>
                                                    <td className="text-right p-2">{parts[3]}</td>
                                                    <td className="text-right p-2 font-semibold">{parts[5]}</td>
                                                  </tr>
                                                ) : null;
                                              }) : <tr><td colSpan={5} className="text-center p-2 text-gray-500">No materials data</td></tr>;
                                            })()}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {sub.resolution_notes?.includes('Material Cost') && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Cost Breakdown</p>
                                      <div className="space-y-2 text-sm">
                                        {(() => {
                                          const costMatch = sub.resolution_notes.match(/Material Cost \(without GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nTotal GST: ₹([\d,]+(?:\.\d{2})?)\s*\nMaterial Cost \(with GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nLabor Hours: ([\d.]+)\s*\nLabor Cost: ₹([\d,]+(?:\.\d{2})?)\s*\nTotal: ₹([\d,]+(?:\.\d{2})?)/s);
                                          return costMatch ? (
                                            <>
                                              <div className="flex justify-between py-1 border-b">
                                                <span className="text-gray-600">Material Cost (without GST)</span>
                                                <span className="font-semibold">₹{costMatch[1]}</span>
                                              </div>
                                              <div className="flex justify-between py-1 border-b">
                                                <span className="text-gray-600">Total GST</span>
                                                <span className="font-semibold">₹{costMatch[2]}</span>
                                              </div>
                                              <div className="flex justify-between py-1 border-b">
                                                <span className="text-gray-600">Material Cost (with GST)</span>
                                                <span className="font-semibold">₹{costMatch[3]}</span>
                                              </div>
                                              <div className="flex justify-between py-1 border-b">
                                                <span className="text-gray-600">Labor Hours</span>
                                                <span className="font-semibold">{costMatch[4]}</span>
                                              </div>
                                              <div className="flex justify-between py-1 border-b">
                                                <span className="text-gray-600">Labor Cost</span>
                                                <span className="font-semibold">₹{costMatch[5]}</span>
                                              </div>
                                              <div className="flex justify-between py-2 bg-gray-100 -mx-3 px-3 mt-2">
                                                <span className="font-bold">Total Estimation</span>
                                                <span className="font-bold text-lg">₹{costMatch[6]}</span>
                                              </div>
                                            </>
                                          ) : <p className="text-gray-500">Cost data not available</p>;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {sub.opex_code && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">OPEX Code</p>
                                      <p className="text-sm font-mono text-gray-900">{sub.opex_code}</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        });
                      } catch (e) {
                        return <p className="text-center text-red-500 py-8">Error loading submission history</p>;
                      }
                    })()}
                  </div>
                </TabsContent>
                
                <TabsContent value="feedback" className="p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedTicket.tenant_id ? 'Tenant Feedback' : 'Creator Feedback'}</CardTitle>
                      <CardDescription>Customer satisfaction and feedback history</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
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
                        ) : selectedTicket.creator_satisfaction ? (
                          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center">
                                  {[...Array(10)].map((_, i) => (
                                    <span key={i} className={`text-lg ${
                                      i < parseInt(selectedTicket.creator_satisfaction?.split('/')[0] || '0') ? 'text-yellow-400' : 'text-gray-300'
                                    }`}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                                <span className="font-semibold text-gray-800">
                                  {selectedTicket.creator_satisfaction} stars
                                </span>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">FEEDBACK</Badge>
                            </div>
                            {selectedTicket.creator_feedback && (
                              <p className="text-sm text-gray-700 mb-2">{selectedTicket.creator_feedback}</p>
                            )}
                          </div>
                        ) : !selectedTicket.tenant_id && selectedTicket.created_by_user_id === user?.id && (selectedTicket.status === 'work_completed' || selectedTicket.status === 'completed') ? (
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Rate the work quality (1-10)</Label>
                              <div className="flex gap-2">
                                {[...Array(10)].map((_, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                      const rating = i + 1;
                                      setSelectedTicket({...selectedTicket, creator_satisfaction: `${rating}/10`});
                                    }}
                                    className={`text-2xl transition-colors ${
                                      i < parseInt(selectedTicket.creator_satisfaction?.split('/')[0] || '0') ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                                    }`}
                                  >
                                    ★
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Feedback (optional)</Label>
                              <Textarea
                                value={selectedTicket.creator_feedback || ''}
                                onChange={(e) => setSelectedTicket({...selectedTicket, creator_feedback: e.target.value})}
                                rows={4}
                                placeholder="Share your feedback about the work..."
                              />
                            </div>
                            <Button
                              className="w-full"
                              onClick={async () => {
                                if (!selectedTicket.creator_satisfaction) {
                                  toast({ title: "Error", description: "Please provide a rating", variant: "destructive" });
                                  return;
                                }
                                try {
                                  await MaintenanceService.updateTicket(selectedTicket.id, {
                                    creator_satisfaction: selectedTicket.creator_satisfaction,
                                    creator_feedback: selectedTicket.creator_feedback || null,
                                    status: 'completed'
                                  });
                                  toast({ title: "Success", description: "Feedback submitted successfully" });
                                  loadTickets();
                                  const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                  setSelectedTicket(refreshedTicket);
                                } catch (error: any) {
                                  toast({ title: "Error", description: error.message, variant: "destructive" });
                                }
                              }}
                            >
                              Submit Feedback
                            </Button>
                          </div>
                        ) : (
                          <p className="text-center text-gray-500 py-8">No feedback available for this ticket</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* Main Content */}
        {!isDetailOpen && !isCreateTicketOpen && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Maintenance Tickets</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={() => setIsCreateTicketOpen(true)} variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Ticket
                </Button>
                <Button onClick={() => setIsReportDialogOpen(true)} variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Overall Report
                </Button>
              </div>
            </div>
            <Tabs defaultValue="all" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" onClick={() => setStatusFilter('all_tickets')}>All Tickets</TabsTrigger>
                <TabsTrigger value="manager" onClick={() => setStatusFilter('manager_tickets')}>Manager Tickets</TabsTrigger>
                <TabsTrigger value="approval" onClick={() => setStatusFilter('pending_approval')}>Approval Pending</TabsTrigger>
                <TabsTrigger value="progress" onClick={() => setStatusFilter('in_progress')}>In Progress</TabsTrigger>
                <TabsTrigger value="completed" onClick={() => setStatusFilter('completed')}>Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search tickets..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-40">
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
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">No tickets found</TableCell>
                    </TableRow>
                  ) : (
                    filteredTickets.map((ticket: any) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.ticket_number || '#' + ticket.id.slice(-6)}</TableCell>
                        <TableCell>{ticket.tenant?.company_name || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">{ticket.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ticket.category.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ticket.status)}>
                            {getStatusLabel(ticket.status).toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(ticket.priority.toLowerCase())}>
                            {ticket.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.assigned_to || 'Unassigned'}</TableCell>
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
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Create Ticket Form */}
        {isCreateTicketOpen && !isDetailOpen && (
        <Card className="animate-in slide-in-from-top-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Maintenance Request Form</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateTicketOpen(false)}>
              <CircleX className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <MaintenanceTicketForm
              isOpen={true}
              onClose={() => setIsCreateTicketOpen(false)}
              onSuccess={() => {
                setIsCreateTicketOpen(false);
                loadTickets();
                toast({ title: "Success", description: "Ticket created successfully" });
              }}
            />
          </CardContent>
        </Card>
        )}

        <ReportDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} tickets={tickets} />
        
        {/* Feedback Dialog */}
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Work Completion Feedback</DialogTitle>
              <p className="text-sm text-muted-foreground">Please rate your satisfaction with the completed work</p>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-center">
                <Label className="text-sm font-medium mb-4 block">Rate your experience (1-10 stars)</Label>
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeedbackRating(i + 1)}
                      className="transition-colors duration-150 cursor-pointer hover:scale-110"
                    >
                      <svg className={`h-8 w-8 ${i < feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-300'}`} viewBox="0 0 24 24">
                        <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>
                      </svg>
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-medium text-gray-600">{feedbackRating}/10</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Additional Comments (Optional)</Label>
                <Textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter className="flex sm:flex-row sm:justify-end sm:space-x-2 flex-col space-y-2">
              <Button variant="outline" onClick={() => { setIsFeedbackOpen(false); setFeedbackRating(0); setFeedbackComment(''); }} className="w-full">Cancel</Button>
              {feedbackRating <= 5 && feedbackRating > 0 ? (
                <div className="flex gap-2 w-full">
                  <Button onClick={async () => {
                    if (!feedbackRating) {
                      toast({ title: "Error", description: "Please provide a rating", variant: "destructive" });
                      return;
                    }
                    try {
                      await MaintenanceService.updateTicket(selectedTicket!.id, {
                        creator_satisfaction: `${feedbackRating}/10`,
                        creator_feedback: feedbackComment || null,
                        status: 'completed'
                      });
                      toast({ title: "Success", description: "Ticket closed with feedback" });
                      setIsFeedbackOpen(false);
                      setFeedbackRating(0);
                      setFeedbackComment('');
                      loadTickets();
                      const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket!.id);
                      setSelectedTicket(refreshedTicket);
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    }
                  }} variant="outline" className="flex-1 border-green-200 text-green-700 hover:bg-green-50">Close Ticket</Button>
                  <Button onClick={async () => {
                    if (!feedbackRating) {
                      toast({ title: "Error", description: "Please provide a rating", variant: "destructive" });
                      return;
                    }
                    try {
                      // Save current submission to history before reopening
                      let previousSubmissions = [];
                      if (selectedTicket.previous_submissions) {
                        try {
                          const parsed = JSON.parse(selectedTicket.previous_submissions);
                          previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {}
                      }
                      const reopenedData = {
                        technicians: selectedTicket.assigned_technicians,
                        resolution_notes: selectedTicket.resolution_notes,
                        cost: selectedTicket.cost,
                        opex_code: selectedTicket.opex_code,
                        reopened_at: new Date().toISOString(),
                        reopened_by: user?.role || 'Manager',
                        creator_satisfaction: `${feedbackRating}/10`,
                        creator_feedback: feedbackComment || null
                      };
                      previousSubmissions.push(reopenedData);
                      
                      await MaintenanceService.updateTicket(selectedTicket!.id, {
                        creator_satisfaction: null,
                        creator_feedback: null,
                        status: 'pending',
                        previous_submissions: JSON.stringify(previousSubmissions),
                        assigned_technicians: null,
                        resolution_notes: null,
                        cost: 0,
                        opex_code: null,
                        work_started_at: null,
                        work_completed_at: null,
                        work_duration_hours: null,
                        sla_hours: null
                      });
                      toast({ title: "Success", description: "Ticket reopened with feedback" });
                      setIsFeedbackOpen(false);
                      setFeedbackRating(0);
                      setFeedbackComment('');
                      loadTickets();
                      const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket!.id);
                      setSelectedTicket(refreshedTicket);
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    }
                  }} className="flex-1 bg-orange-600 hover:bg-orange-700">Reopen Ticket</Button>
                </div>
              ) : (
                <Button onClick={async () => {
                  if (!feedbackRating) {
                    toast({ title: "Error", description: "Please provide a rating", variant: "destructive" });
                    return;
                  }
                  try {
                    await MaintenanceService.updateTicket(selectedTicket!.id, {
                      creator_satisfaction: `${feedbackRating}/10`,
                      creator_feedback: feedbackComment || null,
                      status: 'completed'
                    });
                    toast({ title: "Success", description: "Feedback submitted successfully" });
                    setIsFeedbackOpen(false);
                    setFeedbackRating(0);
                    setFeedbackComment('');
                    loadTickets();
                    const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket!.id);
                    setSelectedTicket(refreshedTicket);
                  } catch (error: any) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }} className="w-full">Submit Feedback</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
