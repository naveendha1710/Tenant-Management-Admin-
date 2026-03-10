import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2, Plus, MapPin, Check, X, Lock, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/utils/permissions';
import { buildingsService, type Building, type Floor } from '@/services/buildingsService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';

function FloorCard({ floorNumber, floorName, floorData, onEdit, canEdit, canDelete, onDelete, assignments, floorId, buildingId, onRoomsUpdate }) {
  const [showRooms, setShowRooms] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [addingRoom, setAddingRoom] = useState(false);
  const [startNumber, setStartNumber] = useState('');
  const [numberOfRooms, setNumberOfRooms] = useState('');
  const [prefix, setPrefix] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
  }, [floorId]);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('floor_id', floorId)
        .order('room_number');
      if (!error && data) setRooms(data);
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const handleAddRooms = async () => {
    if (!startNumber || !numberOfRooms) return;
    try {
      const start = parseInt(startNumber);
      const count = parseInt(numberOfRooms);
      const roomsToAdd = [];
      for (let i = 0; i < count; i++) {
        roomsToAdd.push({
          floor_id: floorId,
          building_id: buildingId,
          room_number: `${prefix}${start + i}`
        });
      }
      const { error } = await supabase.from('rooms').insert(roomsToAdd);
      if (error) throw error;
      toast({ title: 'Success', description: `${count} rooms added successfully` });
      setStartNumber('');
      setNumberOfRooms('');
      setPrefix('');
      setAddingRoom(false);
      loadRooms();
      onRoomsUpdate?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add rooms', variant: 'destructive' });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', roomId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Room deleted successfully' });
      loadRooms();
      onRoomsUpdate?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRooms.length === 0) return;
    try {
      const { error } = await supabase.from('rooms').delete().in('id', selectedRooms);
      if (error) throw error;
      toast({ title: 'Success', description: `${selectedRooms.length} rooms deleted successfully` });
      setSelectedRooms([]);
      loadRooms();
      onRoomsUpdate?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete rooms', variant: 'destructive' });
    }
  };

  const toggleRoomSelection = (roomId) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    );
  };

  const totalAssigned = assignments.reduce((sum, a) => sum + (a.assignedSqft || 0), 0);
  const availableSqft = floorData.totalSqft - totalAssigned;
  const occupancyPercent = (totalAssigned / floorData.totalSqft) * 100;

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-gray-100 rounded-lg">
              <MapPin className="h-5 w-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base sm:text-lg">{floorName || `Floor ${floorNumber}`}</CardTitle>
                {assignments.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3 text-blue-600" />
                    <span className="font-medium text-blue-600">{assignments.length} tenant(s) assigned</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                <span>{floorData.totalSqft.toLocaleString()} sqft</span>
                {assignments.length > 0 && (
                  <span>Assigned: {totalAssigned.toLocaleString()} sqft • Available: {availableSqft.toLocaleString()} sqft ({occupancyPercent.toFixed(1)}% occupied)</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {canEdit ? (
              <Button size="sm" variant="outline" onClick={() => onEdit(floorNumber, floorData)} className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Edit Sqft</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled title="You don't have permission to edit floors" className="flex-1 sm:flex-none">
                <Lock className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit Sqft</span>
              </Button>
            )}
            {canDelete && (
              <Button 
                size="sm" 
                variant="outline" 
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete(floorNumber)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {assignments.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Assigned Tenants:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {assignments.map((assignment, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                  <span className="font-medium">{assignment.tenantName}</span>
                  <span className="text-muted-foreground">{assignment.assignedSqft.toLocaleString()} sqft • {assignment.category}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
      <CardContent className="pt-0">
        <div className="border-t pt-3">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowRooms(!showRooms)}>
            <Label className="text-xs font-medium">Rooms ({rooms.length})</Label>
            {showRooms ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          {showRooms && (
            <div className="mt-3 space-y-2">
              {rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground">No rooms added</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-0">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => canDelete && toggleRoomSelection(room.id)}
                        className={`w-12 h-12 flex items-center justify-center rounded text-xs font-medium cursor-pointer transition-colors ${
                          selectedRooms.includes(room.id)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        {room.room_number}
                      </div>
                    ))}
                  </div>
                  {canDelete && selectedRooms.length > 0 && (
                    <Button size="sm" variant="destructive" onClick={handleDeleteSelected} className="h-7 text-xs">
                      <Trash2 className="h-3 w-3 mr-1" /> Delete ({selectedRooms.length})
                    </Button>
                  )}
                </>
              )}
              {canEdit && (
                addingRoom ? (
                  <div className="flex gap-2">
                    <Input
                      size="sm"
                      placeholder="Prefix (optional)"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="h-8 text-xs w-24"
                    />
                    <Input
                      size="sm"
                      type="number"
                      placeholder="Start number"
                      value={startNumber}
                      onChange={(e) => setStartNumber(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      size="sm"
                      type="number"
                      placeholder="Count"
                      value={numberOfRooms}
                      onChange={(e) => setNumberOfRooms(e.target.value)}
                      className="h-8 text-xs w-20"
                    />
                    <Button size="sm" onClick={handleAddRooms} className="h-8">
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAddingRoom(false); setStartNumber(''); setNumberOfRooms(''); setPrefix(''); }} className="h-8">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setAddingRoom(true)} className="h-8 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Rooms
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BuildingManage() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = usePermissions(user?.appUser?.permissions || []);
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [addingFloor, setAddingFloor] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [floorForm, setFloorForm] = useState({
    floorNumber: '',
    totalSqft: '',
    numberOfSeats: ''
  });
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [floorAssignments, setFloorAssignments] = useState<Record<string, any[]>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<{id: string, assignments: any[]} | null>(null);

  // Check permissions for Buildings module
  const canView = permissions.hasPermission('Buildings', 'view');
  const canAdd = permissions.hasPermission('Buildings', 'add');
  const canEdit = permissions.hasPermission('Buildings', 'edit');
  const canDelete = permissions.hasPermission('Buildings', 'delete');

  // Load building data
  useEffect(() => {
    const loadBuilding = async () => {
      if (!buildingId || !canView) {
        navigate('/admin/buildings');
        return;
      }
      
      try {
        const [buildingData, floorsData] = await Promise.all([
          buildingsService.getBuildingById(buildingId),
          buildingsService.getFloorsByBuilding(buildingId)
        ]);
        
        if (!buildingData) {
          toast({
            title: "Error",
            description: "Building not found",
            variant: "destructive"
          });
          navigate('/admin/buildings');
          return;
        }
        
        setBuilding(buildingData);
        setFloors(floorsData);
        
        // Load tenant assignments from agreements table
        const { data: agreements } = await supabase
          .from('agreements')
          .select('id, tenant_id, space_assignments');
        
        // Get tenant names
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name, company');
        
        const tenantMap = new Map(tenants?.map(t => [t.id, t]) || []);
        
        // Group assignments by floor
        const assignmentsByFloor: Record<string, any[]> = {};
        
        if (agreements) {
          agreements.forEach(agreement => {
            const tenant = tenantMap.get(agreement.tenant_id);
            if (agreement.space_assignments && Array.isArray(agreement.space_assignments)) {
              agreement.space_assignments.forEach((assignment: any) => {
                if (assignment.building === buildingId) {
                  const floorKey = assignment.floorId;
                  if (!assignmentsByFloor[floorKey]) {
                    assignmentsByFloor[floorKey] = [];
                  }
                  assignmentsByFloor[floorKey].push({
                    tenantName: tenant?.company || tenant?.name || 'Unknown',
                    assignedSqft: assignment.assignedSqft || assignment.area || 0,
                    category: assignment.spaceType || 'Workspace'
                  });
                }
              });
            }
          });
        }
        
        console.log('Floor Assignments:', assignmentsByFloor);
        setFloorAssignments(assignmentsByFloor);
      } catch (error) {
        console.error('Error loading building:', error);
        toast({
          title: "Error",
          description: "Failed to load building data",
          variant: "destructive"
        });
        navigate('/admin/buildings');
      } finally {
        setLoading(false);
      }
    };

    loadBuilding();
  }, [buildingId, canView, navigate, toast]);

  if (loading) {
    return (
      <DashboardLayout title="Loading..." subtitle="Loading building data">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading building data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!building) {
    return null;
  }

  const totalSqft = Array.isArray(floors) ? floors.reduce((sum, floor) => sum + floor.total_sqft, 0) : 0;

  const handleEditFloor = async (floorId, floorData) => {
    setEditingFloor({ id: floorId, floorNumber: floorData.floorNumber, floorName: floorData.floorName });
    setFloorForm({
      floorNumber: floorData.floorNumber.toString(),
      totalSqft: floorData.totalSqft.toString(),
      numberOfSeats: floorData.numberOfSeats?.toString() || ''
    });
  };

  const handleSaveFloor = async () => {
    if (editingFloor && floorForm.totalSqft && buildingId) {
      try {
        await buildingsService.updateFloor(editingFloor.id, {
          total_sqft: parseInt(floorForm.totalSqft),
          number_of_seats: floorForm.numberOfSeats ? parseInt(floorForm.numberOfSeats) : null
        });
        
        // Reload floors
        const updatedFloors = await buildingsService.getFloorsByBuilding(buildingId);
        setFloors(updatedFloors);
        
        setEditingFloor(null);
        setFloorForm({ floorNumber: '', totalSqft: '' });
        
        toast({
          title: "Success",
          description: "Floor updated successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update floor",
          variant: "destructive"
        });
      }
    }
  };

  const handleAddFloor = async () => {
    if (floorForm.floorNumber && floorForm.totalSqft && buildingId) {
      try {
        await buildingsService.addFloor(buildingId, {
          floor_number: parseInt(floorForm.floorNumber),
          total_sqft: parseInt(floorForm.totalSqft),
          number_of_seats: floorForm.numberOfSeats ? parseInt(floorForm.numberOfSeats) : null
        });
        
        // Reload floors
        const updatedFloors = await buildingsService.getFloorsByBuilding(buildingId);
        setFloors(updatedFloors);
        
        setAddingFloor(false);
        setFloorForm({ floorNumber: '', totalSqft: '' });
        
        toast({
          title: "Success",
          description: "Floor added successfully"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to add floor",
          variant: "destructive"
        });
      }
    }
  };

  const handleDeleteFloor = async (floorId) => {
    const assignments = floorAssignments[floorId] || [];
    setFloorToDelete({ id: floorId, assignments });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteFloor = async () => {
    if (!floorToDelete) return;
    
    try {
      // Delete floor
      await buildingsService.deleteFloor(floorToDelete.id);
      
      // Remove floor assignments from all affected tenants
      if (floorToDelete.assignments.length > 0) {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, spaceassignments');
        
        if (tenants) {
          for (const tenant of tenants) {
            if (tenant.spaceassignments && Array.isArray(tenant.spaceassignments)) {
              const updatedAssignments = tenant.spaceassignments.filter(
                (a: any) => a.floorId !== floorToDelete.id
              );
              
              if (updatedAssignments.length !== tenant.spaceassignments.length) {
                const totalAmount = updatedAssignments.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
                await supabase
                  .from('tenants')
                  .update({
                    spaceassignments: updatedAssignments,
                    rentamount: totalAmount,
                    space: updatedAssignments.length > 0 ? updatedAssignments.map((a: any) => `${a.buildingName} Floor ${a.floor}`).join(', ') : null
                  })
                  .eq('id', tenant.id);
              }
            }
          }
        }
      }
      
      // Reload floors
      if (buildingId) {
        const updatedFloors = await buildingsService.getFloorsByBuilding(buildingId);
        setFloors(updatedFloors);
      }
      
      toast({
        title: "Success",
        description: "Floor deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete floor",
        variant: "destructive"
      });
    }
    
    setDeleteConfirmOpen(false);
    setFloorToDelete(null);
  };

  return (
    <DashboardLayout title={`Manage ${building.name}`} subtitle="Floor and unit management">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/buildings')} className="w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Buildings</span>
            <span className="sm:hidden">Back</span>
          </Button>
          {canAdd ? (
            <Button onClick={() => setAddingFloor(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Floor
            </Button>
          ) : (
            <Button disabled title="You don't have permission to add floors" className="w-full sm:w-auto">
              <Lock className="h-4 w-4 mr-2" />
              Add Floor
            </Button>
          )}
        </div>

        {/* Building Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg sm:text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl truncate">{building.name}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <span className="inline sm:hidden">{Array.isArray(floors) ? floors.length : 0} floors</span>
                  <span className="hidden sm:inline">{Array.isArray(floors) ? floors.length : 0} floors • {totalSqft.toLocaleString()} total sqft</span>
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Add/Edit Floor Form */}
        {(addingFloor || editingFloor) && (
          <Card className="border-2 border-dashed border-blue-300 bg-blue-50">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>{editingFloor ? `Edit ${editingFloor.floorName}` : 'Add New Floor'}</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={editingFloor ? handleSaveFloor : handleAddFloor}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setAddingFloor(false);
                    setEditingFloor(null);
                    setFloorForm({ floorNumber: '', totalSqft: '' });
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Floor Number</Label>
                  <Input
                    type="number"
                    value={floorForm.floorNumber}
                    onChange={(e) => setFloorForm({...floorForm, floorNumber: e.target.value})}
                    placeholder="e.g., 5"
                    disabled={!!editingFloor}
                  />
                </div>
                <div>
                  <Label>Total Sqft</Label>
                  <Input
                    type="number"
                    value={floorForm.totalSqft}
                    onChange={(e) => setFloorForm({...floorForm, totalSqft: e.target.value})}
                    placeholder="e.g., 5000"
                  />
                </div>
                <div>
                  <Label>Number of Seats</Label>
                  <Input
                    type="number"
                    value={floorForm.numberOfSeats}
                    onChange={(e) => setFloorForm({...floorForm, numberOfSeats: e.target.value})}
                    placeholder="e.g., 50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Floors */}
        <div className="space-y-4">
          {!Array.isArray(floors) || floors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No floors found. Add your first floor to get started.</p>
            </div>
          ) : (
            floors
              .sort((a, b) => a.floor_number - b.floor_number)
              .map((floor) => (
                <FloorCard
                  key={floor.id}
                  floorNumber={floor.floor_number}
                  floorName={floor.floor_name}
                  floorData={{ totalSqft: floor.total_sqft }}
                  onEdit={() => handleEditFloor(floor.id, { floorNumber: floor.floor_number, floorName: floor.floor_name, totalSqft: floor.total_sqft, numberOfSeats: floor.number_of_seats })}
                  onDelete={() => handleDeleteFloor(floor.id)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  assignments={floorAssignments[floor.id] || []}
                  floorId={floor.id}
                  buildingId={buildingId}
                  onRoomsUpdate={() => {}}
                />
              ))
          )}
        </div>


      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Floor</DialogTitle>
            <DialogDescription>
              {floorToDelete?.assignments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-red-600 font-medium">Warning: This floor has {floorToDelete.assignments.length} tenant(s) assigned!</p>
                  <p>Deleting this floor will remove it from the following tenant assignments:</p>
                  <ul className="list-disc list-inside text-sm">
                    {floorToDelete.assignments.map((a, idx) => (
                      <li key={idx}>{a.tenantName} - {a.assignedSqft.toLocaleString()} sqft</li>
                    ))}
                  </ul>
                  <p className="font-medium">Are you sure you want to proceed?</p>
                </div>
              ) : (
                <p>Are you sure you want to delete this floor? This action cannot be undone.</p>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteFloor}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}