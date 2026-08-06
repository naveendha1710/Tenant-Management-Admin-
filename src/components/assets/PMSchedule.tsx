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
import { PMStatusBadge } from '@/pages/preventive-maintenance/components/PMStatusBadge';
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
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterFloor, setFilterFloor] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

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
      
      // Update task statuses based on date (only update rows that are not already in target status)
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

      // Chunk requests to avoid URL length limit on .in(...)
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
        const userIds = [...new Set(pmSchedules.map(pm => pm.assigned_to).filter(Boolean))];

        const [tenantsData, buildingsData, floorsData, usersData] = await Promise.all([
          fetchInChunks(tenantIds, 50, async chunk => (await supabase.from('tenants').select('id, company').in('id', chunk)).data || []),
          fetchInChunks(buildingIds, 50, async chunk => (await supabase.from('buildings').select('id, name').in('id', chunk)).data || []),
          fetchInChunks(floorIds, 50, async chunk => (await supabase.from('floors').select('id, floor_name, floor_number').in('id', chunk)).data || []),
          fetchInChunks(userIds, 50, async chunk => (await supabase.from('users').select('id, name').in('id', chunk)).data || [])
        ]);

        const tenantMap = new Map(tenantsData.map(t => [t.id, t.company]));
        const buildingMap = new Map(buildingsData.map(b => [b.id, b.name]));
        const floorMap = new Map(floorsData.map(f => [f.id, f.floor_name || f.floor_number]));
        const userMap = new Map(usersData.map(u => [u.id, u.name]));

        setTenants(tenantsData);

        const pmMap = new Map(pmSchedules.map(pm => [pm.asset_id, pm]));

        const formatted = assetsData.map(asset => {
          const pm = pmMap.get(asset.id);
          const pmDate = pm?.pm_next_date || '';
          const taskStatus = taskStatusMap.get(asset.id);
          
          let pmStatus: 'overdue' | 'due' | 'upcoming';
          
          // Use status from pm_task_instances if available
          if (taskStatus === 'COMPLETED') {
            pmStatus = 'upcoming';
          } else if (taskStatus === 'OVERDUE') {
            pmStatus = 'overdue';
          } else if (taskStatus === 'PENDING') {
            pmStatus = 'due';
          } else if (taskStatus === 'UPCOMING') {
            pmStatus = 'upcoming';
          } else {
            const todayDate = new Date();
            const nextPM = new Date(pmDate);
            const diffDays = Math.ceil((nextPM.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
            
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
        .select('id, asset_id, asset_name, asset_category, building, floor_id')
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

      const formatted = assets.map(asset => ({
        ...asset,
        building_name: buildingMap.get(asset.building) || 'N/A',
        floor_name: floorMap.get(asset.floor_id) || 'N/A'
      }));

      setAllAssets(formatted);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const loadFilterData = async () => {
    try {
      const [categoriesRes, buildingsRes] = await Promise.all([
        supabase.from('form_dropdowns').select('name').eq('form_type', 'asset').order('name'),
        supabase.from('buildings').select('id, name').order('name')
      ]);

      setAssetCategories(categoriesRes.data?.map(c => c.name) || []);
      setBuildings(buildingsRes.data || []);
    } catch (error) {
      console.error('Failed to load filter data:', error);
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
    }
  }, [filterBuilding]);

  const filteredAssets = allAssets.filter(a => {
    const matchesSearch = a.asset_name.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.asset_id.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.asset_category === filterCategory;
    const matchesBuilding = filterBuilding === 'all' || a.building === filterBuilding;
    const matchesFloor = filterFloor === 'all' || a.floor_id === filterFloor;

    return matchesSearch && matchesCategory && matchesBuilding && matchesFloor;
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

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {assetCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Building</Label>
                <Select value={filterBuilding} onValueChange={setFilterBuilding}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Floor</Label>
                <Select value={filterFloor} onValueChange={setFilterFloor} disabled={filterBuilding === 'all'}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.floor_name || f.floor_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Asset name or ID..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
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
