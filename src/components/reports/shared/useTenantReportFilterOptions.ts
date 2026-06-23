import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const getUnique = (arr: any[]): string[] => Array.from(new Set(arr.filter(Boolean) as string[]));

export function useTenantReportFilterOptions(enabled = true) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [companyGroups, setCompanyGroups] = useState<string[]>([]);
  const [tenantStatuses, setTenantStatuses] = useState<string[]>([]);
  const [agreementStatuses, setAgreementStatuses] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const loadFilterOptions = useCallback(async () => {
    const [
      tenantsRes,
      agreementsRes,
      buildingsRes,
      floorsRes,
      roomsRes,
    ] = await Promise.all([
      supabase
        .from('tenants')
        .select('id, name, company, companygroup, status, is_gst_company, is_main_branch')
        .order('company'),
      supabase
        .from('agreements')
        .select('status'),
      supabase
        .from('buildings')
        .select('id, name')
        .order('name'),
      supabase
        .from('floors')
        .select('id, building_id, floor_name, floor_number')
        .order('floor_number'),
      supabase
        .from('rooms')
        .select('id, floor_id, building_id, room_number')
        .order('room_number'),
    ]);

    if (tenantsRes.data) {
      setTenants(tenantsRes.data);
      setCompanyGroups(getUnique(tenantsRes.data.map((tenant) => tenant.companygroup)));
      setTenantStatuses(getUnique(tenantsRes.data.map((tenant) => tenant.status)));
    }

    if (agreementsRes.data) {
      setAgreementStatuses(getUnique(agreementsRes.data.map((agreement) => agreement.status)));
    }

    if (buildingsRes.data) setBuildings(buildingsRes.data);
    if (floorsRes.data) {
      setFloors(
        floorsRes.data.map((floor: any) => ({
          ...floor,
          name: floor.floor_name || `Floor ${floor.floor_number}`,
        }))
      );
    }
    if (roomsRes.data) {
      setRooms(
        roomsRes.data.map((room: any) => ({
          ...room,
          name: room.room_number,
        }))
      );
    }
  }, []);

  const loadFloorsForBuilding = useCallback(async (buildingId: string) => {
    const { data } = await supabase
      .from('floors')
      .select('id, building_id, floor_name, floor_number')
      .eq('building_id', buildingId)
      .order('floor_number');

    const mappedFloors = (data || []).map((floor: any) => ({
      ...floor,
      name: floor.floor_name || `Floor ${floor.floor_number}`,
    }));

    setFloors(mappedFloors);
    return mappedFloors;
  }, []);

  const loadRoomsForFloor = useCallback(async (floorId: string) => {
    const { data } = await supabase
      .from('rooms')
      .select('id, floor_id, building_id, room_number')
      .eq('floor_id', floorId)
      .order('room_number');

    const mappedRooms = (data || []).map((room: any) => ({
      ...room,
      name: room.room_number,
    }));

    setRooms(mappedRooms);
    return mappedRooms;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadFilterOptions();
  }, [enabled, loadFilterOptions]);

  return {
    tenants,
    companyGroups,
    tenantStatuses,
    agreementStatuses,
    buildings,
    floors,
    rooms,
    setFloors,
    setRooms,
    loadFilterOptions,
    loadFloorsForBuilding,
    loadRoomsForFloor,
  };
}
