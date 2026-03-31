import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssetService, Asset } from '@/services/assetService';
import { buildingService, Building } from '@/services/buildingService';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Edit, Trash2, Eye, Printer, FileSpreadsheet, Tag, Settings2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/pagination';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { generateAssetDetailExcel, generateAssetExcelReport } from '@/utils/assetExport';
import { useToast } from '@/hooks/use-toast';
import { generateAssetLabelsPDF } from '@/utils/thermalPdfGenerator';
import { useAuth } from '@/contexts/AuthContext';

const ALL_COLUMNS = [
  { key: 'asset_id',       label: 'Asset ID' },
  { key: 'asset_name',     label: 'Name' },
  { key: 'asset_category', label: 'Category' },
  { key: 'asset_status',   label: 'Status' },
  { key: 'location',       label: 'Building' },
  { key: 'floor',          label: 'Floor' },
  { key: 'room',           label: 'Room/Rack' },
  { key: 'tenant',         label: 'Tenant' },
  { key: 'asset_value',    label: 'Value' },
  { key: 'serial_number',  label: 'Serial Number' },
  { key: 'manufacturer',   label: 'Manufacturer' },
  { key: 'make_model',     label: 'Make/Model' },
  { key: 'purchase_date',  label: 'Purchase Date' },
  { key: 'warranty_date',  label: 'Warranty Expiry' },
  { key: 'sez_status',     label: 'SEZ Status' },
] as const;

type ColumnKey = typeof ALL_COLUMNS[number]['key'];
const DEFAULT_COLUMNS: ColumnKey[] = ['asset_id', 'asset_name', 'asset_category', 'asset_status', 'location', 'floor', 'room', 'asset_value'];

interface AssetListProps {
  onCreateNew?: () => void;
  onEdit?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  filterCategory?: string;
  filterSubCategory?: string;
  filterType?: string;
  filterStatus?: string;
  filterBuilding?: string;
  filterFloor?: string;
  filterRoom?: string;
  filterTenant?: string;
  filterColor?: string;
  filterMaterial?: string;
  filterSize?: string;
  sortOrder?: string;
  filteredCount?: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
  searchTerm?: string;
  onSearchChange?: (search: string) => void;
  selectedAssets?: Set<string>;
  onSelectAsset?: (assetId: string) => void;
  onSelectAllAssets?: (pageAssetIds: string[]) => void;
  onSelectAllFiltered?: () => void;
  onClearSelection?: () => void;
  filteredCount?: number;
}

