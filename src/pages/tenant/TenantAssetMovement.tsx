import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetService, Asset, AssetMovement as Movement, DashboardStats } from '@/services/assetService';
import { buildingService, Building, Floor } from '@/services/buildingService';
import { TenantData } from '@/services/tenantService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { X, Save, Plus, AlertCircle, TrendingUp, Calendar, QrCode, Search, Check, ChevronsUpDown, Building2, ArrowRight, CheckCircle, XCircle, Settings, FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import QRScannerModal from '@/components/shared/QRScannerModal';
import { supabase } from '@/lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { workflowEngine } from '@/services/workflowEngine';
import { useAuth } from '@/contexts/AuthContext';
import { ApprovalList } from '@/components/workflow/ApprovalList';

export default function AssetMovement() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsWithDetails, setMovementsWithDetails] = useState<any[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [fromFloors, setFromFloors] = useState<Floor[]>([]);
  const [toFloors, setToFloors] = useState<Floor[]>([]);
  const [fromRooms, setFromRooms] = useState<any[]>([]);
  const [toRooms, setToRooms] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [openTenantCombobox, setOpenTenantCombobox] = useState(false);
  const [openHandoverCombobox, setOpenHandoverCombobox] = useState(false);
  const [openOtherHandoverCombobox, setOpenOtherHandoverCombobox] = useState(false);
  const [otherHandovers, setOtherHandovers] = useState<Array<{name: string, email: string, contact: string}>>([]);
  const [viewMovement, setViewMovement] = useState<Movement | null>(null);
  const [viewMovementAssets, setViewMovementAssets] = useState<any[]>([]);
  const [canApproveCurrentMovement, setCanApproveCurrentMovement] = useState(false);
  const [isMovementCreator, setIsMovementCreator] = useState(false);
  const [viewTab, setViewTab] = useState<'details' | 'approvals'>('details');
  const [activeTab, setActiveTab] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tenant_id: '',
    asset_ids: [] as string[],
    movement_type: 'Location',
    movement_date: new Date().toISOString().split('T')[0],
    movement_time: '',
    expected_return_date: '',
    from_building: '',
    from_floor: '',
    from_room: '',
    from_tenant_type: 'Tenant',
    from_other_name: '',
    to_building: '',
    to_floor: '',
    to_room: '',
    to_department: '',
    to_custodian: '',
    new_status: '',
    movement_reason: '',
    other_reason: '',
    remarks: '',
    vendor_name: '',
    vendor_contact: '',
    outward_date: '',
    expected_inward_date: '',
    gate_pass_number: '',
    approval_required: true,
    handover_to: 'Tenant',
    handover_name: '',
    handover_email: '',
    handover_mobile: '',
    from_tenant: '',
    to_tenant: '',
  });

  useEffect(() => {
    loadStats();
    loadData();
    loadTenants();
    loadAllBuildings();
    loadOtherHandovers();
  }, []);

  // Auto-fill tenant_id for tenant users
  useEffect(() => {
    if (user?.appUser?.tenantId && !formData.tenant_id) {
      updateField('tenant_id', user.appUser.tenantId);
    }
  }, [user, showForm]);

  const loadOtherHandovers = async () => {
    const { data } = await supabase
      .from('assets')
      .select('handover_other_name, handover_other_email, handover_other_contact')
      .not('handover_other_name', 'is', null)
      .not('handover_other_name', 'eq', '');
    
    if (data) {
      const unique = Array.from(
        new Map(data.map(item => [
          item.handover_other_name,
          { name: item.handover_other_name, email: item.handover_other_email || '', contact: item.handover_other_contact || '' }
        ])).values()
      );
      setOtherHandovers(unique);
    }
  };

  useEffect(() => {
    // Load assets and buildings based on From Location selections for cascading filter
    if (formData.from_tenant_type === 'Tenant' && formData.tenant_id) {
      loadAssetsByTenant(formData.tenant_id);
      loadBuildingsByTenant(formData.tenant_id);
    } else if (formData.from_tenant_type === 'Other') {
      // Load all assets when "Other" is selected
      loadAllAssets();
    } else {
      setAssets([]);
      setBuildings([]);
    }
  }, [formData.tenant_id, formData.from_tenant_type]);

  const loadAllAssets = async () => {
    try {
      const data = await AssetService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load all assets:', error);
    }
  };

  useEffect(() => {
    const loadHandoverBuildings = async () => {
      if (formData.handover_to === 'Tenant' && formData.handover_name) {
        const { data: agreements } = await supabase.from('agreements').select('space_assignments').eq('tenant_id', formData.handover_name);
        if (agreements && agreements.length > 0) {
          const buildingIds = new Set<string>();
          agreements.forEach(agreement => {
            const spaces = agreement.space_assignments as any[];
            spaces?.forEach(space => {
              if (space.building) buildingIds.add(space.building);
            });
          });
          if (buildingIds.size > 0) {
            const firstBuildingId = Array.from(buildingIds)[0];
            updateField('to_building', firstBuildingId);
          }
        }
      }
    };
    loadHandoverBuildings();
  }, [formData.handover_to, formData.handover_name]);

  useEffect(() => {
    if (formData.from_building) {
      loadFromFloors(formData.from_building);
      setFromRooms([]);
      updateField('from_floor', '');
      updateField('from_room', '');
    }
  }, [formData.from_building]);

  useEffect(() => {
    if (formData.to_building) {
      loadToFloors(formData.to_building);
      setToRooms([]);
      updateField('to_floor', '');
      updateField('to_room', '');
    }
  }, [formData.to_building]);

  useEffect(() => {
    if (formData.from_floor) loadRoomsForFloor(formData.from_floor, 'from');
    else setFromRooms([]);
  }, [formData.from_floor]);

  useEffect(() => {
    if (formData.to_floor) loadRoomsForFloor(formData.to_floor, 'to');
    else setToRooms([]);
  }, [formData.to_floor]);

  useEffect(() => {
    if (formData.asset_ids.length > 0) {
      const selected = assets.filter(a => formData.asset_ids.includes(a.id));
      setSelectedAssets(selected);
    } else {
      setSelectedAssets([]);
    }
  }, [formData.asset_ids, assets]);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.asset_category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (formData.from_tenant_type === 'Tenant' && formData.tenant_id) {
      if (asset.handover_to !== formData.tenant_id) return false;
    }
    
    if (formData.from_building) {
      // Only match by UUID for new assets
      if (asset.building !== formData.from_building) return false;
    }
    
    if (formData.from_floor) {
      if (asset.floor_id !== formData.from_floor) return false;
    }
    
    if (formData.from_room) {
      if (asset.room_id !== formData.from_room) return false;
    }
    
    return true;
  });

  const loadStats = async () => {
    try {
      const data = await AssetService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [movementsData, assetsData] = await Promise.all([
        AssetService.getMovements(),
        AssetService.getAssets()
      ]);
      setMovements(movementsData);
      setAssets(assetsData);

      // Filter movements based on user's workflow assignments
      let filteredMovements = movementsData;
      
      if (user?.appUser?.id) {
        // Show movements where:
        // 1. User's ID is in the workflow_approver_ids (for sub-users)
        // 2. User's tenant ID is in the workflow_approver_ids (for main tenant users)
        // 3. User created the movement (requested_by)
        filteredMovements = movementsData.filter(m => {
          const approverIds = (m as any).workflow_approver_ids || [];
          const isApprover = approverIds.includes(user.appUser.id);
          const isTenantApprover = user.appUser.tenantId && approverIds.includes(user.appUser.tenantId);
          const isCreator = (m as any).requested_by === user.appUser.id;
          return isApprover || isTenantApprover || isCreator;
        });
      }

      // Names are now stored as text directly — no need to resolve UUIDs
      const enriched = filteredMovements.map((m) => ({
        ...m,
        from_building_name: m.from_building || 'N/A',
        to_building_name: m.to_building || 'N/A',
        from_floor_name: m.from_floor || 'N/A',
        to_floor_name: m.to_floor || 'N/A',
      }));
      setMovementsWithDetails(enriched);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadTenants = async () => {
    const { data, error } = await supabase.from('tenants').select('id, name, company').order('company');
    if (!error && data) setTenants(data as any);
  };

  const loadAllBuildings = async () => {
    const data = await buildingService.getAllBuildings();
    setAllBuildings(data);
  };

  const loadAssetsByTenant = async (tenantId: string) => {
    const { data } = await supabase.from('assets').select('*').eq('handover_to', tenantId);
    if (data) setAssets(data as any);
  };

  const loadBuildingsByTenant = async (tenantId: string) => {
    const { data: agreements } = await supabase.from('agreements').select('space_assignments').eq('tenant_id', tenantId);
    if (!agreements) return;
    
    const buildingIds = new Set<string>();
    agreements.forEach(agreement => {
      const spaces = agreement.space_assignments as any[];
      spaces?.forEach(space => {
        if (space.building) buildingIds.add(space.building);
      });
    });
    
    if (buildingIds.size > 0) {
      const { data } = await supabase.from('buildings').select('*').in('id', Array.from(buildingIds)).order('name');
      if (data) setBuildings(data);
    } else {
      setBuildings([]);
    }
  };

  const loadBuildings = async () => {
    const data = await buildingService.getAllBuildings();
    setBuildings(data);
  };

  const loadFromFloors = async (buildingId: string) => {
    const data = await buildingService.getFloorsByBuilding(buildingId);
    setFromFloors(data);
  };

  const loadToFloors = async (buildingId: string) => {
    const data = await buildingService.getFloorsByBuilding(buildingId);
    setToFloors(data);
  };

  const loadRoomsForFloor = async (floorId: string, side: 'from' | 'to') => {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('floor_id', floorId)
      .order('room_number');
    if (!error && data) {
      if (side === 'from') setFromRooms(data);
      else setToRooms(data);
    }
  };

  const getBuildingName = (id?: string) => buildings.find(b => b.id === id)?.name || 'N/A';

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateNew = () => {
    setFormData({
      tenant_id: '',
      asset_ids: [],
      movement_type: 'Location',
      movement_date: new Date().toISOString().split('T')[0],
      movement_time: '',
      expected_return_date: '',
      from_building: '',
      from_floor: '',
      from_room: '',
      from_tenant_type: 'Tenant',
      from_other_name: '',
      to_building: '',
      to_floor: '',
      to_room: '',
      to_department: '',
      to_custodian: '',
      new_status: '',
      movement_reason: '',
      other_reason: '',
      remarks: '',
      vendor_name: '',
      vendor_contact: '',
      outward_date: '',
      expected_inward_date: '',
      gate_pass_number: '',
      approval_required: true,
      approval_status: 'Pending',
      handover_to: 'Tenant',
      handover_name: '',
      handover_email: '',
      handover_mobile: '',
      from_tenant: '',
      to_tenant: '',
    });
    setSelectedAssets([]);
    setSearchTerm('');
    setActiveTab(0);
    setFromRooms([]);
    setToRooms([]);
    setShowForm(true);
  };

  const handleQRScan = (scannedText: string) => {
    const asset = assets.find(a => a.asset_id === scannedText || a.id === scannedText);
    if (asset && !formData.asset_ids.includes(asset.id)) {
      updateField('asset_ids', [...formData.asset_ids, asset.id]);
      toast({ title: 'Asset Added', description: `${asset.asset_id} - ${asset.asset_name}` });
    } else if (asset) {
      toast({ title: 'Already Added', description: 'Asset already selected' });
    } else {
      toast({ title: 'Asset Not Found', description: 'QR code not recognized', variant: 'destructive' });
    }
    setShowQrScanner(false);
  };

  const toggleAssetSelection = (assetId: string) => {
    const newIds = formData.asset_ids.includes(assetId)
      ? formData.asset_ids.filter(id => id !== assetId)
      : [...formData.asset_ids, assetId];
    updateField('asset_ids', newIds);
  };

  const removeAsset = (assetId: string) => {
    updateField('asset_ids', formData.asset_ids.filter(id => id !== assetId));
  };

  const handleSubmit = async () => {
    try {
      // Generate unique request number with random component to avoid conflicts
      const requestNumber = `MV-${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // Resolve UUIDs to names at save time so they persist even if records are deleted
      const fromBuildingName = allBuildings.find(b => b.id === formData.from_building)?.name || formData.from_building || '';
      const toBuildingName = allBuildings.find(b => b.id === formData.to_building)?.name || formData.to_building || '';
      const fromFloorObj = fromFloors.find(f => f.id === formData.from_floor);
      const fromFloorName = fromFloorObj ? (fromFloorObj.floor_name || `Floor ${fromFloorObj.floor_number}`) : formData.from_floor || '';
      const toFloorObj = toFloors.find(f => f.id === formData.to_floor);
      const toFloorName = toFloorObj ? (toFloorObj.floor_name || `Floor ${toFloorObj.floor_number}`) : formData.to_floor || '';
      const fromRoomName = fromRooms.find(r => r.id === formData.from_room)?.room_number || formData.from_room || '';
      const toRoomName = toRooms.find(r => r.id === formData.to_room)?.room_number || formData.to_room || '';
      const fromTenantName = formData.from_tenant_type === 'Tenant' ? tenants.find(t => t.id === formData.tenant_id)?.company || '' : formData.from_other_name;
      const toTenantName = formData.handover_to === 'Tenant' ? tenants.find(t => t.id === formData.handover_name)?.company || '' : formData.handover_name;
      
      const movementPayload: Partial<Movement> = {
        request_number: requestNumber,
        assets: formData.asset_ids,
        movement_type: formData.movement_type as 'Location' | 'Maintenance' | 'Disposal',
        movement_date: formData.movement_date,
        movement_time: formData.movement_time || undefined,
        expected_return_date: formData.expected_return_date || undefined,
        from_building: fromBuildingName,
        from_floor: fromFloorName,
        from_room: fromRoomName,
        to_building: toBuildingName || undefined,
        to_floor: toFloorName || undefined,
        to_room: toRoomName || undefined,
        vendor_name: formData.vendor_name || undefined,
        vendor_contact: formData.vendor_contact || undefined,
        outward_date: formData.outward_date || undefined,
        expected_inward_date: formData.expected_inward_date || undefined,
        gate_pass_number: formData.gate_pass_number || undefined,
        movement_reason: formData.movement_reason === 'Other' ? formData.other_reason : formData.movement_reason,
        remarks: formData.remarks || undefined,
        movement_status: 'Pending',
        approval_required: formData.approval_required,
        approval_status: formData.approval_required ? 'Pending' : 'Approved',
        handover_to: formData.handover_to,
        handover_name: formData.handover_to === 'Other' ? formData.handover_name : undefined,
        handover_email: formData.handover_to === 'Other' ? formData.handover_email : undefined,
        handover_mobile: formData.handover_to === 'Other' ? formData.handover_mobile : undefined,
        from_tenant: fromTenantName,
        to_tenant: toTenantName,
        // Use the user ID from public.users table (after removing foreign key constraint)
        requested_by: user?.appUser?.id || null,
      } as any;
      
      const movement = await AssetService.createMovement(movementPayload);
      
      // Start workflow if approval required
      if (formData.approval_required && formData.tenant_id) {
        try {
          await workflowEngine.startWorkflow(
            'asset_movement',
            movement.id,
            formData.tenant_id,
            {
              request_number: requestNumber,
              movement_type: formData.movement_type,
              asset_count: formData.asset_ids.length
            }
          );
          toast({ title: 'Success', description: `Movement request created and sent for approval` });
        } catch (workflowError) {
          console.error('Workflow start failed:', workflowError);
          toast({ title: 'Warning', description: 'Movement created but workflow could not be started', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Success', description: `Movement request created with ${formData.asset_ids.length} asset(s)` });
      }
      
      setShowForm(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create movements', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Get current pending step for this movement
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('id')
        .eq('entity_type', 'asset_movement')
        .eq('entity_id', id)
        .eq('status', 'in_progress')
        .single();
      
      if (!instance) {
        toast({ title: 'Error', description: 'No active workflow found', variant: 'destructive' });
        return;
      }
      
      const { data: step } = await supabase
        .from('workflow_instance_steps')
        .select('id')
        .eq('instance_id', instance.id)
        .eq('status', 'pending')
        .order('step_number', { ascending: true })
        .limit(1)
        .single();
      
      if (!step) {
        toast({ title: 'Error', description: 'No pending step found', variant: 'destructive' });
        return;
      }
      
      // Call workflow engine to approve
      await workflowEngine.approveStep(step.id, user?.appUser?.id || '');
      toast({ title: 'Success', description: 'Approval submitted' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      // Get current pending step for this movement
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('id')
        .eq('entity_type', 'asset_movement')
        .eq('entity_id', id)
        .eq('status', 'in_progress')
        .single();
      
      if (!instance) {
        toast({ title: 'Error', description: 'No active workflow found', variant: 'destructive' });
        return;
      }
      
      const { data: step } = await supabase
        .from('workflow_instance_steps')
        .select('id')
        .eq('instance_id', instance.id)
        .eq('status', 'pending')
        .order('step_number', { ascending: true })
        .limit(1)
        .single();
      
      if (!step) {
        toast({ title: 'Error', description: 'No pending step found', variant: 'destructive' });
        return;
      }
      
      // Call workflow engine to reject
      await workflowEngine.rejectStep(step.id, user?.appUser?.id || '');
      toast({ title: 'Success', description: 'Movement rejected' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
    }
  };

  const loadMovementAssets = async (requestNumber: string) => {
    const { data: movement } = await supabase.from('asset_movements').select('assets, id, requested_by').eq('request_number', requestNumber).single();
    if (movement) {
      const assetIds = movement.assets || [];
      if (assetIds.length > 0) {
        const { data: assetData } = await supabase.from('assets').select('id, asset_id, asset_name, asset_category, asset_status').in('id', assetIds);
        if (assetData) setViewMovementAssets(assetData);
      }
      
      await checkUserCanApprove(movement.id);
      // Check if current user is the movement creator
      setIsMovementCreator(movement.requested_by === user?.appUser?.id);
      setViewTab('details');
    }
  };
  
  const handleMarkAsCompleted = async (id: string) => {
    try {
      await supabase
        .from('asset_movements')
        .update({
          movement_status: 'Completed',
          actual_movement_date: new Date().toISOString()
        })
        .eq('id', id);
      
      toast({ title: 'Success', description: 'Movement marked as completed' });
      setViewMovement(null);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark as completed', variant: 'destructive' });
    }
  };

  const checkUserCanApprove = async (movementId: string) => {
    if (!user?.appUser?.id) {
      setCanApproveCurrentMovement(false);
      return;
    }
    
    try {
      // Get active workflow instance for this movement
      const { data: instance } = await supabase
        .from('workflow_instances')
        .select('id, status')
        .eq('entity_type', 'asset_movement')
        .eq('entity_id', movementId)
        .eq('status', 'in_progress')
        .single();
      
      if (!instance) {
        setCanApproveCurrentMovement(false);
        return;
      }
      
      // Get current pending step
      const { data: step } = await supabase
        .from('workflow_instance_steps')
        .select('assigned_user_ids')
        .eq('instance_id', instance.id)
        .eq('status', 'pending')
        .order('step_number', { ascending: true })
        .limit(1)
        .single();
      
      if (!step || !step.assigned_user_ids) {
        setCanApproveCurrentMovement(false);
        return;
      }
      
      // Check if current user is in assigned approvers
      // Check both user ID and tenant ID (for main tenant users)
      const isAssignedByUserId = step.assigned_user_ids.includes(user.appUser.id);
      const isAssignedByTenantId = user.appUser.tenantId && step.assigned_user_ids.includes(user.appUser.tenantId);
      
      setCanApproveCurrentMovement(isAssignedByUserId || isAssignedByTenantId);
    } catch (error) {
      console.error('Error checking approval permission:', error);
      setCanApproveCurrentMovement(false);
    }
  };

  return showForm ? (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-auto">
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex border-b">
              {['Movement Details', 'Asset Selection', 'Review & Submit'].map((tab, index) => (
                <button key={tab} onClick={() => setActiveTab(index)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === index ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {activeTab === 0 && (
            <div className="space-y-6">
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Basic Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Movement Type <span className="text-red-500">*</span>
                      </label>
                      <Select value={formData.movement_type} onValueChange={(v) => updateField('movement_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Location">Location</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                          <SelectItem value="Disposal">Disposal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        Movement Date <span className="text-red-500">*</span>
                      </label>
                      <Input type="date" value={formData.movement_date} onChange={(e) => updateField('movement_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Movement Time</label>
                      <Input type="time" value={formData.movement_time} onChange={(e) => updateField('movement_time', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expected Return Date</label>
                      <Input type="date" value={formData.expected_return_date} onChange={(e) => updateField('expected_return_date', e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
              {formData.movement_type === 'Location' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        From Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Hide Tenant Type selection for tenant users */}
                        {!user?.appUser?.tenantId && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Tenant Type</label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value="Tenant" checked={formData.from_tenant_type !== 'Other'} onChange={() => { updateField('from_tenant_type', 'Tenant'); updateField('from_other_name', ''); updateField('from_building', ''); updateField('from_floor', ''); updateField('from_room', ''); }} className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">Tenant</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value="Other" checked={formData.from_tenant_type === 'Other'} onChange={() => { updateField('from_tenant_type', 'Other'); updateField('tenant_id', ''); updateField('from_building', ''); updateField('from_floor', ''); updateField('from_room', ''); }} className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium">Other</span>
                              </label>
                            </div>
                          </div>
                        )}
                        {formData.from_tenant_type === 'Other' && !user?.appUser?.tenantId ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Select or Enter New</label>
                              <Popover open={openOtherHandoverCombobox} onOpenChange={setOpenOtherHandoverCombobox}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {formData.from_other_name || "Select or type new name"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[600px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search or type new name..." value={formData.from_other_name} onValueChange={(v) => updateField('from_other_name', v)} />
                                    <CommandList>
                                      <CommandEmpty>Type to add new</CommandEmpty>
                                      <CommandGroup>
                                        {otherHandovers.map((h, idx) => (
                                          <CommandItem key={idx} value={h.name} onSelect={() => {
                                            updateField('from_other_name', h.name);
                                            setOpenOtherHandoverCombobox(false);
                                          }}>
                                            <Check className={cn("mr-2 h-4 w-4", formData.from_other_name === h.name ? "opacity-100" : "opacity-0")} />
                                            <div>
                                              <div className="font-medium">{h.name}</div>
                                              <div className="text-xs text-gray-500">{h.email} • {h.contact}</div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        ) : (
                          // Hide tenant selection for tenant users, show for admin
                          !user?.appUser?.tenantId && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                From Tenant <span className="text-red-500">*</span>
                              </label>
                              <Popover open={openTenantCombobox} onOpenChange={setOpenTenantCombobox}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className="w-full justify-between">
                                    {formData.tenant_id ? tenants.find(t => t.id === formData.tenant_id)?.company : "Select tenant"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search tenant..." />
                                    <CommandList>
                                      <CommandEmpty>No tenant found.</CommandEmpty>
                                      <CommandGroup>
                                        {tenants.map(t => (
                                          <CommandItem key={t.id} value={t.company} onSelect={() => { updateField('tenant_id', t.id); setOpenTenantCombobox(false); }}>
                                            <Check className={cn("mr-2 h-4 w-4", formData.tenant_id === t.id ? "opacity-100" : "opacity-0")} />
                                            {t.company}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Building</label>
                          <Select value={formData.from_building} onValueChange={(v) => updateField('from_building', v)} disabled={!user?.appUser?.tenantId && formData.from_tenant_type === 'Tenant' && !formData.tenant_id}>
                            <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                            <SelectContent>
                              {(formData.from_tenant_type === 'Other' ? allBuildings : buildings).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Floor</label>
                          <Select value={formData.from_floor} onValueChange={(v) => updateField('from_floor', v)} disabled={!formData.from_building}>
                            <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                            <SelectContent>
                              {fromFloors.map(f => <SelectItem key={f.id} value={f.id}>{f.floor_name || `Floor ${f.floor_number}`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Room</label>
                          <Select value={formData.from_room} onValueChange={(v) => updateField('from_room', v)} disabled={!formData.from_floor}>
                            <SelectTrigger><SelectValue placeholder={!formData.from_floor ? 'Select floor first' : fromRooms.length === 0 ? 'No rooms available' : 'Select room'} /></SelectTrigger>
                            <SelectContent>
                              {fromRooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-green-600" />
                        To Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Handover To</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" value="Tenant" checked={formData.handover_to === 'Tenant'} onChange={(e) => updateField('handover_to', e.target.value)} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">Tenant</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" value="Other" checked={formData.handover_to === 'Other'} onChange={(e) => updateField('handover_to', e.target.value)} className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">Other</span>
                            </label>
                          </div>
                        </div>
                        {formData.handover_to === 'Tenant' ? (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">To Tenant</label>
                            <Popover open={openHandoverCombobox} onOpenChange={setOpenHandoverCombobox}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                  {formData.handover_name ? tenants.find(t => t.id === formData.handover_name)?.company : "Select tenant"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[600px] p-0">
                                <Command>
                                  <CommandInput placeholder="Search tenant..." />
                                  <CommandList>
                                    <CommandEmpty>No tenant found.</CommandEmpty>
                                    <CommandGroup>
                                      {tenants.map(t => (
                                        <CommandItem key={t.id} value={t.company} onSelect={() => { updateField('handover_name', t.id); setOpenHandoverCombobox(false); }}>
                                          <Check className={cn("mr-2 h-4 w-4", formData.handover_name === t.id ? "opacity-100" : "opacity-0")} />
                                          {t.company}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Name</label>
                              <Input placeholder="Enter name" value={formData.handover_name} onChange={(e) => updateField('handover_name', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                                <Input placeholder="Enter email" value={formData.handover_email} onChange={(e) => updateField('handover_email', e.target.value)} />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Contact Mobile</label>
                                <Input placeholder="Enter contact mobile" value={formData.handover_mobile} onChange={(e) => updateField('handover_mobile', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                            Building <span className="text-red-500">*</span>
                          </label>
                          <Select value={formData.to_building} onValueChange={(v) => updateField('to_building', v)} disabled={!formData.tenant_id}>
                            <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                            <SelectContent>
                              {allBuildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Floor</label>
                          <Select value={formData.to_floor} onValueChange={(v) => updateField('to_floor', v)} disabled={!formData.to_building}>
                            <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                            <SelectContent>
                              {toFloors.map(f => <SelectItem key={f.id} value={f.id}>{f.floor_name || `Floor ${f.floor_number}`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Room</label>
                          <Select value={formData.to_room} onValueChange={(v) => updateField('to_room', v)} disabled={!formData.to_floor}>
                            <SelectTrigger><SelectValue placeholder={!formData.to_floor ? 'Select floor first' : toRooms.length === 0 ? 'No rooms available' : 'Select room'} /></SelectTrigger>
                            <SelectContent>
                              {toRooms.map(r => <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {formData.movement_type === 'Maintenance' && (
                <Card className="border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      Maintenance Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Vendor Name <span className="text-red-500">*</span>
                        </label>
                        <Input value={formData.vendor_name} onChange={(e) => updateField('vendor_name', e.target.value)} placeholder="Enter vendor name" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Vendor Contact</label>
                        <Input value={formData.vendor_contact} onChange={(e) => updateField('vendor_contact', e.target.value)} placeholder="Enter contact" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Outward Date <span className="text-red-500">*</span>
                        </label>
                        <Input type="date" value={formData.outward_date} onChange={(e) => updateField('outward_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Expected Inward Date</label>
                        <Input type="date" value={formData.expected_inward_date} onChange={(e) => updateField('expected_inward_date', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Gate Pass Number</label>
                        <Input value={formData.gate_pass_number} onChange={(e) => updateField('gate_pass_number', e.target.value)} placeholder="Enter gate pass" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-purple-600" />
                    Additional Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Movement Reason <span className="text-red-500">*</span>
                        </label>
                        <Select value={formData.movement_reason} onValueChange={(v) => updateField('movement_reason', v)}>
                          <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Relocation">Relocation</SelectItem>
                            <SelectItem value="Repair">Repair</SelectItem>
                            <SelectItem value="Upgrade">Upgrade</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.movement_reason === 'Other' && (
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Other Reason</label>
                          <Input value={formData.other_reason} onChange={(e) => updateField('other_reason', e.target.value)} placeholder="Specify reason" />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">Remarks / Notes</label>
                      <Textarea value={formData.remarks} onChange={(e) => updateField('remarks', e.target.value)} rows={3} placeholder="Add any additional notes..." />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setActiveTab(1)} size="lg" className="w-full md:w-auto">
                  Next: Asset Selection <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {activeTab === 1 && (
            <div className="flex gap-4 h-[calc(100vh-200px)]">
              <div className="w-[60%] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase">Asset Identification</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowQrScanner(true)}>
                    <QrCode className="h-4 w-4 mr-2" />Scan QR
                  </Button>
                </div>
                <QRScannerModal isOpen={showQrScanner} onClose={() => setShowQrScanner(false)} onScan={handleQRScan} title="SCAN ASSET" subtitle="Scan QR code or enter Asset ID manually" />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Search assets by ID, name, or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="h-[calc(100%-120px)] overflow-y-auto border rounded-md">
                  {filteredAssets.map(asset => (
                    <div key={asset.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                      <Checkbox checked={formData.asset_ids.includes(asset.id)} onCheckedChange={() => toggleAssetSelection(asset.id)} />
                      <div className="flex-1">
                        <div className="font-medium">{asset.asset_id} - {asset.asset_name}</div>
                        <div className="text-sm text-gray-500">{asset.asset_category} | {asset.asset_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-[40%]">
                {selectedAssets.length > 0 ? (
                  <div className="h-full flex flex-col">
                    <div className="text-sm font-medium text-gray-900 mb-2">Selected Assets ({selectedAssets.length})</div>
                    <div className="flex-1 border border-gray-300 rounded-sm flex flex-col">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-gray-100">
                            <tr className="border-b border-gray-300">
                              <th className="text-xs font-medium text-gray-700 text-left py-1.5 px-2 border-r border-gray-300">Asset ID</th>
                              <th className="text-xs font-medium text-gray-700 text-left py-1.5 px-2 border-r border-gray-300">Name</th>
                              <th className="text-xs font-medium text-gray-700 text-center py-1.5 px-2 w-8">×</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((asset, index) => (
                              <tr key={asset.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                <td className="text-xs py-1.5 px-2 border-r border-gray-200 font-mono">{asset.asset_id}</td>
                                <td className="text-xs py-1.5 px-2 border-r border-gray-200 truncate">{asset.asset_name}</td>
                                <td className="text-xs py-1.5 px-2 text-center">
                                  <button type="button" onClick={() => removeAsset(asset.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded p-0.5 transition-colors">
                                    <X className="h-3 w-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="border-t border-gray-300 p-2 flex items-center justify-between bg-gray-50">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-xs px-2 py-1 border rounded disabled:opacity-50">&lt;</button>
                        <span className="text-xs">{currentPage} / {Math.ceil(selectedAssets.length / itemsPerPage)}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(selectedAssets.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(selectedAssets.length / itemsPerPage)} className="text-xs px-2 py-1 border rounded disabled:opacity-50">&gt;</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    No assets selected
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 1 && (
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setActiveTab(0)}>Back</Button>
              <Button onClick={() => setActiveTab(2)} disabled={formData.asset_ids.length === 0}>Next: Review</Button>
            </div>
          )}
          {activeTab === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase">Review Movement Request</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Selected Assets ({selectedAssets.length})</h4>
                    <div className="space-y-1">
                      {selectedAssets.map(asset => (
                        <div key={asset.id} className="text-sm text-gray-600">{asset.asset_id} - {asset.asset_name}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Movement Details</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div>Type: {formData.movement_type}</div>
                      <div>Date: {formData.movement_date}</div>
                      {formData.movement_time && <div>Time: {formData.movement_time}</div>}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {formData.movement_type === 'Location' && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Location Details</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>To Building: {getBuildingName(formData.to_building)}</div>
                        {formData.to_floor && <div>To Floor: {toFloors.find(f => f.id === formData.to_floor)?.floor_name}</div>}
                        {formData.to_room && <div>To Room: {formData.to_room}</div>}
                      </div>
                    </div>
                  )}
                  {formData.movement_type === 'Maintenance' && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Vendor Details</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Vendor: {formData.vendor_name}</div>
                        {formData.vendor_contact && <div>Contact: {formData.vendor_contact}</div>}
                      </div>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Reason</h4>
                    <div className="text-sm text-gray-600">{formData.movement_reason === 'Other' ? formData.other_reason : formData.movement_reason}</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setActiveTab(1)}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={handleSubmit}>
                    <Save className="h-4 w-4 mr-2" />
                    Submit Request
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <DashboardLayout title="Asset Movement" subtitle="Manage asset movements and approvals">
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Movement Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.movementToday || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Audit Due Alerts</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.auditDue || 0}</div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </CardContent>
            </Card>
          </div>
      {showForm ? null : (
        <>
          {!viewMovement ? (
            <>
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Asset Movement</h1>
                <div className="flex gap-2">
                  <Button onClick={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4" /> Raise Movement Request
                  </Button>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="transition-colors border-b border-gray-200 hover:bg-transparent bg-gray-50">
                        <th className="h-12 px-4 text-left align-middle text-gray-600 font-semibold uppercase text-xs">Request #</th>
                        <th className="h-12 px-4 text-left align-middle text-gray-600 font-semibold uppercase text-xs">Type</th>
                        <th className="h-12 px-4 text-left align-middle text-gray-600 font-semibold uppercase text-xs">From</th>
                        <th className="h-12 px-4 text-left align-middle text-gray-600 font-semibold uppercase text-xs">To</th>
                        <th className="h-12 px-4 text-left align-middle text-gray-600 font-semibold uppercase text-xs">Approval Status</th>
                        <th className="h-12 px-4 text-left align-middle text-gray-600 font-semibold uppercase text-xs">Movement Status</th>
                        <th className="h-12 px-4 align-middle text-gray-600 font-semibold uppercase text-xs text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {movementsWithDetails.map((m) => (
                        <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-4 align-middle font-medium text-gray-900">{m.request_number}</td>
                          <td className="p-4 align-middle text-gray-700">{m.movement_type}</td>
                          <td className="p-4 align-middle text-gray-700">{m.from_building_name || 'N/A'} - {m.from_floor_name || 'N/A'}</td>
                          <td className="p-4 align-middle text-gray-700">{m.to_building_name || m.vendor_name || 'N/A'}</td>
                          <td className="p-4 align-middle">
                            {(m as any).approval_status === 'Pending' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-amber-100 text-amber-800 border-amber-200">Pending</span>
                            ) : (m as any).approval_status === 'Approved' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-500 border-green-500/30">Approved</span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-500 border-red-500/30">Rejected</span>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            {m.movement_status === 'Pending' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-amber-100 text-amber-800 border-amber-200">Pending</span>
                            ) : m.movement_status === 'Approved' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-green-500/20 text-green-500 border-green-500/30">Approved</span>
                            ) : m.movement_status === 'Rejected' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-500 border-red-500/30">Rejected</span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-blue-500/20 text-blue-500 border-blue-500/30">Completed</span>
                            )}
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => { setViewMovement(m); loadMovementAssets(m.request_number); }} className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors h-9 rounded-md px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100" title="View">
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">Movement Request</h1>
                    <p className="text-sm text-gray-500 mt-1">Ticket #{viewMovement.request_number}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setViewMovement(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {/* Tab Switcher */}
                <div className="flex gap-2 mt-4 border-b">
                  <button
                    onClick={() => setViewTab('details')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      viewTab === 'details'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Building2 className="inline h-4 w-4 mr-1" />
                    Details
                  </button>
                  <button
                    onClick={() => setViewTab('approvals')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      viewTab === 'approvals'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileText className="inline h-4 w-4 mr-1" />
                    Approval History
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {viewTab === 'details' ? (
                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-2">
                    <div className="mb-2 px-2">
                      <span className="text-xs font-medium text-gray-600">Total Assets: <span className="font-bold text-gray-900">{viewMovementAssets.length}</span></span>
                    </div>
                    <div className="flex-1 border border-gray-300 rounded-sm flex flex-col">
                      <div className="flex-1 overflow-auto">
                        <table className="w-full border-collapse">
                          <thead className="sticky top-0 bg-gray-100">
                            <tr className="border-b border-gray-300">
                              <th className="text-xs font-medium text-gray-700 text-left py-1.5 px-2 border-r border-gray-300">Asset ID</th>
                              <th className="text-xs font-medium text-gray-700 text-left py-1.5 px-2 border-r border-gray-300">Name</th>
                              <th className="text-xs font-medium text-gray-700 text-left py-1.5 px-2 border-r border-gray-300">Category</th>
                              <th className="text-xs font-medium text-gray-700 text-left py-1.5 px-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewMovementAssets.map((asset, index) => (
                              <tr key={asset.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                                <td className="text-xs py-1.5 px-2 border-r border-gray-200 font-mono">{asset.asset_id}</td>
                                <td className="text-xs py-1.5 px-2 border-r border-gray-200 truncate">{asset.asset_name}</td>
                                <td className="text-xs py-1.5 px-2 border-r border-gray-200 truncate">{asset.asset_category}</td>
                                <td className="text-xs py-1.5 px-2">{asset.asset_status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-md p-4">
                      {(viewMovement as any).movement_type === 'Location' && (
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex-1 bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">From Location</label>
                            </div>
                            <div className="space-y-1 text-sm">
                              {(viewMovement as any).from_tenant && <p className="text-gray-800"><span className="font-medium">Tenant:</span> {(viewMovement as any).from_tenant}</p>}
                              <p className="text-gray-800"><span className="font-medium">Building:</span> {(viewMovement as any).from_building_name || 'N/A'}</p>
                              <p className="text-gray-800"><span className="font-medium">Floor:</span> {(viewMovement as any).from_floor_name || 'N/A'}</p>
                              <p className="text-gray-800"><span className="font-medium">Room:</span> {viewMovement.from_room || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1 bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">To Location</label>
                            </div>
                            <div className="space-y-1 text-sm">
                              {(viewMovement as any).to_tenant && <p className="text-gray-800"><span className="font-medium">Tenant:</span> {(viewMovement as any).to_tenant}</p>}
                              <p className="text-gray-800"><span className="font-medium">Building:</span> {(viewMovement as any).to_building_name || 'N/A'}</p>
                              <p className="text-gray-800"><span className="font-medium">Floor:</span> {(viewMovement as any).to_floor_name || 'N/A'}</p>
                              <p className="text-gray-800"><span className="font-medium">Room:</span> {viewMovement.to_room || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="h-[1px] bg-gray-200 mb-4" />
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wider">Approval Status</label>
                          <div className="mt-1">
                            {(viewMovement as any).approval_status === 'Pending' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pending</span>
                            ) : (viewMovement as any).approval_status === 'Approved' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wider">Movement Status</label>
                          <div className="mt-1">
                            {viewMovement.movement_status === 'Pending' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pending</span>
                            ) : viewMovement.movement_status === 'Approved' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>
                            ) : viewMovement.movement_status === 'Rejected' ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Completed</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wider">Movement Type</label>
                          <p className="font-medium text-gray-800 mt-1">{viewMovement.movement_type}</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 uppercase tracking-wider">Movement Date</label>
                          <p className="font-medium text-gray-800 mt-1">{viewMovement.movement_date}</p>
                        </div>
                        {viewMovement.movement_time && (
                          <div>
                            <label className="text-xs text-gray-400 uppercase tracking-wider">Time</label>
                            <p className="font-medium text-gray-800 mt-1">{viewMovement.movement_time}</p>
                          </div>
                        )}
                        {viewMovement.movement_reason && (
                          <div className="col-span-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider">Movement Reason</label>
                            <p className="font-medium text-gray-800 mt-1">{viewMovement.movement_reason}</p>
                          </div>
                        )}
                        {viewMovement.remarks && (
                          <div className="col-span-2">
                            <label className="text-xs text-gray-400 uppercase tracking-wider">Remarks</label>
                            <p className="font-medium text-gray-800 mt-1">{viewMovement.remarks}</p>
                          </div>
                        )}
                      </div>
                      {viewMovement.movement_status === 'Pending' && canApproveCurrentMovement && (
                        <>
                          <div className="h-[1px] bg-gray-200 my-4" />
                          <div className="flex gap-3">
                            <button onClick={() => { handleApprove(viewMovement.id); setViewMovement(null); }} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors">
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </button>
                            <button onClick={() => { handleReject(viewMovement.id); setViewMovement(null); }} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors">
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                      {viewMovement.movement_status === 'Approved' && isMovementCreator && (
                        <>
                          <div className="h-[1px] bg-gray-200 my-4" />
                          <button onClick={() => { handleMarkAsCompleted(viewMovement.id); }} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            <CheckCircle className="h-4 w-4" />
                            Mark Movement as Completed
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                ) : (
                  <ApprovalList movementId={viewMovement.id} />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
        </div>
      )}
    </DashboardLayout>
  );
}
