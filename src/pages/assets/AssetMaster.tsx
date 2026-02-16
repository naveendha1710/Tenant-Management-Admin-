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
import { Package, DollarSign, Wrench, TrendingUp, Bell, X, Save, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssetList from './AssetList';
import { QRCodeSVG } from 'qrcode.react';

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
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
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
  }, []);

  useEffect(() => {
    if (formData.asset_category && formData.asset_type && !editingAsset) {
      // Wait a bit to ensure config is loaded
      setTimeout(() => generateAssetId(), 100);
    }
  }, [formData.asset_category, formData.asset_type]);

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
    if (formData.asset_category) {
      const config = (window as any).assetDropdownConfig || [];
      const category = config.find((c: any) => c.name === formData.asset_category);
      const subTypes = category?.subTypes?.map((st: any) => st.name) || [];
      setAssetTypes(subTypes);
      if (!subTypes.includes(formData.asset_type || '')) {
        updateField('asset_type', '');
      }
    }
  }, [formData.asset_category]);



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
          code: s.short_code
        })) || [],
        manufacturers: mfrs?.filter(m => m.category_id === cat.id).map(m => m.name) || []
      })) || [];

      const categories = configData.map((cat: any) => cat.name);
      const types = configData.flatMap((cat: any) => 
        (cat.subTypes || []).map((st: any) => st.name)
      );
      setAssetCategories(categories);
      setAllAssetTypes(types);
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
      const subType = category?.subTypes?.find((st: any) => st.name === formData.asset_type);

      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('asset_category', formData.asset_category)
        .eq('asset_type', formData.asset_type);

      const nextNum = (count || 0) + config.start_value;
      const num = nextNum.toString().padStart(config.digits, '0');
      const sep = config.separator;
      const year = new Date().getFullYear();

      let assetId = '';
      switch (config.structure) {
        case 'cat-type-seq':
          assetId = `${category?.code || 'CAT'}${sep}${subType?.code || 'TYP'}${sep}${num}`;
          break;
        case 'cat-year-seq':
          assetId = `${category?.code || 'CAT'}${sep}${year}${sep}${num}`;
          break;
        case 'type-seq':
          assetId = `${subType?.code || 'TYP'}${sep}${num}`;
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
          assetId = `${category?.code || 'CAT'}${sep}${subType?.code || 'TYP'}${sep}${num}`;
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
    setShowForm(true);
  };

  const handleEdit = (asset: Asset) => {
    setFormData(asset);
    setEditingAsset(asset);
    setViewMode(false);
    setShowForm(true);
  };

  const handleView = (asset: Asset) => {
    setFormData(asset);
    setEditingAsset(asset);
    setViewMode(true);
    setShowForm(true);
    loadAssetTickets(asset.id);
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
      
      if (editingAsset) {
        await AssetService.updateAsset(editingAsset.id, cleanData);
        toast({ title: 'Success', description: 'Asset updated successfully' });
      } else {
        // Set asset_id from generated ID
        cleanData.asset_id = generatedAssetId;
        await AssetService.createAsset(cleanData);
        toast({ title: 'Success', description: 'Asset created successfully' });
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
                <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
                <Wrench className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.underMaintenance || 0}</div>
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
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_category || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Asset Type</label>
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
                        
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList>
                            <TabsTrigger value="status">Status & Maintenance</TabsTrigger>
                            <TabsTrigger value="handover">Handover Details</TabsTrigger>
                            <TabsTrigger value="sez">SEZ & Customs</TabsTrigger>
                            <TabsTrigger value="tickets">Tickets</TabsTrigger>
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
                              <p className="text-sm font-medium text-gray-900 mt-2">{formData.asset_incharge || 'N/A'}</p>
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
                          
                          <TabsContent value="handover" className="mt-4">
                            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                              <div className="grid grid-cols-3 gap-6 mb-6">
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
                            <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                            <Select value={formData.asset_category} onValueChange={(v) => updateField('asset_category', v)}>
                              <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {assetCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Asset Type</label>
                            <Select value={formData.asset_type || ''} onValueChange={(v) => updateField('asset_type', v)} disabled={!formData.asset_category}>
                              <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {assetTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Manufacturer</label>
                            <Select value={formData.manufacturer || ''} onValueChange={(v) => updateField('manufacturer', v)}>
                              <SelectTrigger className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20">
                                <SelectValue placeholder="Select manufacturer" />
                              </SelectTrigger>
                              <SelectContent>
                                {(() => {
                                  const config = (window as any).assetDropdownConfig || [];
                                  const category = config.find((c: any) => c.name === formData.asset_category);
                                  return (category?.manufacturers || []).map((mfr: string) => (
                                    <SelectItem key={mfr} value={mfr}>{mfr}</SelectItem>
                                  ));
                                })()}
                              </SelectContent>
                            </Select>
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
                        </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                          <TabsList>
                            <TabsTrigger value="status">Status & Maintenance</TabsTrigger>
                            <TabsTrigger value="handover">Handover Details</TabsTrigger>
                            <TabsTrigger value="sez">SEZ & Customs</TabsTrigger>
                            <TabsTrigger value="tickets">Tickets</TabsTrigger>
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
                        <Input value={formData.asset_incharge || ''} onChange={(e) => updateField('asset_incharge', e.target.value)} placeholder="Person responsible" className="h-11 border-gray-300 focus:border-primary focus:ring-primary/20" disabled={viewMode} />
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
                          
                          <TabsContent value="handover" className="mt-4">
                            <div className="bg-white rounded-lg shadow-sm p-6">
                              <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 mb-4">
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
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Handover To</label>
                              <div className="flex gap-4 mb-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={handoverType === 'tenant'} onChange={() => setHandoverType('tenant')} disabled={viewMode} className="w-4 h-4" />
                                  <span className="text-sm">Tenant</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" checked={handoverType === 'other'} onChange={() => setHandoverType('other')} disabled={viewMode} className="w-4 h-4" />
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
                                          onClick={() => { updateField('handover_to', ''); setTenantSearch(''); }}
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
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    {!viewMode && (
                      <>
                        <Button variant="outline" onClick={() => setShowForm(false)} className="px-6 py-2 border-gray-300">
                          Cancel
                        </Button>
                        <Button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white">
                          <Save className="h-4 w-4 mr-2" />
                          {editingAsset ? 'Save Changes' : 'Create Asset'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <AssetList onCreateNew={handleCreateNew} onEdit={handleEdit} onView={handleView} />
          )}
        </div>
      )}
    </DashboardLayout>
  );
}


