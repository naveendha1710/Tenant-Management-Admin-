import { useState, useEffect, useRef } from 'react';
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

// Utility function to create URL-friendly slug from building name
function createBuildingSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

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
                      onClick={() => navigate(`/admin/building-manage/${createBuildingSlug(building.name)}`)}
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

  const filteredFloors = floors
    .filter(floor => {
      const matchesSearch = floor.floor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           floor.floor_number?.toString().includes(searchTerm);
      const matchesBuilding = selectedBuilding === 'all' || floor.building_id === selectedBuilding;
      return matchesSearch && matchesBuilding;
    })
    .sort((a, b) => {
      if (a.building_id !== b.building_id) {
        return a.building_name?.localeCompare(b.building_name || '') || 0;
      }
      return (a.floor_number || 0) - (b.floor_number || 0);
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
      // Check if floor has rooms with assets
      const { supabase } = await import('@/lib/supabase');
      const { data: roomsWithAssets } = await supabase
        .from('rooms')
        .select('id, room_number, assets(asset_id, asset_name)')
        .eq('floor_id', deleteFloorId);
      
      const roomsInUse = roomsWithAssets?.filter(r => r.assets && r.assets.length > 0) || [];
      
      if (roomsInUse.length > 0) {
        const roomList = roomsInUse.map(r => r.room_number).join(', ');
        toast({ 
          title: 'Cannot Delete Floor', 
          description: `Floor has rooms with assets: ${roomList}`, 
          variant: 'destructive' 
        });
        setDeleteFloorId(null);
        return;
      }
      
      // Check if floor has assets directly assigned
      const { data: assetsOnFloor } = await supabase
        .from('assets')
        .select('asset_id, asset_name')
        .eq('floor_id', deleteFloorId)
        .limit(5);
      
      if (assetsOnFloor && assetsOnFloor.length > 0) {
        const assetList = assetsOnFloor.map(a => a.asset_name || a.asset_id).join(', ');
        const moreText = assetsOnFloor.length === 5 ? ' and more' : '';
        toast({ 
          title: 'Cannot Delete Floor', 
          description: `Floor has assets assigned: ${assetList}${moreText}`, 
          variant: 'destructive' 
        });
        setDeleteFloorId(null);
        return;
      }
      
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
  const [roomCategories, setRoomCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [deleteRoomId, setDeleteRoomId] = useState(null);
  const [roomForm, setRoomForm] = useState({
    building_id: '',
    floor_id: '',
    rooms: [{ room_number: '', category_id: '' }],
    use_sequence: false,
    sequence_start: '',
    sequence_count: 1,
    sequence_prefix: ''
  });
  const [existingRooms, setExistingRooms] = useState([]);
  const [showSequenceDialog, setShowSequenceDialog] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const saveRoomLockRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const [buildingsData, roomsData, categoriesData] = await Promise.all([
        buildingsService.getBuildings(),
        supabase.from('rooms').select(`
          *,
          buildings(name),
          floors(floor_number, floor_name),
          form_dropdowns!rooms_category_id_fkey(name)
        `),
        supabase.from('form_dropdowns').select('*').eq('form_type', 'room_categories').order('name')
      ]);
      
      setBuildings(buildingsData);
      setRooms(roomsData.data?.map(room => ({
        ...room,
        building_name: room.buildings?.name,
        floor_name: room.floors?.floor_name || `Floor ${room.floors?.floor_number}`,
        floor_number: room.floors?.floor_number,
        category_name: room.form_dropdowns?.name || 'Uncategorized'
      })) || []);
      setRoomCategories(categoriesData.data || []);
      
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
  }).sort((a, b) => {
    // First sort by building name
    if (a.building_name !== b.building_name) {
      return a.building_name?.localeCompare(b.building_name || '') || 0;
    }
    // Then sort by floor number
    if (a.floor_number !== b.floor_number) {
      return (a.floor_number || 0) - (b.floor_number || 0);
    }
    // Finally sort by room number (natural sort for alphanumeric)
    return a.room_number?.localeCompare(b.room_number || '', undefined, { numeric: true, sensitivity: 'base' }) || 0;
  });

  const availableFloors = floors.filter(floor => 
    selectedBuilding === 'all' || floor.building_id === selectedBuilding
  );

  const handleEditRoom = (room) => {
    setEditingRoomId(room.id);
    setRoomForm({
      building_id: room.building_id,
      floor_id: room.floor_id,
      rooms: [{ room_number: room.room_number, category_id: room.category_id || '' }],
      use_sequence: false,
      sequence_start: '',
      sequence_count: 1,
      sequence_prefix: ''
    });
    setIsAddRoomOpen(true);
  };

  const handleDeleteRoom = async (roomId) => {
    setDeleteRoomId(roomId);
  };

  const confirmDeleteRoom = async () => {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Check if room is used by assets
      const { data: assetsInRoom, error: assetError } = await supabase
        .from('assets')
        .select('asset_id, asset_name')
        .eq('room_id', deleteRoomId)
        .limit(5);
      
      if (assetError) throw assetError;
      
      if (assetsInRoom && assetsInRoom.length > 0) {
        const assetList = assetsInRoom.map(a => a.asset_name || a.asset_id).join(', ');
        const moreText = assetsInRoom.length === 5 ? ' and more' : '';
        toast({ 
          title: 'Cannot Delete Room', 
          description: `Room is assigned to assets: ${assetList}${moreText}`, 
          variant: 'destructive' 
        });
        setDeleteRoomId(null);
        return;
      }
      
      await supabase.from('rooms').delete().eq('id', deleteRoomId);
      toast({ title: 'Success', description: 'Room deleted successfully' });
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' });
    }
    setDeleteRoomId(null);
  };

  const addRoom = () => {
    setRoomForm({
      ...roomForm,
      rooms: [...roomForm.rooms, { room_number: '', category_id: '' }]
    });
  };

  const removeRoom = (index) => {
    if (roomForm.rooms.length > 1) {
      setRoomForm({
        ...roomForm,
        rooms: roomForm.rooms.filter((_, i) => i !== index)
      });
    }
  };

  const checkExistingRooms = async (floorId) => {
    if (!floorId) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('floor_id', floorId)
        .order('room_number');
      
      setExistingRooms(data || []);
      
      if (data && data.length > 0) {
        // Try to detect sequence pattern
        const roomNumbers = data.map(r => r.room_number).sort();
        const lastRoom = roomNumbers[roomNumbers.length - 1];
        
        // Extract numeric part from last room number
        const match = lastRoom.match(/^(.*?)([0-9]+)$/);
        if (match) {
          const prefix = match[1];
          const lastNumber = parseInt(match[2]);
          
          setRoomForm(prev => ({
            ...prev,
            sequence_prefix: prefix,
            sequence_start: (lastNumber + 1).toString()
          }));
          
          setShowSequenceDialog(true);
        }
      }
    } catch (error) {
      console.error('Error checking existing rooms:', error);
    }
  };

  const generateSequenceRooms = () => {
    const { sequence_prefix, sequence_start, sequence_count } = roomForm;
    const startNum = parseInt(sequence_start);
    const rooms = [];
    
    for (let i = 0; i < sequence_count; i++) {
      const roomNumber = sequence_prefix + (startNum + i).toString().padStart(2, '0');
      rooms.push({ room_number: roomNumber, category_id: '' });
    }
    
    setRoomForm(prev => ({
      ...prev,
      rooms: rooms,
      use_sequence: false
    }));
    setShowSequenceDialog(false);
    setIsAddRoomOpen(true);
  };

  const handleFloorChange = (floorId) => {
    setRoomForm({...roomForm, floor_id: floorId});
    checkExistingRooms(floorId);
  };

  const updateRoom = (index, field, value) => {
    const newRooms = [...roomForm.rooms];
    newRooms[index] = { ...newRooms[index], [field]: value };
    setRoomForm({
      ...roomForm,
      rooms: newRooms
    });
  };

  const enableSequenceMode = () => {
    setRoomForm(prev => ({
      ...prev,
      use_sequence: true,
      rooms: [{ room_number: '', category_id: '' }]
    }));
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
            setSelectedFloor('all'); // Reset floor selection when building changes
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
          disabled={selectedBuilding === 'all'}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                ) : filteredRooms.map(room => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{room.building_name}</td>
                    <td className="px-6 py-4 text-sm">{room.floor_name}</td>
                    <td className="px-6 py-4 text-sm font-medium">{room.room_number}</td>
                    <td className="px-6 py-4 text-sm">{room.category_name}</td>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoomId ? 'Edit Room' : 'Add New Rooms'}</DialogTitle>
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
                disabled={editingRoomId}
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
                onChange={(e) => handleFloorChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
                disabled={!roomForm.building_id || editingRoomId}
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
              <div className="flex items-center justify-between mb-2">
                <Label>Rooms</Label>
                {!editingRoomId && (
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={enableSequenceMode}>
                      <Plus className="h-4 w-4 mr-1" />
                      Sequence
                    </Button>
                    <Button type="button" size="sm" onClick={addRoom}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add More
                    </Button>
                  </div>
                )}
              </div>
              
              {existingRooms.length > 0 && !editingRoomId && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium mb-1">
                    Existing rooms on this floor:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {existingRooms.map((room, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {room.room_number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {roomForm.use_sequence && !editingRoomId ? (
                <div className="space-y-3 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Prefix</Label>
                      <Input
                        value={roomForm.sequence_prefix}
                        onChange={(e) => setRoomForm({...roomForm, sequence_prefix: e.target.value})}
                        placeholder="e.g., R"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Start Number</Label>
                      <Input
                        type="number"
                        value={roomForm.sequence_start}
                        onChange={(e) => setRoomForm({...roomForm, sequence_start: e.target.value})}
                        placeholder="e.g., 101"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Count</Label>
                      <Input
                        type="number"
                        value={roomForm.sequence_count}
                        onChange={(e) => setRoomForm({...roomForm, sequence_count: parseInt(e.target.value) || 1})}
                        min="1"
                        max="50"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={generateSequenceRooms}>
                      Generate {roomForm.sequence_count} Rooms
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setRoomForm({...roomForm, use_sequence: false})}>
                      Cancel
                    </Button>
                  </div>
                  <div className="text-xs text-gray-600">
                    Preview: {roomForm.sequence_prefix}{roomForm.sequence_start?.padStart(2, '0')} to {roomForm.sequence_prefix}{(parseInt(roomForm.sequence_start || '0') + roomForm.sequence_count - 1).toString().padStart(2, '0')}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {roomForm.rooms.map((room, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs text-gray-600">Room Number</Label>
                        <Input
                          value={room.room_number}
                          onChange={(e) => updateRoom(index, 'room_number', e.target.value)}
                          placeholder={`Room ${index + 1} (e.g., 101)`}
                          className="h-8"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-gray-600">Category</Label>
                        <select
                          value={room.category_id}
                          onChange={(e) => updateRoom(index, 'category_id', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm h-8"
                        >
                          <option value="">Select Category (Optional)</option>
                          {roomCategories.map(category => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      {roomForm.rooms.length > 1 && !editingRoomId && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeRoom(index)}
                          className="text-red-600 h-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddRoomOpen(false);
                  setEditingRoomId(null);
                  setIsSavingRoom(false);
                  setRoomForm({ building_id: '', floor_id: '', rooms: [{ room_number: '', category_id: '' }], use_sequence: false, sequence_start: '', sequence_count: 1, sequence_prefix: '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isSavingRoom}
                onClick={async () => {
                  if (saveRoomLockRef.current) return;
                  saveRoomLockRef.current = true;
                  setIsSavingRoom(true);
                  try {
                    const { supabase } = await import('@/lib/supabase');
                    const normalizeRoomNumber = (value: string) => value.trim().toLowerCase();
                    
                    if (editingRoomId) {
                      // Update existing room
                      const room = roomForm.rooms[0];
                      if (!room.room_number.trim()) {
                        toast({ title: 'Error', description: 'Please enter a room number', variant: 'destructive' });
                        return;
                      }
                      
                      const { error } = await supabase
                        .from('rooms')
                        .update({
                          building_id: roomForm.building_id,
                          floor_id: roomForm.floor_id,
                          room_number: room.room_number.trim(),
                          category_id: room.category_id || null
                        })
                        .eq('id', editingRoomId);
                      
                      if (error?.code === '23505') {
                        toast({ 
                          title: 'Error', 
                          description: 'A room with the same number already exists on this floor.', 
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      if (error) {
                        console.error('Update error:', error);
                        throw error;
                      }
                      
                      toast({ title: 'Success', description: 'Room updated successfully' });
                    } else {
                      // Add new rooms
                      const validRooms = roomForm.rooms.filter(room => room.room_number.trim());
                      
                      if (validRooms.length === 0) {
                        toast({ title: 'Error', description: 'Please enter at least one room number', variant: 'destructive' });
                        return;
                      }

                      const seenNumbers = new Set<string>();
                      const duplicateInForm = validRooms.filter(room => {
                        const normalized = normalizeRoomNumber(room.room_number);
                        if (seenNumbers.has(normalized)) return true;
                        seenNumbers.add(normalized);
                        return false;
                      });

                      if (duplicateInForm.length > 0) {
                        const duplicateList = [...new Set(duplicateInForm.map(room => room.room_number.trim()))];
                        toast({
                          title: 'Error',
                          description: `Duplicate room number(s) in this form: ${duplicateList.join(', ')}`,
                          variant: 'destructive'
                        });
                        return;
                      }
                      
                      // Check for duplicates in existing rooms
                      const { data: existingRoomsData } = await supabase
                        .from('rooms')
                        .select('room_number')
                        .eq('floor_id', roomForm.floor_id);
                      
                      const existingRoomNumbers = new Set(existingRoomsData?.map(r => normalizeRoomNumber(r.room_number)) || []);
                      const duplicates = validRooms.filter(room => existingRoomNumbers.has(normalizeRoomNumber(room.room_number)));
                      
                      if (duplicates.length > 0) {
                        toast({ 
                          title: 'Error', 
                          description: `Room(s) already exist: ${duplicates.map(r => r.room_number).join(', ')}`, 
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      const roomsToInsert = validRooms.map(room => ({
                        building_id: roomForm.building_id,
                        floor_id: roomForm.floor_id,
                        room_number: room.room_number.trim(),
                        category_id: room.category_id || null
                      }));
                      
                      const { error } = await supabase.from('rooms').insert(roomsToInsert);
                      
                      if (error?.code === '23505') {
                        toast({ 
                          title: 'Error', 
                          description: 'One or more rooms already exist on this floor.', 
                          variant: 'destructive' 
                        });
                        return;
                      }
                      
                      if (error) {
                        console.error('Insert error:', error);
                        throw error;
                      }
                      
                      toast({ 
                        title: 'Success', 
                        description: `${validRooms.length} room(s) added successfully` 
                      });
                    }
                    
                    setIsAddRoomOpen(false);
                    setEditingRoomId(null);
                    setRoomForm({ building_id: '', floor_id: '', rooms: [{ room_number: '', category_id: '' }], use_sequence: false, sequence_start: '', sequence_count: 1, sequence_prefix: '' });
                    setExistingRooms([]);
                    loadData();
                  } catch (error) {
                    console.error('Room operation error:', error);
                    toast({ title: 'Error', description: editingRoomId ? 'Failed to update room' : 'Failed to add rooms', variant: 'destructive' });
                  } finally {
                    saveRoomLockRef.current = false;
                    setIsSavingRoom(false);
                  }
                }}
                className="flex-1"
              >
                {isSavingRoom ? 'Saving...' : (editingRoomId ? 'Update Room' : `Add ${roomForm.rooms.filter(room => room.room_number.trim()).length} Room(s)`)}
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

      {/* Sequence Continuation Dialog */}
      <Dialog open={showSequenceDialog} onOpenChange={setShowSequenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Continue Room Sequence?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This floor already has {existingRooms.length} room(s). Would you like to continue with the existing sequence?
            </p>
            
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium mb-2">Existing rooms:</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {existingRooms.slice(0, 10).map((room, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                    {room.room_number}
                  </span>
                ))}
                {existingRooms.length > 10 && (
                  <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                    +{existingRooms.length - 10} more
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Detected Prefix</Label>
                  <Input
                    value={roomForm.sequence_prefix}
                    onChange={(e) => setRoomForm({...roomForm, sequence_prefix: e.target.value})}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Next Number</Label>
                  <Input
                    type="number"
                    value={roomForm.sequence_start}
                    onChange={(e) => setRoomForm({...roomForm, sequence_start: e.target.value})}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">How Many</Label>
                  <Input
                    type="number"
                    value={roomForm.sequence_count}
                    onChange={(e) => setRoomForm({...roomForm, sequence_count: parseInt(e.target.value) || 1})}
                    min="1"
                    max="20"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSequenceDialog(false);
                  setRoomForm(prev => ({ ...prev, use_sequence: false }));
                }}
                className="flex-1"
              >
                Manual Entry
              </Button>
              <Button
                onClick={() => {
                  setRoomForm(prev => ({ ...prev, use_sequence: true }));
                  generateSequenceRooms();
                }}
                className="flex-1"
              >
                Continue Sequence
              </Button>
            </div>
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
  const { toast } = useToast();

  // Check permissions for Buildings module
  const canView = permissions.hasPermission('Buildings', 'view');
  const canAdd = permissions.hasPermission('Buildings', 'add');
  const canEdit = permissions.hasPermission('Buildings', 'edit');
  const canDelete = permissions.hasPermission('Buildings', 'delete');


  // Load buildings data
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const buildingsData = await buildingsService.getBuildings();
        setBuildings(buildingsData);
        
        // Load floor counts and totals in parallel using a single query
        const { supabase } = await import('@/lib/supabase');
        const { data: floorsData } = await supabase
          .from('floors')
          .select('building_id, total_sqft, occupied_sqft');
        
        // Aggregate floor data by building
        const floorTotals: {[key: string]: number} = {};
        const floorCounts: {[key: string]: number} = {};
        let totalSqft = 0;
        let occupiedSqft = 0;
        
        floorsData?.forEach(floor => {
          if (!floorTotals[floor.building_id]) {
            floorTotals[floor.building_id] = 0;
            floorCounts[floor.building_id] = 0;
          }
          floorTotals[floor.building_id] += floor.total_sqft;
          floorCounts[floor.building_id]++;
          totalSqft += floor.total_sqft;
          occupiedSqft += floor.occupied_sqft || 0;
        });
        
        setBuildingFloors(floorTotals);
        setActualFloorCounts(floorCounts);
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
