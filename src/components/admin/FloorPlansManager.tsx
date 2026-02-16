import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building2, 
  Plus, 
  Search, 
  ChevronRight, 
  ChevronDown,
  MapPin,
  Layers,
  Grid3X3,
  Edit,
  Trash2
} from 'lucide-react';
import { floorPlanService, BuildingWithFloors } from '@/services/floorPlanService';
import { useToast } from '@/hooks/use-toast';
import { AddBuildingModal } from './AddBuildingModal';
import { AddFloorModal } from './AddFloorModal';
import { AddUnitModal } from './AddUnitModal';

export function FloorPlansManager() {
  const [buildings, setBuildings] = useState<BuildingWithFloors[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [showEditFloor, setShowEditFloor] = useState(false);
  const [editingFloor, setEditingFloor] = useState<any>(null);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [editingUnitNames, setEditingUnitNames] = useState<{[key: string]: string}>({});
  const [editingUnitRoomNumbers, setEditingUnitRoomNumbers] = useState<{[key: string]: string}>({});
  const [editingUnitAreas, setEditingUnitAreas] = useState<{[key: string]: number}>({});
  const [usedUnits, setUsedUnits] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchBuildings();
    fetchUsedUnits();
  }, []);

  const fetchUsedUnits = async () => {
    try {
      const { data } = await floorPlanService.supabase
        .from('spaces')
        .select('area_sqft');
      
      // Get all units to calculate which ones are used
      const { data: allUnits } = await floorPlanService.supabase
        .from('units')
        .select('id, area_sqft');
      
      const usedUnitIds = new Set<string>();
      // This is a simplified approach - in reality you'd need to track which specific units are in each space
      // For now, we'll mark units as used if there are any spaces created
      if (data && data.length > 0 && allUnits) {
        const totalSpaceArea = data.reduce((sum, s) => sum + (s.area_sqft || 0), 0);
        let remainingArea = totalSpaceArea;
        
        for (const unit of allUnits) {
          if (remainingArea >= (unit.area_sqft || 0)) {
            usedUnitIds.add(unit.id);
            remainingArea -= (unit.area_sqft || 0);
          }
        }
      }
      
      setUsedUnits(usedUnitIds);
    } catch (error) {
      console.error('Error fetching used units:', error);
    }
  };

  const fetchBuildings = async () => {
    try {
      setLoading(true);
      const data = await floorPlanService.getBuildingsWithHierarchy();
      setBuildings(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load buildings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleBuilding = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings);
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId);
    } else {
      newExpanded.add(buildingId);
    }
    setExpandedBuildings(newExpanded);
  };

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddFloor = (buildingId: string) => {
    setSelectedBuilding(buildingId);
    setShowAddFloor(true);
  };

  const handleAddUnit = (floorId: string) => {
    setSelectedFloor(floorId);
    setShowAddUnit(true);
  };

  const handleEditFloor = (floor: any) => {
    setEditingFloor(floor);
    setShowEditFloor(true);
    setSelectedUnits(new Set());
    const unitNames = {};
    const unitRoomNumbers = {};
    const unitAreas = {};
    floor.units?.forEach((unit: any) => {
      unitNames[unit.id] = unit.name;
      unitRoomNumbers[unit.id] = unit.room_number || '';
      unitAreas[unit.id] = unit.area_sqft || 0;
    });
    setEditingUnitNames(unitNames);
    setEditingUnitRoomNumbers(unitRoomNumbers);
    setEditingUnitAreas(unitAreas);
  };

  const updateUnitName = (unitId: string, newName: string) => {
    setEditingUnitNames(prev => ({ ...prev, [unitId]: newName }));
  };

  const updateUnitRoomNumber = (unitId: string, newRoomNumber: string) => {
    setEditingUnitRoomNumbers(prev => ({ ...prev, [unitId]: newRoomNumber }));
  };

  const updateUnitArea = (unitId: string, newArea: number) => {
    setEditingUnitAreas(prev => ({ ...prev, [unitId]: newArea }));
  };

  const handleSaveFloorChanges = async () => {
    try {
      // Update floor name
      const floorNameInput = document.getElementById('floorName') as HTMLInputElement;
      if (floorNameInput?.value !== editingFloor.name) {
        await floorPlanService.updateFloor(editingFloor.id, { name: floorNameInput.value });
      }

      // Batch update unit names, room numbers and areas
      const unitUpdates = [];
      for (const [unitId, newName] of Object.entries(editingUnitNames)) {
        const originalUnit = editingFloor.units?.find((u: any) => u.id === unitId);
        const newRoomNumber = editingUnitRoomNumbers[unitId];
        const newArea = editingUnitAreas[unitId];
        const updateData: any = {};
        
        if (originalUnit && newName !== originalUnit.name) {
          updateData.name = newName;
        }
        if (originalUnit && newRoomNumber !== (originalUnit.room_number || '')) {
          updateData.room_number = newRoomNumber;
        }
        if (originalUnit && newArea !== (originalUnit.area_sqft || 0)) {
          updateData.area_sqft = newArea;
        }
        
        if (Object.keys(updateData).length > 0) {
          unitUpdates.push({ id: unitId, data: updateData });
        }
      }
      if (unitUpdates.length > 0) {
        await floorPlanService.updateUnits(unitUpdates);
      }

      // Batch delete selected units
      if (selectedUnits.size > 0) {
        await floorPlanService.deleteUnits(Array.from(selectedUnits));
      }

      toast({ title: 'Success', description: 'Floor updated successfully' });
      setShowEditFloor(false);
      fetchBuildings();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update floor', variant: 'destructive' });
    }
  };

  const handleDeleteFloor = async (floorId: string) => {
    try {
      await floorPlanService.deleteFloor(floorId);
      toast({ title: 'Success', description: 'Floor deleted successfully' });
      fetchBuildings();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete floor', variant: 'destructive' });
    }
  };

  const toggleUnitSelection = (unitId: string) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnits(newSelected);
  };

  const getUnitTypeColor = (type: string) => {
    const colors = {
      office: 'bg-blue-100 text-blue-800',
      shop: 'bg-green-100 text-green-800',
      room: 'bg-purple-100 text-purple-800',
      conference: 'bg-orange-100 text-orange-800',
      storage: 'bg-gray-100 text-gray-800',
      other: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading floor plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">Floor Plans Management</h2>
          <p className="text-muted-foreground">Manage buildings, floors, and units hierarchy</p>
        </div>
        <Button onClick={() => setShowAddBuilding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Building
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search buildings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Buildings List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Buildings Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Buildings ({filteredBuildings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredBuildings.map((building) => (
                <div key={building.id} className="space-y-2">
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedBuilding === building.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedBuilding(building.id);
                      toggleBuilding(building.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {expandedBuildings.has(building.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Building2 className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{building.name}</div>
                        {building.location && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {building.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary">{building.floors?.length || 0}</Badge>
                  </div>

                  {/* Floors */}
                  {expandedBuildings.has(building.id) && (
                    <div className="ml-6 space-y-1">
                      {building.floors?.map((floor) => (
                        <div key={floor.id} className="flex items-center justify-between p-2 rounded border-l-2 border-muted">
                          <div className="flex items-center gap-2">
                            <Layers className="h-3 w-3" />
                            <span className="text-sm">{floor.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {floor.units?.length || 0} units
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddUnit(floor.id);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddFloor(building.id);
                        }}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Floor
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Floor Details */}
        <div className="lg:col-span-2">
          {selectedBuilding ? (
            <FloorDetails 
              building={filteredBuildings.find(b => b.id === selectedBuilding)!}
              onAddFloor={() => handleAddFloor(selectedBuilding)}
              onAddUnit={handleAddUnit}
              onEditFloor={handleEditFloor}
              onDeleteFloor={handleDeleteFloor}
              usedUnits={usedUnits}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Select a building to view floor details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddBuildingModal
        open={showAddBuilding}
        onClose={() => setShowAddBuilding(false)}
        onSuccess={fetchBuildings}
      />
      
      <AddFloorModal
        open={showAddFloor}
        onClose={() => setShowAddFloor(false)}
        buildingId={selectedBuilding}
        onSuccess={fetchBuildings}
      />
      
      <AddUnitModal
        open={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        floorId={selectedFloor}
        onSuccess={fetchBuildings}
      />
      
      {/* Edit Floor Dialog */}
      <Dialog open={showEditFloor} onOpenChange={setShowEditFloor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Floor: {editingFloor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="floorName">Floor Name</Label>
              <Input id="floorName" defaultValue={editingFloor?.name} />
            </div>
            <div>
              <Label>Units ({editingFloor?.units?.length || 0})</Label>
              <div className="grid grid-cols-1 gap-2 mt-2 max-h-60 overflow-y-auto">
                {editingFloor?.units?.map((unit: any) => (
                  <div key={unit.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox 
                      checked={selectedUnits.has(unit.id)}
                      onCheckedChange={() => toggleUnitSelection(unit.id)}
                    />
                    <Input 
                      className="flex-1 h-8"
                      placeholder="Unit name"
                      value={editingUnitNames[unit.id] || unit.name}
                      onChange={(e) => updateUnitName(unit.id, e.target.value)}
                    />
                    <Input 
                      className="w-20 h-8"
                      placeholder="Room #"
                      value={editingUnitRoomNumbers[unit.id] || unit.room_number || ''}
                      onChange={(e) => updateUnitRoomNumber(unit.id, e.target.value)}
                    />
                    <Input 
                      className="w-20 h-8"
                      type="number"
                      placeholder="Sq.ft"
                      value={editingUnitAreas[unit.id] || 0}
                      onChange={(e) => updateUnitArea(unit.id, Number(e.target.value))}
                    />
                    <Badge className="text-xs">{unit.type}</Badge>
                  </div>
                ))}
              </div>
              {selectedUnits.size > 0 && (
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      // Clear selected units from the editing state
                      const newUnitNames = { ...editingUnitNames };
                      selectedUnits.forEach(unitId => delete newUnitNames[unitId]);
                      setEditingUnitNames(newUnitNames);
                    }}
                  >
                    Delete Selected ({selectedUnits.size})
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditFloor(false)}>Cancel</Button>
              <Button onClick={handleSaveFloorChanges}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FloorDetails({ 
  building, 
  onAddFloor, 
  onAddUnit,
  onEditFloor,
  onDeleteFloor,
  usedUnits
}: { 
  building: BuildingWithFloors;
  onAddFloor: () => void;
  onAddUnit: (floorId: string) => void;
  onEditFloor: (floor: any) => void;
  onDeleteFloor: (floorId: string) => void;
  usedUnits: Set<string>;
}) {
  const getUnitTypeColor = (type: string) => {
    const colors = {
      office: 'bg-blue-100 text-blue-800',
      shop: 'bg-green-100 text-green-800',
      room: 'bg-purple-100 text-purple-800',
      conference: 'bg-orange-100 text-orange-800',
      storage: 'bg-gray-100 text-gray-800',
      other: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || colors.other;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {building.name}
            </CardTitle>
            {building.location && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {building.location}
              </p>
            )}
          </div>
          <Button onClick={onAddFloor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Floor
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {building.floors?.map((floor) => (
          <div key={floor.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <h3 className="font-semibold text-sm">{floor.name}</h3>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">Floor {floor.number}</Badge>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onAddUnit(floor.id)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onEditFloor(floor)}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => onDeleteFloor(floor.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {floor.units && floor.units.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                {floor.units.map((unit) => (
                  <div
                    key={unit.id}
                    className={`flex items-center justify-between p-2 border rounded hover:bg-muted/50 ${
                      usedUnits.has(unit.id) ? 'bg-purple-50 border-purple-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Grid3X3 className="h-4 w-4" />
                      <span className="font-medium">{unit.name}</span>
                      {usedUnits.has(unit.id) && (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          In Space
                        </Badge>
                      )}
                    </div>
                    <Badge className={getUnitTypeColor(unit.type)}>
                      {unit.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Grid3X3 className="h-8 w-8 mx-auto mb-2" />
                <p>No units on this floor</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => onAddUnit(floor.id)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add First Unit
                </Button>
              </div>
            )}
          </div>
        ))}

        {(!building.floors || building.floors.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2" />
            <p>No floors in this building</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={onAddFloor}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add First Floor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}