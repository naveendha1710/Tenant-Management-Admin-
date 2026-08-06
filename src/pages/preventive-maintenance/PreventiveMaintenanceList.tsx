import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Search, ClipboardList, List } from 'lucide-react';
import { PMAsset, PMStatus } from './types/pm.types';
import { PMStatusBadge } from './components/PMStatusBadge';
import { PMAssetDetail } from './PMAssetDetail';
import { supabase } from '@/lib/supabaseClient';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';
import { PMTaskBoard } from '@/components/assets/PMTaskBoard';
import { PMSchedule } from '@/components/assets/PMSchedule';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function PreventiveMaintenanceList() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PMAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('schedule');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [tenants, setTenants] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPMFormModal, setShowPMFormModal] = useState(false);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [pmStartDate, setPmStartDate] = useState('');
  const [pmEndDate, setPmEndDate] = useState('');
  const [pmFrequency, setPmFrequency] = useState('30');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [filterFloor, setFilterFloor] = useState('');
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [assetSubCategories, setAssetSubCategories] = useState<string[]>([]);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);

  useEffect(() => {
    loadAssets();
    loadAllAssets();
    loadFilterData();
    loadUsers();
  }, []);

  const calculatePMStatus = (pmDate: string): PMStatus => {
    const today = new Date();
    const pm = new Date(pmDate);
    const diffDays = Math.ceil((pm.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due';
    return 'upcoming';
  };

  const loadAssets = async () => {
    try {
      const { data: pmSchedules } = await supabase
        .from('preventive_maintenance')
        .select(`
          asset_id,
          pm_next_date
        `)
        .eq('pm_enabled', true)
        .not('pm_next_date', 'is', null);

      if (!pmSchedules || pmSchedules.length === 0) {
        setAssets([]);
        setLoading(false);
        return;
      }

      const assetIds = pmSchedules.map(pm => pm.asset_id).filter(Boolean);
      const pmMap = new Map(pmSchedules.map(pm => [pm.asset_id, pm.pm_next_date]));

      const assetsData = await fetchInChunks(assetIds, 50, async (chunk) => {
        const { data } = await supabase
          .from('assets')
          .select(`
            id,
            asset_id,
            asset_name,
            status,
            handover_to
          `)
          .in('id', chunk);
        return data || [];
      });

      if (assetsData && assetsData.length > 0) {
        const tenantIds = [...new Set(assetsData.map(a => a.handover_to).filter(Boolean))];
        const tenantsData = await fetchInChunks(tenantIds, 50, async (chunk) => {
          const { data } = await supabase
            .from('tenants')
            .select('id, company, name')
            .in('id', chunk);
          return data || [];
        });

        const tenantMap = new Map(tenantsData?.map(t => [t.id, t.company || t.name]) || []);
        const uniqueTenants = [...new Set(tenantsData?.map(t => t.company || t.name) || [])];
        setTenants(uniqueTenants);

        const pmAssets: PMAsset[] = assetsData.map(asset => ({
          id: asset.id,
          asset_id: asset.asset_id,
          asset_name: asset.asset_name,
          tenant_name: tenantMap.get(asset.handover_to) || 'Unassigned',
          status: asset.status || 'Working',
          pm_date: pmMap.get(asset.id) || '',
          pmStatus: calculatePMStatus(pmMap.get(asset.id) || '')
        }));

        setAssets(pmAssets);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllAssets = async () => {
    const { data: assets } = await supabase
      .from('assets')
      .select('id, asset_id, asset_name, asset_category, asset_sub_category, asset_type, building, floor_id')
      .order('asset_name');
    
    if (!assets) return;

    const buildingIds = [...new Set(assets.map(a => a.building).filter(Boolean))];
    const floorIds = [...new Set(assets.map(a => a.floor_id).filter(Boolean))];

    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name')
      .in('id', buildingIds);

    const { data: floors } = await supabase
      .from('floors')
      .select('id, floor_name, floor_number')
      .in('id', floorIds);

    const buildingMap = new Map(buildings?.map(b => [b.id, b.name]) || []);
    const floorMap = new Map(floors?.map(f => [f.id, f.floor_name || f.floor_number]) || []);

    const formattedAssets = assets.map(asset => ({
      ...asset,
      building_name: buildingMap.get(asset.building) || 'N/A',
      floor_name: floorMap.get(asset.floor_id) || 'N/A'
    }));

    setAllAssets(formattedAssets);
  };

  const loadFilterData = async () => {
    try {
      const { data: cats } = await supabase
        .from('form_dropdowns')
        .select('*')
        .eq('form_type', 'asset')
        .order('name');

      const { data: subs } = await supabase
        .from('form_subcategories')
        .select('*')
        .eq('form_type', 'asset');

      const { data: subSubs } = await supabase
        .from('form_sub_subcategories')
        .select('*')
        .eq('form_type', 'asset');

      const configData = cats?.map(cat => ({
        name: cat.name,
        subTypes: subs?.filter(s => s.category_id === cat.id).map(s => ({
          name: s.name,
          subTypes: subSubs?.filter(ss => ss.subcategory_id === s.id).map(ss => ({
            name: ss.name
          })) || []
        })) || []
      })) || [];

      setAssetCategories(configData.map(c => c.name));
      (window as any).assetDropdownConfig = configData;

      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('id, name')
        .order('name');
      
      setBuildings(buildingsData || []);
    } catch (error) {
      console.error('Failed to load filter data:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, email, role')
        .eq('asset_auditor', true)
        .order('name');
      
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadFloors = async (buildingId: string) => {
    const { data } = await supabase
      .from('floors')
      .select('id, floor_name, floor_number')
      .eq('building_id', buildingId)
      .order('floor_number');
    
    setFloors(data || []);
  };

  useEffect(() => {
    if (filterCategory) {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === filterCategory);
      const subTypes = category?.subTypes?.map((st: any) => st.name) || [];
      setAssetSubCategories(subTypes);
    } else {
      setAssetSubCategories([]);
      setFilterSubCategory('');
      setAssetTypes([]);
      setFilterType('');
    }
  }, [filterCategory]);

  useEffect(() => {
    if (filterSubCategory) {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === filterCategory);
      const subCategory = category?.subTypes?.find((st: any) => st.name === filterSubCategory);
      const subSubTypes = subCategory?.subTypes?.map((sst: any) => sst.name) || [];
      setAssetTypes(subSubTypes);
    } else {
      setAssetTypes([]);
      setFilterType('');
    }
  }, [filterSubCategory]);

  useEffect(() => {
    if (filterBuilding) {
      loadFloors(filterBuilding);
    } else {
      setFloors([]);
      setFilterFloor('');
    }
  }, [filterBuilding]);

  const filteredAssets = allAssets.filter(a => {
    const matchesSearch = a.asset_name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.asset_id.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesCategory = !filterCategory || filterCategory === 'all' || a.asset_category === filterCategory;
    const matchesSubCategory = !filterSubCategory || filterSubCategory === 'all' || a.asset_sub_category === filterSubCategory;
    const matchesType = !filterType || filterType === 'all' || a.asset_type === filterType;
    const matchesBuilding = !filterBuilding || filterBuilding === 'all' || a.building === filterBuilding;
    const matchesFloor = !filterFloor || filterFloor === 'all' || a.floor_id === filterFloor;
    
    return matchesSearch && matchesCategory && matchesSubCategory && matchesType && matchesBuilding && matchesFloor;
  });

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const handleSchedulePM = async () => {
    if (!pmStartDate || !pmFrequency || selectedAssets.length === 0) return;
    
    const frequency = parseInt(pmFrequency);
    const startDate = new Date(pmStartDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const isPastOrToday = startDate <= today;
    
    // If start date is today or future, pm_next_date = start date
    // If start date is past, pm_next_date = start date + frequency
    const nextDate = new Date(startDate);
    if (isPastOrToday && startDate < today) {
      nextDate.setDate(nextDate.getDate() + frequency);
    }

    try {
      for (const assetId of selectedAssets) {
        const { error } = await supabase.from('preventive_maintenance').upsert({
          asset_id: assetId,
          pm_enabled: true,
          pm_start_date: pmStartDate,
          pm_end_date: pmEndDate || null,
          pm_frequency_days: frequency,
          pm_next_date: nextDate.toISOString().split('T')[0],
          pm_last_completed_date: (isPastOrToday && startDate < today) ? pmStartDate : null,
          assigned_to: assignedTo && assignedTo !== 'unassigned' ? assignedTo : null,
          assigned_at: assignedTo && assignedTo !== 'unassigned' ? new Date().toISOString() : null,
          assignment_notes: assignmentNotes || null,
          created_by: user?.email,
          updated_by: user?.email
        }, { onConflict: 'asset_id' });
        
        if (error) {
          console.error('Error upserting PM:', error);
        }
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
      
      setShowScheduleModal(false);
      setSelectedAssets([]);
      setAssetSearch('');
      setPmStartDate('');
      setPmEndDate('');
      setPmFrequency('30');
      setAssignedTo('');
      setAssignmentNotes('');
      loadAssets();
      alert('PM schedule set successfully!');
    } catch (error) {
      console.error('Failed to set PM:', error);
      alert('Failed to set PM schedule');
    }
  };

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    if (tenantFilter !== 'all') {
      filtered = filtered.filter(a => a.tenant_name === tenantFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.pm_date).getTime();
      const dateB = new Date(b.pm_date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [assets, tenantFilter, statusFilter, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = filteredAndSortedAssets.slice(startIndex, endIndex);

  if (selectedAsset) {
    return (
      <DashboardLayout title="Preventive Maintenance" subtitle="Asset PM details">
        <PMAssetDetail assetId={selectedAsset} onClose={() => setSelectedAsset(null)} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Preventive Maintenance" subtitle="Track and manage asset maintenance schedules">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule" className="gap-2">
            <List className="h-4 w-4" />
            PM Schedule
          </TabsTrigger>
          <TabsTrigger value="taskboard" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            PM Task Board
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <PMSchedule 
            onViewAsset={(assetId) => setSelectedAsset(assetId)}
            paginatedAssets={paginatedAssets}
            totalAssets={filteredAndSortedAssets.length}
          />
        </TabsContent>

        <TabsContent value="taskboard">
          <PMTaskBoard />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
