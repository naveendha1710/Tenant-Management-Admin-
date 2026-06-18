import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileText, MapPin, Calendar, Camera, AlertTriangle, X, Upload, Cloud, Building2, Layers, Check, ChevronsUpDown, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MaintenanceService } from '@/services/maintenanceService';
import { TicketUploadService } from '@/services/ticketUploadService';
import { supabase } from '@/lib/supabaseClient';
import { ticketNotifications } from '@/services/ticketNotifications';
import { cn } from '@/lib/utils';

const CATEGORIES = {
  Electrical: ['Socket Issue', 'Light Not Working', 'Switch Problem', 'Circuit Breaker', 'Wiring Issue', 'Other'],
  Plumbing: ['Leakage', 'Blocked Drain', 'Tap Issue', 'Toilet Problem', 'Water Pressure', 'Other'],
  Carpentry: ['Door Issue', 'Window Problem', 'Furniture Repair', 'Cabinet Issue', 'Other'],
  HVAC: ['AC Not Cooling', 'AC Leaking', 'Ventilation Issue', 'Thermostat Problem', 'Other'],
  Civil: ['Wall Crack', 'Ceiling Issue', 'Floor Damage', 'Structural Problem', 'Other'],
  Painting: ['Wall Paint', 'Ceiling Paint', 'Door/Window Paint', 'Other'],
  'IT/Networking': ['Internet Issue', 'Network Problem', 'Cable Issue', 'Other'],
  Housekeeping: ['Cleaning Required', 'Pest Control', 'Garbage Disposal', 'Other'],
  Others: ['General Issue']
};

const TIME_SLOTS = ['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-8PM)', 'Anytime'];

