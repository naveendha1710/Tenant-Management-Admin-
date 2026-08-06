import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssetService, Asset } from '@/services/assetService';
import { buildingService, Building } from '@/services/buildingService';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Edit, Trash2, Eye, Printer, FileSpreadsheet, Tag, Settings2, Check, FileText, Filter, X } from 'lucide-react';
// VirtualList: dynamically load react-window's FixedSizeList at runtime
// and fall back to a simple non-virtualized renderer when unavailable.
function VirtualList(props: any) {
  const { height, itemCount, itemSize, width, children } = props;
  const [RemoteList, setRemoteList] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    import('react-window')
      .then((mod) => {
        const Comp = (mod && (mod.FixedSizeList || (mod as any).default || (mod as any).default?.FixedSizeList));
        if (mounted && Comp) setRemoteList(() => Comp);
      })
      .catch(() => {
        // ignore and keep RemoteList null to use fallback
      });
    return () => { mounted = false; };
  }, []);

  if (RemoteList) {
    return (
      // eslint-disable-next-line react/jsx-props-no-spreading
      <RemoteList height={height} itemCount={itemCount} itemSize={itemSize} width={width}>
        {children}
      </RemoteList>
    );
  }

  // Fallback: simple mapped list (not virtualized)
  return (
    <div style={{ height, width, overflow: 'auto' }}>
      {Array.from({ length: itemCount }).map((_, index) => children({ index, style: { height: itemSize } }))}
    </div>
  );
}
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/pagination';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { generateAssetDetailExcel, generateAssetExcelReport } from '@/utils/assetExport';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { generateAssetLabelsPDF } from '@/utils/thermalPdfGenerator';
import { generateAssetDetailPDF } from '@/utils/assetPdfGenerator';
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
  // When true, the list is displayed in a read‑only tenant view. Edit and Delete actions are hidden.
  readOnly?: boolean;
  // When true, hide the selection checkboxes (used for tenant read‑only view).
  hideSelection?: boolean;
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
  setSortOrder?: (value: string) => void;
  setFilterCategory?: (value: string) => void;
  setFilterSubCategory?: (value: string) => void;
  setFilterType?: (value: string) => void;
  setFilterStatus?: (value: string) => void;
  setFilterBuilding?: (value: string) => void;
  setFilterFloor?: (value: string) => void;
  setFilterRoom?: (value: string) => void;
  setFilterTenant?: (value: string) => void;
  setFilterColor?: (value: string) => void;
  setFilterMaterial?: (value: string) => void;
  setFilterSize?: (value: string) => void;
  tenantId?: string;
  assetCategories?: string[];
  filterSubCategories?: string[];
  filterTypes?: string[];
  assetStatuses?: string[];
  filterFloors?: { id: string; floor_name?: string; floor_number?: string }[];
  filterRooms?: { id: string; room_number: string }[];
  tenants?: { id: string; company?: string; name?: string }[];
  filterCombinations?: { color?: string; material?: string; size?: string }[];
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
  onTotalCountChange?: (count: number) => void;
  onClearFilters?: () => void;
}

