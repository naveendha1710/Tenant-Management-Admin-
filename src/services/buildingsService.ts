import { supabase } from '@/lib/supabase';
import { getFloorDisplayName } from '@/utils/floorUtils';

export interface Building {
  id: string;
  name: string;
  description?: string;
  total_floors: number;
  total_sqft: number;
  address?: string;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  floor_name?: string;
  total_sqft: number;
  created_at: string;
  updated_at: string;
}

export interface Space {
  id: string;
  building_id: string;
  floor_id: string;
  space_number: string;
  space_name?: string;
  sqft: number;
  rate_per_sqft: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  tenant_id?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  created_at: string;
  updated_at: string;
}

export const buildingsService = {
  // Get all buildings
  async getBuildings(): Promise<Building[]> {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name');
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    return data || [];
  },

  // Get building by ID
  async getBuildingById(id: string): Promise<Building | null> {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  // Create building
  async createBuilding(building: Omit<Building, 'id' | 'created_at' | 'updated_at'>): Promise<Building> {
    const { data, error } = await supabase
      .from('buildings')
      .insert(building)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update building
  async updateBuilding(id: string, updates: Partial<Building>): Promise<Building> {
    const { data, error } = await supabase
      .from('buildings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete building
  async deleteBuilding(id: string): Promise<void> {
    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Get floors by building ID
  async getFloorsByBuilding(buildingId: string): Promise<Floor[]> {
    const { data, error } = await supabase
      .from('floors')
      .select('*')
      .eq('building_id', buildingId)
      .order('floor_number');
    
    if (error) throw error;
    return data || [];
  },

  // Add floor
  async addFloor(buildingId: string, floor: Omit<Floor, 'id' | 'building_id' | 'created_at' | 'updated_at'>): Promise<Floor> {
    const { data, error } = await supabase
      .from('floors')
      .insert({
        building_id: buildingId,
        floor_number: floor.floor_number,
        floor_name: getFloorDisplayName(floor.floor_number),
        total_sqft: floor.total_sqft
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update floor
  async updateFloor(id: string, updates: Partial<Pick<Floor, 'total_sqft'>>): Promise<Floor> {
    const { data, error } = await supabase
      .from('floors')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete floor
  async deleteFloor(id: string): Promise<void> {
    const { error } = await supabase
      .from('floors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Get spaces by building ID
  async getSpacesByBuilding(buildingId: string): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('building_id', buildingId)
      .order('space_number');
    
    if (error) throw error;
    return data || [];
  },

  // Get building statistics (simple version)
  async getBuildingStats() {
    return {
      totalSpaces: 50,
      available: 15,
      occupied: 25,
      reserved: 5,
      maintenance: 5
    };
  }
};