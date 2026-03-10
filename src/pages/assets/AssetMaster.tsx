import { useState, useEffect } from 'react';
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
import { Package, DollarSign, Wrench, TrendingUp, Bell, X, Save, Ticket, Check, ChevronsUpDown, FileSpreadsheet, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssetList from './AssetList';
import { QRCodeSVG } from 'qrcode.react';
import { Combobox } from '@/components/ui/combobox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAssetExport } from '@/hooks/useAssetExport';
import { generateAssetExcelReport } from '@/utils/assetExport';

const ASSET_TYPE_MAPPING: Record<string, string[]> = {
  'IT Equipment': ['Laptop', 'Desktop', 'Monitor', 'Printer', 'Server'],
  'Furniture': ['Chair', 'Desk', 'Cabinet'],
  'Office Equipment': ['Printer'],
  'Machinery': []
};

export default function AssetMaster() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
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
  const [expandedMovement, setExpandedMovement] = useState<string | null>(null);
  const [bulkGeneration, setBulkGeneration] = useState(false);
  const [bulkQuantity, setBulkQuantity] = useState('');
  const [bulkAssetIds, setBulkAssetIds] = useState<string[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [assetInchargeUsers, setAssetInchargeUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterSubCategories, setFilterSubCategories] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [filterFloors, setFilterFloors] = useState<Floor[]>([]);
  const [filterCombinations, setFilterCombinations] = useState<any[]>([]);
  const [filterColor, setFilterColor] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showCategoryCards, setShowCategoryCards] = useState(false);
  const { fetchAssetsForExport, loading: exportLoading } = useAssetExport();
  const { toast } = useToast();
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

  useEffect(() => {
    if (formData.contract === 'Yes') {
      loadVendors();
    }
  }, [formData.contract]);

  useEffect(() => {
    if (formData.building) {
      loadFloors(formData.building);
    }
  }, [formData.building]);

  useEffect(() => {
    if (filterBuilding && filterBuilding !== 'all') {
      loadFilterFloors(filterBuilding);
    } else {
      setFilterFloors([]);
      setFilterFloor('');
    }
  }, [filterBuilding]);

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
      if (!subSubTypes.includes(formData.asset_type || '')) {
        updateField('asset_type', '');
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
      const { data: config } = await supabase
        .from('id_configs')
        .select('*')
        .eq('entity_type', 'asset')
        .eq('is_active', true)
        .single();

      if (!config) return;

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
      const data = await AssetService.getDashboardStats();
      setStats(data);
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
  };

  const loadFilterFloors = async (buildingId: string) => {
    const data = await buildingService.getFloorsByBuilding(buildingId);
    setFilterFloors(data);
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
        .from('users')
        .select('id, name, email, role, selected_roles');
      
      if (error) return;
      
      if (data) {
        const vendorUsers = data.filter(u => 
          u.role === 'Vendor' || (u.selected_roles && Array.isArray(u.selected_roles) && u.selected_roles.includes('Vendor'))
        );
        setVendors(vendorUsers);
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
        return;
      }
      
      // Get all combinations for this sub-subcategory
      const { data: combinations } = await supabase
        .from('sub_subcategory_combinations')
        .select('*')
        .eq('sub_subcategory_id', subSubCategory.id)
        .eq('is_active', true);
      
      if (combinations) {
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
      }
    } catch (error) {
      console.error('Failed to load asset combinations:', error);
      setAssetCombinations([]);
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
    try {
      const data = await AssetService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const generateAssetId = async () => {
    try {
      const configData = (window as any).assetDropdownConfig || [];
      if (configData.length === 0) {
        setGeneratedAssetId('AUTO-GENERATED');
        return;
      }

      const { data: config, error } = await supabase
        .from('id_configs')
        .select('*')
        .eq('entity_type', 'asset')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !config) {
        setGeneratedAssetId('AUTO-GENERATED');
        return;
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
    } catch (error) {
      console.error('Failed to generate asset ID:', error);
      setGeneratedAssetId('AUTO-GENERATED');
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
    setShowForm(true);
  };

  const handleEdit = (asset: Asset) => {
    setFormData(asset);
    setEditingAsset(asset);
    setViewMode(false);
    setShowForm(true);
  };

  const handleView = async (asset: Asset) => {
    setFormData(asset);
    setEditingAsset(asset);
    setViewMode(true);
    setShowForm(true);
    loadAssetTickets(asset.id);
    loadAssetAudits(asset.asset_id);
    loadAssetHistory(asset.id);
    loadAssetMovements(asset.asset_id);
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
      const cleanData = { ...formData };
      if (cleanData.contract === 'No' || !cleanData.vendor_id) {
        delete cleanData.vendor_id;
      }
      if (!cleanData.customs_category) {
        delete cleanData.customs_category;
      }
      if (!cleanData.asset_combination) {
        delete cleanData.asset_combination;
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
          const promises = bulkAssetIds.map((assetId) => {
            const assetData = { ...cleanData, asset_id: assetId };
            return AssetService.createAsset(assetData);
          });
          
          await Promise.all(promises);
          toast({ title: 'Success', description: `${parseInt(bulkQuantity)} assets created successfully` });
        } else {
          // Single creation
          cleanData.asset_id = generatedAssetId;
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

  const handleExportReport = async () => {
    try {
      toast({ title: 'Generating Report', description: 'Please wait while we prepare your Excel report...' });
      const assets = await fetchAssetsForExport();
      await generateAssetExcelReport(assets);
      toast({ title: 'Success', description: 'Excel report downloaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate report', variant: 'destructive' });
    }
  };

  // Calculate filtered assets for count display
  const filteredAssets = assets.filter(a => {
    const matchesCategory = !filterCategory || filterCategory === 'all' || a.asset_category === filterCategory;
    const matchesSubCategory = !filterSubCategory || filterSubCategory === 'all' || a.asset_sub_category === filterSubCategory;
    const matchesType = !filterType || filterType === 'all' || a.asset_type === filterType;
    const matchesStatus = !filterStatus || filterStatus === 'all' || a.asset_status === filterStatus;
    const matchesBuilding = !filterBuilding || filterBuilding === 'all' || a.building === filterBuilding;
    const matchesFloor = !filterFloor || filterFloor === 'all' || a.floor === filterFloor;
    
    // Combination filters
    let matchesCombination = true;
    if (a.asset_combination && (filterColor || filterMaterial || filterSize)) {
      // Need to load combination data for filtering
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
    
    return matchesCategory && matchesSubCategory && matchesType && matchesStatus && matchesBuilding && matchesFloor && matchesCombination;
  });

  return (
    <DashboardLayout title="Asset Master" subtitle="Manage assets and inventory">
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAssets || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Asset Value (Gross)</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(stats?.assetValueGross || 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Asset Value (Net)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(stats?.assetValueNet || 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
                <Wrench className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.underMaintenance || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowCategoryCards(!showCategoryCards)}>
              <h3 className="text-sm font-medium text-gray-700">Asset Categories</h3>
              {showCategoryCards ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
            </div>
            {showCategoryCards && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {assetCategories.map((cat, idx) => {
                  const count = stats?.assetsByCategory?.[cat] || 0;
                  const colors = [
                    'bg-blue-100 border-blue-300 hover:bg-blue-200',
                    'bg-green-100 border-green-300 hover:bg-green-200',
                    'bg-purple-100 border-purple-300 hover:bg-purple-200',
                    'bg-orange-100 border-orange-300 hover:bg-orange-200',
                    'bg-pink-100 border-pink-300 hover:bg-pink-200',
                    'bg-cyan-100 border-cyan-300 hover:bg-cyan-200'
                  ];
                  return (
                    <Card key={cat} className={`cursor-pointer hover:shadow-md transition-shadow border ${colors[idx % colors.length]}`} onClick={() => { setFilterCategory(cat); setFilterSubCategory(''); setFilterType(''); }}>
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-xs font-medium text-muted-foreground">{cat}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="text-lg font-bold">{count}</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {showForm ? (
            <div className="bg-gray-50 -m-6 p-6">
              <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{editingAsset ? (viewMode ? 'View Asset' : 'Edit Asset') : 'Create New Asset'}</h1>
                    <p className="text-sm text-gray-500 mt-1">{viewMode ? 'Asset details' : 'Update asset information'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {!editingAsset && generatedAssetId && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Asset ID:</span>
                        <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded font-mono text-sm text-blue-600 font-semibold">
                          {generatedAssetId}
                        </div>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3">
                    {viewMode ? (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Basic Information</h2>
                          <div className="grid grid-cols-3 gap-6">
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
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Building</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{buildings.find(b => b.id === formData.building)?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Floor</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{floors.find(f => f.id === formData.floor)?.floor_name || floors.find(f => f.id === formData.floor)?.floor_number || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Room/Rack</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.room_rack || 'N/A'}</p>
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
                          <TabsList>
                            <TabsTrigger value="status">Status & Maintenance</TabsTrigger>
                            <TabsTrigger value="sez">SEZ & Customs</TabsTrigger>
                            <TabsTrigger value="tickets">Tickets</TabsTrigger>
                            <TabsTrigger value="history">Movement History</TabsTrigger>
                            <TabsTrigger value="audits">Physical Audits</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="status" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="grid grid-cols-3 gap-6">
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
                              <div className="grid grid-cols-3 gap-6">
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
                                <div className="overflow-x-auto">
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
                                            <TabsList className="grid w-full grid-cols-3">
                                              <TabsTrigger value="location">Location</TabsTrigger>
                                              <TabsTrigger value="handover">Tenant/Handover</TabsTrigger>
                                              <TabsTrigger value="details">Details</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="location" className="mt-4">
                                              <div className="grid grid-cols-2 gap-6">
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
                                <div className="overflow-x-auto">
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
                      <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                          <div className="border-l-4 border-blue-700 pl-3 mb-6">
                            <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
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
                            <label className="text-sm font-medium text-gray-700">Category</label>
                            <Combobox
                              value={formData.asset_sub_category || ''}
                              onValueChange={(v) => updateField('asset_sub_category', v)}
                              options={assetSubCategories.map(sub => ({ value: sub, label: sub }))}
                              placeholder="Select category"
                              searchPlaceholder="Search category..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Sub Category</label>
                            <Combobox
                              value={formData.asset_type || ''}
                              onValueChange={(v) => updateField('asset_type', v)}
                              options={assetTypes.map(type => ({ value: type, label: type }))}
                              placeholder="Select sub category"
                              searchPlaceholder="Search sub category..."
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Combination (Color | Material | Size)</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between h-11 border-gray-300 focus:border-primary focus:ring-primary/20"
                                  disabled={!formData.asset_type || assetCombinations.length === 0}
                                >
                                  {formData.asset_combination ? 
                                    assetCombinations.find(combo => combo.value === formData.asset_combination)?.label || 'Select combination'
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
                          <div className="grid grid-cols-3 gap-4">
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
                              <Select value={formData.floor || ''} onValueChange={(v) => updateField('floor', v)} disabled={viewMode || !formData.building}>
                                <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                  <SelectValue placeholder="Select floor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {floors.map(f => <SelectItem key={f.id} value={f.id}>{f.floor_name || f.floor_number}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Room/Rack</label>
                              <Input value={formData.room_rack || ''} onChange={(e) => updateField('room_rack', e.target.value)} placeholder="Enter room/rack" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
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
                          <TabsList>
                            <TabsTrigger value="status">Status & Maintenance</TabsTrigger>
                            <TabsTrigger value="sez">SEZ & Customs</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="status" className="mt-4">
                            <div className="bg-white rounded-lg shadow-sm p-6">
                              <div className="grid grid-cols-3 gap-4">
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
                              <div className="grid grid-cols-2 gap-4">
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
                        </Tabs>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">ASSET PICTURE</h3>
                    {viewMode ? (
                      formData.asset_picture ? (
                        <img src={formData.asset_picture} alt="Asset" className="w-full h-40 object-cover rounded-md" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-40 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-400">No image</p>
                        </div>
                      )
                    ) : (
                      <>
                        {formData.asset_picture ? (
                          <div className="relative">
                            <img src={formData.asset_picture} alt="Asset" className="w-full h-40 object-cover rounded-md" />
                            <button
                              onClick={() => updateField('asset_picture', '')}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-40 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-blue-500">
                            <div className="flex flex-col items-center space-y-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-gray-400">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="17 8 12 3 7 8"/>
                                <line x1="12" x2="12" y1="3" y2="15"/>
                              </svg>
                              <span className="text-xs text-gray-600 text-center">Drop image or click</span>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const uploadFormData = new FormData();
                                  uploadFormData.append('file', file);
                                  const response = await fetch(`/api/upload?category=asset_pictures`, { method: 'POST', body: uploadFormData });
                                  const result = await response.json();
                                  if (result.success) {
                                    updateField('asset_picture', result.file.url);
                                    toast({ title: 'Success', description: 'Image uploaded successfully' });
                                  } else {
                                    toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
                                  }
                                } catch (error) {
                                  toast({ title: 'Error', description: 'Failed to upload image', variant: 'destructive' });
                                }
                              }
                            }} />
                          </label>
                        )}
                      </>
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
                          <p className="text-xs text-gray-500">Last Updated By</p>
                          <p className="text-sm text-gray-900 mt-1">{editingAsset.updated_by || 'N/A'}</p>
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
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    {!viewMode && (
                      <>
                        <Button variant="outline" onClick={() => setShowForm(false)} className="px-6 py-2 border-gray-300">
                          Cancel
                        </Button>
                        <Button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={duplicateIds.length > 0}>
                          <Save className="h-4 w-4 mr-2" />
                          {editingAsset ? 'Save Changes' : bulkGeneration ? `Create ${parseInt(bulkQuantity) || 0} Assets` : 'Create Asset'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 items-center p-4 bg-white rounded-lg border">
                <div className="flex gap-4 flex-1 flex-wrap">
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">↑ Ascending</SelectItem>
                      <SelectItem value="desc">↓ Descending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Asset Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Asset Types</SelectItem>
                      {assetCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSubCategory} onValueChange={setFilterSubCategory} disabled={!filterCategory || filterCategory === 'all'}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {filterSubCategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterType} onValueChange={setFilterType} disabled={!filterSubCategory || filterSubCategory === 'all'}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Sub Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sub Categories</SelectItem>
                      {filterTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {assetStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Building" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buildings</SelectItem>
                      {buildings.map(building => (
                        <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterFloor} onValueChange={setFilterFloor} disabled={!filterBuilding || filterBuilding === 'all'}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Floor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Floors</SelectItem>
                      {filterFloors.map(floor => (
                        <SelectItem key={floor.id} value={floor.id}>{floor.floor_name || floor.floor_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterColor} onValueChange={setFilterColor} disabled={!filterType || filterType === 'all' || filterCombinations.length === 0}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colors</SelectItem>
                      {[...new Set(filterCombinations.map(c => c.color).filter(Boolean))].map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterMaterial} onValueChange={setFilterMaterial} disabled={!filterType || filterType === 'all' || filterCombinations.length === 0}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Materials</SelectItem>
                      {[...new Set(filterCombinations.map(c => c.material).filter(Boolean))].map(material => (
                        <SelectItem key={material} value={material}>{material}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterSize} onValueChange={setFilterSize} disabled={!filterType || filterType === 'all' || filterCombinations.length === 0}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sizes</SelectItem>
                      {[...new Set(filterCombinations.map(c => c.size).filter(Boolean))].map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                  <div className="text-xs text-blue-600 font-medium">Filtered Assets</div>
                  <div className="text-lg font-bold text-blue-700">{filteredAssets.length}</div>
                </div>
              </div>
              <AssetList 
                onCreateNew={handleCreateNew} 
                onEdit={handleEdit} 
                onView={handleView} 
                filterCategory={filterCategory}
                filterSubCategory={filterSubCategory}
                filterType={filterType}
                filterStatus={filterStatus}
                filterBuilding={filterBuilding}
                filterFloor={filterFloor}
                filterColor={filterColor}
                filterMaterial={filterMaterial}
                filterSize={filterSize}
                sortOrder={sortOrder}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}


