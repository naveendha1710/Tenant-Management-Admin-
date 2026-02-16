import { supabase } from '@/lib/supabase';

export interface Building {
  id: string;
  name: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_number: number;
  floor_name?: string;
  total_sqft: number;
  occupied_sqft?: number;
  total_seats?: number;
  occupied_seats?: number;
  created_at?: string;
  updated_at?: string;
}

export const buildingService = {
  async getAllBuildings(): Promise<Building[]> {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching buildings:', error);
      return [];
    }
    
    return data || [];
  },

  async getFloorsByBuilding(buildingId: string): Promise<Floor[]> {
    const { data, error } = await supabase
      .from('floors')
      .select('*')
      .eq('building_id', buildingId)
      .order('floor_number');
    
    if (error) {
      console.error('Error fetching floors:', error);
      return [];
    }
    
    return data || [];
  },

  async getFloorById(floorId: string): Promise<Floor | null> {
    const { data, error } = await supabase
      .from('floors')
      .select('*')
      .eq('id', floorId)
      .single();
    
    if (error) {
      console.error('Error fetching floor:', error);
      return null;
    }
    
    return data;
  }
};
