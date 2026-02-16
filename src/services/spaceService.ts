import { supabase } from '@/lib/supabaseClient';

export interface Space {
  id: string;
  space_type: string;
  space_number: string;
  area_sqft: number;
  max_seats: number;
  rate_per_sqft: number;
  status: string;
  building_id: string;
  floor_id: string;
  features?: string[];
  buildings?: {
    name: string;
  };
  floor_plans?: {
    floor_number: number;
  };
}

export interface Building {
  id: string;
  name: string;
  floors: number;
  total_units: number;
  occupied_units: number;
  address?: string;
  description?: string;
  amenities?: string[];
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  name: string;
  area_sqft?: number;
  description?: string;
}

export interface AllocationHistory {
  id: string;
  space_id: string;
  action: string;
  tenant_name?: string;
  allocated_by?: string;
  created_at: string;
  spaces?: {
    space_number: string;
    space_type: string;
  };
}

export const spaceService = {
  // Fetch all spaces with building and floor information
  async getSpaces(): Promise<Space[]> {
    console.log('Fetching spaces from Supabase...');
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching spaces:', error);
      throw error;
    }
    console.log('Spaces data:', data);
    return data || [];
  },

  // Fetch all buildings
  async getBuildings(): Promise<Building[]> {
    console.log('Fetching buildings from Supabase...');
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching buildings:', error);
      // Return empty array instead of throwing error
      return [];
    }
    console.log('Buildings data:', data);
    return data || [];
  },

  // Fetch all floors
  async getFloors(): Promise<Floor[]> {
    console.log('Fetching floors from Supabase...');
    const { data, error } = await supabase
      .from('floor_plans')
      .select('*')
      .order('floor_number', { ascending: true });

    if (error) {
      console.error('Error fetching floors:', error);
      // Return empty array instead of throwing error
      return [];
    }
    console.log('Floors data:', data);
    return data || [];
  },

  // Update space status
  async updateSpaceStatus(spaceId: string, status: 'Available' | 'Occupied' | 'Blocked'): Promise<void> {
    const { error } = await supabase
      .from('spaces')
      .update({ status })
      .eq('id', spaceId);

    if (error) throw error;
  },

  // Get spaces by building
  async getSpacesByBuilding(buildingId: string): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select(`
        id,
        space_type,
        space_number,
        area_sqft,
        max_seats,
        rate_per_sqft,
        status,
        building_id,
        floor_id,
        features,
        buildings(name),
        floor_plans(floor_number)
      `)
      .eq('building_id', buildingId)
      .order('space_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get spaces by floor
  async getSpacesByFloor(floorId: string): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select(`
        id,
        space_type,
        space_number,
        area_sqft,
        max_seats,
        rate_per_sqft,
        status,
        building_id,
        floor_id,
        features,
        buildings(name),
        floor_plans(floor_number)
      `)
      .eq('floor_id', floorId)
      .order('space_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get allocation history
  async getAllocationHistory(): Promise<AllocationHistory[]> {
    console.log('Fetching allocation history...');
    const { data, error } = await supabase
      .from('allocation_history')
      .select(`
        id,
        space_id,
        action,
        tenant_name,
        allocated_by,
        created_at,
        spaces(space_number, space_type)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching allocation history:', error);
      throw error;
    }
    console.log('Allocation history data:', data);
    return data || [];
  },

  // Add allocation history record
  async addAllocationHistory(spaceId: string, action: 'allocated' | 'unallocated', tenantName?: string): Promise<void> {
    const { error } = await supabase
      .from('allocation_history')
      .insert({
        space_id: spaceId,
        action,
        tenant_name: tenantName,
        allocated_by: 'admin@rathinam.edu' // This should come from auth context
      });

    if (error) throw error;
  }
};