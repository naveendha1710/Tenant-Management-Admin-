import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';

import { Building2, Plus, MapPin, Users, Square, Edit, Trash2, Info } from 'lucide-react';

const spaceSchema = z.object({
  area_sqft: z.number().min(1, 'Area must be greater than 0'),
  rate_per_sqft: z.number().min(0, 'Rate per sqft must be non-negative'),
  status: z.string().min(1, 'Status is required'),
});

type SpaceFormData = z.infer<typeof spaceSchema>;

interface Space {
  id: string;
  space_number: string;
  space_type: string;
  area_sqft: number;
  max_seats: number;
  rate_per_sqft: number;
  rate_per_seat: number;
  status: string;
  amenities: string[];
  floor: {
    floor_number: number;
    building: {
      name: string;
    };
  };
}

interface Building {
  id: string;
  name: string;
  total_floors: number;
  total_area: number;
  status: string;
}

interface Floor {
  id: string;
  floor_number: number;
  total_area: number;
  available_area: number;
  status: string;
  building_id: string;
}

const spaceTypes = ['Office', 'Cabin', 'Desk', 'Meeting Room', 'Common Area'];

export function SpaceManagement() {
  const { toast } = useToast();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloors, setSelectedFloors] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewingSpaceDetails, setViewingSpaceDetails] = useState<any>(null);

  const [floorUnits, setFloorUnits] = useState([]);
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);
  const [showSelectedUnits, setShowSelectedUnits] = useState(false);
  const [usedUnits, setUsedUnits] = useState<Set<string>>(new Set());

  const form = useForm<SpaceFormData>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      area_sqft: 0,
      rate_per_sqft: 0,
      status: 'Available',
    },
  });

  useEffect(() => {
    fetchBuildings();
    fetchSpaces();
    fetchUnitStats();
  }, []);

  useEffect(() => {
    fetchUsedUnits();
  }, [editingSpace]);

  const fetchUsedUnits = async () => {
    try {
      // Mock data - no units used
      setUsedUnits(new Set());
    } catch (error) {
      console.error('Error fetching used units:', error);
    }
  };

  useEffect(() => {
    if (selectedBuilding) {
      fetchFloors(selectedBuilding);
    }
  }, [selectedBuilding]);

  useEffect(() => {
    if (selectedFloors.length > 0) {
      fetchMultipleFloorUnits(selectedFloors);
    } else {
      setFloorUnits([]);
    }
  }, [selectedFloors]);



  const fetchBuildings = async () => {
    try {
      const mockBuildings = [
        { id: '1', name: 'Rathinam Tech Park - Block A', total_floors: 5, total_area: 10000, status: 'Active' },
        { id: '2', name: 'Rathinam Tech Park - Block B', total_floors: 3, total_area: 7500, status: 'Active' }
      ];
      setBuildings(mockBuildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast({ title: 'Error', description: 'Failed to fetch buildings', variant: 'destructive' });
    }
  };

  const fetchFloors = async (buildingId: string) => {
    try {
      const mockFloors = [
        { id: '1', floor_number: 1, total_area: 2000, available_area: 1500, status: 'Active', building_id: buildingId, name: 'Ground Floor' },
        { id: '2', floor_number: 2, total_area: 2000, available_area: 1800, status: 'Active', building_id: buildingId, name: 'First Floor' },
        { id: '3', floor_number: 3, total_area: 2000, available_area: 2000, status: 'Active', building_id: buildingId, name: 'Second Floor' }
      ];
      setFloors(mockFloors);
    } catch (error) {
      console.error('Error fetching floors:', error);
      toast({ title: 'Error', description: 'Failed to fetch floors', variant: 'destructive' });
    }
  };

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const { mockSpaces } = await import('@/data/mockData');
      const spacesWithLocation = mockSpaces.map(space => ({
        ...space,
        buildings: { name: space.floor.building.name },
        floor_plans: { floor_number: space.floor.floor_number.toString() }
      }));
      setSpaces(spacesWithLocation);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      toast({ title: 'Error', description: 'Failed to fetch spaces', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SpaceFormData) => {
    console.log('Form data:', data);
    console.log('Selected units:', selectedUnits);
    
    if (!editingSpace && (!selectedBuilding || selectedFloors.length === 0)) {
      toast({ title: 'Error', description: 'Please select building and at least one floor', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Calculate total area from selected units
      const totalArea = selectedUnits.reduce((sum, unit) => sum + (unit.area_sqft || 0), 0);
      
      // Mock space creation/update
      const spaceType = 'Office';
      const floorNumbers = selectedFloors.map(id => floors.find(f => f.id === id)?.floor_number).filter(Boolean);
      const spaceNumber = `F${floorNumbers.join('-')}-${Date.now().toString().slice(-4)}`;

      if (editingSpace) {
        toast({ title: 'Success', description: 'Space updated successfully' });
        await fetchUsedUnits();
      } else {
        toast({ title: 'Success', description: 'Space created successfully' });
      }

      setIsDialogOpen(false);
      setEditingSpace(null);
      form.reset();
      setSelectedBuilding('');
      setSelectedFloors([]);
      setSelectedUnits([]);
      await fetchSpaces();
      await fetchUnitStats();
      await fetchUsedUnits();
    } catch (error: any) {
      console.error('Error saving space:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save space', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (space: any) => {
    setEditingSpace(space);
    setSelectedBuilding(space.building_id || '');
    setSelectedFloors(space.floor_id ? [space.floor_id] : []);
    
    // Mock units for editing
    setSelectedUnits([]);
    
    form.reset({
      area_sqft: space.area_sqft || 0,
      rate_per_sqft: space.rate_per_sqft || 0,
      status: space.status || 'Available',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this space?')) return;

    try {
      // Mock delete
      toast({ title: 'Success', description: 'Space deleted successfully' });
      await fetchSpaces();
      await fetchUnitStats();
      await fetchUsedUnits();
    } catch (error: any) {
      console.error('Error deleting space:', error);
      toast({ title: 'Error', description: error.message || 'Failed to delete space', variant: 'destructive' });
    }
  };

  const fetchMultipleFloorUnits = async (floorIds: string[]) => {
    try {
      const mockUnits = [
        { id: '1', unit_number: '101', name: 'Office 101', type: 'Office', area_sqft: 500, monthly_rent: 25000, tenant_id: null, floor_id: floorIds[0] },
        { id: '2', unit_number: '102', name: 'Office 102', type: 'Office', area_sqft: 600, monthly_rent: 30000, tenant_id: null, floor_id: floorIds[0] },
        { id: '3', unit_number: '103', name: 'Cabin 103', type: 'Cabin', area_sqft: 200, monthly_rent: 15000, tenant_id: null, floor_id: floorIds[0] }
      ];
      
      const unitsWithFloorInfo = mockUnits.map(unit => {
        const floor = floors.find(f => f.id === unit.floor_id);
        return {
          ...unit,
          floor_name: floor?.name || `Floor ${floor?.floor_number || 'Unknown'}`
        };
      });
      
      setFloorUnits(unitsWithFloorInfo);
    } catch (error) {
      console.error('Error fetching floor units:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'Occupied': return 'bg-red-100 text-red-800';
      case 'Reserved': return 'bg-yellow-100 text-yellow-800';
      case 'Maintenance': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const [unitStats, setUnitStats] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    reserved: 0,
    maintenance: 0,
    occupancyRate: '0'
  });

  const fetchUnitStats = async () => {
    try {
      const mockStats = {
        total: 15,
        available: 10,
        occupied: 3,
        reserved: 1,
        maintenance: 1,
        occupancyRate: '20.0'
      };
      setUnitStats(mockStats);
    } catch (error) {
      console.error('Error fetching unit stats:', error);
    }
  };

  const stats = unitStats;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Spaces</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.available}</p>
              </div>
              <Square className="h-8 w-8 text-green-600" />
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{stats.occupied}</p>
              </div>
              <Users className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.reserved}</p>
              </div>
              <MapPin className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.maintenance || 0}</p>
              </div>
              <Building2 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Space Management</CardTitle>
              <CardDescription>
                Manage office spaces, cabins, desks, and meeting rooms
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingSpace(null);
                  form.reset();
                  setSelectedUnits([]);
                  setSelectedBuilding('');
                  setSelectedFloors([]);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Space
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto relative top-[-50vh]">
                <DialogHeader>
                  <DialogTitle>
                    {editingSpace ? 'Edit Space' : 'Add New Space'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSpace ? 'Update space details' : 'Create a new space in the selected floor'}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Building</label>
                        <Select value={selectedBuilding} onValueChange={(value) => {
                          console.log('Building selected:', value);
                          setSelectedBuilding(value);
                          setSelectedFloors([]); // Reset floor selection
                          if (value) {
                            fetchFloors(value);
                          } else {
                            setFloors([]);
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select building" />
                          </SelectTrigger>
                          <SelectContent>
                            {buildings.map((building) => (
                              <SelectItem key={building.id} value={building.id}>
                                {building.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Floors</label>
                        <div className="border rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                          {floors.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Select a building to see floors</p>
                          ) : (
                            <div className="space-y-2">
                              {floors.map((floor) => (
                                <div 
                                  key={floor.id} 
                                  className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                                    selectedFloors.includes(floor.id) ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                                  }`}
                                  onClick={() => {
                                    if (selectedFloors.includes(floor.id)) {
                                      setSelectedFloors(selectedFloors.filter(id => id !== floor.id));
                                    } else {
                                      setSelectedFloors([...selectedFloors, floor.id]);
                                    }
                                  }}
                                >
                                  <div className="font-medium">Floor {floor.floor_number}</div>
                                  <div className="text-sm text-muted-foreground">{floor.name || 'No description'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedFloors.length > 0 && !editingSpace && (
                      <div className="border-t pt-4">
                        <div className="mb-4">
                          <h4 className="font-medium">Units in Selected Floor</h4>
                          {selectedUnits.length > 0 && (
                            <div className="text-sm text-blue-600 mt-1">
                              {selectedUnits.length} selected • {selectedUnits.reduce((sum, unit) => sum + (unit.area_sqft || 0), 0)} sq.ft total
                            </div>
                          )}
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                          {floorUnits.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">No units found in this floor</p>
                          ) : (
                            <div className="space-y-2">
                              {floorUnits.map((unit: any) => (
                                <div key={unit.id} className="p-3 border rounded-md bg-gray-50">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="font-medium">{unit.name || `Unit ${unit.unit_number}`}</div>
                                      <div className="text-sm text-muted-foreground">{unit.type} • {unit.floor_name}</div>
                                      <div className="text-sm">{unit.area_sqft} sq.ft • ₹{unit.monthly_rent}/month</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        unit.tenant_id ? 'bg-red-100 text-red-800' : 
                                        selectedUnits.find(u => u.id === unit.id) ? 'bg-gray-100 text-gray-800' :
                                        usedUnits.has(unit.id) ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                                      }`}>
                                        {unit.tenant_id ? 'Occupied' : 
                                         selectedUnits.find(u => u.id === unit.id) ? 'Used' :
                                         usedUnits.has(unit.id) ? 'Used' : 'Available'}
                                      </span>
                                      {!unit.tenant_id && (!usedUnits.has(unit.id) || selectedUnits.find(u => u.id === unit.id)) && (
                                        <Button 
                                          size="sm" 
                                          variant={selectedUnits.find(u => u.id === unit.id) ? "default" : "outline"}
                                          className="w-8 h-8 p-0"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const isSelected = selectedUnits.find(u => u.id === unit.id);
                                            let newSelectedUnits;
                                            
                                            if (isSelected) {
                                              // Remove unit
                                              newSelectedUnits = selectedUnits.filter(u => u.id !== unit.id);
                                            } else {
                                              // Add unit
                                              newSelectedUnits = [...selectedUnits, unit];
                                            }
                                            
                                            setSelectedUnits(newSelectedUnits);
                                            setShowSelectedUnits(newSelectedUnits.length > 0);
                                            // Update form area value
                                            const totalArea = newSelectedUnits.reduce((sum, u) => sum + (u.area_sqft || 0), 0);
                                            form.setValue('area_sqft', totalArea);
                                            if (totalArea === 0) {
                                              form.clearErrors('area_sqft');
                                            }
                                          }}
                                        >
                                          {selectedUnits.find(u => u.id === unit.id) ? 
                                            <span className="text-lg leading-none">−</span> : 
                                            <Plus className="h-4 w-4" />
                                          }
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedUnits.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <h5 className="font-medium text-sm mb-2">Selected Units ({selectedUnits.length})</h5>
                        <div className="space-y-2">
                          {selectedUnits.map((unit) => (
                            <div key={unit.id} className="flex justify-between items-center p-2 bg-white rounded border">
                              <div>
                                <div className="font-medium text-sm">{unit.name}</div>
                                <div className="text-xs text-muted-foreground">{unit.type} • {unit.area_sqft || 0} sq.ft</div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                onClick={() => {
                                  const newSelectedUnits = selectedUnits.filter(u => u.id !== unit.id);
                                  setSelectedUnits(newSelectedUnits);
                                  // Update form area value
                                  const totalArea = newSelectedUnits.reduce((sum, u) => sum + (u.area_sqft || 0), 0);
                                  form.setValue('area_sqft', totalArea);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="area_sqft"
                        render={({ field }) => {
                          const totalSelectedArea = selectedUnits.reduce((sum, unit) => sum + (unit.area_sqft || 0), 0);
                          // Use totalSelectedArea if available, otherwise use field value
                          const displayValue = totalSelectedArea > 0 ? totalSelectedArea : field.value;
                          return (
                            <FormItem>
                              <FormLabel>Area (Sq.Ft) {totalSelectedArea > 0 && `(Auto: ${totalSelectedArea})`}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  value={displayValue}
                                  onChange={(e) => {
                                    const newValue = Number(e.target.value);
                                    field.onChange(newValue);
                                  }}
                                  placeholder={totalSelectedArea > 0 ? `Auto-calculated: ${totalSelectedArea}` : "Enter area"}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="rate_per_sqft"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rate/Sq.Ft (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="Occupied">Occupied</SelectItem>
                              <SelectItem value="Reserved">Reserved</SelectItem>
                              <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Saving...' : (editingSpace ? 'Update Space' : 'Create Space')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Occupied">Occupied</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Space Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Area</TableHead>

                <TableHead>Rate/Sq.Ft</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading spaces...
                  </TableCell>
                </TableRow>
              ) : spaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No spaces found
                  </TableCell>
                </TableRow>
              ) : (
                spaces
                  .filter(space => statusFilter === 'all' || space.status === statusFilter)
                  .map((space) => (
                  <TableRow key={space.id}>
                    <TableCell className="font-medium">{space.space_number || space.id.slice(0, 8)}</TableCell>
                    <TableCell>{space.space_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{space.buildings?.name} - Floor {space.floor_plans?.floor_number}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => setViewingSpaceDetails(space)}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{space.area_sqft} sq.ft</TableCell>

                    <TableCell>₹{space.rate_per_sqft}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(space.status)}>
                        {space.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(space)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(space.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Space Details Dialog */}
      <Dialog open={!!viewingSpaceDetails} onOpenChange={() => setViewingSpaceDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Space Details</DialogTitle>
          </DialogHeader>
          {viewingSpaceDetails && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Space Number</Label>
                <p className="text-sm">{viewingSpaceDetails.space_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Building</Label>
                <p className="text-sm">{viewingSpaceDetails.buildings?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Floor</Label>
                <p className="text-sm">Floor {viewingSpaceDetails.floor_plans?.floor_number}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Area</Label>
                <p className="text-sm">{viewingSpaceDetails.area_sqft} sq.ft</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm">{viewingSpaceDetails.status}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}