export default function AssetList({ onCreateNew, onEdit, onView, onDelete, readOnly, hideSelection, filterCategory, filterSubCategory, filterType, filterStatus, filterBuilding, filterFloor, filterRoom, filterTenant, filterColor, filterMaterial, filterSize, sortOrder, setSortOrder, setFilterCategory, setFilterSubCategory, setFilterType, setFilterStatus, setFilterBuilding, setFilterFloor, setFilterRoom, setFilterTenant, setFilterColor, setFilterMaterial, setFilterSize, assetCategories = [], filterSubCategories: filterSubCategoryOptions = [], filterTypes: filterTypeOptions = [], assetStatuses: assetStatusOptions = [], filterFloors: filterFloorOptions = [], filterRooms: filterRoomOptions = [], tenants: tenantOptions = [], filterCombinations: filterCombinationOptions = [], currentPage: propCurrentPage, itemsPerPage: propItemsPerPage, onPageChange, onItemsPerPageChange, searchTerm = '', onSearchChange, selectedAssets: propSelectedAssets, onSelectAsset, onSelectAllAssets, onSelectAllFiltered, onClearSelection, onTotalCountChange, onClearFilters }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Record<string, string>>({});
  const [rooms, setRooms] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Record<string, string>>({});
  const [assetCombinations, setAssetCombinations] = useState<Record<string, any>>({});
  const [tenants, setTenants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const currentSelectedAssets = propSelectedAssets ? Array.from(propSelectedAssets) : selectedAssets;
  // Keyset pagination state (cursor = last seen asset_id for paging)
  const [cursor, setCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<(string | null)[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  // Offset paging support for numeric page buttons (hybrid approach)
  // (Will be initialized after searchParams is defined)
  const MAX_OFFSET_PAGES = 50; // safe threshold for OFFSET-based jumps

  useEffect(() => {
    if (propCurrentPage !== undefined) setCurrentPage(propCurrentPage);
  }, [propCurrentPage]);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [showDeepJumpConfirm, setShowDeepJumpConfirm] = useState(false);
  const [deepJumpTarget, setDeepJumpTarget] = useState<number | null>(null);
  const [filterTenantSearch, setFilterTenantSearch] = useState('');
  const filterTenantSearchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Offset paging support for numeric page buttons (hybrid approach)
  // Initialize from URL "page" query param so that on first render the correct
  // offset page is used (avoids race condition with key‑set pagination).
  const [offsetPage, setOffsetPage] = useState<number | null>(() => {
    const urlPage = Number(searchParams.get('page') ?? 1);
    return urlPage > 1 ? urlPage : null;
  });
  // Initialize current page from prop or URL query param (default to 1)
  const initialPage = propCurrentPage ?? Number(searchParams.get('page') ?? 1);
  const [currentPage, setCurrentPage] = useState(initialPage);
  // Items per page state (default 10) – can be overridden via prop
  const [itemsPerPage, setItemsPerPage] = useState(propItemsPerPage || 10);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  // Guard to avoid resetting page on initial mount when filters change
  const isInitialMount = useRef(true);
  const activeFilterCount = [
    filterCategory,
    filterSubCategory,
    filterType,
    filterStatus,
    filterBuilding,
    filterFloor,
    filterRoom,
    filterTenant,
    filterColor,
    filterMaterial,
    filterSize,
  ].filter((value) => Boolean(value) && value !== 'all').length;

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
    // Load non-paged supporting data once or when relevant filters change
    loadBuildings();
    loadUsers();
    loadAssetCombinations();
    loadColumnPreferences();
    loadFloorsAndRooms();
    loadTenants();
  }, []);

  // Load assets when cursor, page size, offsetPage or filters change
  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, offsetPage, itemsPerPage, filterCategory, filterSubCategory, filterType, filterStatus, filterBuilding, filterFloor, filterRoom, filterTenant, searchTerm, sortOrder]);

  useEffect(() => {
    // Reset keyset pagination when filters/search change, but skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setCurrentPage(1);
    setPrevCursors([]);
    setCursor(null);
    setHasNextPage(false);
    setNextCursor(null);
    setOffsetPage(null);
    onPageChange?.(1);
    // Don't reload here - will be handled by the main useEffect triggered by dependencies
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
    setLoading(true);
    try {
      // Build a helper to apply filters to a Supabase query
      const applyFilters = (q: any) => {
        if (searchTerm) {
          q = q.or(`asset_name.ilike.%${searchTerm}%,asset_id.ilike.%${searchTerm}%`);
        }
        if (filterCategory && filterCategory !== 'all') q = q.eq('asset_category', filterCategory);
        if (filterSubCategory && filterSubCategory !== 'all') q = q.eq('asset_sub_category', filterSubCategory);
        if (filterType && filterType !== 'all') q = q.eq('asset_type', filterType);
        if (filterStatus && filterStatus !== 'all') q = q.eq('asset_status', filterStatus);
        if (filterBuilding && filterBuilding !== 'all') q = q.eq('building', filterBuilding);
        if (filterFloor && filterFloor !== 'all') q = q.eq('floor_id', filterFloor);
        if (filterRoom && filterRoom !== 'all') q = q.eq('room_id', filterRoom);
        if (filterTenant && filterTenant !== 'all') q = q.eq('handover_to', filterTenant);
        return q;
      };

      // Get total count (may be expensive for very large datasets)
      try {
        let countQuery: any = supabase.from('assets').select('id', { count: 'exact', head: true });
        countQuery = applyFilters(countQuery);
        const countRes = await countQuery;
        const total = countRes?.count ?? 0;
        setTotalCount(total);
        onTotalCountChange?.(total);
      } catch (err) {
        // Ignore count errors and leave totalCount as-is
        console.warn('Count query failed', err);
      }

      // If offsetPage is set, perform an OFFSET-based fetch for numeric page jumps
      if (offsetPage !== null) {
        const page = Math.max(1, offsetPage);
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        let offsetQuery: any = supabase.from('assets').select('*');
        offsetQuery = applyFilters(offsetQuery);
        const asc = sortOrder !== 'desc';
        offsetQuery = offsetQuery.order('asset_id', { ascending: asc });
        const { data: pageData, error: offsetErr, count: offsetCount } = await offsetQuery.range(from, to);
        if (offsetErr) throw offsetErr;

        const items = (pageData || []) as Asset[];
        setAssets(items);
        if (typeof offsetCount === 'number') setTotalCount(offsetCount);
        setHasNextPage(items.length === itemsPerPage && ((offsetCount ?? 0) > page * itemsPerPage || items.length === itemsPerPage));
        setNextCursor(items.length ? items[items.length - 1].asset_id : null);
        setCurrentPage(page);
        // keep offsetPage as-is to allow numeric navigation; caller can clear it if desired
        return;
      }

      // Fetch page with lookahead (itemsPerPage + 1) to detect next page
      let fetchQuery: any = supabase.from('assets').select('*');
      fetchQuery = applyFilters(fetchQuery);

      const asc = sortOrder !== 'desc';
      fetchQuery = fetchQuery.order('asset_id', { ascending: asc });

      if (cursor) {
        // Keyset: use asset_id comparator based on sort order
        if (asc) fetchQuery = fetchQuery.gt('asset_id', cursor);
        else fetchQuery = fetchQuery.lt('asset_id', cursor);
      }

      const limitCount = itemsPerPage + 1;
      fetchQuery = fetchQuery.limit(limitCount);

      const { data: fetched, error: fetchErr } = await fetchQuery;
      if (fetchErr) throw fetchErr;

      const pageData = (fetched || []) as Asset[];
      const hasNext = pageData.length > itemsPerPage;
      setHasNextPage(hasNext);

      const sliced = hasNext ? pageData.slice(0, itemsPerPage) : pageData;
      setAssets(sliced || []);

      // Set next cursor to last item's asset_id (for forward paging)
      if (sliced && sliced.length > 0) {
        setNextCursor(sliced[sliced.length - 1].asset_id || null);
      } else {
        setNextCursor(null);
      }

      // If cursor is null and no prevCursors, ensure currentPage is 1
      if (!cursor && prevCursors.length === 0) setCurrentPage(1);

    } catch (error) {
      console.error('Failed to load assets:', error);
      setAssets([]);
      setTotalCount(0);
      setHasNextPage(false);
      setNextCursor(null);
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

  const handleNext = () => {
    // If we're in offset mode or within safe OFFSET page range, use numeric jump
    if (offsetPage !== null || currentPage + 1 <= MAX_OFFSET_PAGES) {
      goToPage(currentPage + 1);
      return;
    }

    if (!hasNextPage) return;
    // push current cursor onto stack (can be null for first page)
    setPrevCursors(prev => [...prev, cursor]);
    // move cursor to nextCursor (set by last load)
    setCursor(nextCursor);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    onPageChange?.(nextPage);
  };

  const handlePrev = () => {
    // If we're in offset mode or within safe OFFSET page range, use numeric jump
    if (offsetPage !== null || (currentPage - 1 >= 1 && currentPage - 1 <= MAX_OFFSET_PAGES)) {
      goToPage(Math.max(1, currentPage - 1));
      return;
    }

    if (prevCursors.length === 0) return;
    const stack = [...prevCursors];
    const prevCursor = stack.pop() ?? null;
    setPrevCursors(stack);
    setCursor(prevCursor);
    const prevPage = Math.max(1, currentPage - 1);
    setCurrentPage(prevPage);
    onPageChange?.(prevPage);
  };

  const goToPage = (page: number) => {
    const target = Math.max(1, page);
    // Persist page in URL query params for navigation persistence
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(target));
    setSearchParams(newParams, { replace: true });
    if (target > MAX_OFFSET_PAGES) {
      // Ask user to confirm deep jump since large OFFSET queries can be slow
      setDeepJumpTarget(target);
      setShowDeepJumpConfirm(true);
      return;
    }
    // Use OFFSET-based fetch for numeric jumps within safe range (hybrid)
    setOffsetPage(target);
    // Clear keyset state
    setCursor(null);
    setPrevCursors([]);
    setHasNextPage(false);
    setNextCursor(null);
    setCurrentPage(target);
    onPageChange?.(target);
  };

  const confirmDeepJump = () => {
    if (!deepJumpTarget) return;
    const target = deepJumpTarget;
    setOffsetPage(target);
    setCursor(null);
    setPrevCursors([]);
    setHasNextPage(false);
    setNextCursor(null);
    setCurrentPage(target);
    onPageChange?.(target);
    setShowDeepJumpConfirm(false);
    setDeepJumpTarget(null);
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
    if (totalCount === 0) {
      toast({ title: 'No assets', description: 'Nothing to export', variant: 'destructive' });
      return;
    }
    try {
      toast({ title: 'Generating Report', description: `Fetching all ${totalCount} asset(s)...` });
      
      // Fetch all filtered assets without pagination
      let query = supabase
        .from('assets')
        .select('*');
      
      // Apply same filters
      if (searchTerm) {
        query = query.or(`asset_name.ilike.%${searchTerm}%,asset_id.ilike.%${searchTerm}%`);
      }
      if (filterCategory && filterCategory !== 'all') {
        query = query.eq('asset_category', filterCategory);
      }
      if (filterSubCategory && filterSubCategory !== 'all') {
        query = query.eq('asset_sub_category', filterSubCategory);
      }
      if (filterType && filterType !== 'all') {
        query = query.eq('asset_type', filterType);
      }
      if (filterStatus && filterStatus !== 'all') {
        query = query.eq('asset_status', filterStatus);
      }
      if (filterBuilding && filterBuilding !== 'all') {
        query = query.eq('building', filterBuilding);
      }
      if (filterFloor && filterFloor !== 'all') {
        query = query.eq('floor_id', filterFloor);
      }
      if (filterRoom && filterRoom !== 'all') {
        query = query.eq('room_id', filterRoom);
      }
      if (filterTenant && filterTenant !== 'all') {
        query = query.eq('handover_to', filterTenant);
      }
      
      // Apply sorting
      if (sortOrder === 'desc') {
        query = query.order('asset_id', { ascending: false });
      } else {
        query = query.order('asset_id', { ascending: true });
      }
      
      const { data: allAssets, error } = await query;
      
      if (error) throw error;
      
      if (!allAssets || allAssets.length === 0) {
        toast({ title: 'No assets', description: 'Nothing to export', variant: 'destructive' });
        return;
      }
      
      await generateAssetExcelReport(buildExportData(allAssets));
      toast({ title: 'Success', description: `Report downloaded with ${allAssets.length} asset(s)` });
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

  const handlePrintPDF = async () => {
    const selectedAssetData = assets.filter(a => currentSelectedAssets.includes(a.id));
    if (selectedAssetData.length === 0) {
      toast({ title: 'Error', description: 'No assets selected', variant: 'destructive' });
      return;
    }

    try {
      toast({ title: 'Generating PDF', description: `Creating detailed PDF for ${selectedAssetData.length} asset(s)...` });
      
      const pdf = await generateAssetDetailPDF(
        selectedAssetData,
        buildings,
        floors,
        rooms,
        users,
        tenants
      );

      pdf.save(`Asset_Details_${selectedAssetData.length}_Assets_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: 'Success', description: `PDF generated for ${selectedAssetData.length} asset(s)` });
    } catch (error: any) {
      console.error('PDF generation error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to generate PDF', variant: 'destructive' });
    }
  };





  const filteredAssets = assets; // Already filtered by server

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const paginatedAssets = assets; // Already paginated by server

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
      <Dialog open={showDeepJumpConfirm} onOpenChange={setShowDeepJumpConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jump to page {deepJumpTarget}</DialogTitle>
            <DialogDescription>Direct jumps beyond {MAX_OFFSET_PAGES} may be slow and can impact performance. Do you want to proceed?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeepJumpConfirm(false); setDeepJumpTarget(null); }}>Cancel</Button>
            <Button onClick={confirmDeepJump}>Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Asset Master</h1>
          {/* Hide the create asset button in read‑only mode */}
          {!readOnly && (
            <Button onClick={onCreateNew || (() => navigate('/assets/create'))}>
              <Plus className="mr-2 h-4 w-4" /> Create Asset
            </Button>
          )}
        </div>

        {currentSelectedAssets.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="text-blue-700 font-medium">{currentSelectedAssets.length} selected</span>
            {onSelectAllFiltered && currentSelectedAssets.length < totalCount && paginatedAssets.every(a => currentSelectedAssets.includes(a.id)) && (
              <>
                <span className="text-blue-300">·</span>
                <button onClick={onSelectAllFiltered} className="text-blue-600 hover:text-blue-800 font-medium hover:underline underline-offset-2">
                  Select all {totalCount}
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 relative">
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[42rem] max-w-[calc(100vw-2rem)] rounded-lg p-4" align="start">
              <div className="grid grid-cols-3 gap-3">
                <Select value={sortOrder} onValueChange={(value) => setSortOrder?.(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">↑ Ascending</SelectItem>
                    <SelectItem value="desc">↓ Descending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={(value) => setFilterCategory?.(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Asset Types</SelectItem>
                    {assetCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSubCategory} onValueChange={(value) => setFilterSubCategory?.(value)} disabled={!filterCategory || filterCategory === 'all'}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {filterSubCategoryOptions.map((subCategory) => (
                      <SelectItem key={subCategory} value={subCategory}>{subCategory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(value) => setFilterType?.(value)} disabled={!filterSubCategory || filterSubCategory === 'all'}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Sub Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sub Categories</SelectItem>
                    {filterTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus?.(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {assetStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterBuilding} onValueChange={(value) => setFilterBuilding?.(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>{building.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterFloor} onValueChange={(value) => setFilterFloor?.(value)} disabled={!filterBuilding || filterBuilding === 'all'}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {filterFloorOptions.map((floor) => (
                      <SelectItem key={floor.id} value={floor.id}>{floor.floor_name || floor.floor_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRoom} onValueChange={(value) => setFilterRoom?.(value)} disabled={!filterFloor || filterFloor === 'all'}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {filterRoomOptions.map((room) => (
                      <SelectItem key={room.id} value={room.id}>{room.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterTenant} onValueChange={(value) => { setFilterTenant?.(value); setFilterTenantSearch(''); }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Tenant" />
                  </SelectTrigger>
                  <SelectContent onAnimationEnd={() => filterTenantSearchRef.current?.focus()} onCloseAutoFocus={(event) => event.preventDefault()}>
                    <div className="px-2 py-1.5" onKeyDown={(event) => event.stopPropagation()}>
                      <Input
                        ref={filterTenantSearchRef}
                        placeholder="Search tenants..."
                        value={filterTenantSearch}
                        onChange={(event) => setFilterTenantSearch(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        className="h-8"
                      />
                    </div>
                    <SelectItem value="all">All Tenants</SelectItem>
                    {tenantOptions
                      .filter((tenant) => {
                        const query = filterTenantSearch.toLowerCase();
                        const label = (tenant.company || tenant.name || '').toLowerCase();
                        return !query || label.includes(query);
                      })
                      .map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>{tenant.company || tenant.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={filterColor} onValueChange={(value) => setFilterColor?.(value)} disabled={!filterType || filterType === 'all' || filterCombinationOptions.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colors</SelectItem>
                    {[...new Set(filterCombinationOptions.map((combination) => combination.color).filter(Boolean))].map((color) => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterMaterial} onValueChange={(value) => setFilterMaterial?.(value)} disabled={!filterType || filterType === 'all' || filterCombinationOptions.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Material" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Materials</SelectItem>
                    {[...new Set(filterCombinationOptions.map((combination) => combination.material).filter(Boolean))].map((material) => (
                      <SelectItem key={material} value={material}>{material}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterSize} onValueChange={(value) => setFilterSize?.(value)} disabled={!filterType || filterType === 'all' || filterCombinationOptions.length === 0}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    {[...new Set(filterCombinationOptions.map((combination) => combination.size).filter(Boolean))].map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          {currentSelectedAssets.length > 0 && (
            <>
              <Button onClick={handleThermalLabels} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
                <Tag className="mr-2 h-4 w-4" /> Print Labels ({currentSelectedAssets.length})
              </Button>
              <Button onClick={handlePrintPDF} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <FileText className="mr-2 h-4 w-4" /> Print PDF ({currentSelectedAssets.length})
              </Button>
            </>
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
            // Hide Export Report button in read‑only (tenant) view
            !readOnly && (
              <Button onClick={handleExportFiltered} variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Report ({totalCount})
              </Button>
            )
          )}
          {currentSelectedAssets.length > 0 && (
            <Button onClick={handleBulkDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({currentSelectedAssets.length})
            </Button>
          )}
        </div>

        {(filterCategory || filterSubCategory || filterType || filterStatus || filterBuilding || filterFloor || filterRoom || filterTenant || filterColor || filterMaterial || filterSize) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {filterCategory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterCategory}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterCategory?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterSubCategory && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterSubCategory}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterSubCategory?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterType && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterType}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterType?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterStatus && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterStatus}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterStatus?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterBuilding && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterBuilding}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterBuilding?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterFloor && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterFloor}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterFloor?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterRoom && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterRoom}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterRoom?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterTenant && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterTenant}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterTenant?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterColor && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterColor}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterColor?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterMaterial && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterMaterial}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterMaterial?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {filterSize && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{filterSize}</span>
                <Button variant="ghost" size="sm" onClick={() => setFilterSize?.('')}>
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={onClearFilters}>Clear all</Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="transition-colors data-[state=selected]:bg-muted border-b border-gray-200 hover:bg-transparent bg-gray-50">
                    {/* Selection checkbox column – hidden when hideSelection is true */}
                    {!hideSelection && (
                      <th className="h-12 px-4 text-left align-middle [&:has([role=checkbox])]:pr-0 w-12 text-gray-600 font-semibold uppercase text-xs">
                        <Checkbox 
                          checked={paginatedAssets.length > 0 && paginatedAssets.every(a => currentSelectedAssets.includes(a.id))}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                    )}

                    {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <th key={col.key} className="h-12 px-4 text-left align-middle [&:has([role=checkbox])]:pr-0 text-gray-600 font-semibold uppercase text-xs">{col.label}</th>
                    ))}
                    <th className="h-12 px-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-600 font-semibold uppercase text-xs text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {paginatedAssets.length === 0 ? (
                    <tr><td colSpan={ALL_COLUMNS.length + (hideSelection ? 1 : 2)} className="p-6 text-sm text-gray-500">No assets found.</td></tr>
                  ) : (
                    paginatedAssets.map(asset => (
                      <tr key={asset.id} className="data-[state=selected]:bg-muted border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        {/* Selection checkbox cell – hidden when hideSelection is true */}
                        {!hideSelection && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                            <Checkbox checked={currentSelectedAssets.includes(asset.id)} onCheckedChange={() => toggleAssetSelection(asset.id)} />
                          </td>
                        )}
                        {visibleColumns.includes('asset_id') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium text-gray-900">
                            {asset.asset_id && String(asset.asset_id).trim() ? asset.asset_id : 'AUTO-GENERATED'}
                          </td>
                        )}
                        {visibleColumns.includes('asset_name') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                            <div className="flex items-center gap-3">
                              {asset.asset_picture && (
                                <img src={asset.asset_picture} alt={asset.asset_name} className="w-10 h-10 rounded-lg object-cover" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{asset.asset_name}</p>
                                <p className="text-sm text-gray-500">
                                  {asset.asset_combination && assetCombinations[asset.asset_combination]
                                    ? [
                                        assetCombinations[asset.asset_combination].color,
                                        assetCombinations[asset.asset_combination].material,
                                        assetCombinations[asset.asset_combination].size,
                                      ].filter(Boolean).join(' | ')
                                    : asset.serial_number || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('asset_category') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                            <div>
                                <p className="font-medium text-gray-900">{asset.asset_sub_category || asset.asset_category || 'N/A'}</p>
                                {asset.asset_type && (
                                  <p className="text-sm text-gray-500 mt-1">{asset.asset_type}</p>
                                )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.includes('asset_status') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.asset_status || 'Active')}`}>
                              {asset.asset_status || 'Active'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.includes('location') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{getBuildingName(asset.building)}</td>
                        )}
                        {visibleColumns.includes('floor') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.floor_id ? (floors[asset.floor_id] || 'N/A') : 'N/A'}</td>
                        )}
                        {visibleColumns.includes('room') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.room_id ? (rooms[asset.room_id] || 'N/A') : 'N/A'}</td>
                        )}
                        {visibleColumns.includes('tenant') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.handover_to ? (tenants[asset.handover_to] || 'N/A') : 'N/A'}</td>
                        )}
                        {visibleColumns.includes('asset_value') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">₹{(asset.asset_value || asset.asset_cost || 0).toLocaleString()}</td>
                        )}
                        {visibleColumns.includes('serial_number') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.serial_number || 'N/A'}</td>
                        )}
                        {visibleColumns.includes('manufacturer') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.manufacturer || 'N/A'}</td>
                        )}
                        {visibleColumns.includes('make_model') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.make_model || 'N/A'}</td>
                        )}
                        {visibleColumns.includes('purchase_date') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}</td>
                        )}
                        {visibleColumns.includes('warranty_date') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.warranty_date ? new Date(asset.warranty_date).toLocaleDateString() : 'N/A'}</td>
                        )}
                        {visibleColumns.includes('sez_status') && (
                          <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-700">{asset.sez_status || 'N/A'}</td>
                        )}
                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" variant="ghost" onClick={() => onView ? onView(asset) : navigate(`/assets/view/${asset.id}`)} title="View" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {/* Edit button is hidden in read‑only mode */}
                            {!readOnly && (
                              <Button size="sm" variant="ghost" onClick={() => onEdit ? onEdit(asset) : navigate(`/assets/edit/${asset.id}`, { state: { returnPage: currentPage } })} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Delete button is hidden in read‑only mode */}
                            {!readOnly && (
                              <Button size="sm" variant="ghost" onClick={() => onDelete ? onDelete(asset) : handleDelete(asset.id)} title="Delete" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredAssets.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} assets
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
                  onPageChange={(page) => goToPage(page)}
                  showControls
                />
              </div>
            )}
          </div>
        )}

    </div>
  );
}
