export interface Building {
  id: string;
  name: string;
  location?: string;
  created_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  name: string;
  number: number;
  created_at: string;
  building?: Building;
}

export interface Unit {
  id: string;
  floor_id: string;
  name: string;
  type: 'office' | 'shop' | 'room' | 'conference' | 'storage' | 'other';
  created_at: string;
  floor?: Floor;
}

export interface BuildingWithFloors extends Building {
  floors: (Floor & { units: Unit[] })[];
}

export const mockBuildings: Building[] = [
  {
    id: 'b1',
    name: 'Main Building',
    location: 'Campus Center',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'b2',
    name: 'Tech Hub',
    location: 'North Wing',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'b3',
    name: 'Innovation Center',
    location: 'South Wing',
    created_at: '2024-01-01T00:00:00Z'
  }
];

export const mockFloors: Floor[] = [
  { id: 'f1', building_id: 'b1', name: 'Ground Floor', number: 0, created_at: '2024-01-01T00:00:00Z' },
  { id: 'f2', building_id: 'b1', name: '1st Floor', number: 1, created_at: '2024-01-01T00:00:00Z' },
  { id: 'f3', building_id: 'b1', name: '2nd Floor', number: 2, created_at: '2024-01-01T00:00:00Z' },
  { id: 'f4', building_id: 'b2', name: 'Ground Floor', number: 0, created_at: '2024-01-01T00:00:00Z' },
  { id: 'f5', building_id: 'b2', name: '1st Floor', number: 1, created_at: '2024-01-01T00:00:00Z' },
  { id: 'f6', building_id: 'b3', name: 'Ground Floor', number: 0, created_at: '2024-01-01T00:00:00Z' }
];

export const mockUnits: Unit[] = [
  { id: 'u1', floor_id: 'f1', name: 'Reception', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u2', floor_id: 'f1', name: 'Cafeteria', type: 'other', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u3', floor_id: 'f2', name: 'Office 101', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u4', floor_id: 'f2', name: 'Office 102', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u5', floor_id: 'f2', name: 'Conference Room A', type: 'conference', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u6', floor_id: 'f3', name: 'Office 201', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u7', floor_id: 'f3', name: 'Office 202', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u8', floor_id: 'f4', name: 'Tech Lab 1', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u9', floor_id: 'f4', name: 'Tech Lab 2', type: 'office', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u10', floor_id: 'f5', name: 'Meeting Room', type: 'conference', created_at: '2024-01-01T00:00:00Z' },
  { id: 'u11', floor_id: 'f6', name: 'Innovation Lab', type: 'office', created_at: '2024-01-01T00:00:00Z' }
];