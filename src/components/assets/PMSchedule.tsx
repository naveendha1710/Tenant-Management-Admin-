import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Search, Filter, Plus, Eye, RefreshCw, X, FileText, Download } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pagination } from '@/components/ui/pagination';
import PMReportModal from '@/components/reports/PMReportModal';
import { exportPMReport } from '@/services/pmExcelExportService';
import type { PMReportType, PMReportResponse } from '@/types/pmReports';
import type { PMAsset } from '@/types/pm.types';

const fetchInChunks = async <T,>(
  items: string[],
  chunkSize: number,
  fetcher: (chunk: string[]) => Promise<T[]>
): Promise<T[]> => {
  if (!items || items.length === 0) return [];
  const results: T[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const data = await fetcher(chunk);
    if (data && data.length > 0) {
      results.push(...data);
    }
  }
  return results;
};

interface PMScheduleProps {
  paginatedAssets: PMAsset[];
  totalAssets: number;
  onViewAsset: (assetId: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
}

export const PMSchedule: React.FC<PMScheduleProps> = ({ onViewAsset, paginatedAssets, totalAssets, onRefresh, onExport }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Schedule PM State
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [assetSelectionPage, setAssetSelectionPage] = useState(1);
  const [assetSelectionItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubCategory, setFilterSubCategory] = useState('all');
  const [filterSubCategories, setFilterSubCategories] = useState<string[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [assetStatuses, setAssetStatuses] = useState<string[]>([]);
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [filterFloor, setFilterFloor] = useState('all');
  const [floors, setFloors] = useState<any[]>([]);
  const [filterRoom, setFilterRoom] = useState('all');
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenants, setTenants] = useState<any[]>([]);
  const [filterColor, setFilterColor] = useState('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [filterSize, setFilterSize] = useState('all');
  const [filterCombinations, setFilterCombinations] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [assetCategories, setAssetCategories] = useState<string[]>([]);

  // PM Form
  const [pmStartDate, setPmStartDate] = useState('');
  const [pmEndDate, setPmEndDate] = useState('');
  const [pmFrequency, setPmFrequency] = useState('30');
  const [loading, setLoading] = useState(false);
  const [scheduledAssets, setScheduledAssets] = useState([]);

  useEffect(() => {
    loadScheduledAssets();
    loadAllAssets();
    loadFilterData();
    loadUsers();
  }, []);

  const loadScheduledAssets = async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('pm_task_instances')
        .update({ status: 'OVERDUE' })
        .lt('task_date', today)
        .neq('status', 'COMPLETED')
        .neq('status', 'OVERDUE');
      
      await supabase
        .from('pm_task_instances')
        .update({ status: 'PENDING' })
        .eq('task_date', today)
        .neq('status', 'COMPLETED')
        .neq('status', 'PENDING');
      
      await supabase
        .from('pm_task_instances')
        .update({ status: 'UPCOMING' })
        .gt('task_date', today)
        .neq('status', 'COMPLETED')
        .neq('status', 'UPCOMING');
      
      const { data: pmSchedules } = await supabase
        .from('preventive_maintenance')
        .select('asset_id, pm_next_date, pm_frequency_days, assigned_to')
        .eq('pm_enabled', true)
        .not('pm_next_date', 'is', null);

      if (!pmSchedules || pmSchedules.length === 0) {
        setScheduledAssets([]);
        setLoading(false);
        return;
      }

      const assetIds = pmSchedules.map(pm => pm.asset_id).filter(Boolean);
      const pmNextDates = [...new Set(pmSchedules.map(pm => pm.pm_next_date).filter(Boolean))];

      const taskInstances = await fetchInChunks(assetIds, 50, async (chunk) => {
        const { data } = await supabase
          .from('pm_task_instances')
          .select('asset_id, status, task_date')
          .in('asset_id', chunk)
          .in('task_date', pmNextDates);
        return data || [];
      });
      
      const taskStatusMap = new Map(taskInstances.map(t => [t.asset_id, t.status]));
      
      const assetsData = await fetchInChunks(assetIds, 50, async (chunk) => {
        const { data } = await supabase
          .from('assets')
          .select('id, asset_id, asset_name, status, handover_to, building, floor_id')
          .in('id', chunk);
        return data || [];
      });

      if (assetsData && assetsData.length > 0) {
        const tenantIds = [...new Set(assetsData.map(a => a.handover_to).filter(Boolean))];
        const buildingIds = [...new Set(assetsData.map(a => a.building).filter(Boolean))];
        const floorIds = [...new Set(assetsData.map(a => a.floor_id).filter(Boolean))];
        const assignedUserIds = [...new Set(pmSchedules.map(pm => pm.assigned_to).filter(Boolean))];

        const [tenantsData, buildingsData, floorsData, usersData] = await Promise.all([
          fetchInChunks(tenantIds, 50, async chunk => (await supabase.from('tenants').select('id, company, name').in('id', chunk)).data || []),
          fetchInChunks(buildingIds, 50, async chunk => (await supabase.from('buildings').select('id, name').in('id', chunk)).data || []),
          fetchInChunks(floorIds, 50, async chunk => (await supabase.from('floors').select('id, floor_name, floor_number').in('id', chunk)).data || []),
          fetchInChunks(assignedUserIds, 50, async chunk => (await supabase.from('users').select('id, name').in('id', chunk)).data || [])
        ]);

        const tenantMap = new Map(tenantsData.map(t => [t.id, t.company || t.name]));
        const buildingMap = new Map(buildingsData.map(b => [b.id, b.name]));
        const floorMap = new Map(floorsData.map(f => [f.id, f.floor_name || f.floor_number]));
        const userMap = new Map(usersData.map(u => [u.id, u.name]));

        const uniqueTenants = tenantsData.map(t => ({ id: t.id, company: t.company || t.name }));
        setTenants(uniqueTenants);

        const pmMap = new Map(pmSchedules.map(pm => [pm.asset_id, pm]));

        const formatted = assetsData.map(asset => {
          const pm = pmMap.get(asset.id);
          const pmDate = pm?.pm_next_date || '';
          
          let pmStatus: 'overdue' | 'due' | 'upcoming' = 'upcoming';
          const taskInstanceStatus = taskStatusMap.get(asset.id);
          if (taskInstanceStatus === 'OVERDUE') {
            pmStatus = 'overdue';
          } else if (taskInstanceStatus === 'PENDING') {
            pmStatus = 'due';
          } else if (taskInstanceStatus === 'UPCOMING') {
            pmStatus = 'upcoming';
          } else if (pmDate) {
            const today = new Date();
            const pm = new Date(pmDate);
            const diffDays = Math.ceil((pm.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) pmStatus = 'overdue';
            else if (diffDays <= 7) pmStatus = 'due';
            else pmStatus = 'upcoming';
          }

          return {
            id: asset.id,
            asset_id: asset.asset_id,
            asset_name: asset.asset_name,
            tenant_name: tenantMap.get(asset.handover_to) || 'Unassigned',
            tenant_id: asset.handover_to,
            building_name: buildingMap.get(asset.building) || 'N/A',
            floor_name: floorMap.get(asset.floor_id) || 'N/A',
            status: asset.status || 'Working',
            pm_date: pmDate,
            pm_frequency: pm?.pm_frequency_days || 0,
            assigned_to_name: pm?.assigned_to ? userMap.get(pm.assigned_to) : 'Unassigned',
            pmStatus
          };
        });

        setScheduledAssets(formatted);
      }
    } catch (error) {
      console.error('Failed to load scheduled assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load PM schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAllAssets = async () => {
    try {
      const { data: assets } = await supabase
        .from('assets')
        .select('id, asset_id, asset_name, asset_category, asset_sub_category, asset_type, asset_status, status, building, floor_id, room_id, handover_to, asset_combination')
        .order('asset_name');

      if (!assets) return;

      const buildingIds = [...new Set(assets.map(a => a.building).filter(Boolean))];
      const floorIds = [...new Set(assets.map(a => a.floor_id).filter(Boolean))];

      const [buildingsData, floorsData] = await Promise.all([
        fetchInChunks(buildingIds, 50, async chunk => (await supabase.from('buildings').select('id, name').in('id', chunk)).data || []),
        fetchInChunks(floorIds, 50, async chunk => (await supabase.from('floors').select('id, floor_name, floor_number').in('id', chunk)).data || [])
      ]);

      const buildingMap = new Map(buildingsData.map(b => [b.id, b.name]));
      const floorMap = new Map(floorsData.map(f => [f.id, f.floor_name || f.floor_number]));

      const formatted = assets.map(asset => {
        let color = '';
        let material = '';
        let size = '';
        if (asset.asset_combination && typeof asset.asset_combination === 'object') {
          color = asset.asset_combination.color || '';
          material = asset.asset_combination.material || '';
          size = asset.asset_combination.size || '';
        }
        return {
          ...asset,
          color,
          material,
          size,
          building_name: buildingMap.get(asset.building) || 'N/A',
          floor_name: floorMap.get(asset.floor_id) || 'N/A'
        };
      });

      setAllAssets(formatted);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const loadFilterData = async () => {
    try {
      const [catsRes, subsRes, subSubsRes, buildingsRes, tenantsRes, statusesRes] = await Promise.all([
        supabase.from('form_dropdowns').select('*').eq('form_type', 'asset').order('name'),
        supabase.from('form_subcategories').select('*').eq('form_type', 'asset'),
        supabase.from('form_sub_subcategories').select('*').eq('form_type', 'asset'),
        supabase.from('buildings').select('id, name').order('name'),
        supabase.from('tenants').select('id, company, name').order('company'),
        supabase.from('form_dropdowns').select('name').eq('form_type', 'asset_status').order('name')
      ]);

      const configData = catsRes.data?.map(cat => ({
        name: cat.name,
        subTypes: subsRes.data?.filter(s => s.category_id === cat.id).map(s => ({
          name: s.name,
          subTypes: subSubsRes.data?.filter(ss => ss.subcategory_id === s.id).map(ss => ({
            name: ss.name
          })) || []
        })) || []
      })) || [];

      (window as any).assetDropdownConfig = configData;
      setAssetCategories(configData.map((c: any) => c.name));
      setBuildings(buildingsRes.data || []);
      setTenants(tenantsRes.data?.map(t => ({ id: t.id, company: t.company || t.name })) || []);
      setAssetStatuses(statusesRes.data?.map(s => s.name) || ['Working', 'Not Working', 'Under Maintenance', 'Scrapped', 'In Storage']);
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };

  const loadFilterCombinations = async (assetType: string) => {
    try {
      const { data: subSubCategory } = await supabase
        .from('form_sub_subcategories')
        .select('id')
        .eq('name', assetType)
        .eq('form_type', 'asset')
        .maybeSingle();
      
      if (!subSubCategory) {
        setFilterCombinations([]);
        return;
      }
      
      const { data: combinations } = await supabase
        .from('sub_subcategory_combinations')
        .select('*')
        .eq('sub_subcategory_id', subSubCategory.id)
        .eq('is_active', true);
        
      setFilterCombinations(combinations || []);
    } catch (error) {
      console.error('Failed to load filter combinations:', error);
      setFilterCombinations([]);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('asset_auditor', true)
        .order('name');

      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  useEffect(() => {
    if (filterBuilding && filterBuilding !== 'all') {
      supabase
        .from('floors')
        .select('id, floor_name, floor_number')
        .eq('building_id', filterBuilding)
        .order('floor_number')
        .then(({ data }) => setFloors(data || []));
    } else {
      setFloors([]);
      setFilterFloor('all');
      setRooms([]);
      setFilterRoom('all');
    }
  }, [filterBuilding]);

  useEffect(() => {
    if (filterFloor && filterFloor !== 'all') {
      supabase
        .from('rooms')
        .select('id, room_number')
        .eq('floor_id', filterFloor)
        .order('room_number')
        .then(({ data }) => setRooms(data || []));
    } else {
      setRooms([]);
      setFilterRoom('all');
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
      setFilterSubCategory('all');
      setFilterTypes([]);
      setFilterType('all');
      setFilterCombinations([]);
      setFilterColor('all');
      setFilterMaterial('all');
      setFilterSize('all');
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
      setFilterType('all');
      setFilterCombinations([]);
      setFilterColor('all');
      setFilterMaterial('all');
      setFilterSize('all');
    }
  }, [filterSubCategory]);

  useEffect(() => {
    if (filterType && filterType !== 'all') {
      loadFilterCombinations(filterType);
    } else {
      setFilterCombinations([]);
      setFilterColor('all');
      setFilterMaterial('all');
      setFilterSize('all');
    }
  }, [filterType]);

  const clearAllFilters = () => {
    setFilterCategory('all');
    setFilterSubCategory('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterBuilding('all');
    setFilterFloor('all');
    setFilterRoom('all');
    setTenantFilter('all');
    setFilterColor('all');
    setFilterMaterial('all');
    setFilterSize('all');
    setAssetSearch('');
    setFilterSubCategories([]);
    setFilterTypes([]);
    setFloors([]);
    setRooms([]);
    setFilterCombinations([]);
  };

  const activeFilterCount = [
    filterCategory !== 'all',
    filterSubCategory !== 'all',
    filterType !== 'all',
    filterStatus !== 'all',
    filterBuilding !== 'all',
    filterFloor !== 'all',
    filterRoom !== 'all',
    tenantFilter !== 'all',
    filterColor !== 'all',
    filterMaterial !== 'all',
    filterSize !== 'all',
    assetSearch !== ''
  ].filter(Boolean).length;

  const filteredAssets = allAssets.filter(a => {
    const matchesSearch = !assetSearch || 
      a.asset_name?.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.asset_id?.toLowerCase().includes(assetSearch.toLowerCase());
      
    const matchesCategory = !filterCategory || filterCategory === 'all' || a.asset_category === filterCategory;
    const matchesSubCategory = !filterSubCategory || filterSubCategory === 'all' || a.asset_sub_category === filterSubCategory;
    const matchesType = !filterType || filterType === 'all' || a.asset_type === filterType;
    const matchesStatus = !filterStatus || filterStatus === 'all' || a.asset_status === filterStatus || a.status === filterStatus;
    const matchesBuilding = !filterBuilding || filterBuilding === 'all' || a.building === filterBuilding;
    const matchesFloor = !filterFloor || filterFloor === 'all' || a.floor_id === filterFloor;
    const matchesRoom = !filterRoom || filterRoom === 'all' || a.room_id === filterRoom;
    const matchesTenant = !tenantFilter || tenantFilter === 'all' || a.handover_to === tenantFilter;
    const matchesColor = !filterColor || filterColor === 'all' || a.color === filterColor;
    const matchesMaterial = !filterMaterial || filterMaterial === 'all' || a.material === filterMaterial;
    const matchesSize = !filterSize || filterSize === 'all' || a.size === filterSize;

    return matchesSearch && matchesCategory && matchesSubCategory && matchesType && matchesStatus && matchesBuilding && matchesFloor && matchesRoom && matchesTenant && matchesColor && matchesMaterial && matchesSize;
  });

  const assetSelectionTotalPages = Math.ceil(filteredAssets.length / assetSelectionItemsPerPage);
  const paginatedFilteredAssets = filteredAssets.slice(
    (assetSelectionPage - 1) * assetSelectionItemsPerPage,
    assetSelectionPage * assetSelectionItemsPerPage
  );

  const filteredScheduledAssets = scheduledAssets.filter(a => {
    const matchesTenant = tenantFilter === 'all' || a.tenant_id === tenantFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesTenant && matchesStatus;
  }).sort((a, b) => {
    const dateA = new Date(a.pm_date).getTime();
    const dateB = new Date(b.pm_date).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const totalPages = Math.ceil(filteredScheduledAssets.length / itemsPerPage);
  const paginatedScheduledAssets = filteredScheduledAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  function handleExportReport(reportType: PMReportType, data: PMReportResponse<any>) {
    exportPMReport(reportType, data);
    toast({
      title: 'Success',
      description: 'Report exported successfully'
    });
  }

  const handleSchedulePM = async () => {
    if (!pmStartDate || !pmFrequency || selectedAssets.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill required fields and select assets',
        variant: 'destructive'
      });
      return;
    }

    try {
      const frequency = parseInt(pmFrequency);
      const startDate = new Date(pmStartDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);

      const nextDate = new Date(startDate);
      if (startDate < today) {
        nextDate.setDate(nextDate.getDate() + frequency);
      }

      // Create PM schedules
      for (const assetId of selectedAssets) {
        await supabase.from('preventive_maintenance').upsert({
          asset_id: assetId,
          pm_enabled: true,
          pm_start_date: pmStartDate,
          pm_end_date: pmEndDate || null,
          pm_frequency_days: frequency,
          pm_next_date: nextDate.toISOString().split('T')[0],
          pm_last_completed_date: startDate < today ? pmStartDate : null,
          created_by: user?.email,
          updated_by: user?.email
        }, { onConflict: 'asset_id' });
      }

      // Generate task instances based on user-specified date range
      // If no end date, generate for next 90 days as default
      const generationEndDate = pmEndDate 
        ? new Date(pmEndDate) 
        : new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      const { error: rpcError } = await supabase.rpc('generate_pm_task_instances', {
        p_start_date: today.toISOString().split('T')[0],
        p_end_date: generationEndDate.toISOString().split('T')[0]
      });

      if (rpcError) {
        console.error('Error generating task instances:', rpcError);
      }

      toast({
        title: 'Success',
        description: `PM scheduled for ${selectedAssets.length} asset(s)`
      });

      setShowSchedulePanel(false);
      setSelectedAssets([]);
      setPmStartDate('');
      setPmEndDate('');
      setPmFrequency('30');
      setAssetSearch('');
      loadScheduledAssets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule PM',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{scheduledAssets.length}</div>
            <p className="text-xs text-muted-foreground">Total Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {scheduledAssets.filter(a => a.pmStatus === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {scheduledAssets.filter(a => a.pmStatus === 'due').length}
            </div>
            <p className="text-xs text-muted-foreground">Due Soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {scheduledAssets.filter(a => a.pmStatus === 'upcoming').length}
            </div>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Working">Working</SelectItem>
                  <SelectItem value="Not Working">Not Working</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                Sort: {sortOrder === 'asc' ? '↑ Oldest' : '↓ Newest'}
              </Button>

              <Button variant="outline" size="sm" onClick={loadScheduledAssets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              <Button variant="default" size="sm" onClick={() => setReportModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            </div>

            <Button onClick={() => setShowSchedulePanel(!showSchedulePanel)}>
              {showSchedulePanel ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule PM
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule PM Panel */}
      {showSchedulePanel && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Schedule Preventive Maintenance</span>
              {selectedAssets.length > 0 && (
                <Badge variant="default">{selectedAssets.length} selected</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PM Configuration */}
            {selectedAssets.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={pmStartDate}
                    onChange={(e) => setPmStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={pmEndDate}
                    onChange={(e) => setPmEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Frequency (Days) *</Label>
                  <Input
                    type="number"
                    value={pmFrequency}
                    onChange={(e) => setPmFrequency(e.target.value)}
                    min="1"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSchedulePM} className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule PM
                  </Button>
                </div>
              </div>
            )}

            {/* Search Bar & Popover Filters Button */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search asset name or ID..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm h-9"
                />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 relative gap-2 shrink-0">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="px-1.5 py-0.5 text-xs font-semibold">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[42rem] max-w-[calc(100vw-2rem)] rounded-lg p-4" align="end">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Asset Filters
                      </span>
                      {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                          <X className="h-3 w-3 mr-1" />
                          Clear All Filters
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {/* Asset Type */}
                      <div>
                        <Label className="text-xs font-medium">Asset Type</Label>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Asset Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Asset Types</SelectItem>
                            {assetCategories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Category */}
                      <div>
                        <Label className="text-xs font-medium">Category</Label>
                        <Select 
                          value={filterSubCategory} 
                          onValueChange={setFilterSubCategory} 
                          disabled={!filterCategory || filterCategory === 'all'}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {filterSubCategories.map(sc => (
                              <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sub Category */}
                      <div>
                        <Label className="text-xs font-medium">Sub Category</Label>
                        <Select 
                          value={filterType} 
                          onValueChange={setFilterType} 
                          disabled={!filterSubCategory || filterSubCategory === 'all'}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Sub Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sub Categories</SelectItem>
                            {filterTypes.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status */}
                      <div>
                        <Label className="text-xs font-medium">Status</Label>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {assetStatuses.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Building */}
                      <div>
                        <Label className="text-xs font-medium">Building</Label>
                        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Buildings" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Buildings</SelectItem>
                            {buildings.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Floor */}
                      <div>
                        <Label className="text-xs font-medium">Floor</Label>
                        <Select 
                          value={filterFloor} 
                          onValueChange={setFilterFloor} 
                          disabled={!filterBuilding || filterBuilding === 'all'}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Floors" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Floors</SelectItem>
                            {floors.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.floor_name || f.floor_number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Room */}
                      <div>
                        <Label className="text-xs font-medium">Room</Label>
                        <Select 
                          value={filterRoom} 
                          onValueChange={setFilterRoom} 
                          disabled={!filterFloor || filterFloor === 'all'}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Rooms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Rooms</SelectItem>
                            {rooms.map(r => (
                              <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tenant */}
                      <div>
                        <Label className="text-xs font-medium">Tenant</Label>
                        <Select value={tenantFilter} onValueChange={setTenantFilter}>
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Tenants" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tenants</SelectItem>
                            {tenants.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.company || t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Color */}
                      <div>
                        <Label className="text-xs font-medium">Color</Label>
                        <Select 
                          value={filterColor} 
                          onValueChange={setFilterColor} 
                          disabled={!filterType || filterType === 'all' || filterCombinations.length === 0}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Colors" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Colors</SelectItem>
                            {[...new Set(filterCombinations.map(c => c.color).filter(Boolean))].map(color => (
                              <SelectItem key={color} value={color}>{color}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Material */}
                      <div>
                        <Label className="text-xs font-medium">Material</Label>
                        <Select 
                          value={filterMaterial} 
                          onValueChange={setFilterMaterial} 
                          disabled={!filterType || filterType === 'all' || filterCombinations.length === 0}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Materials" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Materials</SelectItem>
                            {[...new Set(filterCombinations.map(c => c.material).filter(Boolean))].map(mat => (
                              <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Size */}
                      <div>
                        <Label className="text-xs font-medium">Size</Label>
                        <Select 
                          value={filterSize} 
                          onValueChange={setFilterSize} 
                          disabled={!filterType || filterType === 'all' || filterCombinations.length === 0}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue placeholder="All Sizes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Sizes</SelectItem>
                            {[...new Set(filterCombinations.map(c => c.size).filter(Boolean))].map(size => (
                              <SelectItem key={size} value={size}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-xs text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Asset Selection Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox
                          checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedAssets(filteredAssets.map(a => a.id));
                            } else {
                              setSelectedAssets([]);
                            }
                          }}
                        />
                      </th>
                      <th className="p-3 text-left text-sm font-medium">Asset ID</th>
                      <th className="p-3 text-left text-sm font-medium">Name</th>
                      <th className="p-3 text-left text-sm font-medium">Category</th>
                      <th className="p-3 text-left text-sm font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No assets found
                        </td>
                      </tr>
                    ) : (
                      paginatedFilteredAssets.map(asset => (
                        <tr key={asset.id} className="border-t hover:bg-muted/50">
                          <td className="p-3">
                            <Checkbox
                              checked={selectedAssets.includes(asset.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAssets([...selectedAssets, asset.id]);
                                } else {
                                  setSelectedAssets(selectedAssets.filter(id => id !== asset.id));
                                }
                              }}
                            />
                          </td>
                          <td className="p-3 text-sm font-mono">{asset.asset_id}</td>
                          <td className="p-3 text-sm">{asset.asset_name}</td>
                          <td className="p-3 text-sm text-muted-foreground">{asset.asset_category}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {asset.building_name} / {asset.floor_name}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {assetSelectionTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(assetSelectionPage - 1) * assetSelectionItemsPerPage + 1} to{' '}
                    {Math.min(assetSelectionPage * assetSelectionItemsPerPage, filteredAssets.length)} of{' '}
                    {filteredAssets.length} assets
                  </div>
                  <Pagination
                    currentPage={assetSelectionPage}
                    totalPages={assetSelectionTotalPages}
                    onPageChange={setAssetSelectionPage}
                    showControls
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Assets Table */}
      {!showSchedulePanel && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Assets ({totalAssets})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : paginatedScheduledAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No PM schedules found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="p-3 text-left text-sm font-medium">Asset ID</th>
                        <th className="p-3 text-left text-sm font-medium">Asset Name</th>
                        <th className="p-3 text-left text-sm font-medium">Location</th>
                        <th className="p-3 text-left text-sm font-medium">Tenant</th>
                        <th className="p-3 text-left text-sm font-medium">Next PM</th>
                        <th className="p-3 text-left text-sm font-medium">Frequency</th>
                        <th className="p-3 text-center text-sm font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedScheduledAssets.map(asset => (
                        <tr key={asset.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm font-mono">{asset.asset_id}</td>
                          <td className="p-3 text-sm font-medium">{asset.asset_name}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {asset.building_name} / {asset.floor_name}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{asset.tenant_name}</td>
                          <td className="p-3 text-sm">{new Date(asset.pm_date).toLocaleDateString()}</td>
                          <td className="p-3 text-sm">{asset.pm_frequency} days</td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewAsset(asset.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, totalAssets)} of{' '}
                      {totalAssets} assets
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      showControls
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* PM Report Modal */}
      {reportModalOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
          <PMReportModal 
            isOpen={reportModalOpen} 
            onClose={() => setReportModalOpen(false)}
            onExport={handleExportReport}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
