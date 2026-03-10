import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Home, Wrench, Clock, CheckCircle, Settings, Plus, Lock, Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/utils/permissions';
import { buildingsService, type Building } from '@/services/buildingsService';
import LoadingScreen from '@/components/LoadingScreen';

// Buildings Tab Component
function BuildingsTab({ buildings, buildingFloors, actualFloorCounts, spaceStats, canAdd, canEdit, canDelete, loading, onAddBuilding, onDeleteBuilding, navigate }) {
  const stats = [
    {
      title: "Total Sqft",
      value: spaceStats.totalSpaces,
      icon: Building2,
      color: "text-blue-600"
    },
    {
      title: "Available Sqft",
      value: spaceStats.available,
      icon: Home,
      color: "text-green-600"
    },
    {
      title: "Occupied Sqft",
      value: spaceStats.occupied,
      icon: CheckCircle,
      color: "text-orange-600"
    }
  ];

  return (
    <>
      {/* Space Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">Buildings</h2>
        <div className="flex gap-2">
          {canAdd ? (
            <Button onClick={onAddBuilding}>
              <Plus className="h-4 w-4 mr-2" />
              Add Building
            </Button>
          ) : (
            <Button disabled title="You don't have permission to add buildings">
              <Lock className="h-4 w-4 mr-2" />
              Add Building
            </Button>
          )}
        </div>
      </div>

      {/* Buildings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {loading ? (
          <div className="col-span-2 flex justify-center py-8">
            <LoadingScreen />
          </div>
        ) : buildings.length === 0 ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-muted-foreground">No buildings found. Add your first building to get started.</p>
          </div>
        ) : (
          buildings.map((building) => (
            <Card key={building.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg md:text-xl">{building.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{actualFloorCounts[building.id] || building.total_floors} floors</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center p-3 bg-blue-50 rounded-lg mb-4">
                  <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{(buildingFloors[building.id] || building.total_sqft).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Sqft</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {canEdit ? (
                    <Button 
                      className="flex-1" 
                      onClick={() => navigate(`/admin/building-manage/${building.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  ) : (
                    <Button 
                      className="flex-1" 
                      disabled
                      title="You don't have permission to edit buildings"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  )}
                  {canDelete && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => onDeleteBuilding(building)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Building
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

// Floors Tab Component
function FloorsTab({ canAdd, canEdit, canDelete }) {
  const [floors, setFloors] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [isAddFloorOpen, setIsAddFloorOpen] = useState(false);
  const [deleteFloorId, setDeleteFloorId] = useState(null);
  const [floorForm, setFloorForm] = useState({
    building_id: '',
    floor_number: '',
    floor_name: '',
    total_sqft: '',
    number_of_seats: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [buildingsData, floorsData] = await Promise.all([
        buildingsService.getBuildings(),
        loadAllFloors()
      ]);
      setBuildings(buildingsData);
      setFloors(floorsData);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadAllFloors = async () => {
    const { supabase } = await import('@/lib/supabase');
    const { data: floorsData } = await supabase
      .from('floors')
      .select(`
        *,
        buildings(name),
        rooms(count)
      `)
      .order('floor_number');
    
    return floorsData?.map(floor => ({
      ...floor,
      building_name: floor.buildings?.name,
      room_count: floor.rooms?.length || 0
    })) || [];
  };

  const filteredFloors = floors.filter(floor => {
    const matchesSearch = floor.floor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         floor.floor_number?.toString().includes(searchTerm);
    const matchesBuilding = selectedBuilding === 'all' || floor.building_id === selectedBuilding;
    return matchesSearch && matchesBuilding;
  });

  const handleEditFloor = (floor) => {
    setFloorForm({
      building_id: floor.building_id,
      floor_number: floor.floor_number.toString(),
      floor_name: floor.floor_name || '',
      total_sqft: floor.total_sqft.toString(),
      number_of_seats: floor.number_of_seats?.toString() || ''
    });
    setIsAddFloorOpen(true);
  };

  const handleDeleteFloor = async (floorId) => {
    setDeleteFloorId(floorId);
  };

  const confirmDeleteFloor = async () => {
    try {
      await buildingsService.deleteFloor(deleteFloorId);
      toast({ title: 'Success', description: 'Floor deleted successfully' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete floor', variant: 'destructive' });
    }
    setDeleteFloorId(null);
  };

  return (
    <>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search floors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Buildings</option>
          {buildings.map(building => (
            <option key={building.id} value={building.id}>{building.name}</option>
          ))}
        </select>
        {canAdd && (
          <Button onClick={() => setIsAddFloorOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Floor
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sqft</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rooms</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupancy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
                ) : filteredFloors.map(floor => {
                  const occupancyPercent = floor.total_sqft > 0 ? ((floor.occupied_sqft || 0) / floor.total_sqft * 100) : 0;
                  return (
                    <tr key={floor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">{floor.building_name}</td>
                      <td className="px-6 py-4 text-sm font-medium">{floor.floor_name || `Floor ${floor.floor_number}`}</td>
                      <td className="px-6 py-4 text-sm">{floor.total_sqft?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{(floor.occupied_sqft || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{(floor.total_sqft - (floor.occupied_sqft || 0)).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">{floor.room_count}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs">{occupancyPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/building-manage/${floor.building_id}`)}>Manage</Button>
                          {canEdit && <Button size="sm" variant="outline" onClick={() => handleEditFloor(floor)}>Edit</Button>}
                          {canDelete && <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteFloor(floor.id)}>Delete</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Floor Dialog */}
      <Dialog open={isAddFloorOpen} onOpenChange={setIsAddFloorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Floor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Building</Label>
              <select
                value={floorForm.building_id}
                onChange={(e) => setFloorForm({...floorForm, building_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select Building</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Floor Number</Label>
              <Input
                type="number"
                value={floorForm.floor_number}
                onChange={(e) => setFloorForm({...floorForm, floor_number: e.target.value})}
                placeholder="e.g., 1"
                required
              />
            </div>
            <div>
              <Label>Floor Name</Label>
              <Input
                value={floorForm.floor_name}
                onChange={(e) => setFloorForm({...floorForm, floor_name: e.target.value})}
                placeholder="e.g., Ground Floor"
              />
            </div>
            <div>
              <Label>Total Sqft</Label>
              <Input
                type="number"
                value={floorForm.total_sqft}
                onChange={(e) => setFloorForm({...floorForm, total_sqft: e.target.value})}
                placeholder="e.g., 5000"
                required
              />
            </div>
            <div>
              <Label>Number of Seats</Label>
              <Input
                type="number"
                value={floorForm.number_of_seats}
                onChange={(e) => setFloorForm({...floorForm, number_of_seats: e.target.value})}
                placeholder="e.g., 50"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddFloorOpen(false);
                  setFloorForm({ building_id: '', floor_number: '', floor_name: '', total_sqft: '', number_of_seats: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await buildingsService.addFloor(floorForm.building_id, {
                      floor_number: parseInt(floorForm.floor_number),
                      floor_name: floorForm.floor_name,
                      total_sqft: parseInt(floorForm.total_sqft),
                      number_of_seats: floorForm.number_of_seats ? parseInt(floorForm.number_of_seats) : null
                    });
                    toast({ title: 'Success', description: 'Floor added successfully' });
                    setIsAddFloorOpen(false);
                    setFloorForm({ building_id: '', floor_number: '', floor_name: '', total_sqft: '', number_of_seats: '' });
                    loadData();
                  } catch (error) {
                    toast({ title: 'Error', description: 'Failed to add floor', variant: 'destructive' });
                  }
                }}
                className="flex-1"
              >
                Add Floor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Floor Confirmation */}
      <Dialog open={!!deleteFloorId} onOpenChange={() => setDeleteFloorId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Floor</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this floor? This action cannot be undone.</p>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteFloorId(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFloor} className="flex-1">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Rooms Tab Component
function RoomsTab({ canAdd, canEdit, canDelete }) {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState({
    building_id: '',
    floor_id: '',
    room_number: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const [buildingsData, roomsData] = await Promise.all([
        buildingsService.getBuildings(),
        supabase.from('rooms').select(`
          *,
          buildings(name),
          floors(floor_number, floor_name)
        `)
      ]);
      
      setBuildings(buildingsData);
      setRooms(roomsData.data?.map(room => ({
        ...room,
        building_name: room.buildings?.name,
        floor_name: room.floors?.floor_name || `Floor ${room.floors?.floor_number}`
      })) || []);
      
      const floorsData = await supabase.from('floors').select('*').order('floor_number');
      setFloors(floorsData.data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.room_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding = selectedBuilding === 'all' || room.building_id === selectedBuilding;
    const matchesFloor = selectedFloor === 'all' || room.floor_id === selectedFloor;
    return matchesSearch && matchesBuilding && matchesFloor;
  });

  const availableFloors = floors.filter(floor => 
    selectedBuilding === 'all' || floor.building_id === selectedBuilding
  );

  const handleEditRoom = (room) => {
    setRoomForm({
      building_id: room.building_id,
      floor_id: room.floor_id,
      room_number: room.room_number
    });
    setIsAddRoomOpen(true);
  };

  const handleDeleteRoom = async (roomId) => {
    setDeleteRoomId(roomId);
  };

  const confirmDeleteRoom = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('rooms').delete().eq('id', deleteRoomId);
      toast({ title: 'Success', description: 'Room deleted successfully' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' });
    }
    setDeleteRoomId(null);
  };

  return (
    <>
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search rooms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={selectedBuilding}
          onChange={(e) => {
            setSelectedBuilding(e.target.value);
            setSelectedFloor('all');
          }}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Buildings</option>
          {buildings.map(building => (
            <option key={building.id} value={building.id}>{building.name}</option>
          ))}
        </select>
        <select
          value={selectedFloor}
          onChange={(e) => setSelectedFloor(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Floors</option>
          {availableFloors.map(floor => (
            <option key={floor.id} value={floor.id}>
              {floor.floor_name || `Floor ${floor.floor_number}`}
            </option>
          ))}
        </select>
        {canAdd && (
          <Button onClick={() => setIsAddRoomOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Room
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Floor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Room Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                ) : filteredRooms.map(room => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{room.building_name}</td>
                    <td className="px-6 py-4 text-sm">{room.floor_name}</td>
                    <td className="px-6 py-4 text-sm font-medium">{room.room_number}</td>
                    <td className="px-6 py-4 text-sm">{new Date(room.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        {canEdit && <Button size="sm" variant="outline" onClick={() => handleEditRoom(room)}>Edit</Button>}
                        {canDelete && <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleDeleteRoom(room.id)}>Delete</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Room Dialog */}
      <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Building</Label>
              <select
                value={roomForm.building_id}
                onChange={(e) => {
                  setRoomForm({...roomForm, building_id: e.target.value, floor_id: ''});
                }}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select Building</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Floor</Label>
              <select
                value={roomForm.floor_id}
                onChange={(e) => setRoomForm({...roomForm, floor_id: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                required
                disabled={!roomForm.building_id}
              >
                <option value="">Select Floor</option>
                {floors
                  .filter(floor => floor.building_id === roomForm.building_id)
                  .map(floor => (
                    <option key={floor.id} value={floor.id}>
                      {floor.floor_name || `Floor ${floor.floor_number}`}
                    </option>
                  ))
                }
              </select>
            </div>
            <div>
              <Label>Room Number</Label>
              <Input
                value={roomForm.room_number}
                onChange={(e) => setRoomForm({...roomForm, room_number: e.target.value})}
                placeholder="e.g., 101"
                required
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddRoomOpen(false);
                  setRoomForm({ building_id: '', floor_id: '', room_number: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const { supabase } = await import('@/lib/supabase');
                    await supabase.from('rooms').insert({
                      building_id: roomForm.building_id,
                      floor_id: roomForm.floor_id,
                      room_number: roomForm.room_number
                    });
                    toast({ title: 'Success', description: 'Room added successfully' });
                    setIsAddRoomOpen(false);
                    setRoomForm({ building_id: '', floor_id: '', room_number: '' });
                    loadData();
                  } catch (error) {
                    toast({ title: 'Error', description: 'Failed to add room', variant: 'destructive' });
                  }
                }}
                className="flex-1"
              >
                Add Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Room Confirmation */}
      <Dialog open={!!deleteRoomId} onOpenChange={() => setDeleteRoomId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this room? This action cannot be undone.</p>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteRoomId(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRoom} className="flex-1">
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}



export default function BuildingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions(user?.appUser?.permissions || []);
  const [activeTab, setActiveTab] = useState('buildings');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingFloors, setBuildingFloors] = useState<{[key: string]: number}>({});
  const [actualFloorCounts, setActualFloorCounts] = useState<{[key: string]: number}>({});
  const [spaceStats, setSpaceStats] = useState({
    totalSpaces: 0,
    available: 0,
    occupied: 0
  });
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    description: '',
    total_floors: '',
    total_sqft: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSpaceCategoryOpen, setIsSpaceCategoryOpen] = useState(false);
  const [spaceCategories, setSpaceCategories] = useState<Array<{name: string, display_name: string}>>([]);
  const [newCategory, setNewCategory] = useState('');
  const { toast } = useToast();

  // Check permissions for Buildings module
  const canView = permissions.hasPermission('Buildings', 'view');
  const canAdd = permissions.hasPermission('Buildings', 'add');
  const canEdit = permissions.hasPermission('Buildings', 'edit');
  const canDelete = permissions.hasPermission('Buildings', 'delete');



  // Load space categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'space_categories').maybeSingle();
        if (data?.value) {
          setSpaceCategories(data.value);
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Load buildings data
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const buildingsData = await buildingsService.getBuildings();
        setBuildings(buildingsData);
        
        // Load actual floor data for each building
        const floorTotals: {[key: string]: number} = {};
        const floorCounts: {[key: string]: number} = {};
        for (const building of buildingsData) {
          const floors = await buildingsService.getFloorsByBuilding(building.id);
          floorTotals[building.id] = floors.reduce((sum, floor) => sum + floor.total_sqft, 0);
          floorCounts[building.id] = floors.length;
        }
        setBuildingFloors(floorTotals);
        setActualFloorCounts(floorCounts);
        
        // Calculate real stats from floors data
        let totalSqft = 0;
        let occupiedSqft = 0;
        
        for (const building of buildingsData) {
          const floors = await buildingsService.getFloorsByBuilding(building.id);
          floors.forEach(floor => {
            totalSqft += floor.total_sqft;
            occupiedSqft += floor.occupied_sqft || 0;
          });
        }
        
        setSpaceStats({
          totalSpaces: totalSqft,
          available: totalSqft - occupiedSqft,
          occupied: occupiedSqft
        });

      } catch (error) {
        console.error('Error loading buildings:', error);
        toast({
          title: "Error",
          description: `Failed to load buildings: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (canView) {
      loadBuildings();
    } else {
      setLoading(false);
    }
  }, [canView, toast]);

  const handleAddBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const totalFloors = parseInt(buildingForm.total_floors);
      const totalSqft = parseInt(buildingForm.total_sqft);
      const sqftPerFloor = Math.floor(totalSqft / totalFloors);
      
      // Create building first
      const newBuilding = await buildingsService.createBuilding({
        name: buildingForm.name,
        description: buildingForm.description,
        total_floors: totalFloors,
        total_sqft: totalSqft,
        address: buildingForm.address,
        status: 'active'
      });
      
      // Create floors automatically with evenly divided sqft
      for (let i = 1; i <= totalFloors; i++) {
        await buildingsService.addFloor(newBuilding.id, {
          floor_number: i,
          total_sqft: sqftPerFloor
        });
      }
      
      setBuildings([...buildings, newBuilding]);
      setBuildingForm({ name: '', description: '', total_floors: '', total_sqft: '', address: '' });
      setIsAddBuildingOpen(false);
      toast({
        title: "Success",
        description: `Building "${newBuilding.name}" with ${totalFloors} floors added successfully`
      });
    } catch (error) {
      console.error('Error adding building:', error);
      toast({
        title: "Error",
        description: "Failed to add building",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBuilding = async (building: Building) => {
    if (confirm(`Are you sure you want to delete ${building.name}?`)) {
      try {
        await buildingsService.deleteBuilding(building.id);
        setBuildings(buildings.filter(b => b.id !== building.id));
        toast({
          title: "Building Deleted",
          description: `${building.name} has been deleted successfully`,
          variant: "destructive"
        });
      } catch (error) {
        console.error('Error deleting building:', error);
        toast({
          title: "Error",
          description: "Failed to delete building",
          variant: "destructive"
        });
      }
    }
  };

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <DashboardLayout title="Buildings" subtitle="Space allocation and management">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Lock className="h-16 w-16 text-gray-400" />
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-600">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view Buildings.</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = [
    {
      title: "Total Sqft",
      value: spaceStats.totalSpaces,
      icon: Building2,
      color: "text-blue-600"
    },
    {
      title: "Available Sqft",
      value: spaceStats.available,
      icon: Home,
      color: "text-green-600"
    },
    {
      title: "Occupied Sqft",
      value: spaceStats.occupied,
      icon: CheckCircle,
      color: "text-orange-600"
    }
  ];

  return (
    <DashboardLayout title="Buildings" subtitle="Space allocation and management">
      <div className="space-y-4 sm:space-y-6">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('buildings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'buildings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Buildings
            </button>
            <button
              onClick={() => setActiveTab('floors')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'floors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Floors
            </button>
            <button
              onClick={() => setActiveTab('rooms')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rooms'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rooms
            </button>
          </nav>
        </div>

        {activeTab === 'buildings' && (
          <BuildingsTab
            buildings={buildings}
            buildingFloors={buildingFloors}
            actualFloorCounts={actualFloorCounts}
            spaceStats={spaceStats}
            canAdd={canAdd}
            canEdit={canEdit}
            canDelete={canDelete}
            loading={loading}
            onAddBuilding={() => setIsAddBuildingOpen(true)}
            onDeleteBuilding={handleDeleteBuilding}
            navigate={navigate}
          />
        )}

        {activeTab === 'floors' && (
          <FloorsTab canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} />
        )}

        {activeTab === 'rooms' && (
          <RoomsTab canAdd={canAdd} canEdit={canEdit} canDelete={canDelete} />
        )}

        {/* Space Category Dialog */}
        <Dialog open={isSpaceCategoryOpen} onOpenChange={setIsSpaceCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Space Categories</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {spaceCategories.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded">
                      <span className="text-sm">{cat.display_name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-red-100"
                        onClick={async () => {
                          try {
                            const updated = spaceCategories.filter((_, i) => i !== idx);
                            const { supabase } = await import('@/lib/supabase');
                            await supabase.from('app_settings').update({ value: updated }).eq('key', 'space_categories');
                            setSpaceCategories(updated);
                            toast({ title: "Category Deleted", description: `"${cat.display_name}" removed` });
                          } catch (error) {
                            toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="new_category">Add New Category</Label>
                <div className="flex gap-2">
                  <Input
                    id="new_category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g., gym, lounge"
                  />
                  <Button
                    onClick={async () => {
                      if (newCategory.trim()) {
                        try {
                          const name = newCategory.toLowerCase().replace(/\s+/g, '_');
                          const newCat = { name, display_name: newCategory };
                          const updated = [...spaceCategories, newCat];
                          const { supabase } = await import('@/lib/supabase');
                          await supabase.from('app_settings').update({ value: updated }).eq('key', 'space_categories');
                          setSpaceCategories(updated);
                          setNewCategory('');
                          toast({ title: "Category Added", description: `"${newCategory}" has been added` });
                        } catch (error) {
                          toast({ title: "Error", description: "Failed to add category", variant: "destructive" });
                        }
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <Button onClick={() => setIsSpaceCategoryOpen(false)} className="w-full">
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Building Dialog */}
        <Dialog open={isAddBuildingOpen} onOpenChange={setIsAddBuildingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Building</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBuilding} className="space-y-4">
              <div>
                <Label htmlFor="building_name">Building Name *</Label>
                <Input
                  id="building_name"
                  value={buildingForm.name}
                  onChange={(e) => setBuildingForm({...buildingForm, name: e.target.value})}
                  placeholder="e.g., Rathinam Tech Park - Block C"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={buildingForm.description}
                  onChange={(e) => setBuildingForm({...buildingForm, description: e.target.value})}
                  placeholder="Brief description of the building"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="floors">Number of Floors *</Label>
                  <Input
                    id="floors"
                    type="number"
                    min="1"
                    value={buildingForm.total_floors}
                    onChange={(e) => setBuildingForm({...buildingForm, total_floors: e.target.value})}
                    placeholder="e.g., 5"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sqft">Total Sqft *</Label>
                  <Input
                    id="sqft"
                    type="number"
                    min="1"
                    value={buildingForm.total_sqft}
                    onChange={(e) => setBuildingForm({...buildingForm, total_sqft: e.target.value})}
                    placeholder="e.g., 10000"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={buildingForm.address}
                  onChange={(e) => setBuildingForm({...buildingForm, address: e.target.value})}
                  placeholder="Building address"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setBuildingForm({ name: '', description: '', total_floors: '', total_sqft: '', address: '' });
                  setIsAddBuildingOpen(false);
                }} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Add Building
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}