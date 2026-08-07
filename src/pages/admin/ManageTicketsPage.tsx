import { useState, useEffect, useRef } from 'react';
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
import { Search, Filter, Download, Eye, CheckCircle, XCircle, ThumbsUp, ThumbsDown, FileText, Plus, CircleX, TriangleAlert, MapPin, Calendar, Camera, Video, Upload, Cloud, Building2, Layers, Clock, FileImage, ChevronDown, Settings2, Check, AlertTriangle, Play, Square, Send, UserPlus, FileDown, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService } from '@/services/maintenanceService';
import { HelpdeskService } from '@/services/helpdeskService';
import { TicketEstimationService } from '@/services/ticketEstimationService';
import { sendTicketNotification } from '@/services/ticketNotifications';
import { getStatusColor, getStatusLabel } from '@/utils/ticketStatus';
import { ReportDialog } from '@/components/reports/ReportDialog';
import { buildingService } from '@/services/buildingService';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import { AssetInfo } from '@/components/tenant/AssetInfo';
import { MaintenanceTicketForm } from '@/components/tenant/MaintenanceTicketForm';
import { supabase } from '@/lib/supabase';
import { TicketUploadService } from '@/services/ticketUploadService';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all_tickets');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [technicianFilter2, setTechnicianFilter2] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [costRangeFilter, setCostRangeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [activeEstimation, setActiveEstimation] = useState<any>(null);
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
  const [showKpiPicker, setShowKpiPicker] = useState(false);
  const [visibleKpis, setVisibleKpis] = useState<string[]>(['total', 'open', 'approved', 'work_started', 'completed', 'resolved', 'on_hold', 'pending_estimations', 'pending_approvals', 'rejected', 'overdue', 'critical', 'high', 'medium', 'low', 'safety_risk']);
  const kpiPickerRef = useRef<HTMLDivElement>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [technicianSearch, setTechnicianSearch] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [rcaForm, setRcaForm] = useState({ rootCause: '', findings: '' });
  const [estimationForm, setEstimationForm] = useState({ 
    materials: [] as any[], 
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
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [materialCategories, setMaterialCategories] = useState<string[]>(['Electrical', 'Plumbing', 'HVAC', 'Carpentry', 'Painting']);
  const [slaHours, setSlaHours] = useState('');
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
    additionalNotes: '',
    tenant_id: ''
  });
  const [rejectedEstimations, setRejectedEstimations] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [imagePopupOpen, setImagePopupOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [resolvedPhotos, setResolvedPhotos] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const canApproveTickets =
    user?.appUser?.canApproveTickets === true ||
    user?.canApproveTickets === true ||
    user?.appUser?.can_approve_tickets === true ||
    user?.can_approve_tickets === true;

  useEffect(() => {
    loadTickets();
    loadBuildings();
    loadKpiPreferences();
    loadResources();
    const subscription = MaintenanceService.subscribeToTickets(() => loadTickets());
    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const loadRejectedEstimations = async () => {
      if (!selectedTicket?.id) {
        setRejectedEstimations([]);
        return;
      }
      try {
        setLoadingHistory(true);
        const allEstimations = await TicketEstimationService.getAllEstimations(selectedTicket.id);
        const rejected = allEstimations.filter(est => 
          est.status === 'manager_rejected' || est.status === 'tenant_rejected' || (est.reopened_by && est.reopened_at)
        );
        setRejectedEstimations(rejected);
      } catch (error) {
        console.error('Error loading rejected estimations:', error);
        setRejectedEstimations([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadRejectedEstimations();
  }, [selectedTicket?.id]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (kpiPickerRef.current && !kpiPickerRef.current.contains(e.target as Node)) {
        setShowKpiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (selectedTicket?.related_ticket_id) {
      MaintenanceService.getTicketById(selectedTicket.related_ticket_id)
        .then(ticket => setRelatedTicketNumber(ticket.ticket_number))
        .catch(() => setRelatedTicketNumber(null));
    } else {
      setRelatedTicketNumber(null);
    }
    
    if (selectedTicket?.id) {
      (async () => {
        try {
          // Prefer the active estimation from ticket_estimations
          let estimation = await TicketEstimationService.getActiveEstimation(selectedTicket.id).catch(() => null);

          // If no active estimation or it doesn't contain assigned_technicians,
          // fallback to the most recent estimation that has assigned_technicians
          if (!estimation || !Array.isArray(estimation.assigned_technicians) || estimation.assigned_technicians.length === 0) {
            const all = await TicketEstimationService.getAllEstimations(selectedTicket.id).catch(() => []);
            if (all && all.length > 0) {
              const found = all.find((e: any) => Array.isArray(e.assigned_technicians) && e.assigned_technicians.length > 0);
              if (found) estimation = found;
            }
          }

          setActiveEstimation(estimation);
        } catch (err) {
          console.error('Error fetching estimation for technicians:', err);
          setActiveEstimation(null);
        }
      })();
    } else {
      setActiveEstimation(null);
    }

    // Resolve photo URLs
    if (selectedTicket?.photos && selectedTicket.photos.length > 0) {
      TicketUploadService.resolveUrls(selectedTicket.photos)
        .then(urls => setResolvedPhotos(urls))
        .catch(() => setResolvedPhotos(selectedTicket.photos));
    } else {
      setResolvedPhotos([]);
    }
  }, [selectedTicket?.related_ticket_id, selectedTicket?.id, selectedTicket?.photos]);

  const loadBuildings = async () => {
    try {
      const data = await buildingService.getAllBuildings();
      setBuildings(data);
    } catch (error) {
      console.error('Error loading buildings:', error);
    }
  };

  const loadResources = async () => {
    try {
      const { userService } = await import('@/data/userData');
      const { tenantDataService } = await import('@/data/tenantData');
      const [allUsers, matData, tenantList] = await Promise.all([
        userService.getAllUsers(),
        HelpdeskService.getMaterials(),
        tenantDataService.getAllTenants()
      ]);

      const technicianUsers = (allUsers || [])
        .filter((u: any) => u.selectedRoles?.includes('Technician') && u.isActive)
        .map((u: any) => ({
          id: u.id,
          name: u.name,
          contact: u.phone || u.email,
          specialization: u.technicianCategory || u.department || 'General'
        }));

      setTechnicians(technicianUsers);
      setMaterials(matData);
      setTenants(tenantList || []);

      // Build a quick lookup map of users by id so we can resolve created_by_user_id -> name
      try {
        const map: Record<string, any> = {};
        (allUsers || []).forEach((u: any) => { if (u && u.id) map[u.id] = u; });
        setUsersMap(map);
      } catch (e) {
        console.warn('Could not build users map', e);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  };

  const loadKpiPreferences = async () => {
    try {
      const savedUser = localStorage.getItem('demo_user');
      if (!savedUser) return;
      const userId = JSON.parse(savedUser)?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from('users')
        .select('helpdesk_kpi_preferences')
        .eq('id', userId)
        .single();

      if (!error && data?.helpdesk_kpi_preferences?.cards?.length) {
        setVisibleKpis(data.helpdesk_kpi_preferences.cards);
      }
    } catch (error) {
      console.error('Error loading KPI preferences:', error);
    }
  };

  const saveKpiPreferences = async (cards: string[]) => {
    try {
      const savedUser = localStorage.getItem('demo_user');
      if (!savedUser) return;
      const userId = JSON.parse(savedUser)?.id;
      if (!userId) return;
      
      await supabase
        .from('users')
        .update({ helpdesk_kpi_preferences: { cards } })
        .eq('id', userId);
    } catch (error) {
      console.error('Error saving KPI preferences:', error);
    }
  };

  const toggleKpi = (key: string) => {
    setVisibleKpis(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      saveKpiPreferences(next);
      return next;
    });
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
    if (!ticketForm.category || !ticketForm.title || !ticketForm.description || !ticketForm.building_id || !ticketForm.floor_id) {
      toast({ title: "Error", description: "Fill all required fields", variant: "destructive" });
      return;
    }
    try {
      const building = buildings.find(b => b.id === ticketForm.building_id);
      const floor = floors.find(f => f.id === ticketForm.floor_id);
      
      const buildingName = building?.name || 'Unknown';
      const floorName = floor?.floor_name || floor?.floor_number || 'Unknown';
      
      const tenantIdToUse = ticketForm.tenant_id || user?.id || null;
      const ticketData = {
        title: ticketForm.title,
        description: ticketForm.description,
        category: ticketForm.category,
        priority: ticketForm.priority,
        tenant_id: tenantIdToUse,
        on_behalf_tenant_id: ticketForm.tenant_id || null,
        location: `Building: ${buildingName}, Floor: ${floorName}, Room: ${ticketForm.room || 'N/A'}, Spot: ${ticketForm.exactSpot || 'N/A'}`,
        preferred_date: ticketForm.preferredDate || null,
        preferred_time: ticketForm.preferredTime || null,
        additional_notes: `Safety Risk: ${ticketForm.safetyRisk ? 'Yes' : 'No'}\nPrevious Occurrence: ${ticketForm.previousOccurrence ? 'Yes' : 'No'}\n${ticketForm.additionalNotes}`
      };
      
      const createdTicket = await MaintenanceService.createTicket(ticketData);
      
      // Send ticket.created notification
      await sendTicketNotification('ticket.created', createdTicket);
      
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
        additionalNotes: '',
        tenant_id: ''
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
      
      toast({ title: "Success", description: newStatus === 'approved' ? "Estimation approved. Ready for work." : "Estimation approved and sent to tenant for approval" });
      
      const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
      
      // Send manager approval notification
      await sendTicketNotification('ticket.estimation_approved_by_manager', refreshedTicket);
      
      // If skipping tenant approval, also send estimation_submitted
      if (newStatus === 'approved') {
        await sendTicketNotification('ticket.estimation_submitted', refreshedTicket);
      }

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
      // Mark current estimation as rejected in ticket_estimations table
      if (activeEstimation) {
        await TicketEstimationService.updateEstimation(activeEstimation.id, {
          status: 'manager_rejected',
          rejection_reason: rejectionReason,
          rejected_by: 'Manager',
          rejected_at: new Date().toISOString(),
          is_active: false
        });
      }
      
      // Clear maintenance_tickets fields
      await MaintenanceService.updateTicket(selectedTicket.id, { 
        status: 'rejected',
        rejection_reason: rejectionReason,
        assigned_technicians: null,
        resolution_notes: null,
        cost: 0,
        opex_code: null,
        work_started_at: null,
        work_completed_at: null,
        work_duration_hours: null,
        sla_hours: null
      });
      
      toast({ title: "Success", description: "Estimation rejected. Sent back to helpdesk" });
      await sendTicketNotification('ticket.estimation_rejected_by_manager', { ...selectedTicket, status: 'rejected' });
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



  const downloadTicketDetailsPDF = async (ticket: any) => {
    try {
      // Fetch active estimation from ticket_estimations table
      const estimation = await TicketEstimationService.getActiveEstimation(ticket.id).catch(() => null);
      
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;
      
      // Helper function to draw table with compact spacing
      const drawTable = (headers: string[], rows: string[][], startY: number, colWidths: number[]) => {
        let y = startY;
        const tableWidth = colWidths.reduce((a, b) => a + b, 0);
        const startX = 20;
        
        // Header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(startX, y, tableWidth, 6, 'FD');
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        let x = startX;
        headers.forEach((header, i) => {
          pdf.text(header, x + 2, y + 4);
          x += colWidths[i];
        });
        y += 6;
        
        // Rows
        pdf.setFont('helvetica', 'normal');
        rows.forEach(row => {
          // Calculate row height based on longest wrapped text
          let maxLines = 1;
          row.forEach((cell, i) => {
            const lines = pdf.splitTextToSize(cell, colWidths[i] - 4);
            maxLines = Math.max(maxLines, lines.length);
          });
          const rowHeight = Math.max(5, maxLines * 4);
          
          pdf.rect(startX, y, tableWidth, rowHeight, 'S');
          x = startX;
          row.forEach((cell, i) => {
            const lines = pdf.splitTextToSize(cell, colWidths[i] - 4);
            pdf.text(lines, x + 2, y + 3.5);
            // Draw vertical lines
            if (i < row.length - 1) {
              pdf.line(x + colWidths[i], y, x + colWidths[i], y + rowHeight);
            }
            x += colWidths[i];
          });
          y += rowHeight;
        });
        
        return y;
      };
      
      // Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RATHINAM TECHZONE', 20, yPos);
      pdf.setFontSize(12);
      pdf.text('TICKET DETAILS', pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;
      
      // Ticket Info
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Ticket #: ${ticket.ticket_number || ticket.id.slice(-6)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 4;
      pdf.text(`Date: ${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 8;
      
      // Basic Information Table
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BASIC INFORMATION', 20, yPos);
      yPos += 5;
      
      const basicInfoRows = [
        ['Status', getStatusLabel(ticket.status)],
        ['Priority', ticket.priority],
        ['Category', ticket.category],
        ['Created By', ticket.tenant?.company_name || ticket.created_by_name || 'N/A'],
        ['Created At', ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A']
      ];
      yPos = drawTable(['Field', 'Value'], basicInfoRows, yPos, [60, 110]);
      yPos += 6;
      
      // Issue Details Table
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ISSUE DETAILS', 20, yPos);
      yPos += 5;
      
      const issueRows = [
        ['Title', ticket.title],
        ['Description', ticket.description]
      ];
      yPos = drawTable(['Field', 'Value'], issueRows, yPos, [60, 110]);
      yPos += 6;
      
      // Location Table
      if (ticket.building || ticket.location) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('LOCATION', 20, yPos);
        yPos += 5;
        
        const locationRows = [
          ['Building', ticket.building || 'N/A'],
          ['Floor', ticket.floor || 'N/A'],
          ['Room', ticket.room || 'N/A'],
          ['Exact Spot', ticket.spot_description || 'N/A']
        ];
        yPos = drawTable(['Field', 'Value'], locationRows, yPos, [60, 110]);
        yPos += 6;
      }
      
      // Assigned Technicians Table - from estimation
      if (estimation?.assigned_technicians?.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ASSIGNED TECHNICIANS', 20, yPos);
        yPos += 5;
        
        const techRows = estimation.assigned_technicians.map((tech: any) => [
          tech.name,
          tech.contact,
          tech.specialization
        ]);
        yPos = drawTable(['Name', 'Contact', 'Specialization'], techRows, yPos, [60, 55, 55]);
        yPos += 6;
      }
      
      // Root Cause Analysis Table - from estimation
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ROOT CAUSE ANALYSIS', 20, yPos);
      yPos += 5;
      
      const rootCause = estimation?.root_cause || 'Not Added';
      const findings = estimation?.findings || 'Not Added';
      
      const rcaRows = [
        ['Root Cause', rootCause],
        ['Findings', findings]
      ];
      yPos = drawTable(['Field', 'Value'], rcaRows, yPos, [60, 110]);
      yPos += 6;
      
      // Work Tracking Table - Always show if any work tracking data exists
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('WORK TRACKING', 20, yPos);
      yPos += 5;
      
      const workRows = [
        ['SLA Time', ticket.sla_hours ? `${ticket.sla_hours} hours` : 'Not Set'],
        ['Work Started', ticket.work_started_at ? new Date(ticket.work_started_at).toLocaleString() : 'Not Started'],
        ['Work Ended', ticket.work_completed_at ? new Date(ticket.work_completed_at).toLocaleString() : 'Not Completed'],
        ['Duration', ticket.work_duration_hours ? `${ticket.work_duration_hours.toFixed(2)} hours` : 'N/A']
      ];
      yPos = drawTable(['Field', 'Value'], workRows, yPos, [60, 110]);
      yPos += 6;
      
      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      pdf.save(`Ticket_Details_${ticket.ticket_number || ticket.id.slice(-6)}.pdf`);
      toast({ title: "Success", description: "Ticket details PDF downloaded successfully" });
    } catch (error: any) {
      console.error('Error generating ticket details PDF:', error);
      toast({ title: "Error", description: "Failed to generate ticket details PDF", variant: "destructive" });
    }
  };

  const downloadEstimationPDF = async (ticket: any) => {
    try {
      // Fetch active estimation from ticket_estimations table
      const estimation = await TicketEstimationService.getActiveEstimation(ticket.id).catch(() => null);
      
      if (!estimation) {
        toast({ title: "Error", description: "No estimation found for this ticket", variant: "destructive" });
        return;
      }
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Header - Company Name (Left) and ESTIMATION (Right)
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RATHINAM TECHZONE', 20, 20);
      pdf.text('ESTIMATION', pageWidth - 20, 20, { align: 'right' });
      
      // Date and Estimation Number (Right aligned)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const createdDate = new Date(ticket.created_at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
      pdf.text(`DATE: ${createdDate}`, pageWidth - 20, 28, { align: 'right' });
      pdf.text(`ESTIMATION #: Ticket #${ticket.ticket_number || ticket.id.slice(-6)}`, pageWidth - 20, 34, { align: 'right' });
      
      // Ticket Information Box (no border, no background)
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Ticket Information', 25, 52);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Ticket Number: ${ticket.ticket_number || ticket.id.slice(-6)}`, 25, 58);
      pdf.text(`Date: ${createdDate}`, pageWidth - 25, 58, { align: 'right' });
      pdf.text(`Created By: ${ticket.tenant?.company_name || ticket.created_by_name || 'N/A'}`, 25, 62);
      const createdAtTime = new Date(ticket.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      pdf.text(`Created At: ${createdAtTime}`, 25, 66);
      
      // Materials from estimation
      const materials = estimation.materials || [];
      
      // Materials Table with borders
      let yPos = 75;
      const tableStartX = 20;
      const tableWidth = pageWidth - 40;
      const col1Width = 100; // Description - wider
      const col2Width = 35;  // QTY/HRS
      const col3Width = 35;  // Unit Price
      const col4Width = tableWidth - col1Width - col2Width - col3Width; // Total
      const rowHeight = 10; // Increased row height
      
      // Table Header
      pdf.setDrawColor(50, 50, 50);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'FD');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description', tableStartX + 2, yPos + 4.5);
      pdf.text('QTY/HRS', tableStartX + col1Width + 2, yPos + 4.5);
      pdf.text('Unit Price', tableStartX + col1Width + col2Width + 2, yPos + 4.5);
      pdf.text('Total', tableStartX + col1Width + col2Width + col3Width + col4Width - 2, yPos + 4.5, { align: 'right' });
      
      // Draw vertical lines for header
      pdf.line(tableStartX + col1Width, yPos, tableStartX + col1Width, yPos + rowHeight);
      pdf.line(tableStartX + col1Width + col2Width, yPos, tableStartX + col1Width + col2Width, yPos + rowHeight);
      pdf.line(tableStartX + col1Width + col2Width + col3Width, yPos, tableStartX + col1Width + col2Width + col3Width, yPos + rowHeight);
      
      yPos += rowHeight;
      pdf.setFont('helvetica', 'normal');
      
      // Table Rows
      materials.forEach((mat: any, index: number) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 20;
        }
        
        const qty = parseFloat(mat.quantity || mat.qty) || 0;
        const rate = parseFloat(mat.rate) || 0;
        const gst = parseFloat(mat.gst_percentage || mat.gst) || 0;
        const unit = mat.unit || mat.uom || '';
        const item = mat.item || mat.name || '';
        const itemTotal = (qty * rate) + ((qty * rate * gst) / 100);
        
        // Draw row background (white only, no alternating)
        pdf.setFillColor(255, 255, 255);
        pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'F');
        
        // Draw cell borders
        pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'S');
        pdf.line(tableStartX + col1Width, yPos, tableStartX + col1Width, yPos + rowHeight);
        pdf.line(tableStartX + col1Width + col2Width, yPos, tableStartX + col1Width + col2Width, yPos + rowHeight);
        pdf.line(tableStartX + col1Width + col2Width + col3Width, yPos, tableStartX + col1Width + col2Width + col3Width, yPos + rowHeight);
        
        // Cell content
        pdf.text(item, tableStartX + 2, yPos + 4.5);
        pdf.text(`${qty} ${unit}`, tableStartX + col1Width + 2, yPos + 4.5);
        pdf.text(rate.toFixed(2), tableStartX + col1Width + col2Width + 2, yPos + 4.5);
        pdf.text(itemTotal.toFixed(2), tableStartX + col1Width + col2Width + col3Width + col4Width - 2, yPos + 4.5, { align: 'right' });
        
        yPos += rowHeight;
      });
      
      // Add Labor Services if exists
      if (estimation.labor_hours && parseFloat(estimation.labor_hours) > 0) {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setFillColor(255, 255, 255);
        pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'F');
        pdf.rect(tableStartX, yPos, tableWidth, rowHeight, 'S');
        pdf.line(tableStartX + col1Width, yPos, tableStartX + col1Width, yPos + rowHeight);
        pdf.line(tableStartX + col1Width + col2Width, yPos, tableStartX + col1Width + col2Width, yPos + rowHeight);
        pdf.line(tableStartX + col1Width + col2Width + col3Width, yPos, tableStartX + col1Width + col2Width + col3Width, yPos + rowHeight);
        
        const laborHours = parseFloat(estimation.labor_hours);
        const laborCost = parseFloat(estimation.labor_cost);
        const laborRate = laborHours > 0 ? (laborCost / laborHours) : 0;
        
        pdf.text('Labor Services', tableStartX + 2, yPos + 4.5);
        pdf.text(`${laborHours} hrs`, tableStartX + col1Width + 2, yPos + 4.5);
        pdf.text(laborRate.toFixed(2), tableStartX + col1Width + col2Width + 2, yPos + 4.5);
        pdf.text(laborCost.toFixed(2), tableStartX + col1Width + col2Width + col3Width + col4Width - 2, yPos + 4.5, { align: 'right' });
        
        yPos += rowHeight + 10;
      } else {
        yPos += 10;
      }
      
      // Cost Summary (Right aligned)
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 20;
      }
      
      const materialSubtotal = parseFloat(estimation.material_cost_without_gst || 0);
      const gstAmount = parseFloat(estimation.total_gst || 0);
      const laborTotal = parseFloat(estimation.labor_cost || 0);
      const grandTotal = parseFloat(estimation.total_cost || 0);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Material Subtotal:', pageWidth - 80, yPos);
      pdf.text(`Rs. ${materialSubtotal.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
      yPos += 6;
      
      pdf.text('Applicable GST:', pageWidth - 80, yPos);
      pdf.text(`Rs. ${gstAmount.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
      yPos += 6;
      
      pdf.text('Labor Total:', pageWidth - 80, yPos);
      pdf.text(`Rs. ${laborTotal.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
      yPos += 10;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('GRAND TOTAL:', pageWidth - 80, yPos);
      pdf.text(`Rs. ${grandTotal.toFixed(2)}`, pageWidth - 25, yPos, { align: 'right' });
      
      // Signature Section - Position at bottom of page
      const signatureY = pageHeight - 30;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text('Authorized Signatory', 25, signatureY);
      
      const lineY = signatureY + 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(25, lineY, 100, lineY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Signature', 25, lineY + 5);
      
      // Save PDF
      pdf.save(`Estimation_${ticket.ticket_number || ticket.id.slice(-6)}.pdf`);
      toast({ title: "Success", description: "Estimation PDF downloaded successfully" });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const tenantName = ticket.tenant?.company_name || ticket.creator?.name || (ticket.created_by_user_id && usersMap[ticket.created_by_user_id]?.name) || 'N/A';
    const ticketNumber = ticket.ticket_number || ticket.id.slice(-6);
    const unitNumber = ticket.unit_number || '';
    
    const matchesSearch = tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticketNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSearchQuery = !searchQuery || 
                              tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              unitNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'all_tickets' || statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'pending' || statusFilter === 'open') {
      matchesStatus = ['pending', 'reopened', 'open'].includes(ticket.status);
    } else if (statusFilter === 'pending_estimation') {
      matchesStatus = ['assigned', 'rca_added'].includes(ticket.status);
    } else if (statusFilter === 'overdue') {
      if (['resolved', 'closed'].includes(ticket.status)) {
        matchesStatus = false;
      } else if (ticket.target_date) {
        matchesStatus = new Date(ticket.target_date) < new Date();
      } else if (ticket.work_started_at && ticket.sla_hours) {
        const slaDeadline = new Date(ticket.work_started_at);
        slaDeadline.setHours(slaDeadline.getHours() + ticket.sla_hours);
        matchesStatus = slaDeadline < new Date();
      } else {
        matchesStatus = false;
      }
    } else if (statusFilter === 'safety_risk') {
      matchesStatus = ticket.safety_risk === true;
    } else if (statusFilter === 'assigned_awaiting') {
      matchesStatus = ['assigned', 'rca_added', 'pending_approval', 'pending_tenant_approval'].includes(ticket.status);
    } else if (statusFilter === 'pending_approval') {
      matchesStatus = ['pending_approval', 'rejected', 'pending_tenant_approval', 'tenant_rejected'].includes(ticket.status);
    } else if (statusFilter === 'in_progress') {
      matchesStatus = ['approved', 'work_started', 'in_progress', 'work_completed'].includes(ticket.status);
    } else if (statusFilter === 'completed') {
      matchesStatus = ['resolved', 'closed'].includes(ticket.status);
    } else if (statusFilter === 'rejected') {
      matchesStatus = ['rejected', 'tenant_rejected'].includes(ticket.status);
    } else {
      matchesStatus = ticket.status === statusFilter;
    }
    
    const matchesPriority = priorityFilter === 'all' || ticket.priority.toLowerCase() === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesBuilding = buildingFilter === 'all' || ticket.building === buildingFilter;
    
    const matchesTechnician = technicianFilter2 === 'all' || (
      ticket.assigned_technicians && ticket.assigned_technicians.length > 0 &&
      ticket.assigned_technicians.some((tech: any) => tech.id === technicianFilter2)
    );
    
    let matchesDateRange = true;
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const createdDate = new Date(ticket.created_at);
      switch (dateRangeFilter) {
        case 'today':
          matchesDateRange = createdDate >= today;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDateRange = createdDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDateRange = createdDate >= monthAgo;
          break;
      }
    }
    
    let matchesCostRange = true;
    if (costRangeFilter !== 'all') {
      const cost = ticket.cost || 0;
      switch (costRangeFilter) {
        case 'low':
          matchesCostRange = cost > 0 && cost < 5000;
          break;
        case 'medium':
          matchesCostRange = cost >= 5000 && cost < 20000;
          break;
        case 'high':
          matchesCostRange = cost >= 20000;
          break;
      }
    }
    
    return matchesSearch && matchesSearchQuery && matchesStatus && matchesPriority && matchesCategory && matchesBuilding && matchesTechnician && matchesDateRange && matchesCostRange;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'pending' || t.status === 'reopened').length,
    approved: tickets.filter(t => t.status === 'approved').length,
    work_started: tickets.filter(t => t.status === 'work_started').length,
    completed: tickets.filter(t => t.status === 'work_completed').length,
    resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
    on_hold: tickets.filter(t => t.status === 'on_hold').length,
    pending_estimations: tickets.filter(t => ['assigned', 'rca_added'].includes(t.status)).length,
    pending_approvals: tickets.filter(t => ['pending_approval', 'pending_tenant_approval'].includes(t.status)).length,
    rejected: tickets.filter(t => ['rejected', 'tenant_rejected'].includes(t.status)).length,
    overdue: tickets.filter(t => {
      if (['resolved', 'closed'].includes(t.status)) return false;
      if (t.target_date) {
        return new Date(t.target_date) < new Date();
      }
      if (t.work_started_at && t.sla_hours) {
        const slaDeadline = new Date(t.work_started_at);
        slaDeadline.setHours(slaDeadline.getHours() + t.sla_hours);
        return slaDeadline < new Date();
      }
      return false;
    }).length,
    critical: tickets.filter(t => t.priority === 'Critical' || t.priority === 'Urgent').length,
    high: tickets.filter(t => t.priority === 'High').length,
    medium: tickets.filter(t => t.priority === 'Medium').length,
    low: tickets.filter(t => t.priority === 'Low').length,
    safety_risk: tickets.filter(t => t.safety_risk === true).length
  };

  return (
    <DashboardLayout title="Manage Tickets" subtitle="Review and approve maintenance estimations">
      <div className="space-y-4 sm:space-y-6">
        {/* KPI Cards Header with Settings */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Dashboard Overview</h2>
          <div className="relative" ref={kpiPickerRef}>
            <button 
              onClick={() => setShowKpiPicker(p => !p)}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9 rounded-md p-0"
              title="Customize KPI Cards"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M20 7h-9"></path>
                <path d="M14 17H5"></path>
                <circle cx="17" cy="17" r="3"></circle>
                <circle cx="7" cy="7" r="3"></circle>
              </svg>
            </button>
            {showKpiPicker && (
              <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Toggle KPI Cards</p>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {[
                    { key: 'total', label: 'Total Tickets' },
                    { key: 'open', label: 'Open' },
                    { key: 'approved', label: 'Approved' },
                    { key: 'work_started', label: 'Work Started' },
                    { key: 'completed', label: 'Completed' },
                    { key: 'resolved', label: 'Resolved' },
                    { key: 'on_hold', label: 'On Hold' },
                    { key: 'pending_estimations', label: 'Pending Estimations' },
                    { key: 'pending_approvals', label: 'Pending Approvals' },
                    { key: 'rejected', label: 'Rejected' },
                    { key: 'overdue', label: 'Overdue' },
                    { key: 'critical', label: 'Critical Priority' },
                    { key: 'high', label: 'High Priority' },
                    { key: 'medium', label: 'Medium Priority' },
                    { key: 'low', label: 'Low Priority' },
                    { key: 'safety_risk', label: 'Safety Risk' },
                  ].map(kpi => (
                    <div
                      key={kpi.key}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleKpi(kpi.key)}
                    >
                      <span className="text-sm text-gray-700">{kpi.label}</span>
                      {visibleKpis.includes(kpi.key) && <Check className="h-4 w-4 text-blue-600" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4" style={{gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`}}>
          {visibleKpis.includes('total') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('all_tickets'); setPriorityFilter('all'); }}>
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
          )}
          {visibleKpis.includes('open') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('pending'); setPriorityFilter('all'); }}>
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
          )}
          {visibleKpis.includes('approved') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('approved'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('work_started') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('work_started'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Work Started</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.work_started}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('completed') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('work_completed'); setPriorityFilter('all'); }}>
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
          )}
          {visibleKpis.includes('resolved') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('completed'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('on_hold') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('on_hold'); setPriorityFilter('all'); }}>
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
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`}}>
          {visibleKpis.includes('pending_estimations') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('pending_estimation'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Estimations</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pending_estimations}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('pending_approvals') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('pending_approval'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-purple-600">{stats.pending_approvals}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('rejected') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('rejected'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('overdue') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('overdue'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </CardContent>
          </Card>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" style={{gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`}}>
          {visibleKpis.includes('critical') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('all_tickets'); setPriorityFilter('critical'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Critical Priority</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('high') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('all_tickets'); setPriorityFilter('high'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('medium') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('all_tickets'); setPriorityFilter('medium'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Medium Priority</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('low') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setStatusFilter('all_tickets'); setPriorityFilter('low'); }}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Low Priority</p>
              <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
            </CardContent>
          </Card>
          )}
          {visibleKpis.includes('safety_risk') && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-red-50 border-red-200" onClick={() => { setStatusFilter('safety_risk'); setPriorityFilter('all'); }}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-semibold">Safety Risk</p>
                  <p className="text-2xl font-bold text-red-700">{stats.safety_risk}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-30" />
              </div>
            </CardContent>
          </Card>
          )}
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
              <div className="flex items-center gap-2">
                {(() => {
                  const currentIndex = filteredTickets.findIndex(t => t.id === selectedTicket.id);
                  const hasPrevious = currentIndex > 0;
                  const hasNext = currentIndex < filteredTickets.length - 1;
                  return (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={!hasPrevious}
                        onClick={() => {
                          if (hasPrevious) {
                            setSelectedTicket(filteredTickets[currentIndex - 1]);
                          }
                        }}
                        title="Previous ticket"
                      >
                        Previous
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={!hasNext}
                        onClick={() => {
                          if (hasNext) {
                            setSelectedTicket(filteredTickets[currentIndex + 1]);
                          }
                        }}
                        title="Next ticket"
                      >
                        Next
                      </Button>
                    </>
                  );
                })()}
                <Button variant="ghost" size="sm" onClick={() => { setIsDetailOpen(false); setSelectedTicket(null); setRejectionReason(''); }}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
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
                      
                      {/* Changes Requested Badge */}
                      {selectedTicket.status_history?.includes('CHANGES REQUESTED BY HELPDESK') && (
                        <div className="bg-orange-50 rounded-lg border border-orange-200 p-3">
                          <div className="flex items-center gap-2">
                            <TriangleAlert className="h-4 w-4 text-orange-600" />
                            <Label className="text-sm font-semibold text-orange-900">Re-submitted Estimation</Label>
                          </div>
                          <p className="text-sm text-orange-700 mt-1">This estimation has been modified by helpdesk after previous approval.</p>
                        </div>
                      )}

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
                      {activeEstimation && (activeEstimation.root_cause || activeEstimation.findings) && selectedTicket.status !== 'rejected' && selectedTicket.status !== 'tenant_rejected' && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Root Cause Analysis</Label>
                          <div className="space-y-3">
                                {activeEstimation.root_cause && (
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">Root Cause:</p>
                                    <p className="text-gray-900 mt-1">{activeEstimation.root_cause}</p>
                                  </div>
                                )}
                                {activeEstimation.findings && (
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">Findings:</p>
                                    <p className="text-gray-900 mt-1">{activeEstimation.findings}</p>
                                  </div>
                                )}
                          </div>
                        </div>
                      )}
                      {/* Materials Table - Hide if rejected or assigned */}
                      {activeEstimation && selectedTicket.status !== 'assigned' && selectedTicket.status !== 'rejected' && selectedTicket.status !== 'tenant_rejected' && (activeEstimation.materials?.length > 0 || parseFloat(activeEstimation.labor_hours || '0') > 0) && (
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
                                    {activeEstimation.materials && activeEstimation.materials.map((mat: any, i: number) => {
                                      // Support both old and new field names
                                      const qty = parseFloat(mat.quantity || mat.qty) || 0;
                                      const rate = parseFloat(mat.rate) || 0;
                                      const gst = parseFloat(mat.gst_percentage || mat.gst) || 0;
                                      const unit = mat.unit || mat.uom || '';
                                      const item = mat.item || mat.name || '';
                                      const itemTotal = (qty * rate) + ((qty * rate * gst) / 100);
                                      return (
                                        <tr key={i} className="border-b border-gray-100">
                                          <td className="p-3 text-gray-900">{item}</td>
                                          <td className="text-right p-3 text-gray-700">{qty} {unit}</td>
                                          <td className="text-right p-3 text-gray-700">₹{rate.toFixed(2)}</td>
                                          <td className="text-right p-3 text-gray-700">{gst}%</td>
                                          <td className="text-right p-3 font-semibold text-gray-900">₹{itemTotal.toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}

                                    {activeEstimation.labor_hours && parseFloat(activeEstimation.labor_hours) > 0 ? (
                                      <tr className="border-t-2 border-blue-200 bg-blue-50">
                                        <td className="p-3 text-gray-900 font-semibold">Labor Services</td>
                                        <td className="text-right p-3 text-gray-700">{parseFloat(activeEstimation.labor_hours)} hrs</td>
                                        <td className="text-right p-3 text-gray-700">₹{(parseFloat(activeEstimation.labor_cost) / parseFloat(activeEstimation.labor_hours)).toFixed(2)}/hr</td>
                                        <td className="text-right p-3 text-gray-700">-</td>
                                        <td className="text-right p-3 font-semibold text-gray-900">₹{parseFloat(activeEstimation.labor_cost).toFixed(2)}</td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {/* Cost Breakdown - Hide if rejected or assigned */}
                          {activeEstimation && selectedTicket.status !== 'assigned' && selectedTicket.status !== 'rejected' && selectedTicket.status !== 'tenant_rejected' && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Cost Breakdown</Label>
                              <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Material Cost (without GST)</span>
                                  <span className="font-semibold text-gray-900">₹{parseFloat(activeEstimation.material_cost_without_gst || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Total GST</span>
                                  <span className="font-semibold text-gray-900">₹{parseFloat(activeEstimation.total_gst || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Material Cost (with GST)</span>
                                  <span className="font-semibold text-gray-900">₹{parseFloat(activeEstimation.material_cost_with_gst || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Labor Hours</span>
                                  <span className="font-semibold text-gray-900">{parseFloat(activeEstimation.labor_hours || 0)}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">Labor Cost</span>
                                  <span className="font-semibold text-gray-900">₹{parseFloat(activeEstimation.labor_cost || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between py-3 bg-blue-50 -mx-5 px-5 mt-3">
                                  <span className="font-bold text-gray-900">Total Estimation</span>
                                  <span className="font-bold text-blue-600 text-xl">₹{parseFloat(activeEstimation.total_cost || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )}
                      {/* Start Resubmission Button for Reopened/Rejected Tickets */}
                      {(selectedTicket.status === 'reopened' || selectedTicket.status === 'tenant_rejected' || selectedTicket.status === 'rejected') && (
                        <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <TriangleAlert className="h-5 w-5 text-orange-600" />
                            <h3 className="text-base font-semibold text-gray-900">Ticket Needs Resubmission</h3>
                          </div>
                          <p className="text-sm text-gray-700 mb-4">
                            This ticket has been {selectedTicket.status === 'reopened' ? 'reopened' : selectedTicket.status === 'tenant_rejected' ? 'rejected by tenant' : 'rejected by manager'}. 
                            {selectedTicket.rejection_reason && <span className="block mt-2 font-medium text-red-700">Reason: {selectedTicket.rejection_reason}</span>}
                            Click below to clear existing data and start fresh estimation.
                          </p>
                          <Button className="w-full" onClick={async () => {
                            try {
                              // Just clear maintenance_tickets fields - history already in ticket_estimations
                              await MaintenanceService.updateTicket(selectedTicket.id, {
                                status: 'pending',
                                assigned_technicians: null,
                                resolution_notes: null,
                                cost: 0,
                                opex_code: null,
                                work_started_at: null,
                                work_completed_at: null,
                                work_duration_hours: null,
                                sla_hours: null,
                                rejection_reason: null
                              });
                              
                              const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                              setSelectedTicket(refreshedTicket);
                              setActiveEstimation(null);
                              toast({ title: "Success", description: "Ready for new estimation." });
                              loadTickets();
                            } catch (error: any) {
                              toast({ title: "Error", description: error.message, variant: "destructive" });
                            }
                          }}>
                            <Send className="mr-2 h-4 w-4" />Start Resubmission
                          </Button>
                        </div>
                      )}
                      {/* RCA Inline Form */}
                      {(selectedTicket.status === 'assigned') && !activeEstimation?.root_cause && (
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
                                if (activeEstimation) {
                                  // Update existing estimation with RCA
                                  await TicketEstimationService.updateEstimation(activeEstimation.id, {
                                    root_cause: rcaForm.rootCause,
                                    findings: rcaForm.findings
                                  });
                                  setActiveEstimation({...activeEstimation, root_cause: rcaForm.rootCause, findings: rcaForm.findings});
                                } else {
                                  // Create new estimation with RCA
                                  const newEstimation = await TicketEstimationService.createEstimation({
                                    ticket_id: selectedTicket.id,
                                    root_cause: rcaForm.rootCause,
                                    findings: rcaForm.findings,
                                    created_by: user?.id || null
                                  });
                                  setActiveEstimation(newEstimation);
                                }
                                
                                // Update ticket status to in_progress
                                await MaintenanceService.updateTicket(selectedTicket.id, { status: 'in_progress' });
                                const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                setSelectedTicket(refreshedTicket);
                                toast({ title: "Success", description: "RCA added" });
                                setRcaForm({ rootCause: '', findings: '' });
                                loadTickets();
                              } catch (error: any) {
                                console.error('Error adding RCA:', error);
                                toast({ title: "Error", description: error.message, variant: "destructive" });
                              }
                            }}>Submit RCA</Button>
                          </div>
                        </div>
                      )}
                      {/* Estimation Inline Form */}
                      {activeEstimation?.root_cause && !activeEstimation?.materials?.length && ['assigned', 'in_progress'].includes(selectedTicket.status) && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Add Estimation</Label>
                          <div className="space-y-4">
                            <div className="flex gap-4">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search materials..." value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className="pl-10 pr-10" />
                                {materialSearch && (
                                  <button
                                    onClick={() => setMaterialSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    type="button"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                )}
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
                                // Update existing estimation with materials and costs
                                
                                const updatedEstimation = await TicketEstimationService.updateEstimation(activeEstimation.id, {
                                  materials: selectedMaterials.map(id => {
                                    const mat = materials.find(m => m.id === id);
                                    const qty = materialQuantities[id] || 1;
                                    const rate = materialQuantities[`${id}_rate`] !== undefined ? materialQuantities[`${id}_rate`] : (mat?.rate || 0);
                                    const gst = materialQuantities[`${id}_gst`] || 0;
                                    return { 
                                      id: mat?.id, 
                                      item: mat?.name, 
                                      quantity: qty, 
                                      unit: mat?.uom, 
                                      rate: rate, 
                                      gst_percentage: gst 
                                    };
                                  }),
                                  material_cost_without_gst: baseCost,
                                  total_gst: totalGst,
                                  material_cost_with_gst: materialWithGst,
                                  labor_hours: estimationForm.laborHours || 0,
                                  labor_cost: estimationForm.laborCost || 0,
                                  num_labourers: estimationForm.numLabourers || 0,
                                  work_hours: estimationForm.workHours || 0,
                                  labor_cost_per_hour: estimationForm.laborCostPerHour || 0,
                                  total_cost: totalCost,
                                  notes: estimationForm.notes,
                                  opex_code: selectedTicket.opex_code || null,
                                  status: 'submitted'
                                });
                                
                                // Update activeEstimation state immediately
                                setActiveEstimation(updatedEstimation);
                                
                                // Always go to pending_approval - manager will approve
                                await MaintenanceService.updateTicket(selectedTicket.id, {
                                  status: 'pending_approval',
                                  cost: totalCost,
                                  opex_code: selectedTicket.opex_code || null,
                                  skip_tenant_approval: selectedTicket.skip_tenant_approval || false
                                });
                                const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                setSelectedTicket(refreshedTicket);
                                await sendTicketNotification('ticket.estimation_submitted', refreshedTicket);
                                toast({ title: "Success", description: "Estimation sent for manager approval" });
                                
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
                      {/* Manager Decision */}
                      {selectedTicket.status === 'pending_approval' && canApproveTickets && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
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
                      
                      {/* Request Changes - Only for work_started status */}
                      {(selectedTicket.status === 'work_started') && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 block">Request Changes</Label>
                          <div className="space-y-4">
                            <p className="text-sm text-gray-600">Request changes to the estimation. This will save the current estimation to history and reset only estimation fields for resubmission.</p>
                            <Button 
                              variant="outline" 
                              className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
                              onClick={async () => {
                                try {
                                  let previousSubmissions = [];
                                  if (selectedTicket.previous_submissions) {
                                    try {
                                      const parsed = JSON.parse(selectedTicket.previous_submissions);
                                      previousSubmissions = Array.isArray(parsed) ? parsed : [parsed];
                                    } catch (e) {}
                                  }
                                  const changesData = {
                                    technicians: selectedTicket.assigned_technicians,
                                    resolution_notes: selectedTicket.resolution_notes,
                                    cost: selectedTicket.cost,
                                    opex_code: selectedTicket.opex_code,
                                    requested_changes_at: new Date().toISOString(),
                                    requested_by: 'Manager',
                                    manager_approved_at: selectedTicket.status_history?.match(/\[(.*?)\] MANAGER APPROVED/)?.[1],
                                    tenant_approved_at: selectedTicket.status_history?.match(/\[(.*?)\] TENANT APPROVED/)?.[1],
                                    previous_status: selectedTicket.status
                                  };
                                  previousSubmissions.push(changesData);
                                  
                                  // Keep RCA and technicians, reset estimation section only
                                  const techniciansList = selectedTicket.assigned_technicians?.map((t: any) => t.name).join(', ') || '';
                                  const rcaSection = selectedTicket.resolution_notes?.match(/(=== RCA ===[\s\S]+?)(?=\n\n=== |$)/)?.[0] || '';
                                  
                                  await MaintenanceService.updateTicket(selectedTicket.id, {
                                    status: 'assigned',
                                    previous_submissions: JSON.stringify(previousSubmissions),
                                    status_history: `${selectedTicket.status_history || ''}\n[${new Date().toLocaleString()}] CHANGES REQUESTED BY MANAGER - RESUBMISSION REQUIRED`,
                                    resolution_notes: `Technicians: ${techniciansList}\n\n${rcaSection}`,
                                    cost: 0,
                                    opex_code: null,
                                    skip_tenant_approval: false
                                  });
                                  
                                  const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                  setSelectedTicket(refreshedTicket);
                                  toast({ title: "Success", description: "Estimation reset. Technicians and RCA preserved. Add new estimation." });
                                  loadTickets();
                                } catch (error: any) {
                                  toast({ title: "Error", description: error.message, variant: "destructive" });
                                }
                              }}>
                              <FileText className="h-4 w-4 mr-2" />
                              Request Changes
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Sidebar - 30% */}
                    <div className="space-y-3">
                      {/* Ticket Info Card */}
                      <div className="bg-white rounded-lg border border-gray-200 p-3 sticky top-6">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 block">Ticket Information</Label>
                        <div className="space-y-2.5">
                          <div>
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Status</Label>
                            <Badge className={getStatusColor(selectedTicket.status)}>{getStatusLabel(selectedTicket.status)}</Badge>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          <div>
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Priority</Label>
                            <Badge className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          <div>
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Category</Label>
                            <p className="text-sm font-medium text-gray-900">{selectedTicket.category}</p>
                          </div>
                          {selectedTicket?.asset_id && (
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
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Tenant</Label>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedTicket.tenant?.company_name || 'N/A'}
                            </p>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          <div>
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Created By</Label>
                            <p className="text-sm font-medium text-gray-900">{selectedTicket.created_by_name || (selectedTicket.created_by_user_id && usersMap[selectedTicket.created_by_user_id]?.name) || 'N/A'}</p>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          <div>
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Created</Label>
                            <p className="text-sm text-gray-700">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          {/* Technician Details */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="font-medium text-xs text-gray-500 uppercase tracking-wide">Technician Details</Label>
                              {activeEstimation?.assigned_technicians && activeEstimation.assigned_technicians.length > 0 && ['assigned', 'pending_approval', 'rejected'].includes(selectedTicket.status) && (
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
                                  setIsAssignOpen(true);
                                  const currentIds = activeEstimation.assigned_technicians.map((t: any) => t.id);
                                  setSelectedTechnicians(currentIds);
                                }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                </Button>
                              )}
                            </div>
                            {activeEstimation?.assigned_technicians && activeEstimation.assigned_technicians.length > 0 && !isAssignOpen ? (
                              <div className="space-y-1.5">
                                {activeEstimation.assigned_technicians.map((tech: any) => (
                                  <div key={tech.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                        {tech.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-gray-900 text-sm">{tech.name} </p>
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
                                      
                                      // Update maintenance_tickets (only assigned_to for display, status)
                                      await MaintenanceService.updateTicket(selectedTicket.id, {
                                        assigned_to: techniciansList,
                                        status: 'assigned'
                                      });
                                      
                                      // Create NEW estimation version in ticket_estimations table
                                      const newEstimation = await TicketEstimationService.createEstimation({
                                        ticket_id: selectedTicket.id,
                                        assigned_technicians: techniciansData,
                                        created_by: user?.id || null
                                      });
                                      setActiveEstimation(newEstimation);
                                      
                                      const updatedTicket = {
                                        ...selectedTicket,
                                        assigned_to: techniciansList,
                                        status: 'assigned'
                                      };
                                      setSelectedTicket(updatedTicket);
                                      await sendTicketNotification('ticket.assigned', updatedTicket);
                                      toast({ title: "Success", description: "Technicians assigned with new estimation version" });
                                      setSelectedTechnicians([]);
                                      setIsAssignOpen(false);
                                      setTechnicianSearch('');
                                      loadTickets();
                                    } catch (error: any) {
                                      console.error('Error assigning technicians:', error);
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
                            <p className="text-sm font-medium text-gray-900">{activeEstimation?.opex_code || selectedTicket.opex_code || 'Not Set'}</p>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          <div>
                            <Label className="font-medium text-xs text-gray-500 mb-1 block">Estimated Cost</Label>
                            <p className="text-xl font-bold text-blue-600">₹{activeEstimation ? parseFloat(activeEstimation.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (selectedTicket.cost ? selectedTicket.cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}</p>
                          </div>
                          <div className="h-px w-full bg-gray-200"></div>
                          <div>
                            <Label className="font-medium text-xs text-gray-700 mb-3 block">Work Tracking</Label>
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

                          {selectedTicket.status === 'approved' && (() => {
                            // Check if ticket had changes requested or was reopened - if yes, allow starting work again
                            let wasChangesRequested = false;
                            try {
                              if (selectedTicket.previous_submissions) {
                                const parsed = JSON.parse(selectedTicket.previous_submissions);
                                const submissions = Array.isArray(parsed) ? parsed : [parsed];
                                wasChangesRequested = submissions.some((s: any) => s.requested_changes_at || s.reopened_by || s.rejected_by === 'Tenant');
                              }
                            } catch (e) {}
                            return !selectedTicket.work_started_at || wasChangesRequested;
                          })() && (
                            <>
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Label className="text-sm font-medium mb-2 block">SLA Time *</Label>
                                <Select value={slaHours} onValueChange={setSlaHours}>
                                  <SelectTrigger className="mb-2">
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
                                <Button className="w-full" disabled={!slaHours} onClick={async () => {
                                  if (!slaHours) {
                                    toast({ title: "Error", description: "Select SLA time", variant: "destructive" });
                                    return;
                                  }
                                  try {
                                    await MaintenanceService.startWork(selectedTicket.id, parseFloat(slaHours));
                                    toast({ title: "Success", description: "Work started" });
                                    await sendTicketNotification('ticket.work_started', { ...selectedTicket, status: 'in_progress' });
                                    setSlaHours('');
                                    loadTickets();
                                    const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket.id);
                                    setSelectedTicket(refreshedTicket);
                                  } catch (error: any) {
                                    toast({ title: "Error", description: error.message, variant: "destructive" });
                                  }
                                }}>
                                  <Play className="mr-2 h-4 w-4" />Start Work
                                </Button>
                              </div>
                            </>
                          )}
                          {selectedTicket.status === 'work_started' && (
                            <>
                              <div className="h-px w-full bg-gray-200"></div>
                              <div>
                                <Button size="sm" className="w-full" variant="destructive" onClick={async () => {
                                  try {
                                    await MaintenanceService.endWork(selectedTicket.id);
                                    toast({ title: "Success", description: "Work completed" });
                                    await sendTicketNotification('ticket.work_completed', { ...selectedTicket, status: 'work_completed' });
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
                    {((resolvedPhotos && resolvedPhotos.length > 0) || selectedTicket.video) ? (
                      <div className="space-y-6">
                        {resolvedPhotos && resolvedPhotos.length > 0 && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Photos ({resolvedPhotos.length})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {resolvedPhotos.map((photoUrl: string, index: number) => (
                                <div 
                                  key={`photo-${index}`} 
                                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                  onClick={() => {
                                    setSelectedImage(photoUrl);
                                    setImagePopupOpen(true);
                                  }}
                                >
                                  <img 
                                    src={photoUrl} 
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                    <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                    <p className="text-white text-xs font-medium">Photo {index + 1}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                      <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                        <FileImage className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No files uploaded</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="status" className="p-6">
                  <Card className="border">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-6">Ticket Timeline</h3>
                      <div className="space-y-6">
                        {(() => {
                          const events: any[] = [];
                          
                          // Parse status_history field (primary source)
                          if (selectedTicket.status_history) {
                            const lines = selectedTicket.status_history.split('\n').filter((line: string) => line.trim());
                            lines.forEach((line: string) => {
                              // Format: [DD-MM-YYYY, HH:MM:SS] EVENT_NAME: details
                              const match = line.match(/\[([^\]]+)\]\s+([^:]+)(?::\s*(.+))?/);
                              if (match) {
                                const timestamp = match[1];
                                const eventName = match[2].trim();
                                const details = match[3]?.trim();
                                
                                // Parse timestamp (DD-MM-YYYY, HH:MM:SS)
                                let parsedDate: Date | null = null;
                                try {
                                  const [datePart, timePart] = timestamp.split(', ');
                                  if (datePart && timePart) {
                                    const [day, month, year] = datePart.split('-');
                                    const [hour, minute, second] = timePart.split(':');
                                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
                                    if (isNaN(parsedDate.getTime())) {
                                      parsedDate = null;
                                    }
                                  }
                                } catch (e) {
                                  parsedDate = null;
                                }
                                
                                // Map event names to colors and labels
                                let color = 'bg-gray-500';
                                let label = eventName;
                                
                                if (eventName.includes('TICKET_CREATED')) {
                                  color = 'bg-blue-500';
                                  label = 'Ticket Created';
                                } else if (eventName.includes('ASSIGNED')) {
                                  color = 'bg-green-500';
                                  label = 'Technicians Assigned';
                                } else if (eventName.includes('RCA_ADDED')) {
                                  color = 'bg-purple-500';
                                  label = 'RCA Added';
                                } else if (eventName.includes('ESTIMATION_SUBMITTED')) {
                                  color = 'bg-indigo-500';
                                  label = 'Estimation Submitted';
                                } else if (eventName.includes('MANAGER_REJECTED')) {
                                  color = 'bg-red-600';
                                  label = 'Rejected by Manager';
                                } else if (eventName.includes('MANAGER_APPROVED')) {
                                  color = 'bg-green-600';
                                  label = 'Manager Approved';
                                } else if (eventName.includes('TENANT_REJECTED')) {
                                  color = 'bg-red-600';
                                  label = 'Rejected by Tenant';
                                } else if (eventName.includes('TENANT_APPROVED')) {
                                  color = 'bg-green-700';
                                  label = 'Tenant Approved';
                                } else if (eventName.includes('WORK_STARTED')) {
                                  color = 'bg-blue-600';
                                  label = 'Work Started';
                                } else if (eventName.includes('WORK_COMPLETED')) {
                                  color = 'bg-purple-600';
                                  label = 'Work Completed';
                                } else if (eventName.includes('RESOLVED')) {
                                  color = 'bg-green-800';
                                  label = 'Ticket Resolved';
                                } else if (eventName.includes('REOPENED')) {
                                  color = 'bg-orange-600';
                                  label = 'Ticket Reopened';
                                } else if (eventName.includes('PENDING')) {
                                  color = 'bg-yellow-500';
                                  label = 'Status: Pending';
                                } else if (eventName.includes('IN PROGRESS')) {
                                  color = 'bg-blue-500';
                                  label = 'Status: In Progress';
                                }
                                
                                events.push({
                                  type: eventName.toLowerCase().replace(/\s+/g, '_'),
                                  time: parsedDate ? parsedDate.toISOString() : new Date().toISOString(),
                                  label,
                                  details,
                                  color
                                });
                              }
                            });
                          }
                          
                          // Sort by time
                          events.sort((a, b) => {
                            const timeA = a.time ? new Date(a.time).getTime() : 0;
                            const timeB = b.time ? new Date(b.time).getTime() : 0;
                            return timeA - timeB;
                          });
                          
                          return events.map((event, idx) => (
                            <div key={idx} className="flex gap-4">
                              <div className={`w-3 h-3 rounded-full ${event.color} mt-1 flex-shrink-0`}></div>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{event.label}</p>
                                <p className="text-sm text-gray-600">{event.time ? new Date(event.time).toLocaleString() : 'N/A'}</p>
                                {event.details && <p className="text-sm text-gray-700 mt-1">{event.details}</p>}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="history" className="p-6">
                  <div className="space-y-6">
                    {loadingHistory ? (
                      <p className="text-center text-gray-500 py-8">Loading history...</p>
                    ) : rejectedEstimations.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No history available</p>
                    ) : (
                      rejectedEstimations.map((est, idx) => {
                          const isManagerRejected = est.status === 'manager_rejected';
                          const isTenantRejected = est.status === 'tenant_rejected';
                          const isReopened = est.reopened_by && est.reopened_at;
                          const cardBg = isReopened ? 'bg-orange-50 border-orange-300' : (isManagerRejected ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300');
                          const iconColor = isReopened ? 'text-orange-600' : (isManagerRejected ? 'text-red-600' : 'text-orange-600');
                          const title = isReopened ? `Version ${est.version} - Reopened by Tenant` : `Version ${est.version} - Rejected by ${est.rejected_by}`;
                          
                          return (
                            <Card key={idx} className={`${cardBg} border`}>
                              <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                  <XCircle className={`h-5 w-5 ${iconColor}`} />
                                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                                </div>
                                <div className="space-y-4">
                                  {isReopened ? (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">Reopened At</p>
                                      <p className="text-sm text-gray-900">{new Date(est.reopened_at).toLocaleString()}</p>
                                    </div>
                                  ) : est.rejected_at && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">Rejected At</p>
                                      <p className="text-sm text-gray-900">{new Date(est.rejected_at).toLocaleString()}</p>
                                    </div>
                                  )}
                                  {est.rejection_reason && (
                                    <div className="bg-white p-3 rounded border border-red-200">
                                      <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                                      <p className="text-sm text-gray-900">{est.rejection_reason}</p>
                                    </div>
                                  )}
                                  {est.assigned_technicians && est.assigned_technicians.length > 0 && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Assigned Technicians</p>
                                      <div className="space-y-2">
                                        {est.assigned_technicians.map((tech: any, i: number) => (
                                          <div key={i} className="flex items-center gap-3 p-2 bg-blue-50 rounded border border-blue-200">
                                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                              {tech.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <p className="font-medium text-sm text-gray-900">{tech.name}</p>
                                              <p className="text-xs text-gray-600">{tech.contact}</p>
                                              <p className="text-xs text-blue-600">{tech.specialization}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(est.root_cause || est.findings) && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Root Cause Analysis</p>
                                      <div className="space-y-2">
                                        {est.root_cause && (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-600">Root Cause:</p>
                                            <p className="text-sm text-gray-900">{est.root_cause}</p>
                                          </div>
                                        )}
                                        {est.findings && (
                                          <div>
                                            <p className="text-xs font-semibold text-gray-600">Findings:</p>
                                            <p className="text-sm text-gray-900">{est.findings}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {est.materials && est.materials.length > 0 && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Materials</p>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b bg-gray-50">
                                              <th className="text-left p-2">Item</th>
                                              <th className="text-right p-2">Qty</th>
                                              <th className="text-right p-2">Rate</th>
                                              <th className="text-right p-2">GST%</th>
                                              <th className="text-right p-2">Total</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {est.materials.map((mat: any, i: number) => {
                                              const qty = parseFloat(mat.quantity || mat.qty) || 0;
                                              const rate = parseFloat(mat.rate) || 0;
                                              const gst = parseFloat(mat.gst_percentage || mat.gst) || 0;
                                              const itemTotal = (qty * rate) + ((qty * rate * gst) / 100);
                                              return (
                                                <tr key={i} className="border-b">
                                                  <td className="p-2">{mat.item || mat.name}</td>
                                                  <td className="text-right p-2">{qty} {mat.unit || mat.uom}</td>
                                                  <td className="text-right p-2">₹{rate.toFixed(2)}</td>
                                                  <td className="text-right p-2">{gst}%</td>
                                                  <td className="text-right p-2 font-semibold">₹{itemTotal.toFixed(2)}</td>
                                                </tr>
                                              );
                                            })}
                                            {est.labor_hours && parseFloat(est.labor_hours) > 0 && (
                                              <tr className="border-t-2 border-blue-200 bg-blue-50">
                                                <td className="p-2 font-semibold">Labor Services</td>
                                                <td className="text-right p-2">{parseFloat(est.labor_hours)} hrs</td>
                                                <td className="text-right p-2">₹{(parseFloat(est.labor_cost) / parseFloat(est.labor_hours)).toFixed(2)}/hr</td>
                                                <td className="text-right p-2">-</td>
                                                <td className="text-right p-2 font-semibold">₹{parseFloat(est.labor_cost).toFixed(2)}</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  {est.total_cost && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-2">Cost Breakdown</p>
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Material Cost (without GST)</span>
                                          <span className="font-semibold">₹{parseFloat(est.material_cost_without_gst || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Total GST</span>
                                          <span className="font-semibold">₹{parseFloat(est.total_gst || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Material Cost (with GST)</span>
                                          <span className="font-semibold">₹{parseFloat(est.material_cost_with_gst || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Labor Hours</span>
                                          <span className="font-semibold">{parseFloat(est.labor_hours || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-600">Labor Cost</span>
                                          <span className="font-semibold">₹{parseFloat(est.labor_cost || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t">
                                          <span className="text-sm font-bold text-gray-900">Total Estimation</span>
                                          <span className="text-lg font-bold text-blue-600">₹{parseFloat(est.total_cost).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {est.opex_code && (
                                    <div className="bg-white p-3 rounded border">
                                      <p className="text-xs font-semibold text-gray-500 mb-1">OPEX Code</p>
                                      <p className="text-sm font-medium text-gray-900">{est.opex_code}</p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                  </div>
                </TabsContent>
                
                <TabsContent value="feedback" className="p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Feedback</CardTitle>
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
            )}
          </CardContent>
        </Card>
          </div>
        )}

        {/* Tickets Table - Only show when detail view is closed */}
        {!isDetailOpen && !isCreateTicketOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>Manage and review maintenance tickets</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateTicketOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create Ticket
              </Button>
              <Button variant="outline" onClick={() => setIsReportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />Reports
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              {/* First Row - Search and Primary Filters */}
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by ID, title, category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_tickets">All Tickets</SelectItem>
                    <SelectItem value="pending">Open</SelectItem>
                    <SelectItem value="assigned_awaiting">Assigned/Awaiting</SelectItem>
                    <SelectItem value="pending_estimation">Pending Estimation</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="safety_risk">Safety Risk</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Date Range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Second Row - Additional Filters */}
              <div className="flex gap-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(tickets.map(t => t.category))).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Building" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {Array.from(new Set(tickets.map(t => t.building).filter(Boolean))).map(building => (
                      <SelectItem key={building} value={building}>{building}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={technicianFilter2} onValueChange={setTechnicianFilter2}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Technician" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Technicians</SelectItem>
                    {technicians.map(tech => (
                      <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={costRangeFilter} onValueChange={setCostRangeFilter}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Cost Range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Costs</SelectItem>
                    <SelectItem value="low">&lt; ₹5,000</SelectItem>
                    <SelectItem value="medium">₹5,000 - ₹20,000</SelectItem>
                    <SelectItem value="high">&gt; ₹20,000</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all_tickets');
                    setPriorityFilter('all');
                    setCategoryFilter('all');
                    setBuildingFilter('all');
                    setTechnicianFilter2('all');
                    setDateRangeFilter('all');
                    setCostRangeFilter('all');
                  }}
                  className="whitespace-nowrap"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Tickets Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : paginatedTickets.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">No tickets found</TableCell></TableRow>
                  ) : (
                    paginatedTickets.map((ticket) => {
                      const tenantCompanyName = ticket.tenant?.company_name || ticket.tenant_name || (ticket.tenant_id && tenants.find(t => t.id === ticket.tenant_id)?.company_name) || (ticket.on_behalf_tenant_id && tenants.find(t => t.id === ticket.on_behalf_tenant_id)?.company_name) || ticket.created_by_name || (ticket.created_by_user_id && usersMap[ticket.created_by_user_id]?.name) || 'N/A';
                      return (
                        <TableRow key={ticket.id} className="cursor-pointer hover:bg-muted/50" onDoubleClick={() => { setSelectedTicket(ticket); setIsDetailOpen(true); }}>
                          <TableCell className="font-medium">{ticket.ticket_number || ticket.id.slice(-6)}</TableCell>
                          <TableCell>{tenantCompanyName}</TableCell>
                          <TableCell>{ticket.title}</TableCell>
                        <TableCell><Badge className={getStatusColor(ticket.status)}>{getStatusLabel(ticket.status)}</Badge></TableCell>
                        <TableCell><Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge></TableCell>
                        <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setIsDetailOpen(true); }} title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(ticket.resolution_notes?.includes('=== ESTIMATION ===') || ticket.cost > 0) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} title="Download PDF">
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadEstimationPDF(ticket); }}>
                                    <FileDown className="h-4 w-4 mr-2" />
                                    Estimation PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadTicketDetailsPDF(ticket); }}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Ticket Details PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    try {
                                      // Fetch active estimation from ticket_estimations table
                                      const estimation = await TicketEstimationService.getActiveEstimation(ticket.id).catch(() => null);
                                      
                                      const workbook = new ExcelJS.Workbook();
                                      const worksheet = workbook.addWorksheet('Ticket Report');
                                      worksheet.columns = [{header: 'Field', key: 'field', width: 35}, {header: 'Value', key: 'value', width: 60}];
                                      worksheet.addRow({field: '=== MAINTENANCE TICKET REPORT ===', value: ''});
                                      worksheet.addRow({field: '', value: ''});
                                      worksheet.addRow({field: '--- TICKET INFORMATION ---', value: ''});
                                      worksheet.addRow({field: 'Ticket Number', value: ticket.ticket_number || '#' + ticket.id.slice(-6)});
                                      worksheet.addRow({field: 'Title', value: ticket.title});
                                      worksheet.addRow({field: 'Description', value: ticket.description});
                                      worksheet.addRow({field: 'Category', value: ticket.category});
                                      worksheet.addRow({field: 'Priority', value: ticket.priority});
                                      worksheet.addRow({field: 'Status', value: getStatusLabel(ticket.status)});
                                      worksheet.addRow({field: 'Created Date', value: ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'});
                                      worksheet.addRow({field: '', value: ''});
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
                                      worksheet.addRow({field: '--- LOCATION DETAILS ---', value: ''});
                                      worksheet.addRow({field: 'Building', value: ticket.building || 'N/A'});
                                      worksheet.addRow({field: 'Floor', value: ticket.floor || 'N/A'});
                                      worksheet.addRow({field: 'Room', value: ticket.room || 'N/A'});
                                      worksheet.addRow({field: 'Exact Spot', value: ticket.spot_description || 'N/A'});
                                      worksheet.addRow({field: '', value: ''});
                                      worksheet.addRow({field: '--- VISIT PREFERENCES ---', value: ''});
                                      worksheet.addRow({field: 'Preferred Date', value: ticket.preferred_date ? new Date(ticket.preferred_date).toLocaleDateString() : 'N/A'});
                                      worksheet.addRow({field: 'Preferred Time', value: ticket.preferred_time || 'N/A'});
                                      worksheet.addRow({field: 'Target Date', value: ticket.target_date ? new Date(ticket.target_date).toLocaleDateString() : 'N/A'});
                                      worksheet.addRow({field: '', value: ''});
                                      worksheet.addRow({field: '--- RISK ASSESSMENT ---', value: ''});
                                      worksheet.addRow({field: 'Safety Risk', value: ticket.safety_risk ? 'YES - IMMEDIATE ATTENTION REQUIRED' : 'No'});
                                      worksheet.addRow({field: 'Previous Occurrence', value: ticket.previous_occurrence ? 'Yes' : 'No'});
                                      worksheet.addRow({field: '', value: ''});
                                      if (estimation?.assigned_technicians?.length > 0) {
                                        worksheet.addRow({field: '--- ASSIGNED TECHNICIANS ---', value: ''});
                                        estimation.assigned_technicians.forEach((tech: any, idx: number) => {
                                          worksheet.addRow({field: `Technician ${idx + 1}`, value: `${tech.name} | ${tech.contact} | ${tech.specialization}`});
                                        });
                                        worksheet.addRow({field: '', value: ''});
                                      }
                                      if (estimation?.root_cause || estimation?.findings) {
                                        worksheet.addRow({field: '--- ROOT CAUSE ANALYSIS ---', value: ''});
                                        worksheet.addRow({field: 'Root Cause', value: estimation.root_cause || 'Not Added'});
                                        worksheet.addRow({field: 'Findings', value: estimation.findings || 'Not Added'});
                                        worksheet.addRow({field: '', value: ''});
                                      }
                                      if (estimation?.materials?.length > 0) {
                                        worksheet.addRow({field: '--- MATERIALS & COST ESTIMATION ---', value: ''});
                                        worksheet.addRow({field: 'Item | Qty | Unit | Rate | GST% | Total', value: ''});
                                        estimation.materials.forEach((mat: any) => {
                                          const qty = parseFloat(mat.quantity || mat.qty) || 0;
                                          const rate = parseFloat(mat.rate) || 0;
                                          const gst = parseFloat(mat.gst_percentage || mat.gst) || 0;
                                          const unit = mat.unit || mat.uom || '';
                                          const item = mat.item || mat.name || '';
                                          const itemTotal = (qty * rate) + ((qty * rate * gst) / 100);
                                          worksheet.addRow({field: `${item} | ${qty} ${unit} | ₹${rate.toFixed(2)} | ${gst}% | ₹${itemTotal.toFixed(2)}`, value: ''});
                                        });
                                        if (estimation.labor_hours && parseFloat(estimation.labor_hours) > 0) {
                                          const laborHours = parseFloat(estimation.labor_hours);
                                          const laborCost = parseFloat(estimation.labor_cost);
                                          const laborRate = laborHours > 0 ? (laborCost / laborHours) : 0;
                                          worksheet.addRow({field: `Labor Services | ${laborHours} hrs | ₹${laborRate.toFixed(2)}/hr | - | ₹${laborCost.toFixed(2)}`, value: ''});
                                        }
                                        worksheet.addRow({field: '', value: ''});
                                        worksheet.addRow({field: 'Material Cost (without GST)', value: `₹${parseFloat(estimation.material_cost_without_gst || 0).toFixed(2)}`});
                                        worksheet.addRow({field: 'Total GST', value: `₹${parseFloat(estimation.total_gst || 0).toFixed(2)}`});
                                        worksheet.addRow({field: 'Material Cost (with GST)', value: `₹${parseFloat(estimation.material_cost_with_gst || 0).toFixed(2)}`});
                                        worksheet.addRow({field: 'Labor Hours', value: parseFloat(estimation.labor_hours || 0)});
                                        worksheet.addRow({field: 'Labor Cost', value: `₹${parseFloat(estimation.labor_cost || 0).toFixed(2)}`});
                                        worksheet.addRow({field: 'TOTAL ESTIMATION', value: `₹${parseFloat(estimation.total_cost || 0).toFixed(2)}`});
                                        worksheet.addRow({field: '', value: ''});
                                      }
                                      worksheet.addRow({field: '--- FINANCIAL DETAILS ---', value: ''});
                                      worksheet.addRow({field: 'Estimated Cost', value: ticket.cost ? `₹${ticket.cost}` : '₹0'});
                                      worksheet.addRow({field: 'OPEX Code', value: estimation?.opex_code || ticket.opex_code || 'Not Assigned'});
                                      worksheet.addRow({field: '', value: ''});
                                      worksheet.addRow({field: '--- WORK TRACKING ---', value: ''});
                                      worksheet.addRow({field: 'SLA Hours', value: ticket.sla_hours || 'Not Set'});
                                      worksheet.addRow({field: 'Work Started', value: ticket.work_started_at ? new Date(ticket.work_started_at).toLocaleString() : 'Not Started'});
                                      worksheet.addRow({field: 'Work Completed', value: ticket.work_completed_at ? new Date(ticket.work_completed_at).toLocaleString() : 'Not Completed'});
                                      worksheet.addRow({field: 'Work Duration (Hours)', value: ticket.work_duration_hours ? ticket.work_duration_hours.toFixed(2) : 'N/A'});
                                      worksheet.addRow({field: '', value: ''});
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
                                      if (ticket.notes || ticket.additional_notes) {
                                        worksheet.addRow({field: '--- ADDITIONAL NOTES ---', value: ''});
                                        worksheet.addRow({field: 'Notes', value: ticket.notes || ticket.additional_notes || 'None'});
                                      }
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
                                    <FileText className="h-4 w-4 mr-2" />
                                    Excel (Full Report)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {filteredTickets.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                      className="h-9 px-3 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
                  </div>
                </div>
                <div className="flex justify-center">
                  <nav className="flex items-center gap-1 shadow-sm rounded-lg bg-gray-50 p-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:pointer-events-none transition-colors"
                      aria-label="previous page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="m15 18-6-6 6-6"></path>
                      </svg>
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`flex items-center justify-center min-w-9 h-9 px-3 rounded-md text-sm font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                          aria-label={`page ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center justify-center min-w-9 h-9 px-2 rounded-md text-gray-700 hover:bg-gray-200 disabled:text-gray-300 disabled:pointer-events-none transition-colors"
                      aria-label="next page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="m9 18 6-6-6-6"></path>
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            )}
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
                      
                      const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket!.id);
                      
                      // Send ticket.resolved notification
                      await sendTicketNotification('ticket.resolved', refreshedTicket);
                      
                      toast({ title: "Success", description: "Ticket closed with feedback" });
                      setIsFeedbackOpen(false);
                      setFeedbackRating(0);
                      setFeedbackComment('');
                      loadTickets();
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
                      
                      const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket!.id);
                      
                      // Send ticket.reopened notification
                      await sendTicketNotification('ticket.reopened', refreshedTicket);
                      
                      toast({ title: "Success", description: "Ticket reopened with feedback" });
                      setIsFeedbackOpen(false);
                      setFeedbackRating(0);
                      setFeedbackComment('');
                      loadTickets();
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
                    
                    const refreshedTicket = await MaintenanceService.getTicketById(selectedTicket!.id);
                    
                    // Send ticket.resolved notification
                    await sendTicketNotification('ticket.resolved', refreshedTicket);
                    
                    toast({ title: "Success", description: "Feedback submitted successfully" });
                    setIsFeedbackOpen(false);
                    setFeedbackRating(0);
                    setFeedbackComment('');
                    loadTickets();
                    setSelectedTicket(refreshedTicket);
                  } catch (error: any) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  }
                }} className="w-full">Submit Feedback</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Popup Dialog */}
        <Dialog open={imagePopupOpen} onOpenChange={setImagePopupOpen}>
          <DialogContent className="max-w-4xl p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <button
                onClick={() => setImagePopupOpen(false)}
                className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
              <img 
                src={selectedImage} 
                alt="Full size" 
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}





