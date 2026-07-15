import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetService, DashboardStats, Asset } from '@/services/assetService';
import { buildingService, Building, Floor } from '@/services/buildingService';
import { AppSettingsService } from '@/services/appSettingsService';
import { supabase } from '@/lib/supabaseClient';
import { Package, Wrench, X, Save, Ticket, Check, ChevronsUpDown, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Camera, Upload, Plus, Trash2, FileText, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssetList from './AssetList';
import { QRCodeSVG } from 'qrcode.react';
import { Combobox } from '@/components/ui/combobox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { generateAssetLabelsPDF } from '@/utils/thermalPdfGenerator';
import AssetImageUploadService from '@/services/assetImageUploadService';
import { useAuth } from '@/contexts/AuthContext';

// Component to display room with category
function RoomDisplay({ roomId, floorId }: { roomId: string; floorId?: string }) {
  const [roomInfo, setRoomInfo] = useState<{ room_number: string; category_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoomInfo = async () => {
      if (!roomId) {
        setRoomInfo(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('rooms')
          .select(`
            room_number,
            category_id,
            form_dropdowns!rooms_category_id_fkey(name)
          `)
          .eq('id', roomId)
          .single();

        if (!error && data) {
          const categoryName = data.form_dropdowns?.name || '';
          const roomData = {
            room_number: data.room_number,
            category_name: categoryName
          };
          setRoomInfo(roomData);
        } else {
          setRoomInfo({ room_number: '', category_name: '' });
        }
      } catch (error) {
        console.error('Error fetching room info:', error);
        setRoomInfo({ room_number: '', category_name: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchRoomInfo();
  }, [roomId, floorId]);

  if (loading) {
    return <span className="text-gray-500">Loading...</span>;
  }

  if (!roomInfo || !roomInfo.room_number) {
    return <span>N/A</span>;
  }
  
  // If category is empty, show only room number/name
  if (!roomInfo.category_name) {
    return <span>{roomInfo.room_number}</span>;
  }
  
  // Show room number/name with category
  return <span>{roomInfo.room_number} | {roomInfo.category_name}</span>;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

async function compressImage(file: File, maxBytes = MAX_IMAGE_BYTES): Promise<File> {
  if (file.size <= maxBytes) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      let quality = 0.9;
      const tryCompress = () => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          if (blob.size <= maxBytes || quality <= 0.1) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            quality = Math.max(quality - 0.1, 0.1);
            tryCompress();
          }
        }, 'image/jpeg', quality);
      };
      tryCompress();
    };
    img.src = url;
  });
}

const ASSET_TYPE_MAPPING: Record<string, string[]> = {
  'IT Equipment': ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Server'],
  'Furniture': ['Chair', 'Desk', 'Cabinet'],
  'Office Equipment': ['Printer'],
  'Machinery': []
};

// Props for read‑only tenant view
interface AssetMasterProps {
  readOnly?: boolean;
  tenantId?: string;
}

