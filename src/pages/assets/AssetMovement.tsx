import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetService, Asset, AssetMovement as Movement, DashboardStats } from '@/services/assetService';
import { buildingService, Building, Floor } from '@/services/buildingService';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { X, Save, Plus, AlertCircle, TrendingUp, Calendar } from 'lucide-react';

export default function AssetMovement() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [toFloors, setToFloors] = useState<Floor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    asset_id: '',
    movement_type: 'Location',
    movement_date: new Date().toISOString().split('T')[0],
    movement_time: '',
    expected_return_date: '',
    to_building: '',
    to_floor: '',
    to_room: '',
    to_department: '',
    to_custodian: '',
    new_status: '',
    movement_reason: '',
    other_reason: '',
    remarks: '',
    vendor_name: '',
    vendor_contact: '',
    outward_date: '',
    expected_inward_date: '',
    gate_pass_number: '',
    approval_required: true,
  });

  useEffect(() => {
    loadStats();
    loadData();
    loadBuildings();
  }, []);

  useEffect(() => {
    if (formData.to_building) {
      loadToFloors(formData.to_building);
    }
  }, [formData.to_building]);

  useEffect(() => {
    if (formData.asset_id) {
      const asset = assets.find(a => a.id === formData.asset_id);
      setSelectedAsset(asset || null);
    }
  }, [formData.asset_id, assets]);

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

  const loadData = async () => {
    try {
      const [movementsData, assetsData] = await Promise.all([
        AssetService.getMovements(),
        AssetService.getAssets()
      ]);
      setMovements(movementsData);
      setAssets(assetsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadBuildings = async () => {
    const data = await buildingService.getAllBuildings();
    setBuildings(data);
  };

  const loadToFloors = async (buildingId: string) => {
    const data = await buildingService.getFloorsByBuilding(buildingId);
    setToFloors(data);
  };

  const getBuildingName = (id?: string) => buildings.find(b => b.id === id)?.name || 'N/A';

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateNew = () => {
    setFormData({
      asset_id: '',
      movement_type: 'Location',
      movement_date: new Date().toISOString().split('T')[0],
      movement_time: '',
      expected_return_date: '',
      to_building: '',
      to_floor: '',
      to_room: '',
      to_department: '',
      to_custodian: '',
      new_status: '',
      movement_reason: '',
      other_reason: '',
      remarks: '',
      vendor_name: '',
      vendor_contact: '',
      outward_date: '',
      expected_inward_date: '',
      gate_pass_number: '',
      approval_required: true,
    });
    setSelectedAsset(null);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const movementPayload: Partial<Movement> = {
        asset_id: formData.asset_id,
        movement_type: formData.movement_type as 'Location' | 'Maintenance' | 'Disposal',
        movement_date: formData.movement_date,
        movement_time: formData.movement_time || undefined,
        expected_return_date: formData.expected_return_date || undefined,
        from_building: selectedAsset?.building,
        from_floor: selectedAsset?.floor,
        from_room: selectedAsset?.room_rack,
        to_building: formData.to_building || undefined,
        to_floor: formData.to_floor || undefined,
        to_room: formData.to_room || undefined,
        vendor_name: formData.vendor_name || undefined,
        vendor_contact: formData.vendor_contact || undefined,
        outward_date: formData.outward_date || undefined,
        expected_inward_date: formData.expected_inward_date || undefined,
        gate_pass_number: formData.gate_pass_number || undefined,
        movement_reason: formData.movement_reason === 'Other' ? formData.other_reason : formData.movement_reason,
        remarks: formData.remarks || undefined,
        movement_status: 'Pending',
      };
      
      await AssetService.createMovement(movementPayload);
      toast({ title: 'Success', description: 'Movement request created' });
      setShowForm(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create movement', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await AssetService.updateMovementStatus(id, 'Approved', new Date().toISOString());
      toast({ title: 'Success', description: 'Movement approved' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await AssetService.updateMovementStatus(id, 'Rejected');
      toast({ title: 'Success', description: 'Movement rejected' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout title="Asset Movement" subtitle="Manage asset movements and approvals">
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
      {showForm ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New Movement Request</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Asset Identification */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase">Asset Identification</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Asset ID *</div>
                  <Select value={formData.asset_id} onValueChange={(v) => updateField('asset_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                    <SelectContent>
                      {assets.map(a => <SelectItem key={a.id} value={a.id}>{a.asset_id} - {a.asset_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Asset Name</div>
                  <Input value={selectedAsset?.asset_name || ''} disabled />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Asset Category</div>
                  <Input value={selectedAsset?.asset_category || ''} disabled />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Current Status</div>
                  <Input value={selectedAsset?.asset_status || ''} disabled />
                </div>
              </div>
            </div>

            {/* Movement Details */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase">Movement Details</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Movement Type *</div>
                  <Select value={formData.movement_type} onValueChange={(v) => updateField('movement_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Location">Location</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Disposal">Disposal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Movement Date *</div>
                  <Input type="date" value={formData.movement_date} onChange={(e) => updateField('movement_date', e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Movement Time</div>
                  <Input type="time" value={formData.movement_time} onChange={(e) => updateField('movement_time', e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Expected Return Date</div>
                  <Input type="date" value={formData.expected_return_date} onChange={(e) => updateField('expected_return_date', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Location Movement */}
            {formData.movement_type === 'Location' && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase">From → To Location</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">From Building</div>
                    <Input value={getBuildingName(selectedAsset?.building)} disabled />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">To Building *</div>
                    <Select value={formData.to_building} onValueChange={(v) => updateField('to_building', v)}>
                      <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                      <SelectContent>
                        {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">From Floor</div>
                    <Input value={selectedAsset?.floor || ''} disabled />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">To Floor</div>
                    <Select value={formData.to_floor} onValueChange={(v) => updateField('to_floor', v)} disabled={!formData.to_building}>
                      <SelectTrigger><SelectValue placeholder="Select floor" /></SelectTrigger>
                      <SelectContent>
                        {toFloors.map(f => <SelectItem key={f.id} value={f.id}>{f.floor_name || `Floor ${f.floor_number}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">From Room</div>
                    <Input value={selectedAsset?.room_rack || ''} disabled />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">To Room</div>
                    <Input value={formData.to_room} onChange={(e) => updateField('to_room', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Details */}
            {formData.movement_type === 'Maintenance' && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase">Vendor / External Movement</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Vendor Name *</div>
                    <Input value={formData.vendor_name} onChange={(e) => updateField('vendor_name', e.target.value)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Vendor Contact</div>
                    <Input value={formData.vendor_contact} onChange={(e) => updateField('vendor_contact', e.target.value)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Outward Date *</div>
                    <Input type="date" value={formData.outward_date} onChange={(e) => updateField('outward_date', e.target.value)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Expected Inward Date</div>
                    <Input type="date" value={formData.expected_inward_date} onChange={(e) => updateField('expected_inward_date', e.target.value)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Gate Pass Number</div>
                    <Input value={formData.gate_pass_number} onChange={(e) => updateField('gate_pass_number', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Reason & Remarks */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase">Reason & Remarks</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Movement Reason *</div>
                  <Select value={formData.movement_reason} onValueChange={(v) => updateField('movement_reason', v)}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Relocation">Relocation</SelectItem>
                      <SelectItem value="Repair">Repair</SelectItem>
                      <SelectItem value="Upgrade">Upgrade</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.movement_reason === 'Other' && (
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">Other Reason</div>
                    <Input value={formData.other_reason} onChange={(e) => updateField('other_reason', e.target.value)} />
                  </div>
                )}
                <div className="col-span-2">
                  <div className="text-sm font-medium text-gray-900 mb-1">Remarks / Notes</div>
                  <Textarea value={formData.remarks} onChange={(e) => updateField('remarks', e.target.value)} rows={3} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>
                <Save className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Asset Movement</h1>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" /> Raise Movement Request
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Asset ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.request_number}</TableCell>
                  <TableCell>{m.asset_id}</TableCell>
                  <TableCell>{m.movement_type}</TableCell>
                  <TableCell>{m.from_building} - {m.from_floor}</TableCell>
                  <TableCell>{m.to_building || m.vendor_name}</TableCell>
                  <TableCell>
                    <Badge variant={m.movement_status === 'Approved' ? 'default' : m.movement_status === 'Rejected' ? 'destructive' : 'secondary'}>
                      {m.movement_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.movement_status === 'Pending' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(m.id)}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(m.id)}>Reject</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
        </div>
      )}
    </DashboardLayout>
  );
}
