import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { floorPlanService, Building, Floor } from '@/services/floorPlanService';

interface AddUnitModalProps {
  open: boolean;
  onClose: () => void;
  floorId: string | null;
  onSuccess: () => void;
}

const unitTypes = [
  { value: 'office', label: 'Office' },
  { value: 'shop', label: 'Shop' },
  { value: 'room', label: 'Room' },
  { value: 'conference', label: 'Conference Room' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
];

export function AddUnitModal({ open, onClose, floorId, onSuccess }: AddUnitModalProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState(floorId || '');
  const [name, setName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [type, setType] = useState<string>('office');
  const [areaSqft, setAreaSqft] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchBuildings();
      setSelectedFloorId(floorId || '');
      if (floorId) {
        fetchFloorDetails(floorId);
      }
    }
  }, [open, floorId]);

  useEffect(() => {
    if (selectedBuildingId) {
      fetchFloors(selectedBuildingId);
    }
  }, [selectedBuildingId]);

  const fetchBuildings = async () => {
    try {
      const data = await floorPlanService.getBuildings();
      setBuildings(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load buildings',
        variant: 'destructive',
      });
    }
  };

  const fetchFloors = async (buildingId: string) => {
    try {
      const data = await floorPlanService.getFloors(buildingId);
      setFloors(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load floors',
        variant: 'destructive',
      });
    }
  };

  const fetchFloorDetails = async (floorId: string) => {
    try {
      const floors = await floorPlanService.getFloors();
      const floor = floors.find(f => f.id === floorId);
      if (floor && floor.building) {
        setSelectedBuildingId(floor.building_id);
        await fetchFloors(floor.building_id);
      }
    } catch (error) {
      console.error('Failed to fetch floor details:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedFloorId || !type) return;

    try {
      setLoading(true);
      await floorPlanService.createUnit({
        floor_id: selectedFloorId,
        name: name.trim(),
        room_number: roomNumber.trim() || null,
        type: type as any,
        area_sqft: areaSqft || null,
      });

      toast({
        title: 'Success',
        description: 'Unit created successfully',
      });

      setName('');
      setRoomNumber('');
      setType('office');
      setAreaSqft(0);
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create unit',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="building">Building *</Label>
            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
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
            <Label htmlFor="floor">Floor *</Label>
            <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
              <SelectTrigger>
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((floor) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="name">Unit Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Office 101, Room A"
              required
            />
          </div>
          <div>
            <Label htmlFor="roomNumber">Room Number</Label>
            <Input
              id="roomNumber"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g., 101, A-12, R001"
            />
          </div>
          <div>
            <Label htmlFor="type">Unit Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit type" />
              </SelectTrigger>
              <SelectContent>
                {unitTypes.map((unitType) => (
                  <SelectItem key={unitType.value} value={unitType.value}>
                    {unitType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="area_sqft">Area (Sq.Ft)</Label>
            <Input
              id="area_sqft"
              type="number"
              value={areaSqft}
              onChange={(e) => setAreaSqft(Number(e.target.value))}
              placeholder="Enter unit area in square feet"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim() || !selectedFloorId || !type}>
              {loading ? 'Creating...' : 'Create Unit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}