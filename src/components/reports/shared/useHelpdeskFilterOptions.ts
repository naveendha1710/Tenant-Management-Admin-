import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const getUnique = (arr: string[]): string[] => Array.from(new Set(arr));

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

  const loadFilterOptions = useCallback(async () => {
    // Load ticket categories
    const { data: catData } = await supabase
      .from('maintenance_tickets')
      .select('distinct category')
      .order('category');
    if (catData) setCategories(getUnique(catData.map((c) => c.category)));

    // Load ticket sub-categories
    const { data: subCatData } = await supabase
      .from('maintenance_tickets')
      .select('distinct sub_category')
      .order('sub_category');
    if (subCatData) setSubCategories(getUnique(subCatData.map((s) => s.sub_category)));

    // Load priorities
    const { data: priorityData } = await supabase
      .from('maintenance_tickets')
      .select('distinct priority')
      .order('priority');
    if (priorityData) setPriorities(getUnique(priorityData.map((p) => p.priority)));

    // Load statuses
    const { data: statusData } = await supabase
      .from('maintenance_tickets')
      .select('distinct status')
      .order('status');
    if (statusData) setStatuses(getUnique(statusData.map((s) => s.status)));

    // Load buildings
    const { data: buildingData } = await supabase
      .from('buildings')
      .select('id, name');
    if (buildingData) setBuildings(buildingData);

    // Load floors
    const { data: floorData } = await supabase
      .from('floors')
      .select('id, name, building_id');
    if (floorData) setFloors(floorData);

    // Load rooms
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, name, floor_id');
    if (roomData) setRooms(roomData);

    // Load assigned users
    const { data: assignedToData } = await supabase
      .from('maintenance_tickets')
      .select('distinct assigned_to')
      .order('assigned_to');
    if (assignedToData) setAssignedTo(getUnique(assignedToData.map((a) => a.assigned_to)));

    // Load tenants
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, name');
    if (tenantData) setTenants(tenantData);

    // Load safety risks
    const { data: safetyRiskData } = await supabase
      .from('maintenance_tickets')
      .select('distinct safety_risk')
      .order('safety_risk');
    if (safetyRiskData) setSafetyRisks(getUnique(safetyRiskData.map((s) => s.safety_risk)));

  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  const loadFloorsForBuilding = useCallback(async (buildingId: string) => {
    const { data } = await supabase
      .from('floors')
      .select('id, name')
      .eq('building_id', buildingId)
      .order('name');
    
    return data || [];
  }, []);

  const loadRoomsForFloor = useCallback(async (floorId: string) => {
    const { data } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('floor_id', floorId)
      .order('name');
    
    return data || [];
  }, []);

  const loadSubCategoriesForCategory = useCallback(async (category: string) => {
    const { data } = await supabase
      .from('maintenance_tickets')
      .select('distinct sub_category')
      .eq('category', category)
      .order('sub_category');
    
    return data ? getUnique(data.map((d) => d.sub_category)) : [];
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