import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetService, DashboardStats, Asset } from '@/services/assetService';
import { buildingService, Building, Floor } from '@/services/buildingService';
import { Package, DollarSign, AlertCircle, Wrench, TrendingUp, CheckCircle, Calendar, Bell, X, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssetList from './AssetList';
import AssetMovement from './AssetMovement';
import InventoryManagement from './InventoryManagement';

export default function AssetManagement() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Set default tab based on route
    if (location.pathname === '/assets/inventory') {
      return 'inventory';
    }
    return 'assets';
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Asset>>({
    asset_name: '',
    asset_category: '',
    asset_status: 'Active',
    quantity: 1,
    bond_type: 'Non-Bonded',
    sez_status: 'DTA',
  });

  useEffect(() => {
    loadStats();
    loadBuildings();
  }, []);

  useEffect(() => {
    if (formData.building) {
      loadFloors(formData.building);
    }
  }, [formData.building]);

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

  const handleCreateNew = () => {
    setFormData({
      asset_name: '',
      asset_category: '',
      asset_status: 'Active',
      quantity: 1,
      bond_type: 'Non-Bonded',
      sez_status: 'DTA',
    });
    setEditingAsset(null);
    setShowForm(true);
  };

  const handleEdit = (asset: Asset) => {
    setFormData(asset);
    setEditingAsset(asset);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (editingAsset) {
        await AssetService.updateAsset(editingAsset.id, formData);
        toast({ title: 'Success', description: 'Asset updated successfully' });
      } else {
        await AssetService.createAsset(formData);
        toast({ title: 'Success', description: 'Asset created successfully' });
      }
      setShowForm(false);
      loadStats();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save asset', variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout title="Asset Management" subtitle="Manage assets, movements, and compliance">
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab !== 'inventory' && (
            <>
              <div className="flex justify-end">
                <div className={`px-4 py-2 rounded-full ${stats?.complianceStatus === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {stats?.complianceStatus === 'OK' ? <CheckCircle className="inline mr-2" size={16} /> : <AlertCircle className="inline mr-2" size={16} />}
                  Compliance: {stats?.complianceStatus}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <CardTitle className="text-sm font-medium">Bonded Assets</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.bondedAssets || 0}</div>
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
                <CardTitle className="text-sm font-medium">Duty Foregone</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(stats?.dutyForegoneAmount || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Bonded only</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingApprovals || 0}</div>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Movement Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.movementToday || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Audit Due Alerts</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.auditDue || 0}</div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Warranty/AMC Expiry</CardTitle>
                <Bell className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.warrantyExpiring || 0}</div>
                <p className="text-xs text-muted-foreground">Expiring soon</p>
              </CardContent>
            </Card>
          </div>
            </>
          )}

          {activeTab === 'inventory' ? (
            <InventoryManagement />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-lg grid-cols-2">
                <TabsTrigger value="assets">Asset Master</TabsTrigger>
                <TabsTrigger value="movement">Movement</TabsTrigger>
              </TabsList>
            
            <TabsContent value="assets" className="mt-6">
              {showForm ? (
                <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingAsset ? 'Edit Asset' : 'Create New Asset'}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase">Basic Details</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Asset Name *</div>
                      <Input value={formData.asset_name} onChange={(e) => updateField('asset_name', e.target.value)} required />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Asset Category *</div>
                      <Input value={formData.asset_category} onChange={(e) => updateField('asset_category', e.target.value)} required />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Asset Type</div>
                      <Input value={formData.asset_type || ''} onChange={(e) => updateField('asset_type', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Make/Model</div>
                      <Input value={formData.make_model || ''} onChange={(e) => updateField('make_model', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Serial Number</div>
                      <Input value={formData.serial_number || ''} onChange={(e) => updateField('serial_number', e.target.value)} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Quantity</div>
                      <Input type="number" value={formData.quantity} onChange={(e) => updateField('quantity', parseInt(e.target.value))} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Asset Status</div>
                      <Select value={formData.asset_status} onValueChange={(v) => updateField('asset_status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Idle">Idle</SelectItem>
                          <SelectItem value="Repair">Repair</SelectItem>
                          <SelectItem value="Scrap">Scrap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase">SEZ & Bond Classification</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">SEZ Status</div>
                      <Select value={formData.sez_status} onValueChange={(v) => updateField('sez_status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SEZ">SEZ</SelectItem>
                          <SelectItem value="DTA">DTA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Bond Type</div>
                      <Select value={formData.bond_type} onValueChange={(v) => updateField('bond_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bonded">Bonded</SelectItem>
                          <SelectItem value="Non-Bonded">Non-Bonded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Customs Category</div>
                      <Select value={formData.customs_category} onValueChange={(v) => updateField('customs_category', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Capital Goods">Capital Goods</SelectItem>
                          <SelectItem value="Consumables">Consumables</SelectItem>
                          <SelectItem value="Spares">Spares</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Usage Purpose</div>
                      <Input value={formData.usage_purpose || ''} onChange={(e) => updateField('usage_purpose', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase">Financial Details</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Asset Cost</div>
                      <Input type="number" value={formData.asset_cost || ''} onChange={(e) => updateField('asset_cost', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Net Book Value</div>
                      <Input type="number" value={formData.net_book_value || ''} onChange={(e) => updateField('net_book_value', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Duty Foregone Amount</div>
                      <Input type="number" value={formData.duty_foregone_amount || ''} onChange={(e) => updateField('duty_foregone_amount', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Cost Center</div>
                      <Input value={formData.cost_center || ''} onChange={(e) => updateField('cost_center', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase">Location</h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Building</div>
                      <Select value={formData.building} onValueChange={(v) => { updateField('building', v); updateField('floor', ''); }}>
                        <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                        <SelectContent>
                          {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Floor</div>
                      <Select value={formData.floor} onValueChange={(v) => updateField('floor', v)} disabled={!formData.building}>
                        <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                        <SelectContent>
                          {floors.map(f => <SelectItem key={f.id} value={f.id}>{f.floor_name || `Floor ${f.floor_number}`}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Room/Rack</div>
                      <Input value={formData.room_rack || ''} onChange={(e) => updateField('room_rack', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Asset
                  </Button>
                </div>
              </CardContent>
            </Card>
              ) : (
                <AssetList onCreateNew={handleCreateNew} onEdit={handleEdit} />
              )}
            </TabsContent>
            
            <TabsContent value="movement" className="mt-6">
              <AssetMovement />
            </TabsContent>
          </Tabs>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