interface MaintenanceTicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MaintenanceTicketForm({ isOpen, onClose, onSuccess }: MaintenanceTicketFormProps) {
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    building: '',
    floor: '',
    room: '',
    spotDescription: '',
    preferredDate: '',
    preferredTime: '',
    targetDate: '',
    priority: 'Medium',
    safetyRisk: false,
    previousOccurrence: false,
    relatedTicketId: '',
    notes: '',
    photos: [] as File[],
    assetId: ''
  });
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const hasScannedRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [spaceAssignments, setSpaceAssignments] = useState<any[]>([]);
  const [previousTickets, setPreviousTickets] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [tenantAssets, setTenantAssets] = useState<any[]>([]);
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [currentTenant, setCurrentTenant] = useState<any | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user?.email) {
      fetchSpaceAssignments();
      fetchPreviousTickets();
      fetchTenantAssets();
    }
  }, [isOpen, user?.email]);

  useEffect(() => {
    if (spaceAssignments.length > 0 && !formData.building) {
      const firstSpace = spaceAssignments[0];
      const building = firstSpace.buildingName || firstSpace.building;
      const floor = firstSpace.floorName || (firstSpace.floorNumber ? `Floor ${firstSpace.floorNumber}` : null) || (firstSpace.floor ? `Floor ${firstSpace.floor}` : 'Floor 1');
      setFormData({ ...formData, building, floor });
    }
  }, [spaceAssignments]);

  const fetchSpaceAssignments = async () => {
    try {
      // Check if user is a tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('email', user?.email)
        .maybeSingle();

      setCurrentTenant(tenantData || null);

      if (tenantData) {
        // Tenant user - fetch their space assignments
        const { data: agreements, error: agreementsError } = await supabase
          .from('agreements')
          .select('space_assignments')
          .eq('tenant_id', tenantData.id)
          .eq('status', 'Active');

        if (agreementsError) throw agreementsError;
        const allSpaceAssignments = agreements?.flatMap(a => a.space_assignments || []) || [];
        setSpaceAssignments(allSpaceAssignments);
      } else {
        // Non-tenant user (helpdesk/admin) - fetch tenant list and all buildings/floors
        try {
          const { tenantDataService } = await import('@/data/tenantData');
          const allTenants = await tenantDataService.getAllTenants();
          setTenants(allTenants || []);
        } catch (e) {
          console.warn('Could not load tenants list', e);
        }

        // Non-tenant user (helpdesk/admin) - fetch all buildings and floors
        const { data: buildings, error: buildingsError } = await supabase
          .from('buildings')
          .select('id, name');

        if (buildingsError) throw buildingsError;
        
        // Fetch all floors
        const { data: floors, error: floorsError } = await supabase
          .from('floors')
          .select('id, building_id, floor_number, floor_name');

        if (floorsError) throw floorsError;
        
        // Create space assignments for all building-floor combinations
        const allSpaceAssignments: any[] = [];
        buildings?.forEach(building => {
          const buildingFloors = floors?.filter(f => f.building_id === building.id) || [];
          buildingFloors.forEach(floor => {
            allSpaceAssignments.push({
              buildingName: building.name,
              building: building.name,
              floorName: floor.floor_name || `Floor ${floor.floor_number}`,
              floor: floor.floor_name || `Floor ${floor.floor_number}`,
              floorNumber: floor.floor_number
            });
          });
        });
        setSpaceAssignments(allSpaceAssignments);
      }
    } catch (error) {
      console.error('Error fetching space assignments:', error);
    }
  };

  const fetchPreviousTickets = async () => {
    try {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .eq('email', user?.email)
        .maybeSingle();
      
      if (tenantData) {
        const tickets = await MaintenanceService.getTenantTickets(tenantData.id);
        setPreviousTickets(tickets);
      }
    } catch (error) {
      console.error('Error fetching previous tickets:', error);
    }
  };

  const fetchTenantAssets = async () => {
    try {
      const { data: tenantData } = await supabase.from('tenants').select('id').eq('email', user?.email).maybeSingle();
      
      if (tenantData) {
        // Tenant user - fetch only their assets
        const { data: assets } = await supabase.from('assets').select('id, asset_id, asset_name, asset_category, asset_type, room_rack').eq('handover_to', tenantData.id);
        setTenantAssets(assets || []);
      } else {
        // Non-tenant user (helpdesk/admin) - fetch all assets
        const { data: assets } = await supabase.from('assets').select('id, asset_id, asset_name, asset_category, asset_type, room_rack');
        setTenantAssets(assets || []);
      }
    } catch (error) {
      console.error('Error fetching tenant assets:', error);
    }
  };

  const handleQrScan = async (scannedData: string) => {
    await stopScanner();
    setShowQrScanner(false);
    
    try {
      const asset = tenantAssets.find(a => a.asset_id === scannedData);
      if (asset && !selectedAssets.includes(asset.id)) {
        setSelectedAssets([...selectedAssets, asset.id]);
        toast({ title: 'Success', description: `Asset ${asset.asset_id} added` });
      } else if (asset && selectedAssets.includes(asset.id)) {
        toast({ title: 'Info', description: 'Asset already added' });
      } else {
        toast({ title: 'Error', description: 'Asset not found or not assigned to you', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      toast({ title: 'Error', description: 'Failed to process QR code', variant: 'destructive' });
    }
  };

  const startScanner = async () => {
    if (scanning) return;
    
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      hasScannedRef.current = false;
      
      setScanning(true);
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          handleQrScan(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error('Scanner error:', error);
      setScanning(false);
      toast({ title: 'Error', description: 'Failed to start camera', variant: 'destructive' });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      } catch (error) {
        console.error('Stop scanner error:', error);
      }
    }
  };

  useEffect(() => {
    if (showQrScanner) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [showQrScanner]);

  const removeAsset = (assetId: string) => {
    setSelectedAssets(selectedAssets.filter(id => id !== assetId));
  };

  const removePhoto = (index: number) => {
    setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== index) });
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setFormData(prev => ({ ...prev, photos: [...prev.photos, ...files] }));
    }
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.building) newErrors.building = 'Building is required';
    if (!formData.floor) newErrors.floor = 'Floor is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      // Determine tenant context (tenant user or admin selected tenant)
      const tenant = currentTenant || null;
      
      // Upload photos if any
      const uploadedPhotos = [];
      if (formData.photos.length > 0) {
        const folderName = tenant ? tenant.company.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'helpdesk';
        
        try {
          const photoUrls = await TicketUploadService.uploadFiles(formData.photos, folderName);
          uploadedPhotos.push(...photoUrls);
        } catch (error) {
          console.error('Photo upload failed:', error);
          toast({ 
            title: "Warning", 
            description: "Some photos failed to upload, but ticket will be created",
            variant: "destructive" 
          });
        }
      }
      
      // Create ticket data - use selected tenant if an admin chooses one
      const tenantIdToUse = tenant?.id || selectedTenantId || null;
      const ticketData = {
        tenant_id: tenantIdToUse,
        on_behalf_tenant_id: selectedTenantId || null,
        created_by_user_id: user?.id || null,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        building: formData.building,
        floor: formData.floor,
        room: formData.room || null,
        spot_description: formData.spotDescription || null,
        preferred_date: formData.preferredDate || null,
        preferred_time: formData.preferredTime || null,
        target_date: formData.targetDate || null,
        safety_risk: formData.safetyRisk,
        previous_occurrence: formData.previousOccurrence,
        related_ticket_id: formData.relatedTicketId || null,
        notes: formData.notes || null,
        photos: uploadedPhotos,
        status: 'pending',
        cost: 0,
        asset_id: selectedAssets.length > 0 ? selectedAssets[0] : null
      };
      
      const ticket = await MaintenanceService.createTicket(ticketData);
      
      // Link multiple assets if selected
      if (selectedAssets.length > 0) {
        const ticketAssets = selectedAssets.map(assetId => ({
          ticket_id: ticket.id,
          asset_id: assetId
        }));
        await supabase.from('ticket_assets').insert(ticketAssets);
      }
      
      toast({ title: "Success", description: "Maintenance request submitted successfully" });
      setFormData({
        category: '', title: '', description: '', building: '', floor: '', room: '',
        spotDescription: '', preferredDate: '', preferredTime: '', targetDate: '', priority: 'Medium',
        safetyRisk: false, previousOccurrence: false, relatedTicketId: '', notes: '', photos: [], assetId: ''
      });
      setSelectedAssets([]);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getPriorityStyles = (priority: string) => {
    const styles = {
      Critical: 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200',
      High: 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200',
      Medium: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200',
      Low: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
    };
    return formData.priority === priority ? styles[priority as keyof typeof styles] : 'bg-white hover:bg-gray-50';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Issue Details Section */}
      <div className="bg-gray-50 -mx-6 -mt-6 px-6 py-5 border-b">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Issue Details
        </h3>
        <p className="text-sm text-gray-600 mt-1">Tell us what needs attention</p>
      </div>

      {/* Tenant selector for admins to create ticket on behalf of a tenant */}
      {!currentTenant && (
        <div className="px-0">
          <Label className="text-sm font-medium mb-2 block">Select Tenant (Optional)</Label>
          <Select value={selectedTenantId || ''} onValueChange={(v) => setSelectedTenantId(v === '__none' ? null : v)}>
            <SelectTrigger className="ring-offset-background focus:ring-2 focus:ring-blue-500">
              <SelectValue placeholder="Select Tenant (Optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.company || t.name || t.companygroup}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-5">
        {/* Category & Title - 2 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Category *</Label>
            <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
              <SelectTrigger className={`ring-offset-background focus:ring-2 focus:ring-blue-500 ${errors.category ? 'border-red-500 focus:ring-red-500' : ''}`}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(CATEGORIES).map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-red-500 mt-1.5">{errors.category}</p>}
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Issue Title *</Label>
            <Input 
              value={formData.title} 
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
              placeholder="Brief title of the issue" 
              className={`ring-offset-background focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500 focus:ring-red-500' : ''}`} 
            />
            {errors.title && <p className="text-xs text-red-500 mt-1.5">{errors.title}</p>}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Related Assets (Optional)</Label>
          <div className="flex gap-2">
            <Popover open={assetSearchOpen} onOpenChange={setAssetSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="flex-1 justify-between"
                >
                  Search and select assets...
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search assets by ID or name..." />
                  <CommandEmpty>No assets found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {tenantAssets.map((asset) => (
                      <CommandItem
                        key={asset.id}
                        value={`${asset.asset_id} ${asset.asset_name} ${asset.asset_category}`}
                        onSelect={() => {
                          if (!selectedAssets.includes(asset.id)) {
                            setSelectedAssets([...selectedAssets, asset.id]);
                          }
                          setAssetSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedAssets.includes(asset.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{asset.asset_id} - {asset.asset_name}</span>
                          <span className="text-xs text-gray-500">{asset.asset_category}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowQrScanner(true)}
            >
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
          {selectedAssets.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedAssets.map((assetId) => {
                const asset = tenantAssets.find(a => a.id === assetId);
                return asset ? (
                  <Badge key={assetId} variant="secondary" className="pl-3 pr-1 py-1">
                    {asset.asset_id} - {asset.asset_name}
                    <button
                      type="button"
                      onClick={() => removeAsset(assetId)}
                      className="ml-2 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>

        {showQrScanner && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Scan Asset QR Code</h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowQrScanner(false); stopScanner(); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Position the QR code within the frame</p>
                <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                <div className="text-center text-xs text-gray-500">Or enter manually below</div>
                <Input
                  placeholder="Enter asset ID manually"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleQrScan(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Description *</Label>
          <Textarea 
            value={formData.description} 
            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            rows={4} 
            placeholder="Describe the issue in detail..." 
            className={`ring-offset-background focus:ring-2 focus:ring-blue-500 resize-none ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`} 
          />
          {errors.description && <p className="text-xs text-red-500 mt-1.5">{errors.description}</p>}
        </div>

        {/* Priority Selector - Styled Badges */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Priority</Label>
          <div className="flex gap-2 flex-wrap">
            {['Low', 'Medium', 'High', 'Critical'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFormData({ ...formData, priority: p })}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${getPriorityStyles(p)}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Safety Risk & Previous Occurrence - Toggles */}
        <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Safety Risk
            </Label>
            <Switch checked={formData.safetyRisk} onCheckedChange={(v) => setFormData({ ...formData, safetyRisk: v })} />
          </div>
          <div className="h-px bg-gray-200" />
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Previous Occurrence</Label>
            <Switch checked={formData.previousOccurrence} onCheckedChange={(v) => setFormData({ ...formData, previousOccurrence: v, relatedTicketId: v ? formData.relatedTicketId : '' })} />
          </div>
          {formData.previousOccurrence && (
            <div className="pt-2">
              <Label className="text-sm font-medium mb-2 block">Related Ticket</Label>
              <Select value={formData.relatedTicketId} onValueChange={(v) => setFormData({ ...formData, relatedTicketId: v })}>
                <SelectTrigger className="ring-offset-background focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Select previous ticket" />
                </SelectTrigger>
                <SelectContent>
                  {previousTickets.map((ticket) => (
                    <SelectItem key={ticket.id} value={ticket.id}>
                      #{ticket.id.slice(0, 8)} - {ticket.title} ({ticket.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-gray-50 -mx-6 px-6 py-5 border-y">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Location Details
        </h3>
        <p className="text-sm text-gray-600 mt-1">Where is the issue located?</p>
      </div>

      <div className="space-y-5">
        {/* Building & Floor - Same row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              Building/Block *
            </Label>
            <Select value={formData.building} onValueChange={(v) => setFormData({ ...formData, building: v, floor: '' })}>
              <SelectTrigger className={`ring-offset-background focus:ring-2 focus:ring-blue-500 ${errors.building ? 'border-red-500 focus:ring-red-500' : ''}`}>
                <SelectValue placeholder="Select building" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(spaceAssignments.map(s => s.buildingName || s.building))].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.building && <p className="text-xs text-red-500 mt-1.5">{errors.building}</p>}
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-gray-500" />
              Floor *
            </Label>
            <Select value={formData.floor} onValueChange={(v) => setFormData({ ...formData, floor: v })} disabled={!formData.building}>
              <SelectTrigger className={`ring-offset-background focus:ring-2 focus:ring-blue-500 ${errors.floor ? 'border-red-500 focus:ring-red-500' : ''}`}>
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {spaceAssignments.filter(s => (s.buildingName || s.building) === formData.building).map((s, i) => {
                  const floorLabel = s.floorName || (s.floorNumber ? `Floor ${s.floorNumber}` : null) || (s.floor ? `Floor ${s.floor}` : `Floor ${i + 1}`);
                  return <SelectItem key={i} value={floorLabel}>{floorLabel}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            {errors.floor && <p className="text-xs text-red-500 mt-1.5">{errors.floor}</p>}
          </div>
        </div>

        {/* Room & Spot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Room/Unit</Label>
            <Input 
              value={formData.room} 
              onChange={(e) => setFormData({ ...formData, room: e.target.value })} 
              placeholder="e.g., 301" 
              className="ring-offset-background focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Exact Spot</Label>
            <Input 
              value={formData.spotDescription} 
              onChange={(e) => setFormData({ ...formData, spotDescription: e.target.value })} 
              placeholder="e.g., Near main door" 
              className="ring-offset-background focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>

        {/* Photo Upload Dropzone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-3 flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-500" />
              Upload Photos
            </Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setFormData(prev => ({ ...prev, photos: [...prev.photos, ...files] }));
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Cloud className="h-6 w-6 mx-auto text-gray-400 mb-1" />
              <p className="text-xs font-medium text-gray-700">Drag files here or click to upload</p>
              <p className="text-xs text-gray-500 mt-0.5">PNG, JPG up to 10MB</p>
            </div>
            {formData.photos.length > 0 && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {formData.photos.map((photo, i) => (
                  <div key={i} className="relative group">
                    <img src={URL.createObjectURL(photo)} alt="" className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visit Preferences Section */}
      <div className="bg-gray-50 -mx-6 px-6 py-5 border-y">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Visit Preferences
        </h3>
        <p className="text-sm text-gray-600 mt-1">When would you like us to visit?</p>
      </div>

      <div className="space-y-5">
        {/* Date, Time & Target Date - 3 column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Preferred Date
            </Label>
            <Input 
              type="date" 
              value={formData.preferredDate} 
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })} 
              min={new Date().toISOString().split('T')[0]} 
              className="ring-offset-background focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 block">Preferred Time Slot</Label>
            <Select value={formData.preferredTime} onValueChange={(v) => setFormData({ ...formData, preferredTime: v })}>
              <SelectTrigger className="ring-offset-background focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              Target Date
            </Label>
            <Input 
              type="date" 
              value={formData.targetDate} 
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })} 
              min={new Date().toISOString().split('T')[0]} 
              className="ring-offset-background focus:ring-2 focus:ring-blue-500" 
            />
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Additional Notes</Label>
          <Textarea 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
            rows={3} 
            placeholder="Any additional information..." 
            className="ring-offset-background focus:ring-2 focus:ring-blue-500 resize-none" 
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-4 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onClose} 
          className="sm:w-auto ring-offset-background focus:ring-2 focus:ring-blue-500" 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="sm:w-auto bg-blue-600 hover:bg-blue-700 ring-offset-background focus:ring-2 focus:ring-blue-500" 
          disabled={loading}
        >
          {loading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </form>
  );
}