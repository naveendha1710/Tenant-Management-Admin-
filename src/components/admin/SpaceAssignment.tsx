import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, MapPin, Plus, Trash2, Edit, Settings } from 'lucide-react';
import { buildingService } from '@/services/buildingService';
import type { Building as BuildingType, Floor } from '@/services/buildingService';
import { SpaceCategoryDialog } from './SpaceCategoryDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SpaceAssignmentProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  onAssign: (spaceData: any) => void;
}

export const SpaceAssignment: React.FC<SpaceAssignmentProps> = ({ isOpen, onClose, tenant, onAssign }) => {
  const [assignmentType, setAssignmentType] = useState<'sqft' | 'seat'>('sqft');
  const [buildings, setBuildings] = useState<BuildingType[]>([]);
  const [floors, setFloors] = useState<{ [buildingId: string]: Floor[] }>({});
  const [rooms, setRooms] = useState<{ [floorId: string]: any[] }>({});
  const [assignments, setAssignments] = useState([{
    building: '',
    floor: '',
    sqft: '',
    seats: '',
    rate: '',
    occupiedSqft: '',
    spaceType: 'workspace'
  }]);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [spaceCategories, setSpaceCategories] = useState<Array<{name: string, display_name: string}>>([]);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAssignments, setSelectedAssignments] = useState<number[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Load buildings and categories from database
  useEffect(() => {
    const loadData = async () => {
      const buildingsData = await buildingService.getAllBuildings();
      setBuildings(buildingsData);
      
      // Reload floors for all buildings to get fresh occupied_sqft data
      const floorsMap: { [buildingId: string]: Floor[] } = {};
      for (const building of buildingsData) {
        const floorsData = await buildingService.getFloorsByBuilding(building.id);
        floorsMap[building.id] = floorsData;
      }
      setFloors(floorsMap);
      
      // Load rooms for all floors
      const { supabase } = await import('@/lib/supabase');
      const { data: roomsData } = await supabase.from('rooms').select('id, floor_id, room_number');
      if (roomsData) {
        const roomsMap: { [floorId: string]: any[] } = {};
        roomsData.forEach(room => {
          if (!roomsMap[room.floor_id]) {
            roomsMap[room.floor_id] = [];
          }
          roomsMap[room.floor_id].push(room);
        });
        setRooms(roomsMap);
      }
      
      try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'space_categories').maybeSingle();
        if (data?.value) {
          setSpaceCategories(data.value);
        }
      } catch (error) {
        // Error loading categories
      }
    };
    if (isOpen) {
      setAssignments([{ building: '', floor: '', sqft: '', rate: '', seats: '', occupiedSqft: '', spaceType: 'workspace' }]);
      setEditingAssignment(null);
      setSelectedAssignments([]);
      setDeleteConfirmOpen(false);
      loadData();
    }
  }, [isOpen, tenant]);

  // Load floors when building is selected
  const loadFloorsForBuilding = async (buildingId: string) => {
    if (!floors[buildingId]) {
      const floorsData = await buildingService.getFloorsByBuilding(buildingId);
      setFloors(prev => ({ ...prev, [buildingId]: floorsData }));
    }
  };

  // Helper function to get current building name from UUID
  const getBuildingName = (buildingId: string) => {
    return buildings.find(b => b.id === buildingId)?.name || 'Unknown Building';
  };

  // Helper function to get current floor name from UUID
  const getFloorName = (buildingId: string, floorId: string) => {
    const buildingFloors = floors[buildingId] || [];
    const floor = buildingFloors.find(f => f.id === floorId);
    return floor ? (floor.floor_name || `Floor ${floor.floor_number}`) : 'Unknown Floor';
  };

  // Helper function to get current room name from UUID
  const getRoomName = (floorId: string, roomId: string) => {
    const floorRooms = rooms[floorId] || [];
    const room = floorRooms.find(r => r.id === roomId);
    return room?.room_number || 'Unknown Room';
  };

  const addAssignment = () => {
    setAssignments([...assignments, { building: '', floor: '', sqft: '', rate: '', seats: '', occupiedSqft: '', spaceType: 'workspace' }]);
  };

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      setAssignments(assignments.filter((_, i) => i !== index));
    }
  };

  const updateAssignment = (index: number, field: string, value: string) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
  };

  const getFloorData = (buildingId: string, floorId: string) => {
    const buildingFloors = floors[buildingId] || [];
    return buildingFloors.find(f => f.id === floorId);
  };

  const getAvailableSqft = (floorData: Floor | undefined, currentAssignmentIndex?: number) => {
    if (!floorData) return 0;
    let available = floorData.available_sqft || 0;
    
    // If editing an assignment on this floor, add back its sqft to available
    if (editingAssignment && editingAssignment.floorId === floorData.id) {
      available += editingAssignment.assignedSqft || 0;
    }
    
    // Subtract sqft from OTHER assignments being added (not the current one)
    assignments.forEach((assignment, idx) => {
      if (assignment.floor === floorData.id && idx !== currentAssignmentIndex) {
        const sqftToSubtract = assignmentType === 'sqft' 
          ? parseInt(assignment.sqft || '0')
          : parseInt(assignment.occupiedSqft || '0');
        available -= sqftToSubtract;
      }
    });
    
    return available;
  };

  const totalAmount = assignments.reduce((sum, assignment) => {
    if (assignmentType === 'sqft' && assignment.sqft && assignment.rate) {
      return sum + (parseInt(assignment.sqft) * parseFloat(assignment.rate));
    } else if (assignmentType === 'seat' && assignment.seats && assignment.rate) {
      return sum + (parseInt(assignment.seats) * parseFloat(assignment.rate));
    }
    return sum;
  }, 0);

  const canAssign = assignments.every((assignment, index) => {
    if (!assignment.building || !assignment.floor || !assignment.rate) {
      return false;
    }
    
    if (assignmentType === 'sqft') {
      if (!assignment.sqft) return false;
      const floorData = getFloorData(assignment.building, assignment.floor);
      const availableSqft = getAvailableSqft(floorData, index);
      const requestedSqft = parseInt(assignment.sqft);
      if (requestedSqft > availableSqft) return false;
    } else if (assignmentType === 'seat') {
      if (!assignment.seats || !assignment.occupiedSqft) return false;
      const floorData = getFloorData(assignment.building, assignment.floor);
      const availableSqft = getAvailableSqft(floorData, index);
      const requestedSqft = parseInt(assignment.occupiedSqft);
      if (requestedSqft > availableSqft) return false;
    }
    
    return true;
  }) && assignments.length > 0;

  const handleAssign = () => {
    if (canAssign) {
      const existingAssignments = tenant?.spaceAssignments || [];
      const newAssignments = assignments.map(assignment => {
          const floorData = getFloorData(assignment.building, assignment.floor);
          const baseData = {
            building: assignment.building,
            buildingName: buildings.find(b => b.id === assignment.building)?.name,
            floor: floorData?.floor_number || 0,
            floorName: floorData?.floor_name || `Floor ${floorData?.floor_number}`,
            floorId: assignment.floor,
            assignmentType: assignmentType
          };
          
          if (assignmentType === 'sqft') {
            return {
              ...baseData,
              assignedSqft: parseInt(assignment.sqft),
              ratePerSqft: parseFloat(assignment.rate),
              amount: parseInt(assignment.sqft) * parseFloat(assignment.rate),
              spaceType: assignment.spaceType || 'workspace'
            };
          } else {
            return {
              ...baseData,
              assignedSeats: parseInt(assignment.seats),
              assignedSqft: parseInt(assignment.occupiedSqft),
              ratePerSeat: parseFloat(assignment.rate),
              amount: parseInt(assignment.seats) * parseFloat(assignment.rate),
              spaceType: assignment.spaceType || 'workspace'
            };
          }
        });
      
      const allAssignments = [...existingAssignments, ...newAssignments];
      const totalAmount = allAssignments.reduce((sum, a) => sum + (a.amount || 0), 0);
      
      const assignmentData = {
        assignments: allAssignments,
        totalAmount: totalAmount,
        tenantId: tenant?.id,
        tenantName: tenant?.name || tenant?.company
      };
      onAssign(assignmentData);
      onClose();
      setAssignments([{ building: '', floor: '', sqft: '', seats: '', rate: '', occupiedSqft: '', spaceType: 'workspace' }]);
      setEditingAssignment(null);
      setFloors({});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Space - {tenant?.name}</DialogTitle>
          <DialogDescription>
            Select building, floor, and specify {assignmentType === 'sqft' ? 'square footage' : 'seats'} to assign to {tenant?.company || tenant?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Assignment Type Selector */}
          <div>
            <Label>Assignment Type</Label>
            <Select value={assignmentType} onValueChange={(value: 'sqft' | 'seat') => {
              setAssignmentType(value);
              // Clear assignments when switching modes
              setAssignments(assignments.map(a => ({
                building: a.building,
                floor: a.floor,
                sqft: value === 'sqft' ? a.sqft : '',
                seats: value === 'seat' ? a.seats : '',
                rate: '',
                occupiedSqft: value === 'seat' ? a.occupiedSqft : ''
              })));
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sqft">Sqft-Based Assignment</SelectItem>
                <SelectItem value="seat">Seat-Based Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Existing Assignments */}
          {tenant?.spaceAssignments && tenant.spaceAssignments.length > 0 && (
            <Card key={refreshKey} className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Current Space Assignments
                  </CardTitle>
                  {selectedAssignments.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete ({selectedAssignments.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {tenant.spaceAssignments.map((sa: any, idx: number) => {
                  // Fetch current names using UUIDs
                  const currentBuildingName = getBuildingName(sa.building);
                  const currentFloorName = getFloorName(sa.building, sa.floorId);
                  const currentRoomName = sa.roomId ? getRoomName(sa.floorId, sa.roomId) : null;
                  
                  return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded border">
                    <input
                      type="checkbox"
                      checked={selectedAssignments.includes(idx)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAssignments([...selectedAssignments, idx]);
                        } else {
                          setSelectedAssignments(selectedAssignments.filter(i => i !== idx));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {currentBuildingName} - {currentFloorName}
                        {currentRoomName && ` - ${currentRoomName}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sa.assignmentType === 'seat' 
                          ? `${sa.assignedSeats} seats (${sa.assignedSqft} sqft) @ ₹${sa.ratePerSeat}/seat = ₹${sa.amount?.toLocaleString()}/month`
                          : `${sa.assignedSqft} sqft @ ₹${sa.ratePerSqft}/sqft = ₹${sa.amount?.toLocaleString()}/month`}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs capitalize">
                        {spaceCategories.find(c => c.name === sa.spaceType)?.display_name || sa.spaceType || 'Workspace'}
                      </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAssignment(sa);
                          setAssignments([{
                            building: sa.building || '',
                            floor: sa.floorId || '',
                            sqft: sa.assignmentType === 'sqft' ? sa.assignedSqft?.toString() || '' : '',
                            seats: sa.assignmentType === 'seat' ? sa.assignedSeats?.toString() || '' : '',
                            occupiedSqft: sa.assignmentType === 'seat' ? sa.assignedSqft?.toString() || '' : '',
                            rate: (sa.ratePerSqft || sa.ratePerSeat)?.toString() || '',
                            spaceType: sa.spaceType || 'workspace'
                          }]);
                          if (sa.building) {
                            loadFloorsForBuilding(sa.building);
                          }
                          const updatedAssignments = tenant.spaceAssignments.filter((_: any, i: number) => i !== idx);
                          tenant.spaceAssignments = updatedAssignments;
                        }}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  );
                })}
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="text-sm font-medium">Total Monthly Rent:</span>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{tenant.spaceAssignments.reduce((sum: number, sa: any) => sum + (sa.amount || 0), 0).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Label className="text-base font-medium">New Space Assignments</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Space Categories
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addAssignment}>
                <Plus className="h-4 w-4 mr-1" />
                Add Assignment
              </Button>
            </div>
          </div>

          {assignments.map((assignment, index) => {
            const buildingFloors = floors[assignment.building] || [];
            const floorData = getFloorData(assignment.building, assignment.floor);
            const availableSqft = getAvailableSqft(floorData, index);
            const assignmentAmount = assignmentType === 'sqft' && assignment.sqft && assignment.rate 
              ? parseInt(assignment.sqft) * parseFloat(assignment.rate)
              : assignmentType === 'seat' && assignment.seats && assignment.rate
              ? parseInt(assignment.seats) * parseFloat(assignment.rate)
              : 0;

            return (
              <Card key={index} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <CardTitle className="text-sm">Assignment #{index + 1}</CardTitle>
                    {assignments.length > 1 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeAssignment(index)}
                        className="text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Building</Label>
                      <Select 
                        value={assignment.building || ''}
                        onValueChange={(value) => {
                          const updated = [...assignments];
                          updated[index] = { ...updated[index], building: value, floor: '' };
                          setAssignments(updated);
                          loadFloorsForBuilding(value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose building">
                            {assignment.building ? buildings.find(b => b.id === assignment.building)?.name : "Choose building"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[100]" position="popper" sideOffset={5}>
                          {buildings.map(building => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Floor</Label>
                      <Select 
                        value={assignment.floor || ''}
                        onValueChange={(value) => updateAssignment(index, 'floor', value)}
                        disabled={!assignment.building}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose floor">
                            {assignment.floor && buildingFloors.length > 0 ? 
                              buildingFloors.find(f => f.id === assignment.floor)?.floor_name || `Floor ${buildingFloors.find(f => f.id === assignment.floor)?.floor_number}` : 
                              "Choose floor"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[100]" position="popper" sideOffset={5}>
                          {buildingFloors.map(floor => (
                            <SelectItem key={floor.id} value={floor.id}>
                              {assignmentType === 'sqft' 
                                ? `${floor.floor_name || `Floor ${floor.floor_number}`} (${floor.total_sqft.toLocaleString()} sqft)`
                                : floor.floor_name || `Floor ${floor.floor_number}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {assignment.building && assignment.floor && floorData && (
                    <>
                      <Card className="bg-gray-50">
                        <CardContent className="p-3">
                          <div className="text-sm">
                            <div className="font-medium">
                              {buildings.find(b => b.id === assignment.building)?.name} - {floorData.floor_name || `Floor ${floorData.floor_number}`}
                            </div>
                            <div className="text-muted-foreground">
                              Total: {floorData.total_sqft.toLocaleString()} sqft • 
                              Available: {availableSqft.toLocaleString()} sqft
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div>
                        <Label>Space Type</Label>
                        <Select
                          value={assignment.spaceType || 'workspace'}
                          onValueChange={(value) => updateAssignment(index, 'spaceType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {spaceCategories.map(cat => (
                              <SelectItem key={cat.name} value={cat.name}>{cat.display_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {assignmentType === 'sqft' ? (
                          <>
                            <div>
                              <Label>Sqft to Assign</Label>
                              <Input
                                type="number"
                                value={assignment.sqft}
                                onChange={(e) => updateAssignment(index, 'sqft', e.target.value)}
                                placeholder="e.g., 1000"
                                max={availableSqft}
                                className={assignment.sqft && parseInt(assignment.sqft) > availableSqft ? 'border-red-500' : ''}
                              />
                              {assignment.sqft && parseInt(assignment.sqft) > availableSqft && (
                                <p className="text-xs text-red-600 mt-1">
                                  Exceeds available space by {(parseInt(assignment.sqft) - availableSqft).toLocaleString()} sqft
                                </p>
                              )}
                            </div>
                            <div>
                              <Label>Rate per Sqft (₹)</Label>
                              <Input
                                type="number"
                                value={assignment.rate}
                                onChange={(e) => updateAssignment(index, 'rate', e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="e.g., 50"
                                step="0.01"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label>Number of Seats</Label>
                              <Input
                                type="number"
                                value={assignment.seats}
                                onChange={(e) => updateAssignment(index, 'seats', e.target.value)}
                                placeholder="e.g., 10"
                              />
                            </div>
                            <div>
                              <Label>Sqft Occupied</Label>
                              <Input
                                type="number"
                                value={assignment.occupiedSqft}
                                onChange={(e) => updateAssignment(index, 'occupiedSqft', e.target.value)}
                                placeholder="e.g., 500"
                                max={availableSqft}
                                className={assignment.occupiedSqft && parseInt(assignment.occupiedSqft) > availableSqft ? 'border-red-500' : ''}
                              />
                              {assignment.occupiedSqft && parseInt(assignment.occupiedSqft) > availableSqft && (
                                <p className="text-xs text-red-600 mt-1">
                                  Exceeds available space by {(parseInt(assignment.occupiedSqft) - availableSqft).toLocaleString()} sqft
                                </p>
                              )}
                            </div>
                            <div>
                              <Label>Rate per Seat (₹)</Label>
                              <Input
                                type="number"
                                value={assignment.rate}
                                onChange={(e) => updateAssignment(index, 'rate', e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                placeholder="e.g., 5000"
                                step="0.01"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {assignmentAmount > 0 && (
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-medium text-blue-800">₹{assignmentAmount.toLocaleString()}</div>
                          <div className="text-xs text-blue-600">
                            {assignmentType === 'sqft' 
                              ? `${assignment.sqft} sqft @ ₹${assignment.rate}/sqft`
                              : `${assignment.seats} seats @ ₹${assignment.rate}/seat`}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Summary */}
          {totalAmount > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-800 mb-3">
                  <Building className="h-4 w-4" />
                  <span className="font-medium">Total Assignment Summary</span>
                </div>
                <div className="space-y-2 text-sm text-green-700">
                  {assignments.filter(a => a.building && a.floor && ((assignmentType === 'sqft' && a.sqft && a.rate) || (assignmentType === 'seat' && a.seats && a.rate))).map((assignment, index) => {
                    const buildingName = buildings.find(b => b.id === assignment.building)?.name;
                    const assignmentFloor = getFloorData(assignment.building, assignment.floor);
                    const amount = assignmentType === 'sqft' 
                      ? parseInt(assignment.sqft) * parseFloat(assignment.rate)
                      : parseInt(assignment.seats) * parseFloat(assignment.rate);
                    return (
                      <div key={index} className="flex justify-between">
                        <span>
                          {buildingName} {assignmentFloor?.floor_name || `Floor ${assignmentFloor?.floor_number}`}: 
                          {assignmentType === 'sqft' 
                            ? ` ${assignment.sqft} sqft @ ₹${assignment.rate}/sqft`
                            : ` ${assignment.seats} seats (${assignment.occupiedSqft} sqft) @ ₹${assignment.rate}/seat`}
                        </span>
                        <span className="font-medium">₹{amount.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex justify-between font-medium text-green-800">
                    <span>Total Monthly Rent:</span>
                    <span>₹{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              className="flex-1"
              disabled={!canAssign}
            >
              {assignmentType === 'sqft' 
                ? `Assign Spaces (${assignments.filter(a => a.sqft).reduce((sum, a) => sum + parseInt(a.sqft || '0'), 0)} sqft total)`
                : `Assign Spaces (${assignments.filter(a => a.occupiedSqft).reduce((sum, a) => sum + parseInt(a.occupiedSqft || '0'), 0)} sqft total)`}
            </Button>
          </div>
        </div>

        <SpaceCategoryDialog
          isOpen={isCategoryDialogOpen}
          onClose={() => setIsCategoryDialogOpen(false)}
          categories={spaceCategories}
          onCategoriesChange={setSpaceCategories}
        />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Space Assignment{selectedAssignments.length > 1 ? 's' : ''}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedAssignments.length} space assignment{selectedAssignments.length > 1 ? 's' : ''}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={async () => {
                const updatedAssignments = tenant.spaceAssignments.filter((_: any, i: number) => !selectedAssignments.includes(i));
                const totalAmount = updatedAssignments.reduce((sum: number, a: any) => sum + (a.amount || 0), 0);
                
                await onAssign({
                  assignments: updatedAssignments,
                  totalAmount: totalAmount,
                  tenantId: tenant?.id,
                  tenantName: tenant?.name || tenant?.company,
                  skipClose: true
                });
                
                try {
                  const { supabase } = await import('@/lib/supabase');
                  for (const idx of selectedAssignments) {
                    const sa = tenant.spaceAssignments[idx];
                    if (sa?.floorId) {
                      await supabase.rpc('recalculate_floor_occupied_sqft', { p_floor_id: sa.floorId });
                    }
                  }
                  const buildingsData = await buildingService.getAllBuildings();
                  const floorsMap: { [buildingId: string]: Floor[] } = {};
                  for (const building of buildingsData) {
                    const floorsData = await buildingService.getFloorsByBuilding(building.id);
                    floorsMap[building.id] = floorsData;
                  }
                  setFloors(floorsMap);
                  tenant.spaceAssignments = updatedAssignments;
                  setRefreshKey(prev => prev + 1);
                  setSelectedAssignments([]);
                } catch (error) {
                  console.error('Error deleting assignments:', error);
                }
                setDeleteConfirmOpen(false);
              }}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};