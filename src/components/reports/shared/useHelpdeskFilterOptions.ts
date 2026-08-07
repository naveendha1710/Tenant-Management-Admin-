import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const getUnique = (arr: any[]): string[] => Array.from(new Set(arr.filter(Boolean) as string[]));

export function useHelpdeskFilterOptions(enabled = true) {
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

      // Load tenants with company name as primary label
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name, company');
      if (tenantError) throw tenantError;
      if (tenantData) {
        setTenants(
          tenantData.map((t: any) => ({
            id: t.id,
            name: t.company || t.name,
            company: t.company || t.name,
            contact_name: t.name,
          }))
        );
      }

      // Load technicians from users where selectedRoles includes 'Technician'
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, phone, selected_roles, is_active');
      
      if (userError) throw userError;
      if (userData) {
        const technicians = userData
          .filter((u: any) => 
            u.is_active && 
            u.selected_roles && 
            Array.isArray(u.selected_roles) && 
            u.selected_roles.includes('Technician')
          )
          .map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone
          }));
        setAssignedTo(technicians);
      }

      // Hardcoded safety risks options
      setSafetyRisks(['Yes', 'No']);
    } catch (error) {
      console.error('Error loading resources for filters:', error);
    }
  }, []);

  // Filter floors based on selected building
  const getFilteredFloors = useCallback((buildingId?: string) => {
    if (!buildingId || buildingId === 'all') return floors;
    return floors.filter(f => f.building_id === buildingId);
  }, [floors]);

  // Filter rooms based on selected floor or building
  const getFilteredRooms = useCallback((floorId?: string, buildingId?: string) => {
    if (floorId && floorId !== 'all') {
      return rooms.filter(r => r.floor_id === floorId);
    }
    if (buildingId && buildingId !== 'all') {
      return rooms.filter(r => r.building_id === buildingId);
    }
    return rooms;
  }, [rooms]);

  useEffect(() => {
    if (enabled) {
      loadTickets();
      loadResources();
    }
  }, [enabled, loadTickets, loadResources]);

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
    tickets,
    getFilteredFloors,
    getFilteredRooms,
    // Add setters for custom floor/room filtering
    setFloors,
    setRooms,
    loadFloorsForBuilding: getFilteredFloors,
    loadRoomsForFloor: getFilteredRooms,
  };
}
