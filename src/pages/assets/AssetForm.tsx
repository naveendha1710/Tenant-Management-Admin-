import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetService, Asset } from '@/services/assetService';
import { AppSettingsService } from '@/services/appSettingsService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function AssetForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assetCategories, setAssetCategories] = useState<string[]>([]);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Asset>>({
    asset_name: '',
    asset_category: '',
    asset_status: 'Active',
    quantity: 1,
    bond_type: 'Non-Bonded',
    sez_status: 'DTA',
  });

  useEffect(() => {
    loadDropdownData();
    if (id) loadAsset();
  }, [id]);

  const loadDropdownData = async () => {
    try {
      const [categories, types] = await Promise.all([
        AppSettingsService.getSettingsByKey('asset_categories'),
        AppSettingsService.getSettingsByKey('asset_types')
      ]);
      setAssetCategories(categories);
      setAssetTypes(types);
    } catch (error) {
      console.error('Failed to load dropdown options:', error);
    }
  };

  const loadAsset = async () => {
    try {
      const data = await AssetService.getAssetById(id!);
      setFormData(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load asset', variant: 'destructive' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (id) {
        await AssetService.updateAsset(id, formData);
        toast({ title: 'Success', description: 'Asset updated successfully' });
      } else {
        await AssetService.createAsset(formData);
        toast({ title: 'Success', description: 'Asset created successfully' });
      }
      // Return to the asset list preserving the original page if we have it in route state
      if (location.state && typeof location.state.returnPage === 'number') {
        navigate(`/assets?page=${location.state.returnPage}`);
      } else {
        // Fallback to history back – this works when the form was reached via navigation from the list
        navigate(-1);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save asset', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardLayout title={id ? 'Edit Asset' : 'Create Asset'}>
      <div className="max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/assets')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold">{id ? 'Edit Asset' : 'Create New Asset'}</h1>
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Asset'}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase">Basic Details</h3>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Asset Name *</div>
                  <Input value={formData.asset_name} onChange={(e) => updateField('asset_name', e.target.value)} required />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Asset Category *</div>
                  <Select value={formData.asset_category} onValueChange={(v) => updateField('asset_category', v)} required>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {assetCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Asset Type</div>
                  <Select value={formData.asset_type} onValueChange={(v) => updateField('asset_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                  <Input value={formData.building || ''} onChange={(e) => updateField('building', e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Floor</div>
                  <Input value={formData.floor || ''} onChange={(e) => updateField('floor', e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Room/Rack</div>
                  <Input value={formData.room_rack || ''} onChange={(e) => updateField('room_rack', e.target.value)} />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