export default function AssetList({ onCreateNew, onEdit, onView, onDelete, filterCategory, filterSubCategory, filterType, filterStatus, filterBuilding, filterFloor, filterRoom, filterTenant, filterColor, filterMaterial, filterSize, sortOrder, currentPage: propCurrentPage, itemsPerPage: propItemsPerPage, onPageChange, onItemsPerPageChange, searchTerm = '', onSearchChange, selectedAssets: propSelectedAssets, onSelectAsset, onSelectAllAssets, onSelectAllFiltered, onClearSelection, filteredCount }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, string>>({});
  const [assetCombinations, setAssetCombinations] = useState<Record<string, any>>({});
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  // Use prop selectedAssets if provided, otherwise use local state
  const currentSelectedAssets = propSelectedAssets ? Array.from(propSelectedAssets) : selectedAssets;
  const [currentPage, setCurrentPage] = useState(propCurrentPage || 1);
  const [itemsPerPage, setItemsPerPage] = useState(propItemsPerPage || 10);

  useEffect(() => {
    if (propCurrentPage !== undefined) setCurrentPage(propCurrentPage);
  }, [propCurrentPage]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const columnPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
        setShowColumnPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadAssets();
    loadBuildings();
    loadUsers();
    loadAssetCombinations();
    loadColumnPreferences();
    loadFloorsAndRooms();
    loadTenants();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    onPageChange?.(1);
  }, [filterCategory, filterSubCategory, filterType, filterStatus, filterBuilding, filterFloor, filterRoom, filterTenant, filterColor, filterMaterial, filterSize, searchTerm]);

  const loadTenants = async () => {
    const { data } = await supabase.from('tenants').select('id, name, company');
    if (data) setTenants(data.reduce((acc, t) => ({ ...acc, [t.id]: t.company || t.name }), {}));
  };

  const loadFloorsAndRooms = async () => {
    const { data: floorsData } = await supabase.from('floors').select('id, floor_name, floor_number');
    if (floorsData) {
      setFloors(floorsData.reduce((acc, f) => ({ ...acc, [f.id]: f.floor_name || `Floor ${f.floor_number}` }), {}));
    }
    const { data: roomsData } = await supabase.from('rooms').select('id, room_number');
    if (roomsData) {
      setRooms(roomsData.reduce((acc, r) => ({ ...acc, [r.id]: r.room_number }), {}));
    }
  };

  const loadColumnPreferences = async () => {
    const savedUser = localStorage.getItem('demo_user');
    if (!savedUser) return;
    const userId = JSON.parse(savedUser)?.id;
    if (!userId) return;
    const { data } = await supabase.from('users').select('asset_table_preferences').eq('id', userId).single();
    if (data?.asset_table_preferences?.columns?.length) {
      setVisibleColumns(data.asset_table_preferences.columns);
    }
  };

  const saveColumnPreferences = async (columns: ColumnKey[]) => {
    const savedUser = localStorage.getItem('demo_user');
    if (!savedUser) return;
    const userId = JSON.parse(savedUser)?.id;
    if (!userId) return;
    await supabase.from('users').update({ asset_table_preferences: { columns } }).eq('id', userId);
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      saveColumnPreferences(next);
      return next;
    });
  };

  const loadAssets = async () => {
    try {
      const data = await AssetService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    const data = await buildingService.getAllBuildings();
    setBuildings(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('id, name');
    if (data) {
      const userMap = data.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});
      setUsers(userMap);
    }
  };

  const loadAssetCombinations = async () => {
    try {
      const { data: combinations } = await supabase
        .from('sub_subcategory_combinations')
        .select('*')
        .eq('is_active', true);
      
      if (combinations) {
        const combinationMap = combinations.reduce((acc, combo) => {
          acc[combo.id] = combo;
          return acc;
        }, {} as Record<string, any>);
        setAssetCombinations(combinationMap);
      }
    } catch (error) {
      console.error('Failed to load asset combinations:', error);
    }
  };

  const getBuildingName = (buildingId?: string) => {
    if (!buildingId) return 'N/A';
    const building = buildings.find(b => b.id === buildingId);
    return building?.name || buildingId;
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this asset?')) {
      try {
        await AssetService.deleteAsset(id);
        loadAssets();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (currentSelectedAssets.length === 0) return;
    
    if (confirm(`Delete ${currentSelectedAssets.length} selected assets?`)) {
      try {
        await Promise.all(currentSelectedAssets.map(id => AssetService.deleteAsset(id)));
        if (!propSelectedAssets) {
          setSelectedAssets([]);
        }
        loadAssets();
        toast({ title: 'Success', description: `${currentSelectedAssets.length} assets deleted successfully` });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete some assets', variant: 'destructive' });
      }
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    if (onSelectAsset) {
      onSelectAsset(assetId);
    } else {
      // Fallback to local state if no prop handler provided
      setSelectedAssets(prev => 
        prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
      );
    }
  };

  const toggleSelectAll = () => {
    if (onSelectAllAssets) {
      onSelectAllAssets(paginatedAssets.map(a => a.id));
    } else {
      if (currentSelectedAssets.length === paginatedAssets.length && paginatedAssets.every(a => currentSelectedAssets.includes(a.id))) {
        setSelectedAssets(prev => prev.filter(id => !paginatedAssets.map(a => a.id).includes(id)));
      } else {
        setSelectedAssets(prev => [...new Set([...prev, ...paginatedAssets.map(a => a.id)])]);
      }
    }
  };

  const printQRCodes = async () => {
    const selectedAssetData = assets.filter(a => currentSelectedAssets.includes(a.id));
    if (selectedAssetData.length === 0) return;

    const printContainer = document.createElement('div');
    printContainer.id = 'print-qr-container';
    printContainer.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden; }
          #print-qr-container, #print-qr-container * { visibility: visible; }
          #print-qr-container { position: absolute; left: 0; top: 0; width: 100%; }
        }
        .qr-item { page-break-inside: avoid; margin: 20px; display: inline-block; text-align: center; border: 1px solid #ddd; padding: 15px; width: 180px; }
        .qr-canvas { width: 120px; height: 120px; margin: 0 auto; }
        .qr-id { margin: 10px 0 5px; font-weight: bold; font-size: 14px; }
        .qr-name { margin: 0; font-size: 12px; color: #666; }
      </style>
      ${selectedAssetData.map(asset => `
        <div class="qr-item">
          <div id="qr-${asset.id}" class="qr-canvas"></div>
          <p class="qr-id">${asset.asset_id}</p>
          <p class="qr-name">${asset.asset_name}</p>
        </div>
      `).join('')}
    `;
    
    document.body.appendChild(printContainer);

    const logo = new Image();
    logo.src = '/Logo/Rathinam Logo (No name).png';
    logo.crossOrigin = 'anonymous';
    
    await new Promise(resolve => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });

    for (const asset of selectedAssetData) {
      const qrElement = document.getElementById(`qr-${asset.id}`);
      if (qrElement) {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        
        await QRCode.toCanvas(canvas, asset.asset_id, { 
          width: 120, 
          margin: 0,
          errorCorrectionLevel: 'H'
        });
        
        const ctx = canvas.getContext('2d');
        if (ctx && logo.complete) {
          const logoSize = 30;
          const logoX = (120 - logoSize) / 2;
          const logoY = (120 - logoSize) / 2;
          
          ctx.fillStyle = 'white';
          ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        }
        
        qrElement.appendChild(canvas);
      }
    }

    setTimeout(() => {
      window.print();
      document.body.removeChild(printContainer);
    }, 500);
  };

const buildExportData = (toExport: typeof filteredAssets) => toExport.map(a => ({
    id: a.id,
    asset_id: a.asset_id,
    asset_name: a.asset_name,
    asset_category: a.asset_category,
    asset_sub_category: a.asset_sub_category,
    asset_type: a.asset_type,
    make_model: a.make_model,
    serial_number: a.serial_number,
    asset_status: a.asset_status,
    status: a.status,
    sez_status: a.sez_status,
    customs_category: a.customs_category,
    manufacturer: a.manufacturer,
    asset_description: a.asset_description,
    asset_spec: a.asset_spec,
    purchase_date: a.purchase_date,
    warranty_date: a.warranty_date,
    pm_date: a.pm_date,
    asset_value: a.asset_value,
    depreciation_date: a.depreciation_date,
    depreciation_percentage: a.depreciation_percentage,
    decommission_date: a.decommission_date,
    contract: a.contract,
    po_number: a.po_number,
    invoice_number: a.invoice_number,
    invoice_date: a.invoice_date,
    boe_number: a.boe_number,
    boe_date: a.boe_date,
    cif_value: a.cif_value,
    duty_foregone: a.duty_foregone_amount,
    import_date: a.import_date,
    asset_incharge: a.asset_incharge ? (users[a.asset_incharge] || a.asset_incharge) : undefined,
    building: getBuildingName(a.building),
    floor: a.floor_id ? (floors[a.floor_id] || a.floor_id) : undefined,
    room_rack: a.room_id ? (rooms[a.room_id] || a.room_id) : undefined,
    tenant_company: a.handover_to ? (tenants[a.handover_to] || undefined) : undefined,
    handover_other_name: a.handover_other_name,
    comments: a.comments,
  }));

  const handleExportSelected = async () => {
    const toExport = filteredAssets.filter(a => currentSelectedAssets.includes(a.id));
    if (toExport.length === 0) return;
    try {
      toast({ title: 'Exporting', description: `Exporting ${toExport.length} asset(s)...` });
      await generateAssetDetailExcel(buildExportData(toExport), `Asset_Details_Selected_${toExport.length}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: 'Success', description: 'Excel downloaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to export', variant: 'destructive' });
    }
  };

  const handleExportFiltered = async () => {
    if (filteredAssets.length === 0) {
      toast({ title: 'No assets', description: 'Nothing to export', variant: 'destructive' });
      return;
    }
    try {
      toast({ title: 'Generating Report', description: `Building report for ${filteredAssets.length} asset(s)...` });
      await generateAssetExcelReport(buildExportData(filteredAssets));
      toast({ title: 'Success', description: 'Report downloaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to export', variant: 'destructive' });
    }
  };

  const handleThermalLabels = async () => {
    const selectedAssetData = assets.filter(a => currentSelectedAssets.includes(a.id));
    if (selectedAssetData.length === 0) {
      toast({ title: 'Error', description: 'No assets selected', variant: 'destructive' });
      return;
    }
    
    try {
      toast({ title: 'Generating Labels', description: 'Please wait while we prepare your thermal labels...' });
      
      // Convert to AssetForPrint format
      const assetsForPrint = selectedAssetData.map(asset => ({
        asset_id: asset.asset_id,
        name: asset.asset_name || asset.asset_description || 'Asset'
      }));
      
      // Generate QR codes for selected assets with logo
      const qrCodes: Record<string, string> = {};
      const logo = new Image();
      logo.src = '/Logo/Rathinam Logo (No name Black ).png';
      logo.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        logo.onload = () => {
          resolve(true);
        };
        logo.onerror = (error) => {
          resolve(false); // Continue without logo
        };
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve(false);
        }, 5000);
      });
      
      for (const asset of selectedAssetData) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          
          await QRCode.toCanvas(canvas, asset.asset_id, { 
            width: 200, 
            margin: 1,
            errorCorrectionLevel: 'H'
          });
          
          const ctx = canvas.getContext('2d');
          if (ctx && logo.complete && logo.naturalWidth > 0) {
            const logoSize = 50;
            const logoX = (200 - logoSize) / 2;
            const logoY = (200 - logoSize) / 2;
            
            ctx.fillStyle = 'white';
            ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
          }
          
          const qrDataUrl = canvas.toDataURL('image/png');
          qrCodes[asset.asset_id] = qrDataUrl;
          
        } catch (error) {
          // Generate a simple placeholder QR without logo
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          await QRCode.toCanvas(canvas, asset.asset_id, { width: 200, margin: 1 });
          qrCodes[asset.asset_id] = canvas.toDataURL('image/png');
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
        description: `Thermal labels generated for ${currentSelectedAssets.length} asset(s)` 
      });
      
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to generate thermal labels', 
        variant: 'destructive' 
      });
    }
  };





  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.asset_id.toLowerCase().includes(searchTerm.toLowerCase());
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
      const combination = assetCombinations[a.asset_combination];
      if (combination) {
        const matchesColor = !filterColor || filterColor === 'all' || combination.color === filterColor;
        const matchesMaterial = !filterMaterial || filterMaterial === 'all' || combination.material === filterMaterial;
        const matchesSize = !filterSize || filterSize === 'all' || combination.size === filterSize;
        matchesCombination = matchesColor && matchesMaterial && matchesSize;
      } else {
        matchesCombination = false;
      }
    }
    
    return matchesSearch && matchesCategory && matchesSubCategory && matchesType && matchesStatus && matchesBuilding && matchesFloor && matchesRoom && matchesTenant && matchesCombination;
  }).sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.asset_id.localeCompare(a.asset_id);
    }
    return a.asset_id.localeCompare(b.asset_id);
  });

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'Idle': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'Repair': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Asset Master</h1>
          <Button onClick={onCreateNew || (() => navigate('/assets/create'))}>
            <Plus className="mr-2 h-4 w-4" /> Create Asset
          </Button>
        </div>

        {currentSelectedAssets.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="text-blue-700 font-medium">{currentSelectedAssets.length} selected</span>
            {onSelectAllFiltered && currentSelectedAssets.length < (filteredCount ?? filteredAssets.length) && paginatedAssets.every(a => currentSelectedAssets.includes(a.id)) && (
              <>
                <span className="text-blue-300">·</span>
                <button onClick={onSelectAllFiltered} className="text-blue-600 hover:text-blue-800 font-medium hover:underline underline-offset-2">
                  Select all {filteredCount ?? filteredAssets.length}
                </button>
              </>
            )}
            <span className="text-blue-300">·</span>
            <button onClick={onClearSelection} className="text-blue-400 hover:text-red-500 transition-colors font-medium">
              Clear
            </button>
          </div>
        )}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="pl-10"
            />
          </div>
          {currentSelectedAssets.length > 0 && (
            <Button onClick={handleThermalLabels} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
              <Tag className="mr-2 h-4 w-4" /> Print Labels ({currentSelectedAssets.length})
            </Button>
          )}
          <div className="relative" ref={columnPickerRef}>
            <Button variant="outline" onClick={() => setShowColumnPicker(p => !p)}>
              <Settings2 className="mr-2 h-4 w-4" /> Columns
            </Button>
            {showColumnPicker && (
              <div className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-52">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Toggle Columns</p>
                {ALL_COLUMNS.map(col => (
                  <div
                    key={col.key}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleColumn(col.key)}
                  >
                    <span className="text-sm text-gray-700">{col.label}</span>
                    {visibleColumns.includes(col.key) && <Check className="h-4 w-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          {currentSelectedAssets.length > 0 ? (
            <Button onClick={handleExportSelected} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Selected ({currentSelectedAssets.length})
            </Button>
          ) : (
            <Button onClick={handleExportFiltered} variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Report ({filteredAssets.length})
            </Button>
          )}
          {currentSelectedAssets.length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({currentSelectedAssets.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                  <TableHead className="w-12 text-gray-600 font-semibold uppercase text-xs">
                    <Checkbox 
                      checked={paginatedAssets.length > 0 && paginatedAssets.every(a => currentSelectedAssets.includes(a.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                    <TableHead key={col.key} className="text-gray-600 font-semibold uppercase text-xs">{col.label}</TableHead>
                  ))}
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssets.map((asset) => (
                  <TableRow key={asset.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <Checkbox 
                        checked={currentSelectedAssets.includes(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id)}
                      />
                    </TableCell>
                    {visibleColumns.includes('asset_id') && (
                      <TableCell className="font-medium text-gray-900">{asset.asset_id}</TableCell>
                    )}
                    {visibleColumns.includes('asset_name') && (
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {asset.asset_picture && (
                            <img src={asset.asset_picture} alt={asset.asset_name} className="w-10 h-10 rounded-lg object-cover" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{asset.asset_name}</p>
                            <p className="text-sm text-gray-500">{asset.serial_number || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('asset_category') && (
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{asset.asset_category}</p>
                          <div className="flex gap-1 mt-1">
                            {asset.asset_combination && assetCombinations[asset.asset_combination] ? (
                              <>
                                {assetCombinations[asset.asset_combination].color && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">{assetCombinations[asset.asset_combination].color}</span>
                                )}
                                {assetCombinations[asset.asset_combination].material && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">{assetCombinations[asset.asset_combination].material}</span>
                                )}
                                {assetCombinations[asset.asset_combination].size && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">{assetCombinations[asset.asset_combination].size}</span>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">{asset.asset_type || 'N/A'}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('asset_status') && (
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.asset_status || 'Active')}`}>
                          {asset.asset_status || 'Active'}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('location') && (
                      <TableCell className="text-gray-700">{getBuildingName(asset.building)}</TableCell>
                    )}
                    {visibleColumns.includes('floor') && (
                      <TableCell className="text-gray-700">{asset.floor_id ? (floors[asset.floor_id] || 'N/A') : 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('room') && (
                      <TableCell className="text-gray-700">{asset.room_id ? (rooms[asset.room_id] || 'N/A') : 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('tenant') && (
                      <TableCell className="text-gray-700">{asset.handover_to ? (tenants[asset.handover_to] || 'N/A') : 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('asset_value') && (
                      <TableCell className="text-gray-700">₹{(asset.asset_value || asset.asset_cost || 0).toLocaleString()}</TableCell>
                    )}
                    {visibleColumns.includes('serial_number') && (
                      <TableCell className="text-gray-700">{asset.serial_number || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('manufacturer') && (
                      <TableCell className="text-gray-700">{asset.manufacturer || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('make_model') && (
                      <TableCell className="text-gray-700">{asset.make_model || 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('purchase_date') && (
                      <TableCell className="text-gray-700">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('warranty_date') && (
                      <TableCell className="text-gray-700">{asset.warranty_date ? new Date(asset.warranty_date).toLocaleDateString() : 'N/A'}</TableCell>
                    )}
                    {visibleColumns.includes('sez_status') && (
                      <TableCell className="text-gray-700">{asset.sez_status || 'N/A'}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => onView ? onView(asset) : navigate(`/assets/view/${asset.id}`)} title="View" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onEdit ? onEdit(asset) : navigate(`/assets/edit/${asset.id}`)} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete ? onDelete(asset) : handleDelete(asset.id)} title="Delete" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredAssets.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} assets
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Per page:</label>
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => {
                        const newItemsPerPage = Number(e.target.value);
                        setItemsPerPage(newItemsPerPage);
                        setCurrentPage(1);
                        onItemsPerPageChange?.(newItemsPerPage);
                        onPageChange?.(1);
                      }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    onPageChange?.(page);
                  }}
                  showControls
                />
              </div>
            )}
          </div>
        )}

    </div>
  );
}
