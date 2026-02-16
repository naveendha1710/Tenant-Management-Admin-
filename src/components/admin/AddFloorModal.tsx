import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { floorPlanService, Building } from '@/services/floorPlanService';
import { getFloorDisplayName } from '@/utils/floorUtils';

interface AddFloorModalProps {
  open: boolean;
  onClose: () => void;
  buildingId: string | null;
  onSuccess: () => void;
}

export function AddFloorModal({ open, onClose, buildingId, onSuccess }: AddFloorModalProps) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(buildingId || '');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [totalSqft, setTotalSqft] = useState('');
  const [numberOfSeats, setNumberOfSeats] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchBuildings();
      setSelectedBuildingId(buildingId || '');
    }
  }, [open, buildingId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingId || !number.trim()) return;

    try {
      setLoading(true);
      const floorNumber = parseInt(number);
      await floorPlanService.createFloor({
        building_id: selectedBuildingId,
        name: getFloorDisplayName(floorNumber),
        number: floorNumber,
        total_sqft: totalSqft ? parseFloat(totalSqft) : null,
        number_of_seats: numberOfSeats ? parseInt(numberOfSeats) : null,
      });

      toast({
        title: 'Success',
        description: 'Floor created successfully',
      });

      setName('');
      setNumber('');
      setTotalSqft('');
      setNumberOfSeats('');
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create floor',
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
          <DialogTitle>Add New Floor</DialogTitle>
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
          <div style={{ display: 'none' }}>
            <Label htmlFor="name">Floor Name</Label>
            <Input
              id="name"
              value={name}
              readOnly
            />
          </div>
          <div>
            <Label htmlFor="number">Floor Number *</Label>
            <Input
              id="number"
              type="number"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                const num = parseInt(e.target.value);
                if (!isNaN(num)) {
                  setName(getFloorDisplayName(num));
                }
              }}
              placeholder="e.g., 1 for Ground, 2 for Floor 1"
              required
            />
            {number && <p className="text-xs text-muted-foreground mt-1">Will be named: {getFloorDisplayName(parseInt(number) || 1)}</p>}
          </div>
          <div>
            <Label htmlFor="totalSqft">Total Sqft</Label>
            <Input
              id="totalSqft"
              type="number"
              value={totalSqft}
              onChange={(e) => setTotalSqft(e.target.value)}
              placeholder="e.g., 5000"
            />
          </div>
          <div>
            <Label htmlFor="numberOfSeats">Number of Seats</Label>
            <Input
              id="numberOfSeats"
              type="number"
              value={numberOfSeats}
              onChange={(e) => setNumberOfSeats(e.target.value)}
              placeholder="e.g., 50"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedBuildingId || !number.trim()}>
              {loading ? 'Creating...' : 'Create Floor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}