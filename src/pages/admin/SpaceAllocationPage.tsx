import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Building, MapPin, Users, Calendar, Eye, UserCheck, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';



export default function SpaceAllocationPage() {
  const [spaces, setSpaces] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch spaces
      const { data: spacesData, error: spacesError } = await supabase
        .from('spaces')
        .select(`
          *,
          buildings(name),
          floor_plans(floor_number)
        `);

      if (spacesError) throw spacesError;

      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*');

      if (buildingsError) throw buildingsError;

      // Fetch allocation history
      const { data: historyData, error: historyError } = await supabase
        .from('allocation_history')
        .select(`
          *,
          spaces(space_number, space_type)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) console.error('History error:', historyError);

      // Transform spaces data
      const transformedSpaces = (spacesData || []).map(space => ({
        id: space.id,
        building: space.buildings?.name || 'Unknown Building',
        floor: space.floor_plans?.floor_number || 1,
        unit: space.space_number || space.id.slice(0, 8),
        type: space.space_type?.toLowerCase() || 'office',
        capacity: space.max_seats,
        status: space.status?.toLowerCase() || 'available',
        tenant: space.status?.toLowerCase() === 'occupied' ? 'Assigned Tenant' : null,
        monthly_rent: Math.round(space.area_sqft * space.rate_per_sqft),
        amenities: ['AC', 'WiFi', 'Parking']
      }));

      setSpaces(transformedSpaces);
      setBuildings(buildingsData || []);
      setAllocations(historyData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      occupied: 'bg-red-100 text-red-800',
      maintenance: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      office: 'bg-blue-100 text-blue-800',
      coworking: 'bg-green-100 text-green-800',
      incubator: 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const allocateSpace = async (spaceId: string, tenant: string) => {
    try {
      const { error } = await supabase
        .from('spaces')
        .update({ status: 'Occupied' })
        .eq('id', spaceId);

      if (error) throw error;

      // Add to allocation history
      await supabase
        .from('allocation_history')
        .insert({
          space_id: spaceId,
          action: 'allocated',
          tenant_name: tenant,
          allocated_by: 'admin@rathinam.edu'
        });

      // Update local state
      setSpaces(spaces.map(space => 
        space.id === spaceId ? { ...space, status: 'occupied', tenant } : space
      ));

      toast({
        title: "Success",
        description: "Space allocated successfully",
      });
    } catch (error) {
      console.error('Error allocating space:', error);
      toast({
        title: "Error",
        description: "Failed to allocate space",
        variant: "destructive",
      });
    }
  };

  const unallocateSpace = async (spaceId: string) => {
    try {
      const { error } = await supabase
        .from('spaces')
        .update({ status: 'Available' })
        .eq('id', spaceId);

      if (error) throw error;

      // Add to allocation history
      await supabase
        .from('allocation_history')
        .insert({
          space_id: spaceId,
          action: 'unallocated',
          allocated_by: 'admin@rathinam.edu'
        });

      // Update local state
      setSpaces(spaces.map(space => 
        space.id === spaceId ? { ...space, status: 'available', tenant: null } : space
      ));

      toast({
        title: "Success",
        description: "Space unallocated successfully",
      });
    } catch (error) {
      console.error('Error unallocating space:', error);
      toast({
        title: "Error",
        description: "Failed to unallocate space",
        variant: "destructive",
      });
    }
  };

  const filteredSpaces = spaces.filter(space => {
    const matchesSearch = space.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         space.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (space.tenant && space.tenant.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBuilding = buildingFilter === 'all' || space.building === buildingFilter;
    const matchesStatus = statusFilter === 'all' || space.status === statusFilter;
    const matchesType = typeFilter === 'all' || space.type === typeFilter;
    return matchesSearch && matchesBuilding && matchesStatus && matchesType;
  });

  const stats = {
    totalSpaces: spaces.length,
    availableSpaces: spaces.filter(s => s.status === 'available').length,
    occupiedSpaces: spaces.filter(s => s.status === 'occupied').length,
    occupancyRate: spaces.length > 0 ? (spaces.filter(s => s.status === 'occupied').length / spaces.length) * 100 : 0
  };

  if (loading) {
    return (
      <DashboardLayout title="Space Allocation" subtitle="Manage space assignments">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading spaces...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Space Allocation" subtitle="Manage space assignments">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Spaces</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalSpaces}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.availableSpaces}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{stats.occupiedSpaces}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.occupancyRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="spaces" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="spaces">Space Management</TabsTrigger>
            <TabsTrigger value="buildings">Building Overview</TabsTrigger>
            <TabsTrigger value="allocations">Allocation History</TabsTrigger>
          </TabsList>

          {/* Spaces Tab */}
          <TabsContent value="spaces" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Space Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      placeholder="Search spaces..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Building className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Buildings</SelectItem>
                      {buildings.map(building => (
                        <SelectItem key={building.id} value={building.name}>{building.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="coworking">Co-working</SelectItem>
                      <SelectItem value="incubator">Incubator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSpaces.map((space: any) => (
                    <Card key={space.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{space.unit}</CardTitle>
                            <div className="text-sm text-muted-foreground">{space.building} - Floor {space.floor}</div>
                          </div>
                          <Badge className={getStatusColor(space.status)}>
                            {space.status.toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <Badge className={getTypeColor(space.type)} variant="outline">
                              {space.type.toUpperCase()}
                            </Badge>
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-4 w-4" />
                              {space.capacity} seats
                            </div>
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">₹{space.monthly_rent.toLocaleString()}/month</div>
                            {space.tenant && (
                              <div className="text-muted-foreground">Tenant: {space.tenant}</div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {space.amenities.map((amenity: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {amenity}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedSpace(space);
                                setIsAllocationDialogOpen(true);
                              }}
                              className="flex-1"
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            {space.status === 'available' ? (
                              <Button 
                                size="sm"
                                onClick={() => allocateSpace(space.id, 'New Tenant')}
                                className="flex-1"
                              >
                                <UserCheck className="mr-1 h-3 w-3" />
                                Allocate
                              </Button>
                            ) : (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => unallocateSpace(space.id)}
                                className="flex-1"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Unallocate
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buildings Tab */}
          <TabsContent value="buildings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((building: any) => {
                const buildingSpaces = spaces.filter(s => s.building === building.name);
                const occupiedSpaces = buildingSpaces.filter(s => s.status === 'occupied').length;
                const availableSpaces = buildingSpaces.filter(s => s.status === 'available').length;
                const occupancyRate = buildingSpaces.length > 0 ? (occupiedSpaces / buildingSpaces.length) * 100 : 0;
                
                return (
                  <Card key={building.id} className="border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-lg">{building.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Floors</div>
                            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{building.floors}</div>
                          </div>
                          <div>
                            <div className="font-medium">Total Units</div>
                            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{buildingSpaces.length}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium">Occupied</div>
                            <div className="text-lg font-bold text-red-600">{occupiedSpaces}</div>
                          </div>
                          <div>
                            <div className="font-medium">Available</div>
                            <div className="text-lg font-bold text-green-600">{availableSpaces}</div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${occupancyRate}%` }}
                          ></div>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">
                          {occupancyRate.toFixed(1)}% Occupied
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Allocations Tab */}
          <TabsContent value="allocations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Allocation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allocations.length > 0 ? allocations.map((allocation: any) => (
                    <div key={allocation.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{allocation.tenant_name || 'System Action'}</span>
                          <Badge variant="outline">{allocation.spaces?.space_number || 'N/A'}</Badge>
                        </div>
                        <Badge className={allocation.action === 'allocated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {allocation.action.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Action Date</div>
                          <div>{new Date(allocation.created_at).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div className="font-medium">Space Type</div>
                          <div>{allocation.spaces?.space_type || 'N/A'}</div>
                        </div>
                        <div>
                          <div className="font-medium">Performed By</div>
                          <div>{allocation.allocated_by || 'System'}</div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No allocation history found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Allocation Dialog */}
        <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Space Details - {selectedSpace?.unit}</DialogTitle>
              <DialogDescription>Complete space information and allocation options</DialogDescription>
            </DialogHeader>
            {selectedSpace && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Space Information</h4>
                    <div className="text-sm space-y-1 mt-2">
                      <div>Building: {selectedSpace.building}</div>
                      <div>Floor: {selectedSpace.floor}</div>
                      <div>Unit: {selectedSpace.unit}</div>
                      <div>Type: <Badge className={getTypeColor(selectedSpace.type)}>{selectedSpace.type}</Badge></div>
                      <div>Capacity: {selectedSpace.capacity} seats</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Rental Information</h4>
                    <div className="text-sm space-y-1 mt-2">
                      <div>Monthly Rent: ₹{selectedSpace.monthly_rent.toLocaleString()}</div>
                      <div>Status: <Badge className={getStatusColor(selectedSpace.status)}>{selectedSpace.status}</Badge></div>
                      {selectedSpace.tenant && <div>Current Tenant: {selectedSpace.tenant}</div>}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Amenities</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSpace.amenities.map((amenity: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  {selectedSpace.status === 'available' ? (
                    <Button 
                      onClick={() => {
                        allocateSpace(selectedSpace.id, 'New Tenant');
                        setIsAllocationDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      Allocate Space
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        unallocateSpace(selectedSpace.id);
                        setIsAllocationDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      Unallocate Space
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}