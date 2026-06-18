import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const getUnique = (arr: string[]): string[] => Array.from(new Set(arr));

export function useAssetFilterOptions() {
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const loadFilterOptions = useCallback(async () => {
    const { data: catData } = await supabase
      .from('form_dropdowns')
      .select('name')
      .eq('form_type', 'asset')
      .order('name');
    if (catData) setCategories(getUnique(catData.map((c) => c.name)));

    const { data: subCatData } = await supabase
      .from('form_subcategories')
      .select('name')
      .eq('form_type', 'asset')
      .order('name');
    if (subCatData) setSubCategories(getUnique(subCatData.map((s) => s.name)));

    const { data: typeData } = await supabase
      .from('form_sub_subcategories')
      .select('name')
      .eq('form_type', 'asset')
      .order('name');
    if (typeData) setTypes(getUnique(typeData.map((t) => t.name)));

    const { data: statusData } = await supabase
      .from('form_dropdowns')
      .select('name')
      .eq('form_type', 'asset_status')
      .order('name');
    if (statusData) setStatuses(getUnique(statusData.map((s) => s.name)));

    const { data: buildingData } = await supabase
      .from('buildings')
      .select('id, name');
    if (buildingData) setBuildings(buildingData);

    const { data: floorData } = await supabase
      .from('floors')
      .select('id, floor_name, floor_number');
    if (floorData) setFloors(floorData);

    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, room_number');
    if (roomData) setRooms(roomData);

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, name, company');
    if (tenantData) setTenants(tenantData);
  }, []);

  const loadFloorsForBuilding = useCallback(async (buildingId: string) => {
    const { data: floorData } = await supabase
      .from('floors')
      .select('id, floor_name, floor_number')
      .eq('building_id', buildingId);
    if (floorData) setFloors(floorData);
  }, []);

  const loadRoomsForFloor = useCallback(async (floorId: string) => {
    const { data: roomData } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('floor_id', floorId);
    if (roomData) setRooms(roomData);
  }, []);

  const loadSubCategoriesForCategory = useCallback(async (categoryName: string) => {
    const { data: catData } = await supabase
      .from('form_dropdowns')
      .select('id')
      .eq('form_type', 'asset')
      .eq('name', categoryName)
      .single();

    if (catData) {
      const { data: subCatData } = await supabase
        .from('form_subcategories')
        .select('name')
        .eq('form_type', 'asset')
        .eq('category_id', catData.id)
        .order('name');
      if (subCatData) setSubCategories(getUnique(subCatData.map((s) => s.name)));
    }
  }, []);

  const loadTypesForSubCategory = useCallback(async (subCategoryName: string) => {
    const { data: subCatData } = await supabase
      .from('form_subcategories')
      .select('id')
      .eq('form_type', 'asset')
      .eq('name', subCategoryName)
      .single();

    if (subCatData) {
      const { data: typeData } = await supabase
        .from('form_sub_subcategories')
        .select('name')
        .eq('form_type', 'asset')
        .eq('subcategory_id', subCatData.id)
        .order('name');
      if (typeData) setTypes(getUnique(typeData.map((t) => t.name)));
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  return {
    categories,
    subCategories,
    types,
    statuses,
    buildings,
    floors,
    rooms,
    tenants,
    setSubCategories,
    setTypes,
    setFloors,
    setRooms,
    loadFilterOptions,
    loadFloorsForBuilding,
    loadRoomsForFloor,
    loadSubCategoriesForCategory,
    loadTypesForSubCategory,
  };
}
