import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X, Package, Loader2, FileSpreadsheet, FileText, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { AssetCard } from '@/components/tenant/AssetCard';
import { BranchTabs } from '@/components/tenant/BranchTabs';

interface Asset {
  id: string;
  asset_id: string;
  asset_name: string;
  asset_category: string;
  asset_type: string;
  serial_number: string;
  room_rack: string;
  asset_status: string;
  created_at: string;
  purchase_date: string;
  asset_picture?: string;
}

export default function MyAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [sortColumn, setSortColumn] = useState<keyof Asset>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTenantIds, setActiveTenantIds] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const initTenantIds = async () => {
      if (!user?.email || activeTenantIds.length > 0) return;
      
      // First check if user has tenantId in their profile
      if (user?.appUser?.tenantId) {
        setActiveTenantIds([user.appUser.tenantId]);
        setLoading(false);
        return;
      }
      
      // Fallback: try to find tenant by email
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (error) {
          console.error('Error loading tenant:', error);
          setLoading(false);
          return;
        }
        
        if (data) {
          setActiveTenantIds([data.id]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error in initTenantIds:', error);
        setLoading(false);
      }
    };
    initTenantIds();
  }, [user?.email, user?.appUser?.tenantId]);

  useEffect(() => {
    if (user?.email && activeTenantIds.length > 0) fetchAssets();
  }, [user?.email, activeTenantIds]);

  useEffect(() => {
    applyFilters();
  }, [assets, searchTerm, categoryFilter, statusFilter, sortColumn, sortDirection]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .in('handover_to', activeTenantIds);

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({ title: 'Error', description: 'Failed to load assets', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...assets];

    if (searchTerm) {
      filtered = filtered.filter(a =>
        a.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.room_rack?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') filtered = filtered.filter(a => a.asset_category === categoryFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(a => a.asset_status === statusFilter);

    filtered.sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      return sortDirection === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

    setFilteredAssets(filtered);
    setCurrentPage(1);
  };

  const handleSort = (column: keyof Asset) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const exportToCSV = () => {
    const headers = ['Asset ID', 'Name', 'Category', 'Type', 'Serial Number', 'Location', 'Status', 'Created Date'];
    const rows = filteredAssets.map(a => [
      a.asset_id, a.asset_name, a.asset_category, a.asset_type, a.serial_number || '', a.room_rack || '', a.asset_status, new Date(a.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-assets-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: 'Success', description: 'Assets exported to CSV' });
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('My Assets');
      
      worksheet.columns = [
        { header: 'Asset ID', key: 'asset_id', width: 15 },
        { header: 'Name', key: 'asset_name', width: 25 },
        { header: 'Category', key: 'asset_category', width: 15 },
        { header: 'Type', key: 'asset_type', width: 15 },
        { header: 'Serial Number', key: 'serial_number', width: 20 },
        { header: 'Location', key: 'room_rack', width: 20 },
        { header: 'Status', key: 'asset_status', width: 12 },
        { header: 'Created Date', key: 'created_at', width: 15 }
      ];

      filteredAssets.forEach(asset => {
        worksheet.addRow({
          ...asset,
          created_at: new Date(asset.created_at).toLocaleDateString()
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-assets-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      toast({ title: 'Success', description: 'Assets exported to Excel' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to export to Excel', variant: 'destructive' });
    }
  };

  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const categories = [...new Set(assets.map(a => a.asset_category).filter(Boolean))];
  const statuses = [...new Set(assets.map(a => a.asset_status).filter(Boolean))];

  return (
    <DashboardLayout title="My Assets" subtitle="View and manage your assigned assets">
      <div className="space-y-6">
        <BranchTabs onBranchChange={setActiveTenantIds} />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold">{assets.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{assets.filter(a => a.asset_status === 'Active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Maintenance</p>
                  <p className="text-2xl font-bold text-yellow-600">{assets.filter(a => a.asset_status === 'Maintenance').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Categories</p>
                  <p className="text-2xl font-bold">{categories.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <CardTitle>Asset Inventory</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search assets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'card' ? 'list' : 'card')}
                  >
                    {viewMode === 'card' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                  </Button>
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">All Categories</SelectItem>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="all" value="all">All Status</SelectItem>
                    {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                )}
              </div>

              {(loading || activeTenantIds.length === 0) ? (
                <div className="flex justify-center items-center py-20">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">Loading your assets...</p>
                  </div>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No assets found</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    {assets.length === 0 
                      ? 'No assets are currently assigned to you. Contact your administrator if you believe this is an error.' 
                      : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
                  </p>
                  {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
                    <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4">
                      <X className="h-4 w-4 mr-2" />
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {viewMode === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {paginatedAssets.map((asset) => (
                        <AssetCard key={asset.id} asset={asset} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">S.No</TableHead>
                            <TableHead>Asset ID</TableHead>
                            <TableHead>Asset Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Serial No</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAssets.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No assets found
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedAssets.map((asset, index) => (
                              <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50">
                                <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                                <TableCell className="font-mono text-blue-600">{asset.asset_id}</TableCell>
                                <TableCell className="font-medium">{asset.asset_name}</TableCell>
                                <TableCell>{asset.asset_category}</TableCell>
                                <TableCell>{asset.asset_type}</TableCell>
                                <TableCell className="font-mono text-sm">{asset.serial_number || '-'}</TableCell>
                                <TableCell>{asset.room_rack || '-'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`${
                                    asset.asset_status === 'Active' ? 'bg-green-500/20 text-green-500 border-green-500/30' :
                                    asset.asset_status === 'Idle' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                                    asset.asset_status === 'Repair' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                  }`}>
                                    {asset.asset_status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAssets.length)}</span> of <span className="font-medium">{filteredAssets.length}</span> assets
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Per page:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem key="10" value="10">10</SelectItem>
                          <SelectItem key="25" value="25">25</SelectItem>
                          <SelectItem key="50" value="50">50</SelectItem>
                          <SelectItem key="100" value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                          Previous
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
