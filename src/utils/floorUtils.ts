// Utility functions for floor naming conventions
// Floor 1 in database = "Floor G" (Ground)
// Floor 2 in database = "Floor 1"
// Floor 3 in database = "Floor 2", etc.

export function getFloorDisplayName(floorNumber: number): string {
  if (floorNumber === 1) return 'Floor G';
  return `Floor ${floorNumber - 1}`;
}

export function getFloorNumberFromDisplay(displayName: string): number {
  if (displayName === 'Floor G' || displayName === 'G') return 1;
  const match = displayName.match(/\d+/);
  return match ? parseInt(match[0]) + 1 : 1;
}
