import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const getUnique = (arr: any[]): string[] => Array.from(new Set(arr.filter(Boolean) as string[]));

export function useHelpdeskFilterOptions() {
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assignedTo, setAssignedTo] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [safetyRisks, setSafetyRisks] = useState<string[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  // Load all tickets first (similar to ManageTicketsPage.tsx)
  const loadTickets = useCallback(async () => {
    try {
      const { data: ticketsData, error } = await supabase
        .from('maintenance_tickets')
        .select('*');
      
      if (error) throw error;
      if (ticketsData && ticketsData.length > 0) {
        setTickets(ticketsData);
        
        // Extract unique values from tickets data
        const uniqueCategories = getUnique(ticketsData.map((t: any) => t.category));
        setCategories(uniqueCategories);
        
        const uniqueSubCategories = getUnique(ticketsData.map((t: any) => t.sub_category));
        setSubCategories(uniqueSubCategories);
        
        const uniquePriorities = getUnique(ticketsData.map((t: any) => t.priority));
        setPriorities(uniquePriorities);
        
        const uniqueStatuses = getUnique(ticketsData.map((t: any) => t.status));
        setStatuses(uniqueStatuses);
      }
    } catch (error) {
      console.error('Error loading tickets for filters:', error);
    }
  }, []);

  // Load buildings, floors, rooms, tenants, and technicians
  const loadResources = useCallback(async () => {
    try {
      // Load buildings
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name');
      if (buildingError) throw buildingError;
      if (buildingData) setBuildings(buildingData);

      // Load floors (uses floor_number and floor_name columns)
      const { data: floorData, error: floorError } = await supabase
        .from('floors')
        .select('id, building_id, floor_number, floor_name');
      if (floorError) throw floorError;
      if (floorData) {
        // Map to standard format for compatibility with UI components
        setFloors(floorData.map(f => ({
          id: f.id,
          name: f.floor_name || `Floor ${f.floor_number}`,
          floor_number: f.floor_number,
          floor_name: f.floor_name,
          building_id: f.building_id
        })));
      }

      // Load rooms (uses room_number column)
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, floor_id, building_id, room_number');
      if (roomError) throw roomError;
      if (roomData) {
        // Map to standard format for compatibility with UI components
        setRooms(roomData.map(r => ({
          id: r.id,
          name: r.room_number,
          room_number: r.room_number,
          floor_id: r.floor_id,
          building_id: r.building_id
        })));
      }

      // Load tenants
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name');
      if (tenantError) throw tenantError;
      if (tenantData) setTenants(tenantData);

      // Load technicians from users where selectedRoles includes 'Technician'
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, phone, selected_roles, is_active');
      
      if (userError) throw userError;
      if (userData) {
        const technicians = userData
          .filter((u: any) => 
            (u.selected_roles || []).includes('Technician') &&
            u.is_active !== false
          )
          .map((u: any) => ({
            id: u.id,
            name: u.name || u.email || 'Unknown',
            contact: u.phone || u.email || '',
            specialization: u.technicianCategory || u.department || 'General'
          }));
        setAssignedTo(technicians);
      }
    } catch (error) {
      console.error('Error loading resources for filters:', error);
    }
  }, []);

  // Load safety risks from tickets
  const loadSafetyRisks = useCallback(async () => {
    try {
      if (tickets.length === 0) return;
      
      const uniqueSafetyRisks = getUnique(tickets.map((t: any) => t.safety_risk));
      setSafetyRisks(uniqueSafetyRisks);
    } catch (error) {
      console.error('Error loading safety risks:', error);
    }
  }, [tickets]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  useEffect(() => {
    loadSafetyRisks();
  }, [loadSafetyRisks]);

  const loadFloorsForBuilding = useCallback(async (buildingId: string) => {
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('id, floor_number, floor_name')
        .eq('building_id', buildingId)
        .order('floor_number');
      
      if (error) throw error;
      // Map to standard format for compatibility with UI components and update state
      const mappedFloors = (data || []).map(f => ({
        id: f.id,
        name: f.floor_name || `Floor ${f.floor_number}`,
        floor_number: f.floor_number,
        floor_name: f.floor_name
      }));
      setFloors(mappedFloors);
      return mappedFloors;
    } catch (error) {
      console.error('Error loading floors:', error);
      setFloors([]);
      return [];
    }
  }, [setFloors]);

  const loadRoomsForFloor = useCallback(async (floorId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, room_number')
        .eq('floor_id', floorId)
        .order('room_number');
      
      if (error) throw error;
      // Map to standard format for compatibility with UI components and update state
      const mappedRooms = (data || []).map(r => ({
        id: r.id,
        name: r.room_number,
        room_number: r.room_number
      }));
      setRooms(mappedRooms);
      return mappedRooms;
    } catch (error) {
      console.error('Error loading rooms:', error);
      setRooms([]);
      return [];
    }
  }, [setRooms]);

  const loadSubCategoriesForCategory = useCallback(async (category: string) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('distinct sub_category')
        .eq('category', category)
        .order('sub_category');
      
      if (error) throw error;
      return data ? getUnique(data.map((d: any) => d.sub_category)) : [];
    } catch (error) {
      console.error('Error loading sub-categories:', error);
      return [];
    }
  }, []);

  return {
    categories,
    subCategories,
    priorities,
    statuses,
    buildings,
    floors,
    rooms,
    assignedTo,
    tenants,
    safetyRisks,
    setSubCategories,
    setPriorities,
    setStatuses,
    setBuildings,
    setFloors,
    setRooms,
    setAssignedTo,
    setTenants,
    setSafetyRisks,
    loadFloorsForBuilding,
    loadRoomsForFloor,
    loadSubCategoriesForCategory,
  };
}
