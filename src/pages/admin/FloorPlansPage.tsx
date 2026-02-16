import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, Upload, Grid, Building, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Define types for our data objects
interface FloorPlan {
  id: string;
  building_id: string;
  floor_number: number;
  name: string;
  plan_image_url: string | null;
  // For display, we'll join the building name
  buildings: { name: string } | null;
}

interface BuildingType {
  id: string;
  name: string;
}

export default function FloorPlansPage() {
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUnitsDialogOpen, setIsAddUnitsDialogOpen] = useState(false);
  const [selectedFloorForUnits, setSelectedFloorForUnits] = useState<FloorPlan | null>(null);
  const [floorUnits, setFloorUnits] = useState<any[]>([]);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [isEditUnitDialogOpen, setIsEditUnitDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    // Fetch both floor plans and buildings in parallel
    const [floorPlansRes, buildingsRes] = await Promise.all([
      supabase.from('floors').select('*'),
      supabase.from('buildings').select('id, name'),
    ]);

    // Manually join building names since the foreign key relationship might not be set up
    if (floorPlansRes.data && buildingsRes.data) {
      const buildingsMap = new Map(buildingsRes.data.map(b => [b.id, b.name]));
      floorPlansRes.data = floorPlansRes.data.map(floor => ({
        ...floor,
        buildings: { name: buildingsMap.get(floor.building_id) || 'Unknown Building' }
      }));
    }

    if (floorPlansRes.error) {
      console.error('Floor plans error:', floorPlansRes.error);
      toast({ title: "Error fetching floor plans", description: floorPlansRes.error.message, variant: "destructive" });
    } else if (floorPlansRes.data) {
      console.log('Floors fetched:', floorPlansRes.data);
      setFloorPlans(floorPlansRes.data as any);
    }

    if (buildingsRes.error) {
      toast({ title: "Error fetching buildings", description: buildingsRes.error.message, variant: "destructive" });
    } else if (buildingsRes.data) {
      setBuildings(buildingsRes.data as BuildingType[]);
    }

    setLoading(false);
  };

  const handleAddFloorPlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPlanData = {
      building_id: formData.get('building_id') as string,
      floor_number: parseInt(formData.get('floor_number') as string),
      name: formData.get('name') as string,
      area_sqft: parseInt(formData.get('area_sqft') as string) || null,
    };

    const { data, error } = await supabase.from('floors').insert(newPlanData).select('*').single();
    
    if (data) {
      const building = buildings.find(b => b.id === data.building_id);
      (data as any).buildings = { name: building?.name || 'Unknown Building' };
    }

    if (error) {
      toast({ title: "Error adding floor plan", description: error.message, variant: "destructive" });
    } else if (data) {
      setFloorPlans(prev => [...prev, data as any]);
      setIsAddDialogOpen(false);
      toast({ title: "Success", description: "Floor plan added successfully." });
    }
  };

  const handleEditFloorPlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFloorPlan) return;

    const formData = new FormData(e.currentTarget);
    const updatedData = {
      building_id: formData.get('building_id') as string,
      floor_number: parseInt(formData.get('floor_number') as string),
      name: formData.get('name') as string,
      area_sqft: parseInt(formData.get('area_sqft') as string) || null,
    };

    const { data, error } = await supabase
      .from('floors')
      .update(updatedData)
      .eq('id', selectedFloorPlan.id)
      .select('*')
      .single();
    
    if (data) {
      const building = buildings.find(b => b.id === data.building_id);
      (data as any).buildings = { name: building?.name || 'Unknown Building' };
    }

    if (error) {
      toast({ title: "Error updating floor plan", description: error.message, variant: "destructive" });
    } else if (data) {
      setFloorPlans(prev => prev.map(fp => fp.id === selectedFloorPlan.id ? data as any : fp));
      setIsEditDialogOpen(false);
      toast({ title: "Success", description: "Floor plan updated successfully." });
    }
  };

  const handleDeleteFloorPlan = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this floor plan?")) return;

    const { error } = await supabase.from('floors').delete().eq('id', id);

    if (error) {
      toast({ title: "Error deleting floor plan", description: error.message, variant: "destructive" });
    } else {
      setFloorPlans(prev => prev.filter(fp => fp.id !== id));
      toast({ title: "Success", description: "Floor plan deleted successfully." });
    }
  };

  const filteredFloorPlans = floorPlans.filter(fp => {
    const buildingName = fp.buildings?.name || '';
    const matchesSearch = fp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buildingName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = buildingFilter === 'all' || fp.building_id === buildingFilter;
    return matchesSearch && matchesBuilding;
  });

  return (
    <DashboardLayout title="Floor Plans Management" subtitle="Design and manage floor layouts">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats would go here */}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Floor Plans</CardTitle>
              <Button onClick={() => setIsAddDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Floor Plan</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {loading ? <p>Loading...</p> : filteredFloorPlans.length === 0 ? (
              <p>No floor plans found. Add some floors to get started.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFloorPlans.map((plan) => (
                  <Card key={plan.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{plan.buildings?.name || 'Unknown Building'} - Floor {plan.floor_number}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" onClick={() => { setSelectedFloorPlan(plan); setIsEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDeleteFloorPlan(plan.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={async () => {
                            setSelectedFloorForUnits(plan);
                            // Fetch existing units for this floor
                            const { data: units } = await supabase
                              .from('units')
                              .select('*')
                              .eq('floor_id', plan.id);
                            setFloorUnits(units || []);
                            setIsAddUnitsDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />Add Units
                        </Button>
                        <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => { setSelectedFloorPlan(plan); setIsEditDialogOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" />Edit
                        </Button>
                        <Button variant="outline" size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleDeleteFloorPlan(plan.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialogs */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Floor Plan</DialogTitle></DialogHeader>
            <form onSubmit={handleAddFloorPlan} className="space-y-4">
              <div>
                <Label>Building</Label>
                <Select name="building_id" required>
                  <SelectTrigger><SelectValue placeholder="Select a building" /></SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Floor Name</Label><Input name="name" required /></div>
              <div><Label>Floor Number</Label><Input name="floor_number" type="number" required /></div>
              <div><Label>Area (Sq.Ft)</Label><Input name="area_sqft" type="number" placeholder="Enter floor area" /></div>
              <Button type="submit">Add Floor Plan</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Floor Plan</DialogTitle></DialogHeader>
            {selectedFloorPlan && (
              <form onSubmit={handleEditFloorPlan} className="space-y-4">
                <div>
                  <Label>Building</Label>
                  <Select name="building_id" defaultValue={selectedFloorPlan.building_id} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {buildings.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Floor Name</Label><Input name="name" defaultValue={selectedFloorPlan.name} required /></div>
                <div><Label>Floor Number</Label><Input name="floor_number" type="number" defaultValue={selectedFloorPlan.floor_number} required /></div>
                <div><Label>Area (Sq.Ft)</Label><Input name="area_sqft" type="number" defaultValue={selectedFloorPlan.area_sqft} placeholder="Enter floor area" /></div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Update Floor Plan</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Units Dialog */}
        <Dialog open={isAddUnitsDialogOpen} onOpenChange={setIsAddUnitsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Manage Units - {selectedFloorForUnits?.name}</DialogTitle></DialogHeader>
            
            {floorUnits.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium mb-3">Existing Units</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {floorUnits.map((unit) => (
                    <div key={unit.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{unit.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {unit.type} • {unit.area_sqft || 0} sq.ft • ₹{unit.monthly_rent || 0}/month
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingUnit(unit);
                          setIsEditUnitDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <h4 className="font-medium mb-3">Add New Unit</h4>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const unitData = {
                floor_id: selectedFloorForUnits?.id,
                name: formData.get('unit_name') as string,
                type: formData.get('unit_type') as string,
                area_sqft: parseInt(formData.get('area_sqft') as string) || null,
                monthly_rent: parseInt(formData.get('monthly_rent') as string) || null,
                status: 'available'
              };
              
              const { error } = await supabase.from('units').insert([unitData]);
              
              if (error) {
                toast({ title: "Error adding unit", description: error.message, variant: "destructive" });
              } else {
                toast({ title: "Success", description: "Unit added successfully." });
                // Refresh units list
                const { data: units } = await supabase
                  .from('units')
                  .select('*')
                  .eq('floor_id', selectedFloorForUnits?.id);
                setFloorUnits(units || []);
              }
            }} className="space-y-4">
              <div><Label>Unit Name</Label><Input name="unit_name" placeholder="e.g., Reception, Office 101" required /></div>
              <div>
                <Label>Unit Type</Label>
                <Select name="unit_type" required>
                  <SelectTrigger><SelectValue placeholder="Select unit type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="meeting_room">Meeting Room</SelectItem>
                    <SelectItem value="cabin">Cabin</SelectItem>
                    <SelectItem value="desk">Desk</SelectItem>
                    <SelectItem value="common_area">Common Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Area (Sq.Ft)</Label><Input name="area_sqft" type="number" placeholder="Enter unit area" /></div>
              <div><Label>Monthly Rent (₹)</Label><Input name="monthly_rent" type="number" placeholder="Enter monthly rent" /></div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddUnitsDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Add Unit</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Unit Dialog */}
        <Dialog open={isEditUnitDialogOpen} onOpenChange={setIsEditUnitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Unit</DialogTitle></DialogHeader>
            {editingUnit && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedData = {
                  name: formData.get('unit_name') as string,
                  type: formData.get('unit_type') as string,
                  area_sqft: parseInt(formData.get('area_sqft') as string) || null,
                  monthly_rent: parseInt(formData.get('monthly_rent') as string) || null,
                };
                
                const { error } = await supabase
                  .from('units')
                  .update(updatedData)
                  .eq('id', editingUnit.id);
                
                if (error) {
                  toast({ title: "Error updating unit", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "Success", description: "Unit updated successfully." });
                  setIsEditUnitDialogOpen(false);
                  const { data: units } = await supabase
                    .from('units')
                    .select('*')
                    .eq('floor_id', selectedFloorForUnits?.id);
                  setFloorUnits(units || []);
                }
              }} className="space-y-4">
                <div><Label>Unit Name</Label><Input name="unit_name" defaultValue={editingUnit.name} required /></div>
                <div>
                  <Label>Unit Type</Label>
                  <Select name="unit_type" defaultValue={editingUnit.type} required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="meeting_room">Meeting Room</SelectItem>
                      <SelectItem value="cabin">Cabin</SelectItem>
                      <SelectItem value="desk">Desk</SelectItem>
                      <SelectItem value="common_area">Common Area</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Area (Sq.Ft)</Label><Input name="area_sqft" type="number" defaultValue={editingUnit.area_sqft} placeholder="Enter unit area" /></div>
                <div><Label>Monthly Rent (₹)</Label><Input name="monthly_rent" type="number" defaultValue={editingUnit.monthly_rent} placeholder="Enter monthly rent" /></div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditUnitDialogOpen(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1">Update Unit</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