export default function AssetMaster({ readOnly = false, tenantId }: AssetMasterProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [allAssetTypes, setAllAssetTypes] = useState<string[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<string[]>([]);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  const [assetCombinations, setAssetCombinations] = useState<any[]>([]);
  const [assetSubCategories, setAssetSubCategories] = useState<string[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<string[]>([]);
  const [sezStatuses, setSezStatuses] = useState<string[]>([]);
  const [customsCategories, setCustomsCategories] = useState<string[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [filterTenantSearch, setFilterTenantSearch] = useState('');
  const filterTenantSearchRef = useRef<HTMLInputElement>(null);
  const [handoverType, setHandoverType] = useState<'tenant' | 'other'>('tenant');
  const [activeTab, setActiveTab] = useState('status');
  const [generatedAssetId, setGeneratedAssetId] = useState('');
  const [assetTickets, setAssetTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [assetAudits, setAssetAudits] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assetMovements, setAssetMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [assetServices, setAssetServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState<any>({
    service_date: new Date().toISOString().split('T')[0],
    service_type: '',
    service_provider: '',
    service_description: '',
    service_cost: '',
    next_service_date: '',
    performed_by: '',
    invoice_number: '',
    warranty_extended: false,
    remarks: ''
  });

  // Initialize tenant filter when a tenantId is provided (read‑only tenant view)
  useEffect(() => {
    if (tenantId) {
      setFilterTenant(tenantId);
    }
  }, [tenantId]);
  const [assetDocuments, setAssetDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [expandedMovement, setExpandedMovement] = useState<string | null>(null);
  const [bulkGeneration, setBulkGeneration] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkAssetIds, setBulkAssetIds] = useState<string[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [assetInchargeUsers, setAssetInchargeUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sortOrder, setSortOrder] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterSubCategories, setFilterSubCategories] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterFloors, setFilterFloors] = useState<Floor[]>([]);
  const [filterRoom, setFilterRoom] = useState('');
  const [filterRooms, setFilterRooms] = useState<any[]>([]);
  const [filterCombinations, setFilterCombinations] = useState<any[]>([]);
  const [filterColor, setFilterColor] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterTenant, setFilterTenant] = useState('');
  // Clear all filter states (excluding sortOrder)
  const clearAllFilters = () => {
    setFilterCategory('');
    setFilterSubCategory('');
    setFilterType('');
    setFilterStatus('');
    setFilterBuilding('');
    setFilterFloor('');
    setFilterRoom('');
    setFilterTenant('');
    setFilterColor('');
    setFilterMaterial('');
    setFilterSize('');
    // Reset dependent option lists
    setFilterSubCategories([]);
    setFilterTypes([]);
    setFilterFloors([]);
    setFilterRooms([]);
    setFilterCombinations([]);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showCategoryCards, setShowCategoryCards] = useState(false);
  const [assetImages, setAssetImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showLabelOptions, setShowLabelOptions] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCategory, setNewRoomCategory] = useState('');
  const [roomCategories, setRoomCategories] = useState<any[]>([]);
  const [showUpdateHistory, setShowUpdateHistory] = useState(false);
  const [formData, setFormData] = useState<Partial<Asset>>({
    asset_name: '',
    asset_category: '',
    asset_status: 'Active',
    sez_status: 'DTA',
    contract: 'No',
  });

  useEffect(() => {
    loadStats();
    loadBuildings();
    loadAssetSettings();
    loadTenants();
    loadAssetInchargeUsers();
    loadAssets();
    loadRoomCategories();
    loadVendors();
  }, []);

  useEffect(() => {
    if (formData.asset_category && formData.asset_sub_category && !editingAsset) {
      setTimeout(() => generateAssetId(), 100);
    }
  }, [formData.asset_category, formData.asset_sub_category]);

  useEffect(() => {
    if (showForm && !editingAsset) {
      // Reload config when form opens
      loadAssetSettings();
    }
  }, [showForm]);

  // Sync pagination state with URL query parameter "page" when component becomes active or URL changes
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const pageNumber = pageParam ? Number(pageParam) : 1;
    if (!isNaN(pageNumber) && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
    }
    // Note: we intentionally do not update the URL here to avoid loops; AssetList handles URL updates on page changes.
  }, [searchParams, currentPage]);

  useEffect(() => {
    if (formData.contract === 'Yes') {
      loadVendors();
    }
  }, [formData.contract]);

  useEffect(() => {
    if (viewMode) return;
    if (formData.building) {
      loadFloors(formData.building);
    }
  }, [formData.building]);

  useEffect(() => {
    if (viewMode) return;
    if (formData.floor_id) {
      loadRooms(formData.floor_id);
    } else {
      setRooms([]);
      updateField('room_id', '');
    }
  }, [formData.floor_id]);

  useEffect(() => {
    if (filterBuilding && filterBuilding !== 'all') {
      loadFilterFloors(filterBuilding);
    } else {
      setFilterFloors([]);
      setFilterFloor('');
      setFilterRooms([]);
      setFilterRoom('');
    }
  }, [filterBuilding]);

  useEffect(() => {
    if (filterFloor && filterFloor !== 'all') {
      loadFilterRooms(filterFloor);
    } else {
      setFilterRooms([]);
      setFilterRoom('');
    }
  }, [filterFloor]);

  useEffect(() => {
    if (filterCategory && filterCategory !== 'all') {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === filterCategory);
      const subTypes = category?.subTypes?.map((st: any) => st.name) || [];
      setFilterSubCategories(subTypes);
    } else {
      setFilterSubCategories([]);
      setFilterSubCategory('');
      setFilterTypes([]);
      setFilterType('');
    }
  }, [filterCategory]);

  useEffect(() => {
    if (filterSubCategory && filterSubCategory !== 'all') {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === filterCategory);
      const subCategory = category?.subTypes?.find((st: any) => st.name === filterSubCategory);
      const subSubTypes = subCategory?.subTypes?.map((sst: any) => sst.name) || [];
      setFilterTypes(subSubTypes);
    } else {
      setFilterTypes([]);
      setFilterType('');
      setFilterCombinations([]);
      setFilterColor('');
      setFilterMaterial('');
      setFilterSize('');
    }
  }, [filterSubCategory]);

  useEffect(() => {
    if (filterType && filterType !== 'all') {
      loadFilterCombinations(filterType);
    } else {
      setFilterCombinations([]);
      setFilterColor('');
      setFilterMaterial('');
      setFilterSize('');
    }
  }, [filterType]);

  useEffect(() => {
    if (formData.asset_category) {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === formData.asset_category);
      const subTypes = category?.subTypes?.map((st: any) => st.name) || [];
      setAssetSubCategories(subTypes);
      if (!subTypes.includes(formData.asset_sub_category || '')) {
        updateField('asset_sub_category', '');
        updateField('asset_type', '');
      }
    }
  }, [formData.asset_category]);

  useEffect(() => {
    if (formData.asset_sub_category) {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === formData.asset_category);
      const subCategory = category?.subTypes?.find((st: any) => st.name === formData.asset_sub_category);
      const subSubTypes = subCategory?.subTypes?.map((sst: any) => sst.name) || [];
      setAssetTypes(subSubTypes);
      
      // If current asset_type is not in the new list, clear it and combination
      if (!subSubTypes.includes(formData.asset_type || '')) {
        updateField('asset_type', '');
        setAssetCombinations([]);
        updateField('asset_combination', '');
      }
      
      // If no sub-sub types available, clear asset_type and combination
      if (subSubTypes.length === 0) {
        updateField('asset_type', '');
        setAssetCombinations([]);
        updateField('asset_combination', '');
      }
    }
  }, [formData.asset_sub_category]);

  useEffect(() => {
    if (formData.asset_type) {
      loadAssetCombinations(formData.asset_type);
    } else {
      setAssetCombinations([]);
      updateField('asset_combination', '');
    }
  }, [formData.asset_type]);

  // Clear combination if it's not in the available combinations list
  useEffect(() => {
    if (formData.asset_combination && assetCombinations.length > 0) {
      const isValid = assetCombinations.some(combo => combo.value === formData.asset_combination);
      if (!isValid) {
        updateField('asset_combination', '');
      }
    } else if (formData.asset_combination && assetCombinations.length === 0) {
      updateField('asset_combination', '');
    }
  }, [assetCombinations]);

  useEffect(() => {
    if (bulkGeneration && formData.asset_category && formData.asset_sub_category && bulkQuantity && parseInt(bulkQuantity) > 0) {
      generateBulkAssetIds();
    } else {
      setBulkAssetIds([]);
      setDuplicateIds([]);
    }
  }, [bulkGeneration, bulkQuantity, formData.asset_category, formData.asset_sub_category]);

  const generateBulkAssetIds = async () => {
    try {
      const { data: configs, error: configError } = await supabase
        .from('id_configs')
        .select('*')
        .eq('entity_type', 'asset')
        .eq('is_active', true);

      if (configError) {
        toast({ 
          title: 'Configuration Error', 
          description: 'Failed to load asset ID configuration', 
          variant: 'destructive' 
        });
        return;
      }
      
      if (!configs || configs.length === 0) {
        toast({ 
          title: 'Configuration Error', 
          description: 'No active asset ID configuration found', 
          variant: 'destructive' 
        });
        return;
      }
      
      if (configs.length > 1) {
        toast({ 
          title: 'Configuration Error', 
          description: `Multiple active asset ID configurations found (${configs.length}). Please deactivate all but one.`, 
          variant: 'destructive' 
        });
        return;
      }
      
      const config = configs[0];

      const configData = (window as any).assetDropdownConfig || [];
      
      const category = configData.find((c: any) => c.name === formData.asset_category);
      
      const subCategory = category?.subTypes?.find((st: any) => st.name === formData.asset_sub_category);

      const { data: existingAssets } = await supabase
        .from('assets')
        .select('asset_id')
        .eq('asset_category', formData.asset_category)
        .eq('asset_sub_category', formData.asset_sub_category);

      let maxSeq = 0;
      const existingIds = new Set<string>();
      
      if (existingAssets) {
        existingAssets.forEach(asset => {
          if (asset.asset_id) {
            existingIds.add(asset.asset_id);
            const parts = asset.asset_id.split(config.separator);
            const seqStr = parts[parts.length - 1];
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        });
      }

      const newIds: string[] = [];
      const duplicates: string[] = [];
      const sep = config.separator;

      for (let i = 0; i < parseInt(bulkQuantity); i++) {
        const nextNum = maxSeq + i + 1;
        const num = nextNum.toString().padStart(config.digits, '0');
        
        let assetId = '';
        switch (config.structure) {
          case 'cat-type-seq':
            assetId = `${category?.code || 'CAT'}${sep}${subCategory?.code || 'SUB'}${sep}${num}`;
            break;
          case 'cat-year-seq':
            assetId = `${category?.code || 'CAT'}${sep}${new Date().getFullYear()}${sep}${num}`;
            break;
          case 'type-seq':
            assetId = `${subCategory?.code || 'SUB'}${sep}${num}`;
            break;
          case 'cat-seq':
            assetId = `${category?.code || 'CAT'}${sep}${num}`;
            break;
          case 'year-seq':
            assetId = `${new Date().getFullYear()}${sep}${num}`;
            break;
          case 'seq-only':
            assetId = num;
            break;
          default:
            assetId = `${category?.code || 'CAT'}${sep}${subCategory?.code || 'SUB'}${sep}${num}`;
        }

        newIds.push(assetId);
        if (existingIds.has(assetId)) {
          duplicates.push(assetId);
        }
      }
      
      setBulkAssetIds(newIds);
      setDuplicateIds(duplicates);
    } catch (error) {
      console.error('Failed to generate bulk asset IDs:', error);
    }
  };



  const loadStats = async () => {
    try {
      // Load stats with optimized query - only counts, not full data
      let totalQuery = supabase.from('assets').select('*', { count: 'exact', head: true });
      if (readOnly && tenantId) {
        totalQuery = totalQuery.eq('handover_to', tenantId);
      }
      const { count: totalCount } = await totalQuery;
      
      let activeQuery = supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_status', 'Active');
      if (readOnly && tenantId) {
        activeQuery = activeQuery.eq('handover_to', tenantId);
      }
      const { count: activeCount } = await activeQuery;
      
      let idleQuery = supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_status', 'Idle');
      if (readOnly && tenantId) {
        idleQuery = idleQuery.eq('handover_to', tenantId);
      }
      const { count: idleCount } = await idleQuery;
      
      let repairQuery = supabase.from('assets').select('*', { count: 'exact', head: true }).eq('asset_status', 'Repair');
      if (readOnly && tenantId) {
        repairQuery = repairQuery.eq('handover_to', tenantId);
      }
      const { count: repairCount } = await repairQuery;
      
      let scrapQuery = supabase.from('assets').select('*', { count: 'exact', head: true }).or('asset_status.eq.Scrap,asset_status.eq.Disposed');
      if (readOnly && tenantId) {
        scrapQuery = scrapQuery.eq('handover_to', tenantId);
      }
      const { count: scrapCount } = await scrapQuery;
      
      // Set stats with actual counts
      setStats({
        totalAssets: totalCount || 0,
        bondedAssets: 0,
        assetValueGross: 0,
        assetValueNet: 0,
        dutyForegoneAmount: 0,
        pendingApprovals: 0,
        underMaintenance: repairCount || 0,
        movementToday: 0,
        auditDue: 0,
        warrantyExpiring: 0,
        complianceStatus: 'OK',
        activeCount: activeCount || 0,
        idleCount: idleCount || 0,
        repairCount: repairCount || 0,
        scrapCount: scrapCount || 0
      } as any);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    const data = await buildingService.getAllBuildings();
    setBuildings(data);
  };

  const loadFloors = async (buildingId: string) => {
    const data = await buildingService.getFloorsByBuilding(buildingId);
    setFloors(data);
    // Clear rooms when building changes
    setRooms([]);
    updateField('room_id', '');
  };

  const loadRooms = async (floorId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          room_number,
          form_dropdowns!rooms_category_id_fkey(name)
        `)
        .eq('floor_id', floorId)
        .order('room_number');
      
      if (!error && data) {
        const roomsWithCategory = data.map(room => ({
          ...room,
          category_name: room.form_dropdowns?.name || 'Uncategorized',
          display_name: `${room.room_number} | ${room.form_dropdowns?.name || 'Uncategorized'}`
        }));
        setRooms(roomsWithCategory);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
      setRooms([]);
    }
  };

  const loadRoomCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('form_dropdowns')
        .select('id, name')
        .eq('form_type', 'room_categories')
        .order('name');
      
      if (!error && data) {
        setRoomCategories(data);
      }
    } catch (error) {
      console.error('Failed to load room categories:', error);
    }
  };

  const handleAddSingleRoom = async () => {
    if (!formData.building || !formData.floor_id) {
      toast({ title: 'Error', description: 'Please select building and floor first', variant: 'destructive' });
      return;
    }

    if (!newRoomNumber.trim()) {
      toast({ title: 'Error', description: 'Room number is required', variant: 'destructive' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          building_id: formData.building,
          floor_id: formData.floor_id,
          room_number: newRoomNumber.trim(),
          category_id: newRoomCategory || null
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: `Room "${newRoomNumber}" added successfully` });
      
      await loadRooms(formData.floor_id);
      updateField('room_id', data.id);
      
      setShowAddRoomForm(false);
      setNewRoomNumber('');
      setNewRoomCategory('');
    } catch (error: any) {
      console.error('Failed to add room:', error);
      toast({ title: 'Error', description: error.message || 'Failed to add room', variant: 'destructive' });
    }
  };

  const loadFilterFloors = async (buildingId: string) => {
    const data = await buildingService.getFloorsByBuilding(buildingId);
    setFilterFloors(data);
  };

  const loadFilterRooms = async (floorId: string) => {
    const { data, error } = await supabase.from('rooms').select('id, room_number').eq('floor_id', floorId).order('room_number');
    if (!error && data) setFilterRooms(data);
    else setFilterRooms([]);
  };

  const loadAssetSettings = async () => {
    try {
      const { data: cats, error: catsError } = await supabase
        .from('form_dropdowns')
        .select('*')
        .eq('form_type', 'asset')
        .order('name');

      if (catsError) throw catsError;

      const { data: subs, error: subsError } = await supabase
        .from('form_subcategories')
        .select('*')
        .eq('form_type', 'asset');

      if (subsError) throw subsError;

      const { data: subSubs, error: subSubsError } = await supabase
        .from('form_sub_subcategories')
        .select('*')
        .eq('form_type', 'asset');

      if (subSubsError) throw subSubsError;

      const { data: mfrs, error: mfrsError } = await supabase
        .from('form_options')
        .select('*')
        .eq('form_type', 'asset')
        .eq('option_type', 'manufacturer');

      if (mfrsError) throw mfrsError;

      const { data: assetStatusData } = await supabase
        .from('form_dropdowns')
        .select('name')
        .eq('form_type', 'asset_status')
        .order('name');

      const { data: sezStatusData } = await supabase
        .from('form_dropdowns')
        .select('name')
        .eq('form_type', 'sez_status')
        .order('name');

      const { data: customsCategoryData } = await supabase
        .from('form_dropdowns')
        .select('name')
        .eq('form_type', 'customs_category')
        .order('name');

      const configData = cats?.map(cat => ({
        name: cat.name,
        code: cat.short_code,
        subTypes: subs?.filter(s => s.category_id === cat.id).map(s => ({
          name: s.name,
          code: s.short_code,
          subTypes: subSubs?.filter(ss => ss.subcategory_id === s.id).map(ss => ({
            name: ss.name,
            code: ss.short_code
          })) || []
        })) || [],
        manufacturers: mfrs?.filter(m => m.category_id === cat.id).map(m => m.name) || []
      })) || [];

      const categories = configData.map((cat: any) => cat.name);
      const types = configData.flatMap((cat: any) => 
        (cat.subTypes || []).map((st: any) => st.name)
      );
      const allMfrs = mfrs?.map(m => m.name) || [];
      setAssetCategories(categories);
      setAllAssetTypes(types);
      setAllManufacturers(allMfrs);
      setAssetStatuses(assetStatusData?.map(s => s.name) || []);
      setAssetStatuses(assetStatusData?.map(s => s.name) || []);
      setSezStatuses(sezStatusData?.map(s => s.name) || []);
      setCustomsCategories(customsCategoryData?.map(s => s.name) || []);
      
      (window as any).assetDropdownConfig = configData;
    } catch (error) {
      console.error('Failed to load asset settings:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name, email, status')
        .eq('status', 'active');
      
      if (error) return;
      
      if (data) {
        setVendors(data);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, company, email, phone_numbers');
      
      if (error) return;
      if (data) setTenants(data);
    } catch (error) {
      console.error('Failed to load tenants:', error);
    }
  };

  const loadAssetCombinations = async (assetType: string) => {
    try {
      // First get the sub_subcategory_id for the asset type
      const { data: subSubCategory } = await supabase
        .from('form_sub_subcategories')
        .select('id')
        .eq('name', assetType)
        .eq('form_type', 'asset')
        .single();
      
      if (!subSubCategory) {
        setAssetCombinations([]);
        updateField('asset_combination', '');
        return;
      }
      
      // Get all combinations for this sub-subcategory
      const { data: combinations } = await supabase
        .from('sub_subcategory_combinations')
        .select('*')
        .eq('sub_subcategory_id', subSubCategory.id)
        .eq('is_active', true);
      
      if (combinations && combinations.length > 0) {
        // Format combinations for display
        const formattedCombinations = combinations.map(combo => ({
          id: combo.id,
          label: `${combo.color || 'N/A'} | ${combo.material || 'N/A'} | ${combo.size || 'N/A'}`,
          value: combo.id,
          color: combo.color,
          material: combo.material,
          size: combo.size
        }));
        setAssetCombinations(formattedCombinations);
      } else {
        setAssetCombinations([]);
        updateField('asset_combination', '');
      }
    } catch (error) {
      console.error('Failed to load asset combinations:', error);
      setAssetCombinations([]);
      updateField('asset_combination', '');
    }
  };

  const loadFilterCombinations = async (assetType: string) => {
    try {
      const { data: subSubCategory } = await supabase
        .from('form_sub_subcategories')
        .select('id')
        .eq('name', assetType)
        .eq('form_type', 'asset')
        .single();
      
      if (!subSubCategory) {
        setFilterCombinations([]);
        return;
      }
      
      const { data: combinations } = await supabase
        .from('sub_subcategory_combinations')
        .select('*')
        .eq('sub_subcategory_id', subSubCategory.id)
        .eq('is_active', true);
      
      if (combinations) {
        setFilterCombinations(combinations);
      } else {
        setFilterCombinations([]);
      }
    } catch (error) {
      console.error('Failed to load filter combinations:', error);
      setFilterCombinations([]);
    }
  };

  const loadAssetInchargeUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('asset_incharge', true)
        .eq('is_active', true);
      
      if (error) return;
      if (data) setAssetInchargeUsers(data);
    } catch (error) {
      console.error('Failed to load asset incharge users:', error);
    }
  };

  const loadAssets = async () => {
    // Don't load all assets upfront - only load when needed for filtering
    // This prevents loading 20,000+ assets on initial page load
    setAssets([]);
  };

  const generateAssetId = async (): Promise<string> => {
    try {
      const configData = (window as any).assetDropdownConfig || [];
      if (configData.length === 0) {
        setGeneratedAssetId('AUTO-GENERATED');
        return 'AUTO-GENERATED';
      }

      const { data: config, error } = await supabase
        .from('id_configs')
        .select('*')
        .eq('entity_type', 'asset')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !config) {
        setGeneratedAssetId('AUTO-GENERATED');
        return 'AUTO-GENERATED';
      }

      const category = configData.find((c: any) => c.name === formData.asset_category);
      const subCategory = category?.subTypes?.find((st: any) => st.name === formData.asset_sub_category);
      const subType = subCategory?.subTypes?.find((sst: any) => sst.name === formData.asset_type);

      const { data: existingAssets } = await supabase
        .from('assets')
        .select('asset_id')
        .eq('asset_category', formData.asset_category)
        .eq('asset_sub_category', formData.asset_sub_category);

      // Extract sequence numbers from existing asset IDs
      let maxSeq = 0;
      if (existingAssets && existingAssets.length > 0) {
        existingAssets.forEach(asset => {
          if (asset.asset_id) {
            const parts = asset.asset_id.split(config.separator);
            const seqStr = parts[parts.length - 1];
            const seq = parseInt(seqStr, 10);
            if (!isNaN(seq) && seq > maxSeq) {
              maxSeq = seq;
            }
          }
        });
      }

      const nextNum = maxSeq + 1;
      const num = nextNum.toString().padStart(config.digits, '0');
      const sep = config.separator;
      const year = new Date().getFullYear();

      let assetId = '';
      switch (config.structure) {
        case 'cat-type-seq':
          assetId = `${category?.code || 'CAT'}${sep}${subCategory?.code || 'SUB'}${sep}${num}`;
          break;
        case 'cat-year-seq':
          assetId = `${category?.code || 'CAT'}${sep}${year}${sep}${num}`;
          break;
        case 'type-seq':
          assetId = `${subCategory?.code || 'SUB'}${sep}${num}`;
          break;
        case 'cat-seq':
          assetId = `${category?.code || 'CAT'}${sep}${num}`;
          break;
        case 'year-seq':
          assetId = `${year}${sep}${num}`;
          break;
        case 'seq-only':
          assetId = num;
          break;
        default:
          assetId = `${category?.code || 'CAT'}${sep}${subCategory?.code || 'SUB'}${sep}${num}`;
      }

      setGeneratedAssetId(assetId);
      updateField('asset_id', assetId);
      return assetId;
    } catch (error) {
      console.error('Failed to generate asset ID:', error);
      setGeneratedAssetId('AUTO-GENERATED');
      return 'AUTO-GENERATED';
    }
  };

  const handleCreateNew = () => {
    setFormData({
      asset_name: '',
      asset_category: '',
      asset_status: 'Active',
      sez_status: 'DTA',
    });
    setEditingAsset(null);
    setViewMode(false);
    setGeneratedAssetId('');
    setBulkGeneration(false);
    setBulkQuantity('');
    setAssetImages([]);
    setCurrentImageIndex(0);
    setShowForm(true);
  };

  const handleEdit = (asset: Asset) => {
    setFormData(asset);
    setEditingAsset(asset);
    setViewMode(false);
    setAssetImages(asset.asset_pictures ? JSON.parse(asset.asset_pictures) : []);
    setCurrentImageIndex(0);
    setShowForm(true);
  };

  const handleView = async (asset: Asset) => {
    
    // Load floors and rooms for view mode BEFORE setting form data
    try {
      if (asset.building) {
        const floorsData = await buildingService.getFloorsByBuilding(asset.building);
        setFloors(floorsData);
      }
      
      if (asset.floor_id) {
        const { data, error } = await supabase
          .from('rooms')
          .select(`
            id,
            room_number,
            form_dropdowns!rooms_category_id_fkey(name)
          `)
          .eq('floor_id', asset.floor_id)
          .order('room_number');
        
        if (!error && data) {
          const roomsWithCategory = data.map(room => ({
            ...room,
            category_name: room.form_dropdowns?.name || 'Uncategorized',
            display_name: `${room.room_number} | ${room.form_dropdowns?.name || 'Uncategorized'}`
          }));
          setRooms(roomsWithCategory);
        }
      }
    } catch (error) {
      console.error('Error loading location data for view:', error);
    }
    
    // Set form data and other states AFTER loading location data
    setFormData(asset);
    setEditingAsset(asset);
    setViewMode(true);
    setAssetImages(asset.asset_pictures ? JSON.parse(asset.asset_pictures) : []);
    
    // Load documents from asset_documents column if available
    if (asset.asset_documents) {
      try {
        const docs = JSON.parse(asset.asset_documents);
        setAssetDocuments(docs);
      } catch (e) {
        console.error('Failed to parse asset_documents:', e);
        setAssetDocuments([]);
      }
    } else {
      setAssetDocuments([]);
    }
    
    setCurrentImageIndex(0);
    
    // Show form after everything is loaded
    setShowForm(true);
    
    loadAssetTickets(asset.id);
    loadAssetAudits(asset.asset_id);
    loadAssetHistory(asset.id);
    loadAssetMovements(asset.asset_id);
    loadAssetServices(asset.asset_id);
    loadAssetDocuments(asset.id);
  };

  const loadAssetServices = async (assetId: string) => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase
        .from('asset_service_records')
        .select('*')
        .eq('asset_id', assetId)
        .order('service_date', { ascending: false });
      
      if (!error && data) {
        setAssetServices(data);
      }
    } catch (error) {
      console.error('Failed to load asset services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleAddService = async () => {
    if (!editingAsset?.asset_id) return;
    
    try {
      const savedUser = localStorage.getItem('demo_user');
      const userName = savedUser ? JSON.parse(savedUser)?.name : 'Unknown';
      
      const { error } = await supabase
        .from('asset_service_records')
        .insert({
          asset_id: editingAsset.asset_id,
          service_date: serviceFormData.service_date,
          service_type: serviceFormData.service_type || null,
          service_provider: serviceFormData.service_provider || null,
          service_description: serviceFormData.service_description || null,
          service_cost: serviceFormData.service_cost ? parseFloat(serviceFormData.service_cost) : null,
          next_service_date: serviceFormData.next_service_date || null,
          performed_by: serviceFormData.performed_by || null,
          invoice_number: serviceFormData.invoice_number || null,
          warranty_extended: serviceFormData.warranty_extended,
          remarks: serviceFormData.remarks || null,
          created_by: userName,
          updated_by: userName
        });
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Service record added successfully' });
      setShowAddServiceForm(false);
      setServiceFormData({
        service_date: new Date().toISOString().split('T')[0],
        service_type: '',
        service_provider: '',
        service_description: '',
        service_cost: '',
        next_service_date: '',
        performed_by: '',
        invoice_number: '',
        warranty_extended: false,
        remarks: ''
      });
      loadAssetServices(editingAsset.asset_id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add service record', variant: 'destructive' });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Delete this service record?')) return;
    
    try {
      const { error } = await supabase
        .from('asset_service_records')
        .delete()
        .eq('id', serviceId);
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Service record deleted successfully' });
      if (editingAsset?.asset_id) {
        loadAssetServices(editingAsset.asset_id);
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete service record', variant: 'destructive' });
    }
  };

  // Document handling functions
  const loadAssetDocuments = async (assetId: string) => {
    setLoadingDocuments(true);
    try {
      // Load documents from the asset's asset_documents column
      if (editingAsset?.asset_documents) {
        try {
          const docs = JSON.parse(editingAsset.asset_documents);
          setAssetDocuments(docs);
        } catch (e) {
          console.error('Failed to parse asset_documents:', e);
          setAssetDocuments([]);
        }
      } else {
        setAssetDocuments([]);
      }
    } catch (error) {
      console.error('Failed to load asset documents:', error);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingAsset?.asset_id || !e.target.files || e.target.files.length === 0) return;
    
    try {
      const files = Array.from(e.target.files);
      
      // Validate file size (50MB limit)
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          toast({ 
            title: 'File Too Large', 
            description: `${file.name} exceeds the 50MB limit`, 
            variant: 'destructive' 
          });
          return;
        }
      }
      
      // Get existing documents from asset
      let existingDocs = [];
      if (formData.asset_documents) {
        try {
          existingDocs = JSON.parse(formData.asset_documents);
        } catch (e) {
          console.error('Failed to parse existing documents:', e);
          existingDocs = [];
        }
      }
      
      const category = formData.asset_category?.replace(/\s+/g, '_') || 'Uncategorized';
      const subCategory = formData.asset_sub_category?.replace(/\s+/g, '_').replace(/\//g, '_') || 'Uncategorized';
      const assetId = editingAsset.asset_id.replace(/\//g, '_');
      
      // Upload each file to Supabase Storage
      const newDocuments = [];
      
      for (const file of files) {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const folderPath = `${category}/${subCategory}/${assetId}/`;
        const storagePath = `${folderPath}${safeFileName}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('asset_documents')
          .upload(storagePath, file);
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({ 
            title: 'Upload Failed', 
            description: `Failed to upload ${file.name}: ${uploadError.message}`, 
            variant: 'destructive' 
          });
          return;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('asset_documents')
          .getPublicUrl(storagePath);
        
        newDocuments.push({
          id: timestamp.toString(),
          file_name: file.name,
          file_path: storagePath,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.appUser?.name || 'Unknown'
        });
      }
      
      // Combine existing and new documents
      const updatedDocs = [...existingDocs, ...newDocuments];
      
      // Update form data with combined documents as JSON string
      updateField('asset_documents', JSON.stringify(updatedDocs));
      
      // Also update local assetDocuments state so it shows immediately
      setAssetDocuments(updatedDocs);
      
      toast({ title: 'Success', description: `${files.length} document(s) uploaded successfully` });
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to upload documents', 
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      // Find the document to get file path
      const docToDelete = assetDocuments.find(d => d.id === documentId);
      
      if (docToDelete?.file_path) {
        // Delete from Supabase Storage
        const { error: storageError } = await supabase.storage
          .from('asset_documents')
          .remove([docToDelete.file_path]);
        
        if (storageError) {
          console.error('Storage deletion error:', storageError);
          toast({ 
            title: 'Deletion Warning', 
            description: 'Document record deleted but file may still exist in storage', 
            variant: 'destructive' 
          });
        }
      }
      
      // Remove from asset_documents array and update form
      const updatedDocs = assetDocuments.filter(d => d.id !== documentId);
      
      console.log('Before delete:', assetDocuments);
      console.log('After delete (filtered):', updatedDocs);
      console.log('Updated docs JSON:', JSON.stringify(updatedDocs));
      
      // Update local state immediately for UI feedback
      setAssetDocuments(updatedDocs);
      
      if (editingAsset?.id) {
        console.log('Updating database with documents:', JSON.stringify(updatedDocs));
        
        // If no more documents, set to null instead of empty array
        const docsToUpdate = updatedDocs.length > 0 ? JSON.stringify(updatedDocs) : null;
        console.log('Docs to update in DB:', docsToUpdate);
        
        try {
          // Use direct Supabase update to ensure it works
          const { data: userData } = await supabase
            .from('assets')
            .select('updated_by')
            .eq('id', editingAsset.id)
            .single();
          
          const savedUser = localStorage.getItem('demo_user');
          const userName = savedUser ? JSON.parse(savedUser).appUser?.name : 'Unknown';
          
          const { error: updateError } = await supabase
            .from('assets')
            .update({ 
              asset_documents: docsToUpdate,
              updated_by: userName
            })
            .eq('id', editingAsset.id);
          
          if (updateError) {
            console.error('Update error:', updateError);
            toast({ 
              title: 'Warning', 
              description: `Document deleted but failed to update database: ${updateError.message}`, 
              variant: 'destructive' 
            });
          } else {
            console.log('Database updated successfully');
            
            // Reload asset data from DB to ensure we have the latest state
            const { data: refreshedAsset } = await supabase
              .from('assets')
              .select('*')
              .eq('id', editingAsset.id)
              .single();
            
            if (refreshedAsset) {
              setFormData(refreshedAsset);
              console.log('Form data reloaded from database');
            }
          }
        } catch (error) {
          console.error('Failed to update database:', error);
          toast({ 
            title: 'Warning', 
            description: 'Document deleted but failed to update database', 
            variant: 'destructive' 
          });
        }
      } else {
        updateField('asset_documents', JSON.stringify(updatedDocs));
      }
      
      toast({ title: 'Success', description: 'Document deleted successfully' });
    } catch (error: any) {
      console.error('Delete document error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete document', 
        variant: 'destructive' 
      });
    }
  };

  const handleDownloadDocument = async (fileUrl: string, fileName: string) => {
    try {
      // Fetch the file from Supabase Storage
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to download document', 
        variant: 'destructive' 
      });
    }
  };

  const getDocumentIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-8 w-8 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="h-8 w-8 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return <Image className="h-8 w-8 text-purple-500" />;
      case 'txt':
        return <FileText className="h-8 w-8 text-gray-500" />;
      default:
        return <FileText className="h-8 w-8 text-orange-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadAssetAudits = async (assetId: string) => {
    setLoadingAudits(true);
    try {
      const { data, error } = await supabase
        .from('physical_audits')
        .select('*')
        .eq('asset_id', assetId)
        .order('audit_date', { ascending: false });
      
      if (!error && data) {
        setAssetAudits(data);
      }
    } catch (error) {
      console.error('Failed to load asset audits:', error);
    } finally {
      setLoadingAudits(false);
    }
  };

  const loadAssetHistory = async (assetId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('asset_history')
        .select('*')
        .eq('asset_id', assetId)
        .order('changed_at', { ascending: false });
      
      if (!error && data) {
        const enriched = await Promise.all(data.map(async (h) => {
          let oldValueName = h.old_value || 'N/A';
          let newValueName = h.new_value || 'N/A';
          
          if (h.field_name === 'building') {
            if (h.old_value && h.old_value !== 'null') {
              const { data: oldBuilding } = await supabase.from('buildings').select('name').eq('id', h.old_value).single();
              oldValueName = oldBuilding?.name || h.old_value;
            }
            if (h.new_value && h.new_value !== 'null') {
              const { data: newBuilding } = await supabase.from('buildings').select('name').eq('id', h.new_value).single();
              newValueName = newBuilding?.name || h.new_value;
            }
          } else if (h.field_name === 'floor') {
            if (h.old_value && h.old_value !== 'null') {
              const { data: oldFloor } = await supabase.from('floors').select('floor_name, floor_number').eq('id', h.old_value).single();
              oldValueName = oldFloor?.floor_name || `Floor ${oldFloor?.floor_number}` || h.old_value;
            }
            if (h.new_value && h.new_value !== 'null') {
              const { data: newFloor } = await supabase.from('floors').select('floor_name, floor_number').eq('id', h.new_value).single();
              newValueName = newFloor?.floor_name || `Floor ${newFloor?.floor_number}` || h.new_value;
            }
          }
          
          let requestNumber = null;
          if (h.movement_request_id) {
            const { data: movement } = await supabase
              .from('asset_movements')
              .select('request_number')
              .eq('id', h.movement_request_id)
              .single();
            requestNumber = movement?.request_number;
          }
          
          return { ...h, old_value_name: oldValueName, new_value_name: newValueName, request_number: requestNumber };
        }));
        setAssetHistory(enriched);
      }
    } catch (error) {
      console.error('Failed to load asset history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadAssetMovements = async (assetId: string) => {
    setLoadingMovements(true);
    try {
      // First get the asset UUID from the asset_id string
      const { data: assetData } = await supabase
        .from('assets')
        .select('id')
        .eq('asset_id', assetId)
        .single();
      
      if (!assetData) {
        setAssetMovements([]);
        return;
      }
      
      // Use the UUID to search in asset_movements
      const { data, error } = await supabase
        .from('asset_movements')
        .select('*')
        .filter('assets', 'cs', JSON.stringify([assetData.id]))
        .order('movement_date', { ascending: false });
      
      if (!error && data) {
        const enriched = await Promise.all(data.map(async (m) => {
          let fromBuildingName = m.from_building;
          let toBuildingName = m.to_building;
          let fromFloorName = m.from_floor;
          let toFloorName = m.to_floor;
          
          if (m.from_building) {
            const { data: building } = await supabase.from('buildings').select('name').eq('id', m.from_building).single();
            fromBuildingName = building?.name || m.from_building;
          }
          if (m.to_building) {
            const { data: building } = await supabase.from('buildings').select('name').eq('id', m.to_building).single();
            toBuildingName = building?.name || m.to_building;
          }
          if (m.from_floor) {
            const { data: floor } = await supabase.from('floors').select('floor_name, floor_number').eq('id', m.from_floor).single();
            fromFloorName = floor?.floor_name || `Floor ${floor?.floor_number}` || m.from_floor;
          }
          if (m.to_floor) {
            const { data: floor } = await supabase.from('floors').select('floor_name, floor_number').eq('id', m.to_floor).single();
            toFloorName = floor?.floor_name || `Floor ${floor?.floor_number}` || m.to_floor;
          }
          
          return { ...m, from_building_name: fromBuildingName, to_building_name: toBuildingName, from_floor_name: fromFloorName, to_floor_name: toFloorName };
        }));
        setAssetMovements(enriched);
      }
    } catch (error) {
      console.error('Failed to load asset movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadAssetTickets = async (assetId: string) => {
    setLoadingTickets(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('id, ticket_number, title, category, priority, status, created_at')
        .eq('asset_id', assetId)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setAssetTickets(data);
      }
    } catch (error) {
      console.error('Failed to load asset tickets:', error);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validation for required fields
      if (!formData.asset_name?.trim()) {
        toast({ title: 'Validation Error', description: 'Asset Name is required', variant: 'destructive' });
        return;
      }
      if (!formData.asset_category?.trim()) {
        toast({ title: 'Validation Error', description: 'Asset Type is required', variant: 'destructive' });
        return;
      }
      if (!formData.asset_sub_category?.trim()) {
        toast({ title: 'Validation Error', description: 'Category is required', variant: 'destructive' });
        return;
      }
      if (!formData.asset_type?.trim()) {
        toast({ title: 'Validation Error', description: 'Sub Category is required', variant: 'destructive' });
        return;
      }
      
      const cleanData = { ...formData };
      
      if (!cleanData.customs_category) {
        delete cleanData.customs_category;
      }
      // Set asset_combination to null if empty, don't delete it
      if (!cleanData.asset_combination) {
        cleanData.asset_combination = null;
      }
      
      // Save images as JSON array
      if (assetImages.length > 0) {
        cleanData.asset_pictures = JSON.stringify(assetImages);
      } else {
        cleanData.asset_pictures = null;
      }
      
      // Save documents as JSON array of paths
      if (assetDocuments.length > 0) {
        const docPaths = assetDocuments.map(d => ({
          id: d.id,
          file_name: d.file_name,
          file_path: d.file_path,
          file_url: d.file_url,
          file_size: d.file_size,
          file_type: d.file_type,
          uploaded_by: d.uploaded_by,
          created_at: d.created_at
        }));
        cleanData.asset_documents = JSON.stringify(docPaths);
      } else if (formData.asset_documents) {
        // If assetDocuments is empty but formData has documents, preserve them
        cleanData.asset_documents = formData.asset_documents;
      } else {
        cleanData.asset_documents = null;
      }
      
      // Handle handover_to field - set to null if handoverType is 'other'
      if (handoverType === 'other') {
        cleanData.handover_to = null;
      } else if (!cleanData.handover_to) {
        delete cleanData.handover_to;
      }
      
      if (editingAsset) {
        await AssetService.updateAsset(editingAsset.id, cleanData);
        toast({ title: 'Success', description: 'Asset updated successfully' });
      } else {
        if (bulkGeneration && bulkQuantity && parseInt(bulkQuantity) > 1) {
          // Bulk creation with pre-generated IDs
          if (bulkAssetIds.length === 0) {
            toast({ title: 'Error', description: 'No asset IDs generated. Please try again.', variant: 'destructive' });
            return;
          }
          
          const promises = bulkAssetIds.map((assetId) => {
            const assetData = { ...cleanData, asset_id: assetId };
            return AssetService.createAsset(assetData);
          });
          
          const results = await Promise.allSettled(promises);
          const successful = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          
          if (failed > 0) {
            toast({ 
              title: 'Partial Success', 
              description: `${successful} assets created, ${failed} failed.`, 
              variant: 'destructive' 
            });
          } else {
            toast({ title: 'Success', description: `${successful} assets created successfully` });
          }
        } else {
          // Single creation
          // Prefer explicit asset_id in formData, else try to generate one now
          let finalAssetId = formData.asset_id && String(formData.asset_id).trim() ? String(formData.asset_id).trim() : '';
          if (!finalAssetId) {
            finalAssetId = await generateAssetId();
          }

          if (!finalAssetId || finalAssetId === 'AUTO-GENERATED') {
            toast({ title: 'Error', description: 'Failed to generate asset ID. Please enter Asset ID manually or check configuration.', variant: 'destructive' });
            return;
          }

          cleanData.asset_id = finalAssetId;
          // Fix temp image paths if images were uploaded before asset ID was generated
          if (assetImages.some(url => url.includes('/asset_pictures/temp/'))) {
            const fixedImages = await Promise.all(assetImages.map(async (url) => {
              if (!url.includes('/asset_pictures/temp/')) return url;
              const filename = url.split('/').pop();
              const fd = new FormData();
              const res = await fetch(url);
              const blob = await res.blob();
              fd.append('file', new File([blob], filename!, { type: blob.type }));
              const uploadRes = await fetch(`/api/upload?category=asset_pictures&assetId=${encodeURIComponent(finalAssetId)}`, { method: 'POST', body: fd });
              const result = await uploadRes.json();
              return result.success ? result.file.url : url;
            }));
            cleanData.asset_pictures = JSON.stringify(fixedImages);
          }
          await AssetService.createAsset(cleanData);
          toast({ title: 'Success', description: 'Asset created successfully' });
        }
      }
      setShowForm(false);
      loadStats();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to save asset', variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateThermalLabels = async () => {
    try {
      if (selectedAssets.size === 0) {
        toast({ title: 'No Assets Selected', description: 'Please select assets to generate labels for', variant: 'destructive' });
        return;
      }

      toast({ title: 'Generating Labels', description: 'Please wait while we prepare your thermal labels...' });
      
      // Get selected asset data
      const selectedAssetData = assets.filter(asset => selectedAssets.has(asset.id));
      
      // Convert to AssetForPrint format
      const assetsForPrint = selectedAssetData.map(asset => ({
        asset_id: asset.asset_id,
        name: asset.asset_name || asset.asset_description || 'Asset'
      }));
      
      // Generate QR codes for selected assets
      const qrCodes: Record<string, string> = {};
      for (const asset of selectedAssetData) {
        // Try to get existing QR code from DOM or generate placeholder
        const existingQRElement = document.querySelector(`[data-asset-id="${asset.asset_id}"] canvas`);
        if (existingQRElement && existingQRElement instanceof HTMLCanvasElement) {
          qrCodes[asset.asset_id] = existingQRElement.toDataURL();
        }
      }
      
      // Generate thermal PDF
      await generateAssetLabelsPDF(
        assetsForPrint,
        qrCodes,
        `Asset_Labels_${new Date().toISOString().split('T')[0]}.pdf`
      );
      
      toast({ 
        title: 'Success', 
        description: `Thermal labels generated for ${selectedAssets.size} asset(s)` 
      });
      
      // Clear selection
      setSelectedAssets(new Set());
      setShowLabelOptions(false);
      
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to generate thermal labels', 
        variant: 'destructive' 
      });
    }
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const handleSelectAllAssets = (pageAssetIds: string[]) => {
    const allPageSelected = pageAssetIds.every(id => selectedAssets.has(id));
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageAssetIds.forEach(id => next.delete(id));
      } else {
        pageAssetIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
  };

  // Calculate filtered assets for count display
  const filteredAssets = assets.filter(a => {
    const matchesCategory = !filterCategory || filterCategory === 'all' || a.asset_category === filterCategory;
    const matchesSubCategory = !filterSubCategory || filterSubCategory === 'all' || a.asset_sub_category === filterSubCategory;
    const matchesType = !filterType || filterType === 'all' || a.asset_type === filterType;
    const matchesStatus = !filterStatus || filterStatus === 'all' || a.asset_status === filterStatus;
    const matchesBuilding = !filterBuilding || filterBuilding === 'all' || a.building === filterBuilding;
    const matchesFloor = !filterFloor || filterFloor === 'all' || a.floor_id === filterFloor;
    const matchesRoom = !filterRoom || filterRoom === 'all' || a.room_id === filterRoom;
    const matchesTenant = !filterTenant || filterTenant === 'all' || a.handover_to === filterTenant;
    
    // Combination filters
    let matchesCombination = true;
    if (a.asset_combination && (filterColor || filterMaterial || filterSize)) {
      const combination = filterCombinations.find(c => c.id === a.asset_combination);
      if (combination) {
        const matchesColor = !filterColor || filterColor === 'all' || combination.color === filterColor;
        const matchesMaterial = !filterMaterial || filterMaterial === 'all' || combination.material === filterMaterial;
        const matchesSize = !filterSize || filterSize === 'all' || combination.size === filterSize;
        matchesCombination = matchesColor && matchesMaterial && matchesSize;
      } else {
        matchesCombination = false;
      }
    }
    
    return matchesCategory && matchesSubCategory && matchesType && matchesStatus && matchesBuilding && matchesFloor && matchesRoom && matchesTenant && matchesCombination;
  });

  // Use stats from database for KPI cards
  const activeCount    = (stats as any)?.activeCount || 0;
  const idleCount      = (stats as any)?.idleCount || 0;
  const repairCount    = (stats as any)?.repairCount || 0;
  const scrapCount     = (stats as any)?.scrapCount || 0;

  return (
    <DashboardLayout title="Asset Master" subtitle="Manage assets and inventory">
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAssets || 0}</div>
                {(filterCategory || filterSubCategory || filterType || filterStatus || filterBuilding || filterFloor || filterTenant || filterColor || filterMaterial || filterSize) && (
                  <p className="text-xs text-muted-foreground mt-1">total (unfiltered)</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">In service</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Under Repair</CardTitle>
                <Wrench className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{repairCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Under maintenance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Idle</CardTitle>
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{idleCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Not in use</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Scrap / Disposed</CardTitle>
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{scrapCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Decommissioned</p>
              </CardContent>
            </Card>
          </div>



          {showForm ? (
            <div className="bg-gray-50 -m-6 p-6">
              <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{editingAsset ? (viewMode ? 'View Asset' : 'Edit Asset') : 'Create New Asset'}</h1>
                    <p className="text-sm text-gray-500 mt-1">{viewMode ? 'Asset details' : 'Update asset information'}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    {!editingAsset && generatedAssetId && (
                      <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                        <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">Asset ID:</span>
                        <div className="px-2 sm:px-4 py-1 sm:py-2 bg-blue-50 border border-blue-200 rounded font-mono text-xs sm:text-sm text-blue-600 font-semibold truncate">
                          {generatedAssetId}
                        </div>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
                  <div className="lg:col-span-3">
                    {viewMode ? (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Basic Information</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Name</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Type</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_category || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_sub_category || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Combination</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">
                                {(() => {
                                  const comboId = formData.asset_combination || (editingAsset ? (editingAsset as any).asset_combination : undefined);
                                  if (!comboId) return 'N/A';
                                  const combo = assetCombinations.find((c: any) => String(c.value) === String(comboId) || String(c.id) === String(comboId));
                                  if (combo) return [combo.color, combo.material, combo.size].filter(Boolean).join(' | ');
                                  return 'N/A';
                                })()}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub Category</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_type || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manufacturer</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.manufacturer || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Make/Model</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.make_model || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Serial Number</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.serial_number || 'N/A'}</p>
                            </div>
                            <div className="col-span-3">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Description</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_description || 'N/A'}</p>
                            </div>
                            <div className="col-span-3">
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Technical Specifications</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_spec || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Location</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Building</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{buildings.find(b => b.id === formData.building)?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Floor</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{floors.find(f => f.id === formData.floor_id)?.floor_name || floors.find(f => f.id === formData.floor_id)?.floor_number || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Room/Rack</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">
                                {formData.room_id ? (rooms.find(r => r.id === formData.room_id)?.room_number || formData.room_id) : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Handover Details</h2>
                          {formData.handover_to && (() => {
                            const selectedTenant = tenants.find(t => t.id === formData.handover_to);
                            return selectedTenant ? (
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="font-semibold text-sm text-gray-900 mb-2">{selectedTenant.company || selectedTenant.name}</p>
                                <p className="text-xs text-gray-600">Contact: {selectedTenant.name}</p>
                                <p className="text-xs text-gray-600">Email: {selectedTenant.email}</p>
                                <p className="text-xs text-gray-600">Phone: {selectedTenant.phone_numbers}</p>
                              </div>
                            ) : null;
                          })()}
                          {(formData.handover_other_name || formData.handover_other_email || formData.handover_other_contact) && (
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 block">Other Handover Recipient</label>
                              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-gray-700"><span className="font-medium">Name:</span> {formData.handover_other_name || 'N/A'}</p>
                                <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Email:</span> {formData.handover_other_email || 'N/A'}</p>
                                <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Contact Mobile:</span> {formData.handover_other_contact || 'N/A'}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-full overflow-x-auto">
                            <TabsTrigger value="status" className="text-xs sm:text-sm whitespace-nowrap">Status</TabsTrigger>
                            <TabsTrigger value="sez" className="text-xs sm:text-sm whitespace-nowrap">SEZ</TabsTrigger>
                            <TabsTrigger value="tickets" className="text-xs sm:text-sm whitespace-nowrap">Tickets</TabsTrigger>
                            <TabsTrigger value="history" className="text-xs sm:text-sm whitespace-nowrap">History</TabsTrigger>
                            <TabsTrigger value="audits" className="text-xs sm:text-sm whitespace-nowrap">Audits</TabsTrigger>
                            <TabsTrigger value="services" className="text-xs sm:text-sm whitespace-nowrap">Services</TabsTrigger>
                            <TabsTrigger value="documents" className="text-xs sm:text-sm whitespace-nowrap">Documents</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="status" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Working Status</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.status || 'Working'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Status</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_status || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Incharge</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{assetInchargeUsers.find(user => user.id === formData.asset_incharge)?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Purchase Date</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.purchase_date ? new Date(formData.purchase_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Warranty Expiry</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.warranty_date ? new Date(formData.warranty_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{vendors.find(v => v.id === formData.vendor_id)?.vendor_name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Number</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.invoice_number || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Invoice Date</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.invoice_date ? new Date(formData.invoice_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Preventive Maintenance Date</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.pm_date ? new Date(formData.pm_date).toLocaleDateString() : 'Not set'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Depreciation Date</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.depreciation_date ? new Date(formData.depreciation_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Depreciation %</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.depreciation_percentage || 'N/A'}%</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Decommission Date</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.decommission_date ? new Date(formData.decommission_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                              </div>
                            </div>
                          </TabsContent>
                          

                          <TabsContent value="sez" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">SEZ Status</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.sez_status || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customs Category</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.customs_category || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contract</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.contract || 'No'}</p>
                            </div>
                            {formData.contract === 'Yes' && formData.vendor_id && (() => {
                              const selectedVendor = vendors.find(v => v.id === formData.vendor_id);
                              return selectedVendor ? (
                                <div className="col-span-2">
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</label>
                                  <p className="text-sm font-medium text-gray-900 mt-2">{selectedVendor.name} ({selectedVendor.email})</p>
                                </div>
                              ) : null;
                            })()}
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="tickets" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="flex items-center gap-2 mb-4">
                                <Ticket className="h-5 w-5 text-gray-700" />
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Maintenance Tickets</h3>
                              </div>
                              {loadingTickets ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                              ) : assetTickets.length === 0 ? (
                                <div className="text-center py-8">
                                  <Ticket className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                  <p className="text-sm text-gray-500">No tickets found for this asset</p>
                                </div>
                              ) : (
                                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Priority</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Created</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {assetTickets.map((ticket) => (
                                        <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                                          <td className="py-3 px-4">
                                            <span className="font-mono text-sm font-semibold text-blue-600">{ticket.ticket_number}</span>
                                          </td>
                                          <td className="py-3 px-4 text-sm text-gray-900">{ticket.title}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{ticket.category}</td>
                                          <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                              ticket.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                              ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                              ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {ticket.priority}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                              ticket.status === 'completed' || ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                              ticket.status === 'in_progress' || ticket.status === 'work_started' ? 'bg-blue-100 text-blue-700' :
                                              ticket.status === 'rejected' || ticket.status === 'tenant_rejected' ? 'bg-red-100 text-red-700' :
                                              'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {ticket.status}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-sm text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="history" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Movement History</h3>
                              {loadingMovements ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                              ) : assetMovements.length === 0 ? (
                                <p className="text-sm text-gray-500">No movement history found</p>
                              ) : (
                                <div className="space-y-3">
                                  {assetMovements.map((movement) => (
                                    <div key={movement.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                      <div 
                                        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onClick={() => setExpandedMovement(expandedMovement === movement.id ? null : movement.id)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono text-sm font-semibold text-blue-600">{movement.request_number}</span>
                                              <span className="text-gray-400">|</span>
                                              <span className="text-sm font-medium text-gray-700">{movement.movement_type}</span>
                                            </div>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                              movement.movement_status === 'Completed' ? 'bg-green-100 text-green-700' :
                                              movement.movement_status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                                              movement.movement_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                              'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {movement.movement_status}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">{new Date(movement.movement_date).toLocaleDateString()}</span>
                                            {expandedMovement === movement.id ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                          </div>
                                        </div>
                                      </div>
                                      {expandedMovement === movement.id && (
                                        <div className="p-4 bg-white border-t border-gray-200">
                                          <Tabs defaultValue="location" className="w-full">
                                            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                                              <TabsTrigger value="location">Location</TabsTrigger>
                                              <TabsTrigger value="handover">Tenant/Handover</TabsTrigger>
                                              <TabsTrigger value="details">Details</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="location" className="mt-4">
                                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                  <h4 className="text-xs font-semibold text-gray-500 uppercase">From Location</h4>
                                                  <div className="space-y-2">
                                                    <div>
                                                      <p className="text-xs text-gray-500">Building</p>
                                                      <p className="text-sm text-gray-900">{movement.from_building_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Floor</p>
                                                      <p className="text-sm text-gray-900">{movement.from_floor_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Room</p>
                                                      <p className="text-sm text-gray-900">{movement.from_room || 'N/A'}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="space-y-3">
                                                  <h4 className="text-xs font-semibold text-gray-500 uppercase">To Location</h4>
                                                  <div className="space-y-2">
                                                    <div>
                                                      <p className="text-xs text-gray-500">Building</p>
                                                      <p className="text-sm text-gray-900">{movement.to_building_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Floor</p>
                                                      <p className="text-sm text-gray-900">{movement.to_floor_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Room</p>
                                                      <p className="text-sm text-gray-900">{movement.to_room || 'N/A'}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </TabsContent>
                                            <TabsContent value="handover" className="mt-4">
                                              <div className="space-y-3">
                                                <div>
                                                  <p className="text-xs text-gray-500">Handover Type</p>
                                                  <p className="text-sm font-medium text-gray-900">{movement.handover_to || 'N/A'}</p>
                                                </div>
                                                {movement.handover_name && (
                                                  <div>
                                                    <p className="text-xs text-gray-500">Name</p>
                                                    <p className="text-sm text-gray-900">{movement.handover_name}</p>
                                                  </div>
                                                )}
                                                {movement.handover_email && (
                                                  <div>
                                                    <p className="text-xs text-gray-500">Email</p>
                                                    <p className="text-sm text-gray-900">{movement.handover_email}</p>
                                                  </div>
                                                )}
                                                {movement.handover_mobile && (
                                                  <div>
                                                    <p className="text-xs text-gray-500">Contact Mobile</p>
                                                    <p className="text-sm text-gray-900">{movement.handover_mobile}</p>
                                                  </div>
                                                )}
                                              </div>
                                            </TabsContent>
                                            <TabsContent value="details" className="mt-4">
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <p className="text-xs text-gray-500">Movement Type</p>
                                                  <p className="text-sm text-gray-900">{movement.movement_type}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-gray-500">Movement Date</p>
                                                  <p className="text-sm text-gray-900">{new Date(movement.movement_date).toLocaleDateString()}</p>
                                                </div>
                                                {movement.movement_time && (
                                                  <div>
                                                    <p className="text-xs text-gray-500">Movement Time</p>
                                                    <p className="text-sm text-gray-900">{movement.movement_time}</p>
                                                  </div>
                                                )}
                                                {movement.movement_reason && (
                                                  <div>
                                                    <p className="text-xs text-gray-500">Reason</p>
                                                    <p className="text-sm text-gray-900">{movement.movement_reason}</p>
                                                  </div>
                                                )}
                                                {movement.other_reason && (
                                                  <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">Other Reason</p>
                                                    <p className="text-sm text-gray-900">{movement.other_reason}</p>
                                                  </div>
                                                )}
                                                {movement.remarks && (
                                                  <div className="col-span-2">
                                                    <p className="text-xs text-gray-500">Remarks</p>
                                                    <p className="text-sm text-gray-900">{movement.remarks}</p>
                                                  </div>
                                                )}
                                                {movement.movement_type === 'Maintenance' && (
                                                  <>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Vendor Name</p>
                                                      <p className="text-sm text-gray-900">{movement.vendor_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Vendor Contact</p>
                                                      <p className="text-sm text-gray-900">{movement.vendor_contact || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Outward Date</p>
                                                      <p className="text-sm text-gray-900">{movement.outward_date ? new Date(movement.outward_date).toLocaleDateString() : 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Expected Inward Date</p>
                                                      <p className="text-sm text-gray-900">{movement.expected_inward_date ? new Date(movement.expected_inward_date).toLocaleDateString() : 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-xs text-gray-500">Gate Pass Number</p>
                                                      <p className="text-sm text-gray-900">{movement.gate_pass_number || 'N/A'}</p>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            </TabsContent>
                                          </Tabs>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="audits" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Physical Audit History</h3>
                              {loadingAudits ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                              ) : assetAudits.length === 0 ? (
                                <p className="text-sm text-gray-500">No physical audit records found</p>
                              ) : (
                                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Audit Date</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Auditor</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Result</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Asset Found</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Location Match</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Condition</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">GPS Location</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {assetAudits.map((audit) => (
                                        <tr key={audit.id} className="border-b border-gray-100 hover:bg-gray-50">
                                          <td className="py-3 px-4 text-sm text-gray-900">{new Date(audit.audit_date).toLocaleDateString()}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{audit.auditor_name || 'N/A'}</td>
                                          <td className="py-3 px-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                              audit.audit_result === 'Pass' ? 'bg-green-100 text-green-700' :
                                              audit.audit_result === 'Fail' ? 'bg-red-100 text-red-700' :
                                              'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {audit.audit_result || 'N/A'}
                                            </span>
                                          </td>
                                          <td className="py-3 px-4 text-sm">{audit.asset_found ? '✓ Yes' : '✗ No'}</td>
                                          <td className="py-3 px-4 text-sm">{audit.location_match ? '✓ Yes' : '✗ No'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{audit.condition || 'N/A'}</td>
                                          <td className="py-3 px-4 text-sm">
                                            {audit.gps_latitude && audit.gps_longitude ? (
                                              <a
                                                href={`https://www.google.com/maps?q=${audit.gps_latitude},${audit.gps_longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 font-mono text-xs"
                                                title={`Accuracy: ±${audit.gps_accuracy?.toFixed(1)}m`}
                                              >
                                                {(() => {
                                                  const latDir = audit.gps_latitude >= 0 ? 'N' : 'S';
                                                  const lngDir = audit.gps_longitude >= 0 ? 'E' : 'W';
                                                  const latAbs = Math.abs(audit.gps_latitude);
                                                  const lngAbs = Math.abs(audit.gps_longitude);
                                                  const latDeg = Math.floor(latAbs);
                                                  const latMin = Math.floor((latAbs - latDeg) * 60);
                                                  const latSec = ((latAbs - latDeg - latMin / 60) * 3600).toFixed(1);
                                                  const lngDeg = Math.floor(lngAbs);
                                                  const lngMin = Math.floor((lngAbs - lngDeg) * 60);
                                                  const lngSec = ((lngAbs - lngDeg - lngMin / 60) * 3600).toFixed(1);
                                                  return `${latDeg}°${latMin}'${latSec}"${latDir} ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
                                                })()}
                                              </a>
                                            ) : (
                                              <span className="text-gray-400">-</span>
                                            )}
                                          </td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{audit.remarks || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="services" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Service Records</h3>
                              </div>
                              
                              {loadingServices ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                              ) : assetServices.length === 0 ? (
                                <p className="text-sm text-gray-500">No service records found</p>
                              ) : (
                                <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Service Date</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Service Type</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Provider</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Description</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Cost</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Next Service</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Performed By</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {assetServices.map((service) => (
                                        <tr key={service.id} className="border-b border-gray-100 hover:bg-gray-50">
                                          <td className="py-3 px-4 text-sm text-gray-900">{new Date(service.service_date).toLocaleDateString()}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.service_type || 'N/A'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.service_provider || 'N/A'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.service_description || '-'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-900">₹{service.service_cost ? service.service_cost.toLocaleString() : '0'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.next_service_date ? new Date(service.next_service_date).toLocaleDateString() : '-'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.performed_by || 'N/A'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.invoice_number || '-'}</td>
                                          <td className="py-3 px-4 text-sm text-gray-600">{service.remarks || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="documents" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Asset Documents</h3>
                                {editingAsset && !viewMode && (
                                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                                    <Upload className="h-4 w-4" />
                                    <span>Upload Document</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="*/*"
                                      multiple
                                      onChange={handleDocumentUpload}
                                    />
                                  </label>
                                )}
                              </div>
                              
                              {loadingDocuments ? (
                                <div className="flex justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                              ) : assetDocuments.length === 0 ? (
                                <div className="text-center py-12 px-4 border-2 border-dashed border-gray-300 rounded-lg">
                                  {viewMode || !editingAsset ? (
                                    <>
                                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                      <p className="text-sm text-gray-500">No documents uploaded for this asset</p>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                                      <p className="text-sm text-gray-500 mb-4">Click "Upload Document" to add files</p>
                                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                                        Supported: PDF, Images, Word, Excel, and all file types
                                      </p>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {assetDocuments.map((doc) => (
                                    <div key={doc.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
                                      <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-3">
                                            {getDocumentIcon(doc.file_name)}
                                            <div>
                                              <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{doc.file_name}</p>
                                              <p className="text-xs text-gray-500 mt-1">{formatFileSize(doc.file_size)}</p>
                                            </div>
                                          </div>
                                          {!viewMode && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDeleteDocument(doc.id)}
                                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-3">
                                          <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors text-center"
                                          >
                                            View/Download
                                          </a>
                                          {!viewMode && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleDownloadDocument(doc.file_url, doc.file_name)}
                                              className="h-8 px-3 text-xs"
                                            >
                                              Save
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        </Tabs>
                        {formData.comments && (
                          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Additional Information</h2>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comments</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.comments}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4 lg:space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                          <div className="border-l-4 border-blue-700 pl-3 mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Asset Name <span className="text-red-500">*</span></label>
                            <Input 
                              value={formData.asset_name} 
                              onChange={(e) => updateField('asset_name', e.target.value)} 
                              placeholder="Enter asset name"
                              className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20"
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Asset Type <span className="text-red-500">*</span></label>
                            <Combobox
                              value={formData.asset_category || ''}
                              onValueChange={(v) => updateField('asset_category', v)}
                              options={assetCategories.map(cat => ({ value: cat, label: cat }))}
                              placeholder="Select asset type"
                              searchPlaceholder="Search asset type..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                            <Combobox
                              value={formData.asset_sub_category || ''}
                              onValueChange={(v) => updateField('asset_sub_category', v)}
                              options={assetSubCategories.map(sub => ({ value: sub, label: sub }))}
                              placeholder="Select category"
                              searchPlaceholder="Search category..."
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Sub Category <span className="text-red-500">*</span></label>
                            <Combobox
                              value={formData.asset_type || ''}
                              onValueChange={(v) => updateField('asset_type', v)}
                              options={assetTypes.map(type => ({ value: type, label: type }))}
                              placeholder="Select sub category"
                              searchPlaceholder="Search sub category..."
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Combination (Color | Material | Size)</label>
                            <Popover key={`combo-${formData.asset_type}-${assetCombinations.length}`}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-11 border-gray-300 focus:border-primary focus:ring-primary/20"
                                  disabled={!formData.asset_type || assetCombinations.length === 0}
                                >
                                  {formData.asset_combination && assetCombinations.find(combo => combo.value === formData.asset_combination) ? 
                                    assetCombinations.find(combo => combo.value === formData.asset_combination)?.label
                                    : 'Select combination'
                                  }
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-full p-0" align="start">
                                <div className="max-h-64 overflow-y-auto">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b sticky top-0">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700">Color</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700">Material</th>
                                        <th className="px-3 py-2 text-left font-medium text-gray-700">Size</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {assetCombinations.map((combo) => (
                                        <tr 
                                          key={combo.id} 
                                          className={`border-b hover:bg-gray-50 cursor-pointer ${
                                            formData.asset_combination === combo.value ? 'bg-blue-50' : ''
                                          }`}
                                          onClick={() => updateField('asset_combination', combo.value)}
                                        >
                                          <td className="px-3 py-2">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                              {combo.color || 'N/A'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                              {combo.material || 'N/A'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">
                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                              {combo.size || 'N/A'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Manufacturer</label>
                            <Combobox
                              value={formData.manufacturer || ''}
                              onValueChange={(v) => updateField('manufacturer', v)}
                              options={allManufacturers.map(mfr => ({ value: mfr, label: mfr }))}
                              placeholder="Select manufacturer"
                              searchPlaceholder="Search manufacturer..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Make/Model</label>
                            <Input value={formData.make_model || ''} onChange={(e) => updateField('make_model', e.target.value)} placeholder="e.g., Latitude 5420" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Serial Number</label>
                            <Input value={formData.serial_number || ''} onChange={(e) => updateField('serial_number', e.target.value)} placeholder="Enter serial number" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Manual Asset ID</label>
                            <Input value={formData.manual_asset_id || ''} onChange={(e) => updateField('manual_asset_id', e.target.value)} placeholder="Enter manual ID" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" />
                          </div>
                          <div className="col-span-3 space-y-2">
                            <label className="text-sm font-medium text-gray-700">Asset Description</label>
                            <Input value={formData.asset_description || ''} onChange={(e) => updateField('asset_description', e.target.value)} placeholder="Brief description of the asset" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" />
                          </div>
                          <div className="col-span-3 space-y-2">
                            <label className="text-sm font-medium text-gray-700">Technical Specifications</label>
                            <Input value={formData.asset_spec || ''} onChange={(e) => updateField('asset_spec', e.target.value)} placeholder="e.g., Intel i7, 16GB RAM, 512GB SSD" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" />
                          </div>
                          
                          {!editingAsset && (
                            <div className="col-span-3 border-t pt-4">
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={bulkGeneration} 
                                    onChange={(e) => setBulkGeneration(e.target.checked)}
                                    className="w-4 h-4" 
                                  />
                                  <span className="text-sm font-medium text-gray-700">Bulk Generation</span>
                                </label>
                                {bulkGeneration && (
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700">Quantity:</label>
                                    <Input 
                                      type="text" 
                                      value={bulkQuantity} 
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= 100)) {
                                          setBulkQuantity(value);
                                        }
                                      }}
                                      className="w-20 h-9 border-gray-300"
                                      placeholder="1"
                                    />
                                    <span className="text-xs text-gray-500">(Max: 100)</span>
                                  </div>
                                )}
                              </div>
                              {bulkGeneration && bulkAssetIds.length > 0 && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Asset IDs to be created:</p>
                                  <div className="text-xs font-mono px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
                                    {bulkAssetIds[0]} to {bulkAssetIds[bulkAssetIds.length - 1]} ({parseInt(bulkQuantity)} assets)
                                  </div>
                                  {duplicateIds.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs text-red-600 mb-1">Duplicate IDs found:</p>
                                      <div className="space-y-1">
                                        {duplicateIds.map((id, index) => (
                                          <div key={index} className="text-xs font-mono px-2 py-1 rounded bg-red-100 text-red-700 border border-red-200">
                                            {id} (DUPLICATE)
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                          <div className="border-l-4 border-blue-700 pl-3 mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Location</h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Building</label>
                              <Select value={formData.building || ''} onValueChange={(v) => updateField('building', v)} disabled={viewMode}>
                                <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                  <SelectValue placeholder="Select building" />
                                </SelectTrigger>
                                <SelectContent>
                                  {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Floor</label>
                              <Select value={formData.floor_id || ''} onValueChange={(v) => updateField('floor_id', v)} disabled={viewMode || !formData.building}>
                                <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                  <SelectValue placeholder="Select floor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {floors.map(f => <SelectItem key={f.id} value={f.id}>{f.floor_name || f.floor_number}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700">Room/Rack</label>
                                {!viewMode && formData.floor_id && !showAddRoomForm && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowAddRoomForm(true)}
                                    className="h-7 text-xs"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Room
                                  </Button>
                                )}
                              </div>
                              
                              {showAddRoomForm ? (
                                <div className="p-3 border border-blue-200 rounded-lg bg-blue-50 space-y-3">
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700">Room Number *</label>
                                    <Input
                                      value={newRoomNumber}
                                      onChange={(e) => setNewRoomNumber(e.target.value)}
                                      placeholder="Enter room number"
                                      className="h-9 border-gray-300"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700">Category</label>
                                    <Select value={newRoomCategory} onValueChange={setNewRoomCategory}>
                                      <SelectTrigger className="h-9 border-gray-300">
                                        <SelectValue placeholder="Select category (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roomCategories.map(cat => (
                                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={handleAddSingleRoom}
                                      className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setShowAddRoomForm(false);
                                        setNewRoomNumber('');
                                        setNewRoomCategory('');
                                      }}
                                      className="flex-1 h-8 text-xs"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Select value={formData.room_id || ''} onValueChange={(v) => updateField('room_id', v)} disabled={viewMode || !formData.floor_id}>
                                  <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                    <SelectValue placeholder={
                                      !formData.floor_id ? "Select floor first" : 
                                      rooms.length === 0 ? "No rooms available" : 
                                      "Select room"
                                    } />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rooms.map(room => (
                                      <SelectItem key={room.id} value={room.id}>
                                        {room.display_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm p-6">
                          <div className="border-l-4 border-blue-700 pl-3 mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Handover Details</h2>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Handover To</label>
                              <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={handoverType === 'tenant'} onChange={() => { setHandoverType('tenant'); updateField('handover_to', ''); updateField('handover_other_name', ''); updateField('handover_other_email', ''); updateField('handover_other_contact', ''); }} disabled={viewMode} className="w-4 h-4" />
                                  <span className="text-sm">Tenant</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={handoverType === 'other'} onChange={() => { setHandoverType('other'); updateField('handover_to', null); }} disabled={viewMode} className="w-4 h-4" />
                                  <span className="text-sm">Other</span>
                                </label>
                              </div>
                              {handoverType === 'tenant' ? (
                                <>
                              {!formData.handover_to && (
                                <Input 
                                  placeholder="Search tenants..." 
                                  value={tenantSearch} 
                                  onChange={(e) => setTenantSearch(e.target.value)} 
                                  className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" 
                                  disabled={viewMode} 
                                />
                              )}
                              {formData.handover_to && (() => {
                                const selectedTenant = tenants.find(t => t.id === formData.handover_to);
                                return selectedTenant ? (
                                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="font-semibold text-base text-gray-900">{selectedTenant.company || selectedTenant.name}</p>
                                      {!viewMode && (
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" 
                                          onClick={() => { updateField('handover_to', null); setTenantSearch(''); }}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-sm text-gray-700"><span className="font-medium">Contact Person:</span> {selectedTenant.name}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {selectedTenant.email}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Phone:</span> {selectedTenant.phone_numbers}</p>
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                              {!viewMode && tenantSearch && !formData.handover_to && (
                                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                  {tenants.filter(t => 
                                    (t.name && t.name.toLowerCase().includes(tenantSearch.toLowerCase())) ||
                                    (t.company && t.company.toLowerCase().includes(tenantSearch.toLowerCase())) ||
                                    (t.email && t.email.toLowerCase().includes(tenantSearch.toLowerCase())) ||
                                    (t.phone_numbers && t.phone_numbers.includes(tenantSearch))
                                  ).map((tenant) => (
                                    <div 
                                      key={tenant.id} 
                                      className="p-3 bg-green-50 rounded-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors" 
                                      onClick={() => { updateField('handover_to', tenant.id); setTenantSearch(''); }}
                                    >
                                      <p className="font-semibold text-sm text-gray-900">{tenant.company || tenant.name}</p>
                                      <p className="text-xs text-gray-600 mt-1">{tenant.name} • {tenant.email} • {tenant.phone_numbers}</p>
                                    </div>
                                  ))}
                                  {tenants.filter(t => 
                                    (t.name && t.name.toLowerCase().includes(tenantSearch.toLowerCase())) ||
                                    (t.company && t.company.toLowerCase().includes(tenantSearch.toLowerCase())) ||
                                    (t.email && t.email.toLowerCase().includes(tenantSearch.toLowerCase())) ||
                                    (t.phone_numbers && t.phone_numbers.includes(tenantSearch))
                                  ).length === 0 && (
                                    <p className="text-sm text-gray-500 text-center py-4">No tenants found</p>
                                  )}
                                </div>
                              )}
                                </>
                              ) : (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Name</label>
                                      <Input value={formData.handover_other_name || ''} onChange={(e) => updateField('handover_other_name', e.target.value)} placeholder="Enter name" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium text-gray-700">Email</label>
                                      <Input type="email" value={formData.handover_other_email || ''} onChange={(e) => updateField('handover_other_email', e.target.value)} placeholder="Enter email" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Contact Mobile</label>
                                    <Input value={formData.handover_other_contact || ''} onChange={(e) => updateField('handover_other_contact', e.target.value)} placeholder="Enter contact mobile" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList className="grid grid-cols-3 w-full">
                            <TabsTrigger value="status" className="text-xs sm:text-sm">Status & Maintenance</TabsTrigger>
                            <TabsTrigger value="sez" className="text-xs sm:text-sm">SEZ & Customs</TabsTrigger>
                            <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="status" className="mt-4">
                            <div className="bg-white rounded-lg shadow-sm p-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Working Status</label>
                        <Select value={formData.status || 'Working'} onValueChange={(v) => updateField('status', v)} disabled={viewMode}>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Working">✓ Working</SelectItem>
                            <SelectItem value="Not Working">✗ Not Working</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Asset Status</label>
                        <Select value={formData.asset_status} onValueChange={(v) => updateField('asset_status', v)} disabled={viewMode}>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {assetStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Asset Incharge</label>
                        <Combobox
                          value={formData.asset_incharge || ''}
                          onValueChange={(v) => updateField('asset_incharge', v)}
                          options={assetInchargeUsers.map(user => ({ value: user.id, label: `${user.name} (${user.email})` }))}
                          placeholder="Select asset incharge"
                          searchPlaceholder="Search users..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Purchase Date</label>
                        <Input type="date" value={formData.purchase_date || ''} onChange={(e) => updateField('purchase_date', e.target.value)} className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Purchase Order Number</label>
                        <Input value={formData.po_number || ''} onChange={(e) => updateField('po_number', e.target.value)} placeholder="Enter PO number" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Warranty Expiry</label>
                        <Input type="date" value={formData.warranty_date || ''} onChange={(e) => updateField('warranty_date', e.target.value)} className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Vendor</label>
                        <Combobox
                          value={formData.vendor_id || ''}
                          onValueChange={(v) => updateField('vendor_id', v)}
                          options={vendors.map(vendor => ({ value: vendor.id, label: `${vendor.vendor_name} (${vendor.email || 'No email'})` }))}
                          placeholder="Select vendor"
                          searchPlaceholder="Search vendors..."
                          disabled={viewMode}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Invoice Number</label>
                        <Input value={formData.invoice_number || ''} onChange={(e) => updateField('invoice_number', e.target.value)} placeholder="Enter invoice number" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Invoice Date</label>
                        <Input type="date" value={formData.invoice_date || ''} onChange={(e) => updateField('invoice_date', e.target.value)} className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Depreciation Date</label>
                        <Input type="date" value={formData.depreciation_date || ''} onChange={(e) => updateField('depreciation_date', e.target.value)} className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Depreciation %</label>
                        <Input type="number" value={formData.depreciation_percentage || ''} onChange={(e) => updateField('depreciation_percentage', e.target.value)} placeholder="0" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Decommission Date</label>
                        <Input type="date" value={formData.decommission_date || ''} onChange={(e) => updateField('decommission_date', e.target.value)} className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
                      </div>
                              </div>
                            </div>
                          </TabsContent>
                          

                          <TabsContent value="sez" className="mt-4">
                            <div className="bg-white rounded-lg shadow-sm p-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">SEZ Status</label>
                        <Select value={formData.sez_status} onValueChange={(v) => updateField('sez_status', v)} disabled={viewMode}>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {sezStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Customs Category</label>
                        <Select value={formData.customs_category} onValueChange={(v) => updateField('customs_category', v)} disabled={viewMode}>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {customsCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Contract</label>
                        <Select value={formData.contract || 'No'} onValueChange={(v) => updateField('contract', v)} disabled={viewMode}>
                          <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yes">Yes</SelectItem>
                            <SelectItem value="No">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.contract === 'Yes' && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Vendor</label>
                          <div className="space-y-3">
                            <div className="relative">
                              <Input
                                placeholder="Search vendors..."
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20"
                              />
                            </div>
                            
                            {/* Selected Vendor */}
                            {formData.vendor_id && (() => {
                              const selectedVendor = vendors.find(v => v.id === formData.vendor_id);
                              return selectedVendor ? (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                    {selectedVendor.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-gray-900">{selectedVendor.name}</p>
                                    <p className="text-xs text-gray-600">{selectedVendor.email}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => { updateField('vendor_id', ''); setVendorSearch(''); }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : null;
                            })()}
                            
                            {/* Available Vendors */}
                            {vendorSearch && (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                <label className="text-xs font-medium text-gray-500">Available</label>
                                {vendors
                                  .filter(vendor => vendor.id !== formData.vendor_id && vendor.name.toLowerCase().includes(vendorSearch.toLowerCase()))
                                  .map((vendor) => (
                                    <div key={vendor.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                        {vendor.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-900">{vendor.name}</p>
                                        <p className="text-xs text-gray-600">{vendor.email}</p>
                                      </div>
                                      <Button
                                        size="sm"
                                        className="h-8 px-3 text-xs"
                                        onClick={() => { updateField('vendor_id', vendor.id); setVendorSearch(''); }}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="documents" className="mt-4">
                            <div className="bg-white rounded-lg shadow-sm p-6">
                              <div className="space-y-4">
                                {/* Document list */}
                                {assetDocuments.length > 0 ? (
                                  <div className="space-y-3">
                                    {assetDocuments.map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          {getDocumentIcon(doc.file_name)}
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                                            <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                                          >
                                            View/Download
                                          </a>
                                          {!viewMode && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDeleteDocument(doc.id)}
                                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">No documents uploaded</p>
                                )}

                                {/* Upload button */}
                                {!viewMode && (
                                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                                    <Upload className="w-8 h-8 text-blue-400" />
                                    <span className="text-sm font-medium text-blue-600 mt-2">Click to upload documents</span>
                                    <span className="text-xs text-gray-500 mt-1">PDF, Images, Word, Excel & all file types supported (Max 50MB)</span>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="*/*"
                                      multiple
                                      onChange={handleDocumentUpload}
                                    />
                                  </label>
                                )}
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">ASSET PICTURES</h3>

                    {/* Image scroll strip */}
                    {assetImages.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                        {assetImages.map((img, idx) => (
                          <div key={idx} className="relative shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-gray-200 group">
                            <img
                              src={img}
                              alt={`Asset ${idx + 1}`}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => setCurrentImageIndex(idx)}
                            />
                            {/* Fullscreen overlay on click */}
                            <div
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition cursor-pointer"
                              onClick={() => {
                                setCurrentImageIndex(idx);
                                setShowImageLightbox(true);
                              }}
                            />
                            {!viewMode && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const imgToDelete = assetImages[idx];
                                    
                                    // Check if it's a Supabase proxy URL or direct path
                                    let supabasePath = imgToDelete;
                                    if (imgToDelete.startsWith('/api/asset-images/')) {
                                      const urlWithoutQuery = imgToDelete.split('?')[0];
                                      const pathPart = urlWithoutQuery.replace('/api/asset-images/', '');
                                      supabasePath = `/supabase/${pathPart}`;
                                    }
                                    
                                    if (supabasePath.startsWith('/supabase/')) {
                                      const settings = await AssetImageUploadService.getSettings();
                                      await AssetImageUploadService.deleteFile(supabasePath, settings.useSupabase);
                                    }
                                    
                                    const newImages = assetImages.filter((_, i) => i !== idx);
                                    setAssetImages(newImages);
                                    if (currentImageIndex >= newImages.length) setCurrentImageIndex(Math.max(0, newImages.length - 1));
                                    
                                    toast({ title: 'Success', description: 'Image deleted' });
                                  } catch (error) {
                                    toast({ title: 'Error', description: 'Failed to delete image', variant: 'destructive' });
                                  }
                                }}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-full h-28 bg-gray-50 rounded-lg border border-dashed border-gray-200 mb-3">
                        <p className="text-sm text-gray-400">No images</p>
                      </div>
                    )}

                    {/* Upload button — only when < 2 images and not viewMode */}
                    {!viewMode && assetImages.length < 2 && (() => {
                      const handleFiles = async (fileList: FileList | null) => {
                        const files = Array.from(fileList || []).slice(0, 2 - assetImages.length);
                        if (files.length === 0) return;
                        try {
                          const settings = await AssetImageUploadService.getSettings();
                          
                          if (!formData.asset_category || !formData.asset_sub_category) {
                            toast({ title: 'Error', description: 'Please select Asset Type and Category first', variant: 'destructive' });
                            return;
                          }
                          
                          const assetId = editingAsset?.asset_id || generatedAssetId || 'temp';
                          
                          const compressedFiles = await Promise.all(files.map(f => compressImage(f)));
                          
                          const results = await AssetImageUploadService.uploadFiles(
                            compressedFiles,
                            formData.asset_category,
                            formData.asset_sub_category,
                            assetId,
                            settings.useSupabase
                          );
                          
                          // Resolve URLs for viewing
                          const urls = results.map(r => {
                            if (r.url.startsWith('/supabase/') && user?.appUser) {
                              const resolved = AssetImageUploadService.resolveUrl(r.url, user.appUser.id, user.appUser.email);
                              return resolved;
                            }
                            return r.url;
                          });
                          if (urls.length > 0) {
                            setAssetImages(prev => [...prev, ...urls].slice(0, 2));
                            toast({ title: 'Success', description: `${urls.length} image(s) uploaded to ${settings.useSupabase ? 'Supabase' : 'Local Storage'}` });
                          } else {
                            toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' });
                          }
                        } catch (error) {
                          toast({ title: 'Error', description: 'Upload failed', variant: 'destructive' });
                        }
                      };
                      return (
                        <>
                          {/* Desktop: single upload button */}
                          <label className="hidden md:flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer">
                            <Upload className="w-5 h-5 text-gray-400" />
                            <span className="text-xs text-gray-500 mt-1">Add Image</span>
                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                          </label>
                          {/* Mobile: Camera + Gallery buttons */}
                          <div className="flex md:hidden gap-2">
                            <label className="flex flex-col items-center justify-center flex-1 h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer">
                              <Camera className="w-5 h-5 text-gray-400" />
                              <span className="text-xs text-gray-500 mt-1">Camera</span>
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                            </label>
                            <label className="flex flex-col items-center justify-center flex-1 h-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition cursor-pointer">
                              <Upload className="w-5 h-5 text-gray-400" />
                              <span className="text-xs text-gray-500 mt-1">Gallery</span>
                              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                            </label>
                          </div>
                        </>
                      );
                    })()}
                    {!viewMode && assetImages.length >= 2 && (
                      <p className="text-xs text-gray-400 text-center">Max 2 images. Remove one to upload another.</p>
                    )}

                    {/* Lightbox */}
                    {showImageLightbox && assetImages.length > 0 && (
                      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setShowImageLightbox(false)}>
                        <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setShowImageLightbox(false)}>
                          <X className="h-6 w-6" />
                        </button>
                        {assetImages.length > 1 && (
                          <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/40"
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? assetImages.length - 1 : prev - 1); }}
                          >
                            <ChevronLeft className="h-6 w-6" />
                          </button>
                        )}
                        <img
                          src={assetImages[currentImageIndex]}
                          alt="Full view"
                          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {assetImages.length > 1 && (
                          <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 text-white rounded-full p-2 hover:bg-white/40"
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === assetImages.length - 1 ? 0 : prev + 1); }}
                          >
                            <ChevronRight className="h-6 w-6" />
                          </button>
                        )}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
                          {currentImageIndex + 1} {" / "} {assetImages.length}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="text-xs text-gray-500 mb-2 block">Asset Value</label>
                      {viewMode ? (
                        <p className="text-2xl font-bold text-blue-600">₹{(formData.asset_value || 0).toLocaleString()}</p>
                      ) : (
                        <Input type="number" value={formData.asset_value || ''} onChange={(e) => updateField('asset_value', e.target.value)} placeholder="0.00" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" />
                      )}
                    </div>
                  </div>

                  {editingAsset && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">CONSTANT DETAILS</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Asset ID</p>
                          <p className="text-sm font-mono text-gray-900 mt-1">{editingAsset.asset_id}</p>
                        </div>
                        <div className="flex justify-center py-3 bg-gray-50 rounded-md">
                          <QRCodeSVG 
                            value={editingAsset.asset_id} 
                            size={120}
                            level="H"
                            imageSettings={{
                              src: "/Logo/Rathinam Logo (No name).png",
                              height: 30,
                              width: 30,
                              excavate: true,
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Created On</p>
                          <p className="text-sm text-gray-900 mt-1">{editingAsset.created_at ? new Date(editingAsset.created_at).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Created By</p>
                          <p className="text-sm text-gray-900 mt-1">{editingAsset.created_by || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Updated On</p>
                          <p className="text-sm text-gray-900 mt-1">{editingAsset.updated_at ? new Date(editingAsset.updated_at).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowUpdateHistory(!showUpdateHistory)}>
                            <p className="text-xs text-gray-500">Last Updated By</p>
                            {showUpdateHistory ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                          </div>
                          {(() => {
                            try {
                              let history = [];
                              
                              // Handle different data types
                              if (typeof editingAsset.update_history === 'string') {
                                history = JSON.parse(editingAsset.update_history);
                              } else if (Array.isArray(editingAsset.update_history)) {
                                history = editingAsset.update_history;
                              } else if (editingAsset.update_history && typeof editingAsset.update_history === 'object') {
                                history = [editingAsset.update_history];
                              }
                              
                              if (Array.isArray(history) && history.length > 0) {
                                const lastUpdate = history[history.length - 1];
                                return (
                                  <>
                                    <p className="text-sm text-gray-900 mt-1">{lastUpdate.updated_by || 'Unknown'}</p>
                                    {showUpdateHistory && (
                                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto border-t pt-2">
                                        <p className="text-xs font-medium text-gray-600 mb-2">Update History ({history.length} entries)</p>
                                        {history.slice().reverse().map((entry: any, idx: number) => (
                                          <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                                            <p className="text-xs font-medium text-gray-900">{entry.updated_by || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{entry.updated_at ? new Date(entry.updated_at).toLocaleString() : 'N/A'}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                );
                              }
                              return <p className="text-sm text-gray-500 mt-1">No updates</p>;
                            } catch (e) {
                              return <p className="text-sm text-red-500 mt-1">Error loading history</p>;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {editingAsset && assetAudits.length > 0 && assetAudits[0].gps_latitude && assetAudits[0].gps_longitude && (
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">LAST AUDIT LOCATION</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">GPS Coordinates</p>
                          <p className="text-xs font-mono text-gray-700">{assetAudits[0].gps_latitude.toFixed(6)}, {assetAudits[0].gps_longitude.toFixed(6)}</p>
                          <p className="text-xs text-gray-500 mt-1">Accuracy: ±{assetAudits[0].gps_accuracy?.toFixed(1)}m</p>
                        </div>
                        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${assetAudits[0].gps_latitude},${assetAudits[0].gps_longitude}&zoom=18`}
                            allowFullScreen
                          />
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${assetAudits[0].gps_latitude},${assetAudits[0].gps_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  )}

                  {!viewMode && (
                    <div className="mt-6 pb-20 sm:pb-0 flex flex-col-reverse sm:flex-row justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-2 border-gray-300">
                        Cancel
                      </Button>
                      <Button onClick={handleSave} className="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={duplicateIds.length > 0 || !formData.asset_name?.trim() || !formData.asset_category?.trim() || !formData.asset_sub_category?.trim() || !formData.asset_type?.trim()}>
                        <Save className="h-4 w-4 mr-2" />
                        {editingAsset ? 'Save Changes' : bulkGeneration ? `Create ${parseInt(bulkQuantity) || 0} Assets` : 'Create Asset'}
                      </Button>
                      {(duplicateIds.length > 0 || !formData.asset_name?.trim() || !formData.asset_category?.trim() || !formData.asset_sub_category?.trim() || !formData.asset_type?.trim()) && (
                        <div className="text-xs text-red-600 mt-2">
                          Save disabled: 
                          {duplicateIds.length > 0 && ` Duplicate IDs (${duplicateIds.length})`}
                          {!formData.asset_name?.trim() && ' Missing Asset Name'}
                          {!formData.asset_category?.trim() && ' Missing Asset Type'}
                          {!formData.asset_sub_category?.trim() && ' Missing Category'}
                          {!formData.asset_type?.trim() && ' Missing Sub Category'}
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {showLabelOptions && selectedAssets.size > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-green-800">Thermal Label Generation</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowLabelOptions(false)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <div className="text-sm text-green-700">
                      <span className="font-medium">{selectedAssets.size}</span> asset(s) selected for label generation
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={handleGenerateThermalLabels}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Ticket className="h-4 w-4 mr-2" />
                        Generate Thermal PDF
                      </Button>
                      <Button 
                        onClick={() => setSelectedAssets(new Set())}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto border-green-300 text-green-700 hover:bg-green-50"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <AssetList
                              // In read‑only tenant view we hide create/edit/delete actions
                              onCreateNew={readOnly ? undefined : handleCreateNew}
                              onEdit={readOnly ? undefined : handleEdit}
                              onView={handleView}
                              readOnly={readOnly}
                                           hideSelection={readOnly}
                              filterCategory={filterCategory}
                              filterSubCategory={filterSubCategory}
                              filterType={filterType}
                              filterStatus={filterStatus}
                              filterBuilding={filterBuilding}
                              filterFloor={filterFloor}
                              filterRoom={filterRoom}
                              filterTenant={filterTenant}
                              filterColor={filterColor}
                              filterMaterial={filterMaterial}
                              filterSize={filterSize}
                              sortOrder={sortOrder}
                              setSortOrder={setSortOrder}
                              setFilterCategory={setFilterCategory}
                              setFilterSubCategory={setFilterSubCategory}
                              setFilterType={setFilterType}
                              setFilterStatus={setFilterStatus}
                              setFilterBuilding={setFilterBuilding}
                              setFilterFloor={setFilterFloor}
                              setFilterRoom={setFilterRoom}
                              setFilterTenant={setFilterTenant}
                              setFilterColor={setFilterColor}
                              setFilterMaterial={setFilterMaterial}
                              setFilterSize={setFilterSize}
                              assetCategories={assetCategories}
                              filterSubCategories={filterSubCategories}
                              filterTypes={filterTypes}
                              assetStatuses={assetStatuses}
                              filterFloors={filterFloors}
                              filterRooms={filterRooms}
                              tenants={tenants}
                              filterCombinations={filterCombinations}
                              onClearFilters={clearAllFilters}
                              currentPage={currentPage}
                              itemsPerPage={itemsPerPage}
                              onPageChange={setCurrentPage}
                              onItemsPerPageChange={setItemsPerPage}
                              searchTerm={searchTerm}
                              onSearchChange={setSearchTerm}
                              selectedAssets={selectedAssets}
                              onSelectAsset={handleSelectAsset}
                              onSelectAllAssets={handleSelectAllAssets}
                              onSelectAllFiltered={handleSelectAllFiltered}
                              onClearSelection={() => setSelectedAssets(new Set())}
                              onTotalCountChange={(count) => {
                                // Update stats with actual total from AssetList
                                if (stats) {
                                  setStats({ ...stats, totalAssets: count });
                                }
                              }}
                            />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}









