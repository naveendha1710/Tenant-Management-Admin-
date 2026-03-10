import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Search } from 'lucide-react';
import { PMAsset, PMStatus } from './types/pm.types';
import { PMStatusBadge } from './components/PMStatusBadge';
import { PMAssetDetail } from './PMAssetDetail';
import { supabase } from '@/lib/supabaseClient';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';

export default function PreventiveMaintenanceList() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PMAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
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

  useEffect(() => {
    loadAssets();
    loadAllAssets();
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

      const assetIds = pmSchedules.map(pm => pm.asset_id);
      const pmMap = new Map(pmSchedules.map(pm => [pm.asset_id, pm.pm_next_date]));

      const { data: assetsData } = await supabase
        .from('assets')
        .select(`
          id,
          asset_id,
          asset_name,
          status,
          handover_to
        `)
        .in('id', assetIds);

      if (assetsData) {
        const tenantIds = [...new Set(assetsData.map(a => a.handover_to).filter(Boolean))];
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, company, name')
          .in('id', tenantIds);

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
      .select('id, asset_id, asset_name, asset_category, building, floor')
      .order('asset_name');
    
    if (!assets) return;

    const buildingIds = [...new Set(assets.map(a => a.building).filter(Boolean))];
    const floorIds = [...new Set(assets.map(a => a.floor).filter(Boolean))];

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
      floor_name: floorMap.get(asset.floor) || 'N/A'
    }));

    setAllAssets(formattedAssets);
  };

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
          created_by: user?.email,
          updated_by: user?.email
        }, { onConflict: 'asset_id' });
        
        if (error) {
          console.error('Error upserting PM:', error);
        }
      }
      
      setShowScheduleModal(false);
      setSelectedAssets([]);
      setAssetSearch('');
      setPmStartDate('');
      setPmEndDate('');
      setPmFrequency('30');
      loadAssets();
      alert('PM schedule set successfully!');
    } catch (error) {
      console.error('Failed to set PM:', error);
      alert('Failed to set PM schedule');
    }
  };

  const filteredAssets = allAssets.filter(a =>
    a.asset_name.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.asset_id.toLowerCase().includes(assetSearch.toLowerCase())
  );

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
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
            <Select value={tenantFilter} onValueChange={setTenantFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenants.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
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
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              Sort PM Date: {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            </div>
            
            <Button onClick={() => setShowScheduleModal(!showScheduleModal)}>
              <Calendar className="mr-2 h-4 w-4" /> {showScheduleModal ? 'Cancel' : 'Schedule PM'}
            </Button>
          </div>

          {/* Inline Schedule PM Form */}
          {showScheduleModal && (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Schedule Preventive Maintenance</h3>
                {selectedAssets.length > 0 && (
                  <Button onClick={() => setShowPMFormModal(true)}>
                    Schedule PM ({selectedAssets.length})
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search assets by name or ID..."
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Asset List */}
                <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200 max-h-80 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                      <tr className="hover:bg-transparent">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-12">
                          <input
                            type="checkbox"
                            checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                            onChange={() => {
                              if (selectedAssets.length === filteredAssets.length) {
                                setSelectedAssets([]);
                              } else {
                                setSelectedAssets(filteredAssets.map(a => a.id));
                              }
                            }}
                            className="h-4 w-4"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssets.map(asset => (
                        <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedAssets.includes(asset.id)}
                              onChange={() => toggleAssetSelection(asset.id)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{asset.asset_id}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{asset.asset_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{asset.asset_category}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{asset.building_name} / {asset.floor_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!showScheduleModal && (
          <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="hover:bg-transparent">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Asset Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Next PM Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PM Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssets.map(asset => (
                  <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{asset.asset_id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{asset.asset_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{asset.tenant_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(asset.pm_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <PMStatusBadge status={asset.pmStatus} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAsset(asset.id)}
                        title="View"
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedAssets.length)} of {filteredAndSortedAssets.length} assets
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  showControls
                />
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* PM Form Modal */}
      {showPMFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Schedule PM</h3>
            <p className="text-sm text-gray-600 mb-4">Configure PM schedule for {selectedAssets.length} asset(s)</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <Input
                  type="date"
                  value={pmStartDate}
                  onChange={(e) => setPmStartDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <Input
                  type="date"
                  value={pmEndDate}
                  onChange={(e) => setPmEndDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency (Days) *</label>
                <Input
                  type="number"
                  value={pmFrequency}
                  onChange={(e) => setPmFrequency(e.target.value)}
                  placeholder="30"
                  min="1"
                  required
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowPMFormModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleSchedulePM();
                    setShowPMFormModal(false);
                  }}
                  disabled={!pmStartDate || !pmFrequency}
                  className="flex-1"
                >
                  Schedule PM
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


    </DashboardLayout>
  );
}
