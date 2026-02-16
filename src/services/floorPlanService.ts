import { supabase } from '@/lib/supabaseClient';
import { mockBuildings, mockFloors, mockUnits, Building, Floor, Unit, BuildingWithFloors } from '@/data/mockFloorPlans';

export type { Building, Floor, Unit, BuildingWithFloors };

// Demo mode flag - set to true for demo, false for real DB
const DEMO_MODE = false;

class FloorPlanService {
  // Buildings
  async getBuildings(): Promise<Building[]> {
    if (DEMO_MODE) {
      return Promise.resolve(mockBuildings);
    }
    
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Map database fields to expected interface
      return (data || []).map(building => ({
        id: building.id,
        name: building.name,
        location: building.address || building.location,
        created_at: building.created_at
      }));
    } catch (error) {
      console.error('Error loading buildings:', error);
      throw error;
    }
  }

  async getBuildingsWithHierarchy(): Promise<BuildingWithFloors[]> {
    if (DEMO_MODE) {
      return Promise.resolve(mockBuildings.map(building => ({
        ...building,
        floors: mockFloors
          .filter(floor => floor.building_id === building.id)
          .map(floor => ({
            ...floor,
            units: mockUnits.filter(unit => unit.floor_id === floor.id)
          }))
      })));
    }
    
    try {
      // First get buildings
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
        .order('name');
      
      if (buildingsError) throw buildingsError;
      
      // Then get floors for each building
      const buildingsWithFloors = [];
      for (const building of buildings || []) {
        const { data: floors, error: floorsError } = await supabase
          .from('floors')
          .select('*')
          .eq('building_id', building.id)
          .order('floor_number');
        
        if (floorsError) throw floorsError;
        
        // Get units for each floor
        const floorsWithUnits = [];
        for (const floor of floors || []) {
          const { data: units, error: unitsError } = await supabase
            .from('units')
            .select('*')
            .eq('floor_id', floor.id)
            .order('name');
          
          if (unitsError) throw unitsError;
          
          floorsWithUnits.push({
            ...floor,
            number: floor.floor_number || 0,
            units: units || []
          });
        }
        
        buildingsWithFloors.push({
          ...building,
          location: building.address || building.location,
          floors: floorsWithUnits
        });
      }
      
      return buildingsWithFloors;
    } catch (error) {
      console.error('Error loading buildings with hierarchy:', error);
      throw error;
    }
  }

  async createBuilding(building: Omit<Building, 'id' | 'created_at'>): Promise<Building> {
    if (DEMO_MODE) {
      const newBuilding: Building = {
        id: `b${Date.now()}`,
        ...building,
        created_at: new Date().toISOString()
      };
      mockBuildings.push(newBuilding);
      return Promise.resolve(newBuilding);
    }
    
    const { data, error } = await supabase
      .from('buildings')
      .insert(building)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateBuilding(id: string, updates: Partial<Building>): Promise<Building> {
    const { data, error } = await supabase
      .from('buildings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteBuilding(id: string): Promise<void> {
    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Floors
  async getFloors(buildingId?: string): Promise<Floor[]> {
    try {
      let query = supabase
        .from('floors')
        .select('*');
      
      if (buildingId) {
        query = query.eq('building_id', buildingId);
      }
      
      const { data: floors, error } = await query.order('floor_number');
      
      if (error) throw error;
      
      // Get building info for each floor
      const floorsWithBuildings = [];
      for (const floor of floors || []) {
        const { data: building } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', floor.building_id)
          .single();
        
        floorsWithBuildings.push({
          ...floor,
          number: floor.floor_number || 0,
          building: building ? {
            id: building.id,
            name: building.name,
            location: building.address || building.location,
            created_at: building.created_at
          } : undefined
        });
      }
      
      return floorsWithBuildings;
    } catch (error) {
      console.error('Error loading floors:', error);
      throw error;
    }
  }

  async createFloor(floor: Omit<Floor, 'id' | 'created_at'>): Promise<Floor> {
    if (DEMO_MODE) {
      const newFloor: Floor = {
        id: `f${Date.now()}`,
        ...floor,
        created_at: new Date().toISOString(),
        building: mockBuildings.find(b => b.id === floor.building_id)
      };
      mockFloors.push(newFloor);
      return Promise.resolve(newFloor);
    }
    
    try {
      // Insert floor with required fields
      const floorData = {
        building_id: floor.building_id,
        name: floor.name,
        floor_number: floor.number || 0
      };
      
      console.log('Inserting floor data:', floorData);
      const { data, error } = await supabase
        .from('floors')
        .insert(floorData)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase floor insert error:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        throw error;
      }
      console.log('Floor inserted successfully:', data);
      
      // Get building info separately
      const { data: building } = await supabase
        .from('buildings')
        .select('*')
        .eq('id', floor.building_id)
        .single();
      
      return {
        ...data,
        number: data.floor_number || 0,
        building: building ? {
          id: building.id,
          name: building.name,
          location: building.address || building.location,
          created_at: building.created_at
        } : undefined
      };
    } catch (error) {
      console.error('Error creating floor:', JSON.stringify(error, null, 2));
      console.error('Full error object:', error);
      throw error;
    }
  }

  async updateFloor(id: string, updates: Partial<Floor>): Promise<Floor> {
    if (DEMO_MODE) {
      const floor = mockFloors.find(f => f.id === id);
      if (floor) {
        Object.assign(floor, updates);
        return floor;
      }
      throw new Error('Floor not found');
    }
    
    const { data, error } = await supabase
      .from('floors')
      .update(updates)
      .eq('id', id)
      .select('*, building:buildings(*)')
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteFloor(id: string): Promise<void> {
    if (DEMO_MODE) {
      const index = mockFloors.findIndex(f => f.id === id);
      if (index > -1) mockFloors.splice(index, 1);
      return;
    }
    
    const { error } = await supabase
      .from('floors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Units
  async getUnits(floorId?: string): Promise<Unit[]> {
    let query = supabase
      .from('units')
      .select('*, floor:floors(*, building:buildings(*))');
    
    if (floorId) {
      query = query.eq('floor_id', floorId);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) throw error;
    return data || [];
  }

  async createUnit(unit: Omit<Unit, 'id' | 'created_at'>): Promise<Unit> {
    if (DEMO_MODE) {
      const floor = mockFloors.find(f => f.id === unit.floor_id);
      const newUnit: Unit = {
        id: `u${Date.now()}`,
        ...unit,
        created_at: new Date().toISOString(),
        floor: floor ? {
          ...floor,
          building: mockBuildings.find(b => b.id === floor.building_id)
        } : undefined
      };
      mockUnits.push(newUnit);
      return Promise.resolve(newUnit);
    }
    
    try {
      // Insert unit with required fields
      const unitData = {
        floor_id: unit.floor_id,
        name: unit.name,
        type: unit.type,
        area_sqft: unit.area_sqft || null
      };
      
      console.log('Inserting unit data:', unitData);
      const { data, error } = await supabase
        .from('units')
        .insert(unitData)
        .select('*')
        .single();
      
      if (error) {
        console.error('Supabase unit insert error:', JSON.stringify(error, null, 2));
        console.error('Error message:', error.message);
        throw error;
      }
      
      console.log('Unit inserted successfully:', data);
      
      // Get floor and building info separately
      const { data: floor } = await supabase
        .from('floors')
        .select('*')
        .eq('id', unit.floor_id)
        .single();
      
      let building = null;
      if (floor) {
        const { data: buildingData } = await supabase
          .from('buildings')
          .select('*')
          .eq('id', floor.building_id)
          .single();
        
        building = buildingData ? {
          id: buildingData.id,
          name: buildingData.name,
          location: buildingData.address || buildingData.location,
          created_at: buildingData.created_at
        } : null;
      }
      
      return {
        ...data,
        floor: floor ? {
          ...floor,
          number: floor.floor_number || 0,
          building
        } : undefined
      };
    } catch (error) {
      console.error('Error creating unit:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
    if (DEMO_MODE) {
      const unit = mockUnits.find(u => u.id === id);
      if (unit) {
        Object.assign(unit, updates);
        return unit;
      }
      throw new Error('Unit not found');
    }
    
    const { data, error } = await supabase
      .from('units')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateUnits(updates: Array<{id: string, data: Partial<Unit>}>): Promise<void> {
    for (const update of updates) {
      await this.updateUnit(update.id, update.data);
    }
  }

  async deleteUnit(id: string): Promise<void> {
    if (DEMO_MODE) {
      const index = mockUnits.findIndex(u => u.id === id);
      if (index > -1) mockUnits.splice(index, 1);
      return;
    }
    
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async deleteUnits(ids: string[]): Promise<void> {
    if (DEMO_MODE) {
      ids.forEach(id => {
        const index = mockUnits.findIndex(u => u.id === id);
        if (index > -1) mockUnits.splice(index, 1);
      });
      return;
    }
    
    const { error } = await supabase
      .from('units')
      .delete()
      .in('id', ids);
    
    if (error) throw error;
  }
}

export const floorPlanService = new FloorPlanService();