import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ReportDialog } from '@/components/reports/ReportDialog';
import { MaintenanceTicketForm } from '@/components/tenant/MaintenanceTicketForm';
import { 
  Search, Eye, UserPlus, FileText, DollarSign, Play, Upload, 
  CheckCircle, Clock, AlertTriangle, XCircle, Send, Image as ImageIcon,
  Calendar, MapPin, Building, User, Phone, Mail, Plus, Trash2, Square, Download, Filter, Camera, Video, CircleX, TriangleAlert, Cloud, Building2, Layers, ChevronDown
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService, MaintenanceTicket } from '@/services/maintenanceService';
import { HelpdeskService } from '@/services/helpdeskService';
import { DashboardStats, MaterialItem } from '@/types/helpdesk.types';
import { getStatusColor, getStatusLabel } from '@/utils/ticketStatus';
import { buildingService } from '@/services/buildingService';
import { useAuth } from '@/contexts/AuthContext';
import { AssetInfo } from '@/components/tenant/AssetInfo';
import { sendTicketNotification } from '@/services/ticketNotifications';
export default function HelpdeskDashboard() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<MaintenanceTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [relatedTicketNumber, setRelatedTicketNumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // Dialogs
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRCAOpen, setIsRCAOpen] = useState(false);
  const [isEstimationOpen, setIsEstimationOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [slaHours, setSlaHours] = useState('');
  // Form states
  const [technicianForm, setTechnicianForm] = useState({ name: '', contact: '', specialization: '' });
  const [rcaForm, setRcaForm] = useState({ rootCause: '', findings: '' });
  const [estimationForm, setEstimationForm] = useState({ 
    materials: [] as MaterialItem[], 
    materialCost: 0, 
    laborHours: 0, 
    laborCost: 0, 
    totalCost: 0, 
    notes: '',
    timeline: '',
    totalGstAmount: 0,
    materialCostWithoutGst: 0,
    numLabourers: 0,
    workHours: 0,
    laborCostPerHour: 0
  });
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [materialInput, setMaterialInput] = useState({ name: '', category: '', rate: 0, uom: '' });
  const [materialCategories, setMaterialCategories] = useState<string[]>(['Electrical', 'Plumbing', 'HVAC', 'Carpentry', 'Painting']);
  const [newCategory, setNewCategory] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('all');
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);
  const [isViewTechniciansOpen, setIsViewTechniciansOpen] = useState(false);
  const [isViewMaterialsOpen, setIsViewMaterialsOpen] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
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
    targetDate: '',
    additionalNotes: ''
  });
  const { user } = useAuth();
  const [progressForm, setProgressForm] = useState({ update: '', status: 'in_progress' });
  const [completionForm, setCompletionForm] = useState({ notes: '', images: [] as File[] });
  const [showActionForm, setShowActionForm] = useState(false);
  const [activeTab, setActiveTab] = useState('technicians');
  const { toast } = useToast();
  // Auto-refresh tickets every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets();
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    loadTickets();
    // Subscribe to real-time ticket updates
    const subscription = MaintenanceService.subscribeToTickets(() => {
      loadTickets();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter, priorityFilter]);
  useEffect(() => {
    const fetchRelatedTicket = async () => {
      if (selectedTicket?.related_ticket_id) {
        try {
          const relatedTicket = await MaintenanceService.getTicketById(selectedTicket.related_ticket_id);
          setRelatedTicketNumber(relatedTicket.ticket_number || '');
        } catch (error) {
          console.error('Error fetching related ticket:', error);
          setRelatedTicketNumber('');
        }
      } else {
        setRelatedTicketNumber('');
      }
    };
    fetchRelatedTicket();
  }, [selectedTicket?.related_ticket_id]);
  const loadTickets = async () => {
    try {
      const data = await MaintenanceService.getAllTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    }
  };
  const loadResources = async () => {
    try {
      const { userService } = await import('@/data/userData');
      const [allUsers, matData] = await Promise.all([
        userService.getAllUsers(),
        HelpdeskService.getMaterials()
      ]);
      // Filter users with 'Technician' in selectedRoles array
      const technicianUsers = allUsers
        .filter(user => user.selectedRoles?.includes('Technician') && user.isActive)
        .map(user => ({
          id: user.id,
          name: user.name,
          contact: user.phone || user.email,
          specialization: user.technicianCategory || user.department || 'General'
        }));
      setTechnicians(technicianUsers);
      setMaterials(matData);
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };
  useEffect(() => {
    loadResources();
    loadBuildings();
  }, []);
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
        tenant_id: null,
        created_by_user_id: user?.id || null,
        building: buildingName,
        floor: floorName,
        room: ticketForm.room || null,
        spot_description: ticketForm.exactSpot || null,
        preferred_date: ticketForm.preferredDate || null,
        preferred_time: ticketForm.preferredTime || null,
        safety_risk: ticketForm.safetyRisk,
        previous_occurrence: ticketForm.previousOccurrence,
        notes: ticketForm.additionalNotes || null
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
        targetDate: '',
        additionalNotes: ''
      });
      loadTickets();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  const filterTickets = () => {
    let filtered = tickets;
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter === 'all_tickets') {
      // Show all tickets - no filtering
    } else if (statusFilter === 'all') {
      filtered = filtered.filter(t => ['pending', 'reopened'].includes(t.status));
    } else if (statusFilter === 'pending_approval') {
      filtered = filtered.filter(t => ['pending_approval', 'rejected', 'pending_tenant_approval', 'tenant_rejected'].includes(t.status));
    } else if (statusFilter === 'in_progress') {
      filtered = filtered.filter(t => ['approved', 'work_started', 'in_progress', 'work_completed'].includes(t.status));
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(t => ['completed', 'resolved', 'closed'].includes(t.status));
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority.toLowerCase() === priorityFilter);
    }
    setFilteredTickets(filtered);
  };
  const handleAssignTechnician = async () => {
    if (!selectedTicket || !technicianForm.name) {
      toast({ title: "Error", description: "Technician name required", variant: "destructive" });
      return;
    }
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, {
        assigned_to: technicianForm.name,
        status: 'assigned',
        resolution_notes: `Technician: ${technicianForm.name}\nContact: ${technicianForm.contact}\nSpecialization: ${technicianForm.specialization}`
      });
      toast({ title: "Success", description: "Technician assigned" });
      sendTicketNotification('ticket.assigned', { ...selectedTicket, status: 'assigned', assigned_to: technicianForm.name }).catch(console.error);
      setIsAssignOpen(false);
      setTechnicianForm({ name: '', contact: '', specialization: '' });
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  const handleAddRCA = async () => {
    if (!selectedTicket || !rcaForm.rootCause) {
      toast({ title: "Error", description: "Root cause required", variant: "destructive" });
      return;
    }
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, {
        status: 'rca_added',
        resolution_notes: `${selectedTicket.resolution_notes || ''}\n\n=== RCA ===\nRoot Cause: ${rcaForm.rootCause}\nFindings: ${rcaForm.findings}`
      });
      toast({ title: "Success", description: "RCA added" });
      setIsRCAOpen(false);
      setRcaForm({ rootCause: '', findings: '' });
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  const handleAddEstimation = async () => {
    if (!selectedTicket || !estimationForm.totalCost) {
      toast({ title: "Error", description: "Total cost required", variant: "destructive" });
      return;
    }
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, {
        status: 'pending_approval',
        cost: parseFloat(estimationForm.totalCost),
        resolution_notes: `${selectedTicket.resolution_notes || ''}\n\n=== ESTIMATION ===\nMaterials: ${estimationForm.materials}\nMaterial Cost: ₹${estimationForm.materialCost}\nLabor Hours: ${estimationForm.laborHours}\nLabor Cost: ₹${estimationForm.laborCost}\nTotal: ₹${estimationForm.totalCost}\nNotes: ${estimationForm.notes}`
      });
      toast({ title: "Success", description: "Estimation sent for approval" });
      sendTicketNotification('ticket.estimation_submitted', { ...selectedTicket, status: 'pending_approval' }).catch(console.error);
      setIsEstimationOpen(false);
      setEstimationForm({ materials: '', materialCost: '', laborHours: '', laborCost: '', totalCost: '', notes: '' });
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  const handleCompleteWork = async () => {
    if (!selectedTicket || !completionForm.notes) {
      toast({ title: "Error", description: "Completion notes required", variant: "destructive" });
      return;
    }
    try {
      await MaintenanceService.updateTicket(selectedTicket.id, {
        status: 'completed',
        resolved_at: new Date().toISOString(),
        resolution_notes: `${selectedTicket.resolution_notes || ''}\n\n=== COMPLETION ===\n${completionForm.notes}\nImages: ${completionForm.images.length} uploaded`
      });
      toast({ title: "Success", description: "Work completed. Tenant notified." });
      sendTicketNotification('ticket.work_completed', { ...selectedTicket, status: 'completed' }).catch(console.error);
      setIsCompleteOpen(false);
      setCompletionForm({ notes: '', images: [] });
      loadTickets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  const getStatusBadge = (status: string) => {
    return <Badge className={getStatusColor(status)}>{getStatusLabel(status).toUpperCase()}</Badge>;
  };
  const stats: DashboardStats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'pending' || t.status === 'reopened').length,
    in_progress: tickets.filter(t => ['assigned', 'rca_added', 'pending_approval', 'rejected', 'pending_tenant_approval', 'tenant_rejected', 'approved', 'work_started', 'in_progress', 'work_completed'].includes(t.status)).length,
    completed: tickets.filter(t => ['completed', 'resolved', 'closed'].includes(t.status)).length,
    on_hold: tickets.filter(t => t.status === 'on_hold').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
    pending_estimations: tickets.filter(t => ['assigned', 'rca_added'].includes(t.status)).length,
    pending_approvals: tickets.filter(t => ['pending_approval', 'pending_tenant_approval'].includes(t.status)).length,
    critical_priority: tickets.filter(t => t.priority === 'Critical' || t.priority === 'Urgent').length,
    overdue: tickets.filter(t => !['completed', 'resolved', 'closed'].includes(t.status)).length
  };
  return (
    <DashboardLayout title="Helpdesk Dashboard" subtitle="Complete Maintenance Management">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Tickets</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('open')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Open</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('in_progress')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('completed')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('on_hold')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.on_hold}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Estimations</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending_estimations}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-purple-600">{stats.pending_approvals}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Critical Priority</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical_priority}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-gray-600">{stats.cancelled}</p>
            </CardContent>
          </Card>
        </div>
        {/* Quick Actions */}
        {!isCreateTicketOpen && (
        <div className="flex gap-4">
          <Button onClick={() => setIsCreateTicketOpen(true)} variant="default">
            <Plus className="mr-2 h-4 w-4" />Add Ticket
          </Button>
          <Button onClick={() => setIsReportDialogOpen(true)} variant="outline">
            <Download className="mr-2 h-4 w-4" />Generate Report
          </Button>
        </div>
        )}
        {/* Filters */}
        {!isCreateTicketOpen && (
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, title, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                  <SelectItem value="pending_approval">Pending Manager Approval</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="pending_tenant_approval">Pending Tenant Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        )}
        {/* Tickets Table */}
        {!isDetailOpen && !isCreateTicketOpen && (
        <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
          <div className="flex flex-col space-y-1.5 p-6 border-b border-gray-200">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Maintenance Tickets</h3>
            <div dir="ltr" data-orientation="horizontal" className="w-full mt-4">
              <div role="tablist" aria-orientation="horizontal" className="h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground grid w-full grid-cols-5" tabIndex={0} data-orientation="horizontal">
                <button type="button" role="tab" onClick={() => setStatusFilter('all_tickets')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${statusFilter === 'all_tickets' ? 'bg-background text-foreground shadow-sm' : ''}`}>All Tickets</button>
                <button type="button" role="tab" onClick={() => setStatusFilter('all')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${statusFilter === 'all' ? 'bg-background text-foreground shadow-sm' : ''}`}>Pending/Reopened</button>
                <button type="button" role="tab" onClick={() => setStatusFilter('pending_approval')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${statusFilter === 'pending_approval' ? 'bg-background text-foreground shadow-sm' : ''}`}>Approval Pending</button>
                <button type="button" role="tab" onClick={() => setStatusFilter('in_progress')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${statusFilter === 'in_progress' ? 'bg-background text-foreground shadow-sm' : ''}`}>In Progress</button>
                <button type="button" role="tab" onClick={() => setStatusFilter('completed')} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${statusFilter === 'completed' ? 'bg-background text-foreground shadow-sm' : ''}`}>Resolved</button>
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                <TableHead className="text-gray-600 font-semibold uppercase text-xs">ID</TableHead>
                <TableHead className="text-gray-600 font-semibold uppercase text-xs">Tenant</TableHead>
                <TableHead className="text-gray-600 font-semibold uppercase text-xs">Issue</TableHead>
                <TableHead className="text-gray-600 font-semibold uppercase text-xs">Category</TableHead>
                <TableHead className="text-gray-600 font-semibold uppercase text-xs">Priority</TableHead>
                <TableHead className="text-gray-600 font-semibold uppercase text-xs">Status</TableHead>
                <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedTickets = filteredTickets.slice(startIndex, endIndex);
                return paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onDoubleClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }}>
                    <TableCell className="font-mono text-xs font-medium text-gray-900">{ticket.ticket_number || '#' + ticket.id.slice(-6)}</TableCell>
                    <TableCell className="text-gray-700">{ticket.tenant?.company_name || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate text-gray-900">{ticket.title}</TableCell>
                    <TableCell><Badge variant="outline">{ticket.category}</Badge></TableCell>
                    <TableCell><Badge>{ticket.priority}</Badge></TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }} title="View Details" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" title="Download" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                              <Download className="h-4 w-4 mr-1" />
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => {
                          if (!ticket.resolution_notes?.includes('=== ESTIMATION ===')) {
                            toast({title: 'Info', description: 'No estimation available for this ticket'});
                            return;
                          }
                            try {
                              const doc = new jsPDF();
                              doc.setFontSize(18);
                              doc.setFont(undefined, 'bold');
                              doc.text('ESTIMATION REPORT', 105, 20, { align: 'center' });
                              
                              // Ticket Info Table
                              doc.setFontSize(10);
                              doc.setFont(undefined, 'normal');
                              let y = 35;
                              doc.setFillColor(240, 240, 240);
                              doc.rect(15, y, 180, 8, 'F');
                              doc.setFont(undefined, 'bold');
                              doc.text('Ticket Information', 20, y + 5);
                              y += 10;
                              doc.setFont(undefined, 'normal');
                              doc.text(`Ticket Number: ${ticket.ticket_number || '#' + ticket.id.slice(-6)}`, 20, y);
                              doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y);
                              y += 6;
                              doc.text(`Created By: ${ticket.created_by_name || ticket.tenant?.company_name || 'N/A'}`, 20, y);
                              y += 6;
                              doc.text(`Created At: ${ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}`, 20, y);
                              y += 12;
                              
                              // Materials Table
                              const materialsMatch = ticket.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                              if (materialsMatch) {
                                doc.setFillColor(240, 240, 240);
                                doc.rect(15, y, 180, 8, 'F');
                                doc.setFont(undefined, 'bold');
                                doc.text('Materials Details', 20, y + 5);
                                y += 10;
                                
                                // Table header
                                doc.setFillColor(220, 220, 220);
                                doc.rect(15, y, 180, 7, 'F');
                                doc.setFontSize(9);
                                doc.text('Item', 20, y + 5);
                                doc.text('Qty', 90, y + 5);
                                doc.text('Rate', 110, y + 5);
                                doc.text('GST%', 135, y + 5);
                                doc.text('Total', 165, y + 5);
                                y += 7;
                                
                                // Table rows
                                doc.setFont(undefined, 'normal');
                                materialsMatch[1].split('\n').forEach((line, i) => {
                                  const parts = line.split(' | ');
                                  if (parts.length === 6) {
                                    if (i % 2 === 0) {
                                      doc.setFillColor(250, 250, 250);
                                      doc.rect(15, y, 180, 6, 'F');
                                    }
                                    doc.text(parts[0].substring(0, 25), 20, y + 4);
                                    doc.text(parts[1], 90, y + 4);
                                    doc.text(parts[2], 110, y + 4);
                                    doc.text(parts[3], 135, y + 4);
                                    doc.text(parts[5], 165, y + 4);
                                    y += 6;
                                  }
                                });
                                y += 6;
                              }
                              
                              // Estimation Summary Table
                              const costMatch = ticket.resolution_notes.match(/Material Cost \(without GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nTotal GST: ₹([\d,]+(?:\.\d{2})?)\s*\nMaterial Cost \(with GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nLabor Hours: ([\d.]+)\s*\nLabor Cost: ₹([\d,]+(?:\.\d{2})?)\s*\nTotal: ₹([\d,]+(?:\.\d{2})?)/s);
                              if (costMatch) {
                                doc.setFillColor(240, 240, 240);
                                doc.rect(15, y, 180, 8, 'F');
                                doc.setFont(undefined, 'bold');
                                doc.setFontSize(10);
                                doc.text('Estimation Summary', 20, y + 5);
                                y += 10;
                                
                                doc.setFont(undefined, 'normal');
                                doc.setFontSize(9);
                                const rows = [
                                  ['Material Cost (without GST)', '₹' + costMatch[1]],
                                  ['Total GST', '₹' + costMatch[2]],
                                  ['Material Cost (with GST)', '₹' + costMatch[3]],
                                  ['Labor Hours', costMatch[4]],
                                  ['Labor Cost', '₹' + costMatch[5]]
                                ];
                                
                                rows.forEach((row, i) => {
                                  if (i % 2 === 0) {
                                    doc.setFillColor(250, 250, 250);
                                    doc.rect(15, y, 180, 6, 'F');
                                  }
                                  doc.text(row[0], 20, y + 4);
                                  doc.text(row[1], 165, y + 4, { align: 'right' });
                                  y += 6;
                                });
                                
                                // Total
                                y += 2;
                                doc.setFillColor(200, 220, 255);
                                doc.rect(15, y, 180, 8, 'F');
                                doc.setFont(undefined, 'bold');
                                doc.setFontSize(12);
                                doc.text('TOTAL ESTIMATION', 20, y + 5);
                                doc.text('₹' + costMatch[6], 175, y + 5, { align: 'right' });
                              }
                              
                              doc.save(`estimation_${ticket.ticket_number || ticket.id.slice(-6)}.pdf`);
                              toast({title: 'Success', description: 'Estimation PDF downloaded'});
                              return;
                            } catch (error: any) {
                              toast({title: 'Error', description: error.message, variant: 'destructive'});
                            }
                            }}>
                              <FileText className="h-4 w-4 mr-2" />PDF (Estimation)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={async () => {
                          try {
                            const workbook = new ExcelJS.Workbook();
                            const worksheet = workbook.addWorksheet('Ticket Report');
                            worksheet.columns = [{header: 'Field', key: 'field', width: 35}, {header: 'Value', key: 'value', width: 60}];
                            // Header
                            worksheet.addRow({field: '=== MAINTENANCE TICKET REPORT ===', value: ''});
                            worksheet.addRow({field: '', value: ''});
                            // Basic Info
                            worksheet.addRow({field: '--- TICKET INFORMATION ---', value: ''});
                            worksheet.addRow({field: 'Ticket Number', value: ticket.ticket_number || '#' + ticket.id.slice(-6)});
                            worksheet.addRow({field: 'Title', value: ticket.title});
                            worksheet.addRow({field: 'Description', value: ticket.description});
                            worksheet.addRow({field: 'Category', value: ticket.category});
                            worksheet.addRow({field: 'Priority', value: ticket.priority});
                            worksheet.addRow({field: 'Status', value: getStatusLabel(ticket.status)});
                            worksheet.addRow({field: 'Created Date', value: ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'});
                            worksheet.addRow({field: '', value: ''});
                            // Tenant/Creator Info
                            worksheet.addRow({field: '--- REQUESTER INFORMATION ---', value: ''});
                            if (ticket.tenant_id) {
                              worksheet.addRow({field: 'Tenant Company', value: ticket.tenant?.company_name || 'N/A'});
                              worksheet.addRow({field: 'Contact Person', value: ticket.tenant?.contact_person || 'N/A'});
                              worksheet.addRow({field: 'Email', value: ticket.tenant?.email || 'N/A'});
                              worksheet.addRow({field: 'Phone', value: ticket.tenant?.phone || 'N/A'});
                            } else {
                              worksheet.addRow({field: 'Created By', value: ticket.created_by_name || 'Helpdesk/Manager'});
                              worksheet.addRow({field: 'Role', value: ticket.created_by_role || 'N/A'});
                            }
                            worksheet.addRow({field: '', value: ''});
                            // Location Details
                            worksheet.addRow({field: '--- LOCATION DETAILS ---', value: ''});
                            worksheet.addRow({field: 'Building', value: ticket.building || 'N/A'});
                            worksheet.addRow({field: 'Floor', value: ticket.floor || 'N/A'});
                            worksheet.addRow({field: 'Room', value: ticket.room || 'N/A'});
                            worksheet.addRow({field: 'Exact Spot', value: ticket.spot_description || 'N/A'});
                            worksheet.addRow({field: '', value: ''});
                            // Visit Preferences
                            worksheet.addRow({field: '--- VISIT PREFERENCES ---', value: ''});
                            worksheet.addRow({field: 'Preferred Date', value: ticket.preferred_date ? new Date(ticket.preferred_date).toLocaleDateString() : 'N/A'});
                            worksheet.addRow({field: 'Preferred Time', value: ticket.preferred_time || 'N/A'});
                            worksheet.addRow({field: 'Target Date', value: ticket.target_date ? new Date(ticket.target_date).toLocaleDateString() : 'N/A'});
                            worksheet.addRow({field: '', value: ''});
                            // Risk Flags
                            worksheet.addRow({field: '--- RISK ASSESSMENT ---', value: ''});
                            worksheet.addRow({field: 'Safety Risk', value: ticket.safety_risk ? 'YES - IMMEDIATE ATTENTION REQUIRED' : 'No'});
                            worksheet.addRow({field: 'Previous Occurrence', value: ticket.previous_occurrence ? 'Yes' : 'No'});
                            worksheet.addRow({field: '', value: ''});
                            // Technician Assignment
                            if (ticket.assigned_technicians?.length > 0) {
                              worksheet.addRow({field: '--- ASSIGNED TECHNICIANS ---', value: ''});
                              ticket.assigned_technicians.forEach((tech: any, idx: number) => {
                                worksheet.addRow({field: `Technician ${idx + 1}`, value: `${tech.name} | ${tech.contact} | ${tech.specialization}`});
                              });
                              worksheet.addRow({field: '', value: ''});
                            }
                            // RCA Details
                            if (ticket.resolution_notes?.includes('=== RCA ===')) {
                              const rcaMatch = ticket.resolution_notes.match(/=== RCA ===\s*\nRoot Cause: ([^\n]+)\s*\nFindings: ([^\n]+)/);
                              if (rcaMatch) {
                                worksheet.addRow({field: '--- ROOT CAUSE ANALYSIS ---', value: ''});
                                worksheet.addRow({field: 'Root Cause', value: rcaMatch[1]});
                                worksheet.addRow({field: 'Findings', value: rcaMatch[2]});
                                worksheet.addRow({field: '', value: ''});
                              }
                            }
                            // Materials & Cost
                            if (ticket.resolution_notes?.includes('Materials:')) {
                              worksheet.addRow({field: '--- MATERIALS & COST ESTIMATION ---', value: ''});
                              const materialsMatch = ticket.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                              if (materialsMatch) {
                                worksheet.addRow({field: 'Item | Qty | Rate | GST% | GST Amt | Total', value: ''});
                                materialsMatch[1].split('\n').forEach(line => {
                                  if (line.trim()) worksheet.addRow({field: line, value: ''});
                                });
                              }
                              const costMatch = ticket.resolution_notes.match(/Material Cost \(without GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nTotal GST: ₹([\d,]+(?:\.\d{2})?)\s*\nMaterial Cost \(with GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nLabor Hours: ([\d.]+)\s*\nLabor Cost: ₹([\d,]+(?:\.\d{2})?)\s*\nTotal: ₹([\d,]+(?:\.\d{2})?)/s);
                              if (costMatch) {
                                worksheet.addRow({field: '', value: ''});
                                worksheet.addRow({field: 'Material Cost (without GST)', value: `₹${costMatch[1]}`});
                                worksheet.addRow({field: 'Total GST', value: `₹${costMatch[2]}`});
                                worksheet.addRow({field: 'Material Cost (with GST)', value: `₹${costMatch[3]}`});
                                worksheet.addRow({field: 'Labor Hours', value: costMatch[4]});
                                worksheet.addRow({field: 'Labor Cost', value: `₹${costMatch[5]}`});
                                worksheet.addRow({field: 'TOTAL ESTIMATION', value: `₹${costMatch[6]}`});
                              }
                              worksheet.addRow({field: '', value: ''});
                            }
                            // Financial Details
                            worksheet.addRow({field: '--- FINANCIAL DETAILS ---', value: ''});
                            worksheet.addRow({field: 'Estimated Cost', value: ticket.cost ? `₹${ticket.cost}` : '₹0'});
                            worksheet.addRow({field: 'OPEX Code', value: ticket.opex_code || 'Not Assigned'});
                            worksheet.addRow({field: '', value: ''});
                            // Work Tracking
                            worksheet.addRow({field: '--- WORK TRACKING ---', value: ''});
                            worksheet.addRow({field: 'SLA Hours', value: ticket.sla_hours || 'Not Set'});
                            worksheet.addRow({field: 'Work Started', value: ticket.work_started_at ? new Date(ticket.work_started_at).toLocaleString() : 'Not Started'});
                            worksheet.addRow({field: 'Work Completed', value: ticket.work_completed_at ? new Date(ticket.work_completed_at).toLocaleString() : 'Not Completed'});
                            worksheet.addRow({field: 'Work Duration (Hours)', value: ticket.work_duration_hours ? ticket.work_duration_hours.toFixed(2) : 'N/A'});
                            worksheet.addRow({field: '', value: ''});
                            // Approval History
                            if (ticket.status_history) {
                              worksheet.addRow({field: '--- APPROVAL HISTORY ---', value: ''});
                              const managerApproval = ticket.status_history.match(/\[(.*?)\] MANAGER APPROVED/);
                              const tenantApproval = ticket.status_history.match(/\[(.*?)\] TENANT APPROVED/);
                              const managerRejection = ticket.status_history.match(/\[(.*?)\] MANAGER REJECTED: (.+)/);
                              const tenantRejection = ticket.status_history.match(/\[(.*?)\] TENANT REJECTED: (.+)/);
                              if (managerApproval) worksheet.addRow({field: 'Manager Approved', value: managerApproval[1]});
                              if (tenantApproval) worksheet.addRow({field: 'Tenant Approved', value: tenantApproval[1]});
                              if (managerRejection) worksheet.addRow({field: 'Manager Rejected', value: `${managerRejection[1]} - Reason: ${managerRejection[2]}`});
                              if (tenantRejection) worksheet.addRow({field: 'Tenant Rejected', value: `${tenantRejection[1]} - Reason: ${tenantRejection[2]}`});
                              worksheet.addRow({field: '', value: ''});
                            }
                            // Feedback
                            if (ticket.tenant_satisfaction || ticket.creator_satisfaction) {
                              worksheet.addRow({field: '--- FEEDBACK & SATISFACTION ---', value: ''});
                              if (ticket.tenant_satisfaction) {
                                worksheet.addRow({field: 'Tenant Satisfaction', value: ticket.tenant_satisfaction});
                                worksheet.addRow({field: 'Tenant Feedback', value: ticket.tenant_feedback || 'No comments'});
                              }
                              if (ticket.creator_satisfaction) {
                                worksheet.addRow({field: 'Creator Satisfaction', value: ticket.creator_satisfaction});
                                worksheet.addRow({field: 'Creator Feedback', value: ticket.creator_feedback || 'No comments'});
                              }
                              worksheet.addRow({field: '', value: ''});
                            }
                            // Additional Notes
                            if (ticket.notes || ticket.additional_notes) {
                              worksheet.addRow({field: '--- ADDITIONAL NOTES ---', value: ''});
                              worksheet.addRow({field: 'Notes', value: ticket.notes || ticket.additional_notes || 'None'});
                            }
                            // Style header rows
                            worksheet.getRow(1).font = {bold: true, size: 14};
                            [3, 12, 18, 23, 28, 33].forEach(rowNum => {
                              const row = worksheet.getRow(rowNum);
                              if (row) row.font = {bold: true, color: {argb: 'FF0066CC'}};
                            });
                            const buffer = await workbook.xlsx.writeBuffer();
                            const blob = new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ticket_report_${ticket.ticket_number || ticket.id.slice(-6)}.xlsx`;
                            a.click();
                            window.URL.revokeObjectURL(url);
                            toast({title: 'Success', description: 'Ticket report downloaded successfully'});
                          } catch (error: any) {
                            toast({title: 'Error', description: error.message, variant: 'destructive'});
                          }
                            }}>
                              <FileText className="h-4 w-4 mr-2" />Excel (Full Report)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ));
              })()}
            </TableBody>
          </Table>
          {(() => {
            const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            return totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
        )}
        {/* Ticket Detail Section */}
        {isDetailOpen && selectedTicket && (
          <Card className="border-gray-200 shadow-sm">
              <CardHeader className="space-y-1.5 p-6 flex flex-row items-center justify-between border-b bg-white">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h1>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Ticket #{selectedTicket?.ticket_number || 'RTP-' + selectedTicket?.id.slice(-6)}</p>
                </div>
                <Button variant="ghost" className="h-9 rounded-md px-3" onClick={() => { setIsDetailOpen(false); setShowActionForm(false); }}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="view" className="bg-white">
                  <div className="border-b px-6">
                    <TabsList className="bg-transparent">
                      <TabsTrigger value="view">Details</TabsTrigger>
                      <TabsTrigger value="files">Files</TabsTrigger>
                      <TabsTrigger value="status">Status</TabsTrigger>
                      <TabsTrigger value="history">History</TabsTrigger>
                      <TabsTrigger value="feedback">Feedback</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="view" className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Main Content - 70% */}
                      <div className="lg:col-span-2 space-y-3">
                        {/* Location & Visit Preferences - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Location Details Card */}
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
                          {/* Visit Preferences Card */}
                          {(selectedTicket.preferred_date || selectedTicket.preferred_time || selectedTicket.target_date) && (
                            <div className="bg-white rounded-lg border border-gray-200 p-3">
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Visit Preferences</Label>
                              <div className="space-y-1.5 text-sm">
                                {selectedTicket.preferred_date && (
                                  <div>
                                    <p className="text-gray-500 text-xs">Preferred Date</p>
                                    <p className="text-gray-900 font-medium">{selectedTicket.preferred_date ? new Date(selectedTicket.preferred_date).toLocaleDateString() : 'N/A'}</p>
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
                                    <p className="text-gray-900 font-medium">{selectedTicket.target_date ? new Date(selectedTicket.target_date).toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Safety & Previous Occurrence Card */}
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
                        {/* Description Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</Label>
                          <p className="mt-2 text-sm text-gray-700 leading-relaxed">{selectedTicket.description}</p>
                        </div>
                        {/* Additional Notes Card */}
                        {(selectedTicket.notes || selectedTicket.additional_notes) && (
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes</Label>
                            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{selectedTicket.notes || selectedTicket.additional_notes}</p>
                          </div>
                        )}
                        {/* RCA Section - Hide if rejected */}
                        {selectedTicket.resolution_notes && selectedTicket.resolution_notes.includes('=== RCA ===') && selectedTicket.status !== 'rejected' && selectedTicket.status !== 'tenant_rejected' && (
                          <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Root Cause Analysis</Label>
                            {(() => {
                              const rcaMatch = selectedTicket.resolution_notes.match(/=== RCA ===\s*\nRoot Cause: ([^\n]+)\s*\nFindings: ([^\n]+)/);
                              return rcaMatch ? (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">Root Cause:</p>
                                    <p className="text-gray-900 mt-1">{rcaMatch[1]}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">Findings:</p>
                                    <p className="text-gray-900 mt-1">{rcaMatch[2]}</p>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                        {/* Rejected Submission - Show Previous Data */}
                        {(selectedTicket.status === 'rejected' || selectedTicket.status === 'tenant_rejected') && (() => {
                          // Get the latest rejection matching current status
                          let latestRejection = null;
                          if (selectedTicket.status === 'rejected') {
                            // Manager rejection - get from previous_submissions
                            if (selectedTicket.previous_submissions) {
                              try {
                                const parsed = JSON.parse(selectedTicket.previous_submissions);
                                const submissions = Array.isArray(parsed) ? parsed : [parsed];
                                latestRejection = submissions[submissions.length - 1];
                              } catch (e) {}
                            }
                          } else if (selectedTicket.status === 'tenant_rejected') {
                            // Tenant rejection - use current ticket data
                            latestRejection = {
                              technicians: selectedTicket.assigned_technicians,
                              resolution_notes: selectedTicket.resolution_notes,
                              rejection_reason: selectedTicket.tenant_rejected_submissions?.match(/=== REJECTED: (.+) ===/)?.[1] || 'No reason provided'
                            };
                          }
                          return latestRejection ? (
                          <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                            <div className="flex items-center gap-2 mb-4">
                              <XCircle className="h-5 w-5 text-red-600" />
                              <Label className="text-sm font-semibold text-red-700 uppercase tracking-wide">Previous Submission (Rejected)</Label>
                            </div>
                            {/* Rejection Reason */}
                            {latestRejection.rejection_reason && (
                              <div className="bg-white p-4 rounded border border-red-300 mb-4">
                                <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
                                <p className="text-gray-900">{latestRejection.rejection_reason}</p>
                              </div>
                            )}
                            {/* RCA */}
                            {latestRejection.resolution_notes?.includes('=== RCA ===') && (
                              <div className="bg-white rounded border p-4 mb-4">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Root Cause Analysis</Label>
                                {(() => {
                                  const rcaMatch = latestRejection.resolution_notes.match(/=== RCA ===\s*\nRoot Cause: ([^\n]+)\s*\nFindings: ([^\n]+)/);
                                  return rcaMatch ? (
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700">Root Cause:</p>
                                        <p className="text-sm text-gray-900 mt-1">{rcaMatch[1]}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700">Findings:</p>
                                        <p className="text-sm text-gray-900 mt-1">{rcaMatch[2]}</p>
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            )}
                            {/* Materials Table */}
                            {latestRejection.resolution_notes?.includes('Materials:') && (
                            <div className="bg-white rounded border p-4 mb-4">
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Materials Required</Label>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50">
                                      <th className="text-left p-2 font-semibold text-gray-700">Item</th>
                                      <th className="text-right p-2 font-semibold text-gray-700">Qty</th>
                                      <th className="text-right p-2 font-semibold text-gray-700">Rate</th>
                                      <th className="text-right p-2 font-semibold text-gray-700">GST%</th>
                                      <th className="text-right p-2 font-semibold text-gray-700">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(() => {
                                      const materialsMatch = latestRejection.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                                      return materialsMatch ? materialsMatch[1].split('\n').map((line, i) => {
                                        const parts = line.split(' | ');
                                        return parts.length === 6 ? (
                                          <tr key={i} className="border-b border-gray-100">
                                            <td className="p-2 text-gray-900">{parts[0]}</td>
                                            <td className="text-right p-2 text-gray-700">{parts[1]}</td>
                                            <td className="text-right p-2 text-gray-700">{parts[2]}</td>
                                            <td className="text-right p-2 text-gray-700">{parts[3]}</td>
                                            <td className="text-right p-2 font-semibold text-gray-900">{parts[5]}</td>
                                          </tr>
                                        ) : null;
                                      }) : null;
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                            )}
                            {/* Cost Breakdown */}
                            {latestRejection.resolution_notes?.includes('Material Cost') && (
                            <div className="bg-white rounded border p-4 mb-4">
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Cost Breakdown</Label>
                              <div className="space-y-2">
                                {(() => {
                                  const costMatch = latestRejection.resolution_notes.match(/Material Cost \(without GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nTotal GST: ₹([\d,]+(?:\.\d{2})?)\s*\nMaterial Cost \(with GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nLabor Hours: ([\d.]+)\s*\nLabor Cost: ₹([\d,]+(?:\.\d{2})?)\s*\nTotal: ₹([\d,]+(?:\.\d{2})?)/s);
                                  return costMatch ? (
                                    <>
                                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                                        <span className="text-sm text-gray-600">Material Cost (without GST)</span>
                                        <span className="text-sm font-semibold text-gray-900">₹{costMatch[1]}</span>
                                      </div>
                                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                                        <span className="text-sm text-gray-600">Total GST</span>
                                        <span className="text-sm font-semibold text-gray-900">₹{costMatch[2]}</span>
                                      </div>
                                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                                        <span className="text-sm text-gray-600">Material Cost (with GST)</span>
                                        <span className="text-sm font-semibold text-gray-900">₹{costMatch[3]}</span>
                                      </div>
                                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                                        <span className="text-sm text-gray-600">Labor Hours</span>
                                        <span className="text-sm font-semibold text-gray-900">{costMatch[4]}</span>
                                      </div>
                                      <div className="flex justify-between py-1.5 border-b border-gray-100">
                                        <span className="text-sm text-gray-600">Labor Cost</span>
                                        <span className="text-sm font-semibold text-gray-900">₹{costMatch[5]}</span>
                                      </div>
                                      <div className="flex justify-between py-2 bg-red-100 -mx-4 px-4 mt-2">
                                        <span className="font-bold text-gray-900">Total Estimation</span>
                                        <span className="font-bold text-red-600 text-lg">₹{costMatch[6]}</span>
                                      </div>
                                    </>
                                  ) : null;
                                })()}
                              </div>
                            </div>
                            )}
                            <Button className="w-full" variant="destructive" onClick={async () => {
                              try {
                                // Load existing previous_submissions array
                                let previousSubmissions = [];
                                if (selectedTicket.previous_submissions) {
                                  try {
                                    const parsed = JSON.parse(selectedTicket.previous_submissions);
                                    previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                                  } catch (e) {}
                                }
                                await MaintenanceService.updateTicket(selectedTicket.id, {
                                  status: 'pending',
                                  assigned_technicians: null,
                                  resolution_notes: null,
                                  cost: 0,
                                  opex_code: null,
                                  work_started_at: null,
                                  work_completed_at: null,
                                  sla_hours: null
                                });
                                toast({ title: "Success", description: "Ready to resubmit. You can now reassign technicians." });
                                loadTickets();
                                const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                setSelectedTicket(refreshedTicket);
                              } catch (error: any) {
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              }
                            }}>
                              <Send className="mr-2 h-4 w-4" />Start Resubmission
                            </Button>
                          </div>
                          ) : null;
                        })()}
                        {/* Materials Table - Hide if rejected */}
                        {selectedTicket.resolution_notes && selectedTicket.resolution_notes.includes('Materials:') && selectedTicket.status !== 'rejected' && selectedTicket.status !== 'tenant_rejected' && (
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
                                  {(() => {
                                    const materialsMatch = selectedTicket.resolution_notes.match(/Materials:[\s\S]+?-{60}\n([\s\S]+?)\n-{60}/);
                                    return materialsMatch ? materialsMatch[1].split('\n').map((line, i) => {
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
                                    }) : null;
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {/* Cost Breakdown - Hide if rejected */}
                        {selectedTicket.resolution_notes && selectedTicket.resolution_notes.includes('Material Cost') && selectedTicket.status !== 'rejected' && selectedTicket.status !== 'tenant_rejected' && (
                          <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Cost Breakdown</Label>
                            <div className="space-y-3">
                              {(() => {
                                const costMatch = selectedTicket.resolution_notes.match(/Material Cost \(without GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nTotal GST: ₹([\d,]+(?:\.\d{2})?)\s*\nMaterial Cost \(with GST\): ₹([\d,]+(?:\.\d{2})?)\s*\nLabor Hours: ([\d.]+)\s*\nLabor Cost: ₹([\d,]+(?:\.\d{2})?)\s*\nTotal: ₹([\d,]+(?:\.\d{2})?)/s);
                                return costMatch ? (
                                  <>
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
                                  </>
                                ) : (
                                  <div className="text-center text-gray-500 py-4">
                                    Cost breakdown format not recognized
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                  {/* RCA Inline Form */}
                  {(selectedTicket.status === 'assigned') && !selectedTicket.resolution_notes?.includes('=== RCA ===') && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Add Root Cause Analysis</Label>
                      <div className="space-y-4">
                        <div>
                          <Label>Root Cause *</Label>
                          <Textarea value={rcaForm.rootCause} onChange={(e) => setRcaForm({...rcaForm, rootCause: e.target.value})} rows={3} placeholder="Describe the root cause..." />
                        </div>
                        <div>
                          <Label>Findings</Label>
                          <Textarea value={rcaForm.findings} onChange={(e) => setRcaForm({...rcaForm, findings: e.target.value})} rows={3} placeholder="Additional findings..." />
                        </div>
                        <Button className="w-full" onClick={async () => {
                          if (!selectedTicket || !rcaForm.rootCause) {
                            toast({ title: "Error", description: "Root cause required", variant: "destructive" });
                            return;
                          }
                          try {
                            const updatedNotes = `${selectedTicket.resolution_notes || ''}\n\n=== RCA ===\nRoot Cause: ${rcaForm.rootCause}\nFindings: ${rcaForm.findings}`;
                            await MaintenanceService.updateTicket(selectedTicket.id, {
                              resolution_notes: updatedNotes
                            });
                            // Reload the ticket to get fresh data
                            const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                            setSelectedTicket(refreshedTicket);
                            toast({ title: "Success", description: "RCA added" });
                            setRcaForm({ rootCause: '', findings: '' });
                            loadTickets();
                          } catch (error: any) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                          }
                        }}>Submit RCA</Button>
                      </div>
                    </div>
                  )}
                  {/* Estimation Inline Form */}
                  {selectedTicket.resolution_notes?.includes('=== RCA ===') && !selectedTicket.resolution_notes?.includes('=== ESTIMATION ===') && (
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Add Estimation</Label>
                      <div className="space-y-4">
                        <div className="flex gap-4">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search materials..." value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className="pl-10" />
                          </div>
                          <Select value={materialFilter} onValueChange={setMaterialFilter}>
                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              {materialCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {materialSearch && (
                          <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2">
                            {materials
                              .filter(mat => {
                                const matchesSearch = mat.name.toLowerCase().includes(materialSearch.toLowerCase());
                                const matchesFilter = materialFilter === 'all' || mat.category === materialFilter;
                                return matchesSearch && matchesFilter;
                              })
                              .map((mat) => (
                                <div key={mat.id} className={`p-2 border rounded flex items-center justify-between hover:bg-muted cursor-pointer text-sm ${selectedMaterials.includes(mat.id) ? 'bg-blue-50 border-blue-300' : ''}`}>
                                  <div className="flex-1">
                                    <p className="font-medium">{mat.name}</p>
                                    <div className="flex gap-2 items-center">
                                      <Badge variant="outline" className="text-xs">{mat.category}</Badge>
                                      <span className="text-xs text-muted-foreground">₹{mat.rate}/{mat.uom}</span>
                                    </div>
                                  </div>
                                  <Button size="sm" onClick={() => {
                                    if (selectedMaterials.includes(mat.id)) {
                                      setSelectedMaterials(selectedMaterials.filter(id => id !== mat.id));
                                    } else {
                                      setSelectedMaterials([...selectedMaterials, mat.id]);
                                      setMaterialQuantities({...materialQuantities, [mat.id]: 1, [`${mat.id}_gst`]: 0, [`${mat.id}_rate`]: mat.rate});
                                    }
                                  }}>
                                    {selectedMaterials.includes(mat.id) ? 'Remove' : 'Add'}
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                        {selectedMaterials.length > 0 && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm font-semibold text-blue-900 mb-2">Selected Materials ({selectedMaterials.length})</p>
                            <div className="space-y-2">
                              {selectedMaterials.map((matId) => { 
                                const mat = materials.find(m => m.id === matId);
                                const qty = materialQuantities[matId] || 1;
                                const rate = materialQuantities[`${matId}_rate`] !== undefined ? materialQuantities[`${matId}_rate`] : mat?.rate || 0;
                                return mat ? (
                                  <div key={matId} className="flex items-center gap-2 p-2 bg-white border rounded text-xs">
                                    <div className="flex-1">
                                      <p className="font-medium">{mat.name}</p>
                                      <p className="text-muted-foreground">{mat.uom}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span>Qty:</span>
                                      <Input type="number" min="1" value={qty} onChange={(e) => {
                                        const newQty = Math.max(1, parseInt(e.target.value) || 1);
                                        setMaterialQuantities({...materialQuantities, [matId]: newQty});
                                      }} className="w-14 h-7" />
                                      <span>Amt:</span>
                                      <Input type="number" min="0" step="0.01" value={rate} onChange={(e) => {
                                        const newRate = parseFloat(e.target.value) || 0;
                                        setMaterialQuantities({...materialQuantities, [`${matId}_rate`]: newRate});
                                      }} className="w-16 h-7" placeholder="0" />
                                      <span>GST:</span>
                                      <Input type="number" max="100" step="0.5" value={materialQuantities[`${matId}_gst`] || ''} onChange={(e) => {
                                        const gst = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                        setMaterialQuantities({...materialQuantities, [`${matId}_gst`]: gst});
                                      }} className="w-14 h-7" placeholder="0" />
                                      <span>%</span>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => {
                                      setSelectedMaterials(selectedMaterials.filter(id => id !== matId));
                                    }}><XCircle className="h-4 w-4" /></Button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-4">
                          <div><Label>No. of Labourers</Label><Input type="number" value={estimationForm.numLabourers || ''} onChange={(e) => {
                            const num = parseFloat(e.target.value) || 0;
                            const totalHours = num * (estimationForm.workHours || 0);
                            const laborCost = totalHours * (estimationForm.laborCostPerHour || 0);
                            setEstimationForm({...estimationForm, numLabourers: num, laborHours: totalHours, laborCost});
                          }} placeholder="0" /></div>
                          <div><Label>Work Hours</Label><Input type="number" value={estimationForm.workHours || ''} onChange={(e) => {
                            const hours = parseFloat(e.target.value) || 0;
                            const totalHours = (estimationForm.numLabourers || 0) * hours;
                            const laborCost = totalHours * (estimationForm.laborCostPerHour || 0);
                            setEstimationForm({...estimationForm, workHours: hours, laborHours: totalHours, laborCost});
                          }} placeholder="0" /></div>
                          <div><Label>Cost/Hour (₹)</Label><Input type="number" value={estimationForm.laborCostPerHour || ''} onChange={(e) => {
                            const rate = parseFloat(e.target.value) || 0;
                            const laborCost = (estimationForm.laborHours || 0) * rate;
                            setEstimationForm({...estimationForm, laborCostPerHour: rate, laborCost});
                          }} placeholder="0" /></div>
                        </div>
                        <div><Label>Notes</Label><Textarea value={estimationForm.notes} onChange={(e) => setEstimationForm({...estimationForm, notes: e.target.value})} rows={2} placeholder="Additional notes..." /></div>
                        <div><Label>OPEX Code</Label><Input value={selectedTicket?.opex_code || ''} onChange={(e) => setSelectedTicket({...selectedTicket, opex_code: e.target.value})} placeholder="Enter OPEX code" /></div>
                        {selectedTicket?.tenant_id && (
                          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                            <div>
                              <Label className="font-medium">Skip Tenant Approval</Label>
                              <p className="text-xs text-muted-foreground">Send directly to manager for approval</p>
                            </div>
                            <Switch checked={selectedTicket?.skip_tenant_approval || false} onCheckedChange={(v) => setSelectedTicket({...selectedTicket, skip_tenant_approval: v})} />
                          </div>
                        )}
                        <Button className="w-full" onClick={async () => {
                          if (!selectedTicket) return;
                          try {
                            let totalGst = 0;
                            let baseCost = 0;
                            selectedMaterials.forEach(id => {
                              const m = materials.find(m => m.id === id);
                              const q = materialQuantities[id] || 1;
                              const rate = materialQuantities[`${id}_rate`] !== undefined ? materialQuantities[`${id}_rate`] : (m?.rate || 0);
                              const gst = (materialQuantities[`${id}_gst`] || 0);
                              const itemCost = q * rate;
                              baseCost += itemCost;
                              totalGst += itemCost * gst / 100;
                            });
                            const materialWithGst = baseCost + totalGst;
                            const totalCost = materialWithGst + (estimationForm.laborCost || 0);
                            const materialsTable = selectedMaterials.map(id => {
                              const mat = materials.find(m => m.id === id);
                              const qty = materialQuantities[id] || 1;
                              const rate = materialQuantities[`${id}_rate`] !== undefined ? materialQuantities[`${id}_rate`] : (mat?.rate || 0);
                              const gst = materialQuantities[`${id}_gst`] || 0;
                              const itemCost = qty * rate;
                              const gstAmount = itemCost * gst / 100;
                              const total = itemCost + gstAmount;
                              return `${mat?.name || 'N/A'} | ${qty} ${mat?.uom || ''} | ₹${rate.toFixed(2)} | ${gst}% | ₹${gstAmount.toFixed(2)} | ₹${total.toFixed(2)}`;
                            }).join('\n');
                            const materialsSection = selectedMaterials.length > 0 
                              ? `Materials:\nItem | Qty | Rate | GST% | GST Amt | Total\n${'-'.repeat(60)}\n${materialsTable}\n${'-'.repeat(60)}`
                              : 'Materials: None';
                            const updatedNotes = `${selectedTicket.resolution_notes || ''}\n\n=== ESTIMATION ===\n${materialsSection}\n\nMaterial Cost (without GST): ₹${baseCost.toFixed(2)}\nTotal GST: ₹${totalGst.toFixed(2)}\nMaterial Cost (with GST): ₹${materialWithGst.toFixed(2)}\nLabor Hours: ${estimationForm.laborHours || 0}\nLabor Cost: ₹${(estimationForm.laborCost || 0).toFixed(2)}\nTotal: ₹${totalCost.toFixed(2)}\nNotes: ${estimationForm.notes}`;
                            await MaintenanceService.updateTicket(selectedTicket.id, {
                              status: 'pending_approval',
                              cost: totalCost,
                              opex_code: selectedTicket.opex_code || null,
                              skip_tenant_approval: selectedTicket.skip_tenant_approval || false,
                              resolution_notes: updatedNotes
                            });
                            // Reload the ticket to get fresh data
                            const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                            setSelectedTicket(refreshedTicket);
                            toast({ title: "Success", description: "Estimation sent for approval" });
                            setEstimationForm({ materials: [], materialCost: 0, laborHours: 0, laborCost: 0, totalCost: 0, notes: '', timeline: '', totalGstAmount: 0, materialCostWithoutGst: 0, numLabourers: 0, workHours: 0, laborCostPerHour: 0 });
                            setSelectedMaterials([]);
                            setMaterialQuantities({});
                            loadTickets();
                          } catch (error: any) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                          }
                        }}>Send for Approval</Button>
                      </div>
                    </div>
                  )}
                  {/* Reopened Ticket - Notice */}
                  {selectedTicket.status === 'reopened' && (
                    <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <h2 className="text-base font-semibold text-gray-900">Ticket Reopened by Tenant</h2>
                          <p className="text-sm text-gray-600">Previous submission is shown in Status tab. Please reassign technician and resubmit.</p>
                        </div>
                      </div>
                      <Button className="w-full" onClick={async () => {
                        try {
                          let previousSubmissions = [];
                          if (selectedTicket.previous_submissions) {
                            try {
                              const parsed = JSON.parse(selectedTicket.previous_submissions);
                              previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                            } catch (e) {}
                          }
                          const reopenedData = {
                            technicians: selectedTicket.assigned_technicians,
                            rca: selectedTicket.resolution_notes?.includes('=== RCA ==='),
                            estimation: selectedTicket.cost,
                            opex_code: selectedTicket.opex_code,
                            resolution_notes: selectedTicket.resolution_notes,
                            reopened_at: new Date().toISOString(),
                            reopened_by: 'Tenant'
                          };
                          previousSubmissions.push(reopenedData);
                          // Add reopened event to timeline
                          let timelineEvents = [];
                          if (selectedTicket.timeline_events) {
                            timelineEvents = Array.isArray(selectedTicket.timeline_events) ? [...selectedTicket.timeline_events] : [];
                          }
                          timelineEvents.push({
                            type: 'reopened',
                            timestamp: new Date().toISOString(),
                            reopened_by: 'Tenant'
                          });
                          const techniciansList = selectedTicket.assigned_technicians?.map((t: any) => t.name).join(', ') || '';
                          await MaintenanceService.updateTicket(selectedTicket.id, {
                            status: 'assigned',
                            previous_submissions: JSON.stringify(previousSubmissions),
                            resolution_notes: `Technicians: ${techniciansList}`,
                            cost: 0,
                            opex_code: null,
                            work_started_at: null,
                            work_completed_at: null,
                            sla_hours: null,
                            timeline_events: timelineEvents
                          });
                          toast({ title: "Success", description: "Ready to resubmit. Previous submission saved." });
                          loadTickets();
                          const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                          setSelectedTicket(refreshedTicket);
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        }
                      }}>
                        <Send className="mr-2 h-4 w-4" />Start Resubmission
                      </Button>
                    </div>
                  )}
                  {/* Action Buttons */}
                  {selectedTicket.status === 'in_progress' && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Square className="h-4 w-4 text-red-600" />
                        <h2 className="text-lg font-semibold text-gray-900">End Work</h2>
                      </div>
                      <Button size="sm" className="w-full" variant="destructive" onClick={async () => {
                        try {
                          await MaintenanceService.endWork(selectedTicket.id);
                          toast({ title: "Success", description: "Work completed" });
                          sendTicketNotification('ticket.work_completed', { ...selectedTicket, status: 'work_completed' }).catch(console.error);
                          loadTickets();
                          const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                          setSelectedTicket(refreshedTicket);
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        }
                      }}>
                        <Square className="mr-2 h-4 w-4" />End Work
                      </Button>
                    </div>
                  )}
                  {/* Provide Feedback Button */}
                  {!selectedTicket.tenant_id && selectedTicket.created_by_user_id === user?.id && selectedTicket.status === 'work_completed' && !selectedTicket.creator_satisfaction && (
                    <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Provide Feedback</h2>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Work has been completed. Please provide your feedback.</p>
                      <Button size="sm" className="w-full" onClick={() => setIsFeedbackOpen(true)}>
                        <CheckCircle className="mr-2 h-4 w-4" />Provide Feedback
                      </Button>
                    </div>
                  )}
                  {selectedTicket.status === 'approved' && !selectedTicket.work_started_at && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Play className="h-4 w-4 text-green-600" />
                        <h2 className="text-lg font-semibold text-gray-900">Start Work</h2>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">SLA Time *</Label>
                          <Select value={slaHours} onValueChange={setSlaHours}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select SLA time" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0.5">30 minutes</SelectItem>
                              <SelectItem value="1">1 hour</SelectItem>
                              <SelectItem value="3">3 hours</SelectItem>
                              <SelectItem value="5">5 hours</SelectItem>
                              <SelectItem value="8">8 hours</SelectItem>
                              <SelectItem value="10">10 hours</SelectItem>
                              <SelectItem value="12">12 hours</SelectItem>
                              <SelectItem value="24">1 day</SelectItem>
                              <SelectItem value="48">2 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full" onClick={async () => {
                          if (!slaHours) {
                            toast({ title: "Error", description: "Select SLA time", variant: "destructive" });
                            return;
                          }
                          try {
                            await MaintenanceService.startWork(selectedTicket.id, parseFloat(slaHours));
                            toast({ title: "Success", description: "Work started" });
                            sendTicketNotification('ticket.work_started', { ...selectedTicket, status: 'in_progress' }).catch(console.error);
                            setSlaHours('');
                            loadTickets();
                            setIsDetailOpen(false);
                          } catch (error: any) {
                            toast({ title: "Error", description: error.message, variant: "destructive" });
                          }
                        }}>
                          <Play className="mr-2 h-4 w-4" />Start Work
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                        {/* Sidebar - 30% */}
                        <div className="space-y-3">
                          {/* Ticket Meta Information */}
                          <div className="bg-white rounded-lg border border-gray-200 p-3 sticky top-6">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Ticket Information</Label>
                            <div className="space-y-2.5">
                              <div>
                                <Label className="font-medium text-xs text-gray-500 mb-1 block">Status</Label>
                                {getStatusBadge(selectedTicket.status)}
                              </div>
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="font-medium text-xs text-gray-500 mb-1 block">Priority</Label>
                                <Badge>{selectedTicket.priority.toUpperCase()}</Badge>
                              </div>
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="font-medium text-xs text-gray-500 mb-1 block">Category</Label>
                                <p className="text-sm font-medium text-gray-900">{selectedTicket.category}</p>
                              </div>
                              {selectedTicket.asset_id && (
                                <>
                                  <div className="h-px w-full bg-gray-200"></div>
                                  <div>
                                    <Label className="font-medium text-xs text-gray-500 mb-1 block">Related Asset</Label>
                                    <AssetInfo assetId={selectedTicket.asset_id} />
                                  </div>
                                </>
                              )}
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="font-medium text-xs text-gray-500 mb-1 block">{selectedTicket.tenant_id ? 'Tenant' : 'Created By'}</Label>
                                <p className="text-sm font-medium text-gray-900">
                                  {selectedTicket.tenant?.company_name || (selectedTicket.created_by_name ? `${selectedTicket.created_by_name} (${selectedTicket.created_by_role})` : 'Helpdesk/Manager')}
                                </p>
                              </div>
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="font-medium text-xs text-gray-500 mb-1 block">Created</Label>
                                <p className="text-sm text-gray-700">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleDateString() : 'N/A'}</p>
                              </div>
                              <div className="h-px w-full bg-gray-200"></div>
                              {/* Technician Details - Assigned Technicians */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="font-medium text-xs text-gray-500 uppercase tracking-wide">Technician Details</Label>
                                  {selectedTicket.assigned_technicians && selectedTicket.assigned_technicians.length > 0 && ['assigned', 'pending_approval', 'rejected'].includes(selectedTicket.status) && (
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                                      setIsAssignOpen(true);
                                      const currentIds = selectedTicket.assigned_technicians.map((t: any) => t.id);
                                      setSelectedTechnicians(currentIds);
                                    }}>
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                    </Button>
                                  )}
                                </div>
                                {/* Show assigned technicians as cards */}
                                {selectedTicket.assigned_technicians && selectedTicket.assigned_technicians.length > 0 && !isAssignOpen ? (
                                  <div className="space-y-1.5">
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
                                ) : (selectedTicket.status === 'pending' || selectedTicket.status === 'reopened' || isAssignOpen) ? (
                                  /* Search Interface */
                                  <div className="space-y-3">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input placeholder="Search technicians..." value={technicianSearch} onChange={(e) => setTechnicianSearch(e.target.value)} className="pl-10 h-9 text-sm" />
                                    </div>
                                    {/* Selected Technicians */}
                                    {selectedTechnicians.length > 0 && (
                                      <div className="space-y-2">
                                        <Label className="text-xs font-medium text-gray-500">Selected ({selectedTechnicians.length})</Label>
                                        {selectedTechnicians.map(id => {
                                          const tech = technicians.find(t => t.id === id);
                                          return tech ? (
                                            <div key={tech.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                {tech.name.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-gray-900">{tech.name}</p>
                                                <p className="text-xs text-gray-600">{tech.contact}</p>
                                                <p className="text-xs text-blue-600">{tech.specialization}</p>
                                              </div>
                                              <Button size="sm" variant="ghost" className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setSelectedTechnicians(selectedTechnicians.filter(tid => tid !== id))}>
                                                Remove
                                              </Button>
                                            </div>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                    {/* Available Technicians */}
                                    {technicianSearch && (
                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                        <Label className="text-xs font-medium text-gray-500">Available</Label>
                                        {technicians
                                          .filter(tech => !selectedTechnicians.includes(tech.id) && tech.name.toLowerCase().includes(technicianSearch.toLowerCase()))
                                          .map((tech) => (
                                            <div key={tech.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                {tech.name.charAt(0).toUpperCase()}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-gray-900">{tech.name}</p>
                                                <p className="text-xs text-gray-600">{tech.contact}</p>
                                                <p className="text-xs text-blue-600">{tech.specialization}</p>
                                              </div>
                                              <button 
                                                onClick={() => setSelectedTechnicians([...selectedTechnicians, tech.id])}
                                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 rounded-md h-8 px-3 text-xs"
                                              >
                                                Add
                                              </button>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full" onClick={() => { setIsAssignOpen(false); setSelectedTechnicians([]); setTechnicianSearch(''); }}>
                                        <CircleX className="h-5 w-5" />
                                      </Button>
                                      <Button size="sm" className="flex-1 h-10" onClick={async () => {
                                        if (selectedTechnicians.length === 0) {
                                          toast({ title: "Error", description: "Select at least one technician", variant: "destructive" });
                                          return;
                                        }
                                        try {
                                          const techniciansData = selectedTechnicians.map(id => {
                                            const tech = technicians.find(t => t.id === id);
                                            return tech ? { id: tech.id, name: tech.name, contact: tech.contact, specialization: tech.specialization } : null;
                                          }).filter(Boolean);
                                          const techniciansList = techniciansData.map(t => `${t.name} (${t.specialization})`).join(', ');
                                          const updateData: any = {
                                            assigned_to: techniciansList,
                                            assigned_technicians: techniciansData,
                                            status: 'assigned'
                                          };
                                          if (selectedTicket.status === 'reopened') {
                                            const previousData = {
                                              technicians: selectedTicket.assigned_technicians,
                                              rca: selectedTicket.resolution_notes?.includes('=== RCA ==='),
                                              estimation: selectedTicket.cost,
                                              opex_code: selectedTicket.opex_code,
                                              timestamp: new Date().toISOString()
                                            };
                                            updateData.previous_submissions = JSON.stringify(previousData);
                                            updateData.resolution_notes = `Technicians: ${techniciansList}`;
                                            updateData.cost = 0;
                                            updateData.opex_code = null;
                                          } else {
                                            updateData.resolution_notes = `Technicians: ${techniciansList}`;
                                          }
                                          await MaintenanceService.updateTicket(selectedTicket.id, updateData);
                                          setSelectedTicket({
                                            ...selectedTicket,
                                            assigned_to: techniciansList,
                                            assigned_technicians: techniciansData,
                                            status: 'assigned',
                                            ...(selectedTicket.status === 'reopened' ? { cost: 0, opex_code: null } : {})
                                          });
                                          toast({ title: "Success", description: selectedTicket.status === 'reopened' ? "Technicians reassigned. Previous data saved." : "Technicians assigned" });
                                          setSelectedTechnicians([]);
                                          setIsAssignOpen(false);
                                          setTechnicianSearch('');
                                          loadTickets();
                                        } catch (error: any) {
                                          toast({ title: "Error", description: error.message, variant: "destructive" });
                                        }
                                      }}>
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="font-medium text-xs text-gray-500 mb-1 block">OPEX Code</Label>
                                <p className="text-sm font-medium text-gray-900">{selectedTicket.opex_code || 'Not Set'}</p>
                              </div>
                              {selectedTicket.cost > 0 && (
                                <>
                                  <div className="h-px w-full bg-gray-200"></div>
                                  <div>
                                    <Label className="font-medium text-xs text-gray-500 mb-1 block">Estimated Cost</Label>
                                    <p className="text-xl font-bold text-blue-600">₹{selectedTicket.cost.toLocaleString()}</p>
                                  </div>
                                </>
                              )}
                              {/* Work Tracking */}
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="font-medium text-xs text-gray-700 mb-2 block">Work Tracking</Label>
                                <div className="space-y-2">
                                  {selectedTicket.sla_hours && (
                                    <div>
                                      <Label className="text-xs text-gray-500">SLA Time</Label>
                                      <p className="text-sm font-medium text-gray-900">{selectedTicket.sla_hours} hours</p>
                                    </div>
                                  )}
                                  {selectedTicket.work_started_at && (
                                    <div>
                                      <Label className="text-xs text-gray-500">Work Started</Label>
                                      <p className="text-xs text-gray-700">{selectedTicket.work_started_at ? new Date(selectedTicket.work_started_at).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  )}
                                  {selectedTicket.work_completed_at && (
                                    <div>
                                      <Label className="text-xs text-gray-500">Work Ended</Label>
                                      <p className="text-xs text-gray-700">{selectedTicket.work_completed_at ? new Date(selectedTicket.work_completed_at).toLocaleString() : 'N/A'}</p>
                                    </div>
                                  )}
                                  {selectedTicket.work_duration_hours && (
                                    <div>
                                      <Label className="text-xs text-gray-500">Work Duration</Label>
                                      <p className="text-sm font-bold text-blue-600">{selectedTicket.work_duration_hours.toFixed(2)} hours</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Request Changes Button */}
                              {(['pending_approval', 'pending_tenant_approval', 'approved'].includes(selectedTicket.status)) && (
                                <>
                                  <div className="h-px w-full bg-gray-200"></div>
                                  <div>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                                      onClick={async () => {
                                        if (!selectedTicket) return;
                                        try {
                                          // Save current estimation to history
                                          let previousSubmissions = [];
                                          if (selectedTicket.previous_submissions) {
                                            try {
                                              const parsed = JSON.parse(selectedTicket.previous_submissions);
                                              previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                                            } catch (e) {}
                                          }
                                          const changeRequestData = {
                                            technicians: selectedTicket.assigned_technicians,
                                            resolution_notes: selectedTicket.resolution_notes,
                                            cost: selectedTicket.cost,
                                            opex_code: selectedTicket.opex_code,
                                            change_requested_at: new Date().toISOString(),
                                            change_requested_by: 'Helpdesk',
                                            manager_approved_at: selectedTicket.status_history?.match(/\[(.*?)\] MANAGER APPROVED/)?.[1],
                                            tenant_approved_at: selectedTicket.status_history?.match(/\[(.*?)\] TENANT APPROVED/)?.[1],
                                            previous_status: selectedTicket.status
                                          };
                                          previousSubmissions.push(changeRequestData);
                                          // Keep RCA and technicians, reset estimation section only
                                          const techniciansList = selectedTicket.assigned_technicians?.map((t: any) => t.name).join(', ') || '';
                                          const rcaSection = selectedTicket.resolution_notes?.match(/(=== RCA ===[\s\S]+?)(?=\n\n=== |$)/)?.[0] || '';
                                          // Clear all approval-related fields to restart approval cycle
                                          await MaintenanceService.updateTicket(selectedTicket.id, {
                                            status: 'assigned',
                                            previous_submissions: JSON.stringify(previousSubmissions),
                                            status_history: `${selectedTicket.status_history || ''}\n[${new Date().toLocaleString()}] CHANGES REQUESTED BY HELPDESK - RESUBMISSION REQUIRED`,
                                            resolution_notes: `Technicians: ${techniciansList}\n\n${rcaSection}`,
                                            cost: 0,
                                            opex_code: null,
                                            work_started_at: null,
                                            work_completed_at: null,
                                            work_duration_hours: null,
                                            sla_hours: null,
                                            skip_tenant_approval: false
                                          });
                                          sendTicketNotification('ticket.request_changes', { ...selectedTicket, status: 'assigned' }).catch(console.error);
                                          toast({ 
                                            title: "Success", 
                                            description: "Estimation saved to history. Modify and resubmit for full approval cycle." 
                                          });
                                          loadTickets();
                                          const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                          setSelectedTicket(refreshedTicket);
                                        } catch (error: any) {
                                          toast({ title: "Error", description: error.message, variant: "destructive" });
                                        }
                                      }}
                                    >
                                      <Send className="mr-2 h-4 w-4" />Request Changes
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="files" className="p-6">
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
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center pointer-events-none">
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
                              <p className="text-sm text-gray-600">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'N/A'}</p>
                            </div>
                          </div>
                          {(() => {
                            const events = [];
                            // Parse timeline events from JSONB column
                            let timelineEvents = [];
                            if (selectedTicket.timeline_events && Array.isArray(selectedTicket.timeline_events)) {
                              timelineEvents = selectedTicket.timeline_events;
                            }
                            // Add timeline events to events array
                            timelineEvents.forEach((evt: any) => {
                              if (evt.type === 'reopened') {
                                events.push({ type: 'reopened', timestamp: evt.timestamp });
                              }
                            });
                            // Parse previous submissions
                            let previousSubmissions = [];
                            if (selectedTicket.previous_submissions) {
                              try {
                                const parsed = JSON.parse(selectedTicket.previous_submissions);
                                previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                              } catch (e) {}
                            }
                            // Add all previous submissions
                            previousSubmissions.forEach((sub, idx) => {
                              const submissionTime = sub.rejected_at || sub.change_requested_at || sub.timestamp || selectedTicket.created_at;
                              if (sub.technicians && sub.technicians.length > 0) {
                                events.push({ type: 'technicians', data: sub.technicians, timestamp: submissionTime, submissionIndex: idx + 1 });
                              }
                              if (sub.resolution_notes?.includes('=== RCA ===')) {
                                events.push({ type: 'rca', timestamp: submissionTime, submissionIndex: idx + 1 });
                              }
                              if (sub.estimation || sub.cost) {
                                events.push({ type: 'estimation', cost: sub.estimation || sub.cost, timestamp: submissionTime, submissionIndex: idx + 1 });
                              }
                              // Check if it's a change request or rejection
                              if (sub.change_requested_by) {
                                events.push({ type: 'change_requested', timestamp: submissionTime, submissionIndex: idx + 1 });
                              } else if (sub.rejection_reason || sub.rejected_by) {
                                events.push({ type: 'rejected', reason: sub.rejection_reason, timestamp: submissionTime, submissionIndex: idx + 1, rejectedBy: sub.rejected_by });
                              }
                              if (idx < previousSubmissions.length - 1 || selectedTicket.status !== 'rejected') {
                                events.push({ type: 'resubmit', timestamp: submissionTime, submissionIndex: idx + 1 });
                              }
                            });
                            // Current submission - only show if not in previous submissions
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
                              if (managerApprovalMatch && managerApprovalMatch[1]) {
                                try {
                                  events.push({ type: 'manager_approved', timestamp: new Date(managerApprovalMatch[1]).toISOString() });
                                } catch (e) {
                                  events.push({ type: 'manager_approved', timestamp: selectedTicket.created_at });
                                }
                              }
                              // Only show tenant approval if ticket has a tenant
                              if (selectedTicket.tenant_id) {
                                const tenantApprovalMatch = selectedTicket.status_history.match(/\[(.*?)\] TENANT APPROVED/);
                                if (tenantApprovalMatch && tenantApprovalMatch[1]) {
                                  try {
                                    events.push({ type: 'tenant_approved', timestamp: new Date(tenantApprovalMatch[1]).toISOString() });
                                  } catch (e) {
                                    events.push({ type: 'tenant_approved', timestamp: selectedTicket.created_at });
                                  }
                                }
                              }
                            }
                            if (selectedTicket.work_started_at) {
                              events.push({ type: 'work_started', timestamp: selectedTicket.work_started_at });
                            }
                            if (selectedTicket.work_completed_at) {
                              events.push({ type: 'work_completed', timestamp: selectedTicket.work_completed_at });
                            }
                            if (selectedTicket.resolved_at) {
                              events.push({ type: 'resolved', timestamp: selectedTicket.resolved_at });
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
                                case 'change_requested':
                                  return (
                                    <div key={idx} className="flex gap-4">
                                      <div className="w-3 h-3 rounded-full bg-orange-500 mt-1"></div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-orange-600">Changes Requested {event.submissionIndex ? `(Submission ${event.submissionIndex})` : ''}</p>
                                        <p className="text-sm text-gray-600">Helpdesk requested changes to estimation</p>
                                        <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                      </div>
                                    </div>
                                  );
                                case 'rejected':
                                  const rejectorLabel = event.rejectedBy === 'Tenant' ? 'Tenant' : 'Manager';
                                  return (
                                    <div key={idx} className="flex gap-4">
                                      <div className="w-3 h-3 rounded-full bg-red-500 mt-1"></div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-red-600">{rejectorLabel} Rejected {event.submissionIndex ? `(Submission ${event.submissionIndex})` : ''}</p>
                                        <p className="text-sm text-gray-600">Estimation rejected by {rejectorLabel.toLowerCase()}</p>
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
                                        <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                      </div>
                                    </div>
                                  );
                                case 'reopened':
                                  return (
                                    <div key={idx} className="flex gap-4">
                                      <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1"></div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-yellow-600">Ticket Reopened by Tenant</p>
                                        <p className="text-sm text-gray-600">Ticket reopened for resubmission</p>
                                        <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                      </div>
                                    </div>
                                  );
                                case 'work_completed':
                                  return (
                                    <div key={idx} className="flex gap-4">
                                      <div className="w-3 h-3 rounded-full bg-purple-600 mt-1"></div>
                                      <div className="flex-1">
                                        <p className="font-semibold">Work Completed</p>
                                        <p className="text-sm text-gray-600">Technician completed work</p>
                                        <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                      </div>
                                    </div>
                                  );
                                case 'resolved':
                                  return (
                                    <div key={idx} className="flex gap-4">
                                      <div className="w-3 h-3 rounded-full bg-green-700 mt-1"></div>
                                      <div className="flex-1">
                                        <p className="font-semibold">Ticket Resolved</p>
                                        <p className="text-sm text-gray-600">Tenant provided feedback and closed ticket</p>
                                        <p className="text-sm text-gray-500">{event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
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
                  <TabsContent value="history" className="p-6">
                    <div className="space-y-6">
                      {(() => {
                        try {
                          const submissions = selectedTicket.previous_submissions ? JSON.parse(selectedTicket.previous_submissions) : null;
                          const userRole = user?.role;
                          if (!submissions) {
                            return <p className="text-center text-gray-500 py-8">No submission history available</p>;
                          }
                          // Convert single submission to array for uniform handling
                          const submissionArray = Array.isArray(submissions) ? submissions : [submissions];
                          return submissionArray.map((sub, idx) => {
                            const rejectedBy = sub.rejected_by || (sub.status === 'rejected' ? 'Manager' : sub.status === 'tenant_rejected' ? 'Tenant' : 'Unknown');
                            const isReopenedByTenant = sub.reopened_by === 'Tenant' || selectedTicket.status === 'reopened';
                            // Role-based visibility
                            const isManagerRejection = rejectedBy === 'Manager';
                            const isTenantRejection = rejectedBy === 'Tenant' || isReopenedByTenant;
                            // Manager rejection: visible to Manager & Helpdesk only
                            if (isManagerRejection && userRole === 'Tenant') {
                              return null;
                            }
                            const statusLabel = isReopenedByTenant ? 'Reopened by Tenant' : `Rejected by ${rejectedBy}`;
                            const statusColor = isReopenedByTenant ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300';
                            const iconColor = isReopenedByTenant ? 'text-yellow-600' : 'text-red-600';
                            return (
                              <Card key={idx} className={`${statusColor} border`}>
                                <CardContent className="p-6">
                                  <div className="flex items-center gap-2 mb-4">
                                    {isReopenedByTenant ? <AlertTriangle className={`h-5 w-5 ${iconColor}`} /> : <XCircle className={`h-5 w-5 ${iconColor}`} />}
                                    <h3 className="text-lg font-semibold text-gray-900">{statusLabel}</h3>
                                  </div>
                                  <div className="space-y-4">
                                    {/* Timestamp */}
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">Submission Date</p>
                                      <p className="text-sm text-gray-900">{sub.timestamp ? new Date(sub.timestamp).toLocaleString() : sub.rejected_at ? new Date(sub.rejected_at).toLocaleString() : 'N/A'}</p>
                                    </div>
                                    {/* Rejection Reason */}
                                    {sub.rejection_reason && (
                                      <div className="bg-white p-3 rounded border border-red-200">
                                        <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                                        <p className="text-sm text-gray-900">{sub.rejection_reason}</p>
                                      </div>
                                    )}
                                    {/* Technicians */}
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
                                    {/* RCA */}
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
                                    {/* Materials Table */}
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
                                    {/* Cost Breakdown */}
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
                                                  <span className="font-bold text-lg">{isReopenedByTenant ? '₹' + costMatch[6] : '₹' + costMatch[6]}</span>
                                                </div>
                                              </>
                                            ) : <p className="text-gray-500">Cost data not available</p>;
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                    {/* OPEX Code */}
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
                          {/* Show tenant feedback if exists */}
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
                            /* Show creator feedback if exists */
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
                            /* Show feedback form for creator */
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
                            <div className="text-center py-8 text-muted-foreground">
                              No feedback available for this ticket
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
        )}
        {/* Completion Dialog */}
        <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Complete Work</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Completion Notes *</Label><Textarea value={completionForm.notes} onChange={(e) => setCompletionForm({...completionForm, notes: e.target.value})} rows={4} /></div>
              <div>
                <Label>Upload Images</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setCompletionForm({...completionForm, images: Array.from(e.target.files || [])})} />
                {completionForm.images.length > 0 && <p className="text-sm text-muted-foreground">{completionForm.images.length} images selected</p>}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCompleteWork}>Complete & Notify Tenant</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Add Technician Dialog */}
        <Dialog open={isTechnicianDialogOpen} onOpenChange={setIsTechnicianDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Technician from Users</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select a user with "Technician" role from User Management to add as a technician resource.</p>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-900">Note:</p>
                <p className="text-sm text-blue-700 mt-1">Users must be created in User Management with role "Technician" first. Go to Admin → User Management to create technician users.</p>
              </div>
              <Button className="w-full" onClick={() => {
                setIsTechnicianDialogOpen(false);
                window.location.href = '/admin/user-management';
              }}>Go to User Management</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Add Material Dialog */}
        <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Material Category *</Label>
                <div className="flex gap-2">
                  <Select value={materialInput.category || ''} onValueChange={(v) => setMaterialInput({...materialInput, category: v})}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {materialCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" onClick={() => {
                    if (newCategory.trim()) {
                      setMaterialCategories([...materialCategories, newCategory.trim()]);
                      setNewCategory('');
                      toast({ title: "Success", description: "Category added" });
                    }
                  }}>+</Button>
                </div>
                <Input placeholder="Add new category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="mt-2" />
              </div>
              <div><Label>Material Name *</Label><Input value={materialInput.name} onChange={(e) => setMaterialInput({...materialInput, name: e.target.value})} /></div>
              <div><Label>Rate (₹) *</Label><Input type="number" step="0.01" value={materialInput.rate || ''} onChange={(e) => setMaterialInput({...materialInput, rate: parseFloat(e.target.value)})} /></div>
              <div><Label>UOM *</Label><Input value={materialInput.uom || ''} onChange={(e) => setMaterialInput({...materialInput, uom: e.target.value})} placeholder="e.g., pcs, kg, m, sqft" /></div>
              <Button className="w-full" onClick={async () => {
                if (!materialInput.category || !materialInput.name || !materialInput.rate || !materialInput.uom) {
                  toast({ title: "Error", description: "All fields required", variant: "destructive" });
                  return;
                }
                try {
                  await HelpdeskService.addMaterial({
                    category: materialInput.category,
                    name: materialInput.name,
                    rate: materialInput.rate,
                    uom: materialInput.uom
                  });
                  await loadResources();
                  toast({ title: "Success", description: "Material added successfully" });
                  setIsMaterialDialogOpen(false);
                  setMaterialInput({ name: '', category: '', rate: 0, uom: '' });
                } catch (error: any) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                }
              }}>Add Material</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* View Technicians Dialog */}
        <Dialog open={isViewTechniciansOpen} onOpenChange={setIsViewTechniciansOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Technicians List</DialogTitle>
                <Button onClick={() => setIsTechnicianDialogOpen(true)} size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />Add Technician
                </Button>
              </div>
            </DialogHeader>
            <div className="space-y-3">
              {technicians.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No technicians added yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Specialization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {technicians.map((tech) => (
                      <TableRow key={tech.id}>
                        <TableCell>{tech.name}</TableCell>
                        <TableCell>{tech.contact}</TableCell>
                        <TableCell><Badge variant="outline">{tech.specialization}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {/* Create Ticket Form */}
        {isCreateTicketOpen && (
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
                        reopened_by: user?.role || 'Helpdesk',
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
        {/* View Materials Dialog */}
        <Dialog open={isViewMaterialsOpen} onOpenChange={setIsViewMaterialsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <DialogTitle>Materials List</DialogTitle>
                <Button onClick={() => setIsMaterialDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />Add Material
                </Button>
              </div>
            </DialogHeader>
            <div className="overflow-auto flex-1">
              {materials.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No materials added yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Material Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>UOM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell><Badge variant="outline">{material.category}</Badge></TableCell>
                        <TableCell>{material.name}</TableCell>
                        <TableCell>₹{material.rate}</TableCell>
                        <TableCell>{material.uom}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

