import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAssetFilterOptions } from '../shared/useAssetFilterOptions';

interface SheetFiltersProps {
  filters?: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
}

export function SheetFilters({ filters = {}, onChange }: SheetFiltersProps) {
  const initialFilters = filters ?? {};
  const {
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
    loadFloorsForBuilding,
    loadRoomsForFloor,
    loadSubCategoriesForCategory,
    loadTypesForSubCategory,
  } = useAssetFilterOptions();

  const [category, setCategory] = useState(initialFilters.category || 'all');
  const [subCategory, setSubCategory] = useState(initialFilters.subCategory || 'all');
  const [assetType, setAssetType] = useState(initialFilters.assetType || 'all');
  const [status, setStatus] = useState(initialFilters.status || 'all');
  const [building, setBuilding] = useState(initialFilters.building || 'all');
  const [floor, setFloor] = useState(initialFilters.floor || 'all');
  const [room, setRoom] = useState(initialFilters.room || 'all');
  const [tenant, setTenant] = useState(initialFilters.tenant || 'all');
  const [dateField, setDateField] = useState(initialFilters.dateField || 'all');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || '');
  const isInitialBuildingEffect = useRef(true);
  const isInitialFloorEffect = useRef(true);
  const isInitialCategoryEffect = useRef(true);
  const isInitialSubCategoryEffect = useRef(true);

  // Keep the onChange handler reference stable to avoid infinite loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current({
      category,
      subCategory,
      assetType,
      status,
      building,
      floor,
      room,
      tenant,
      dateField,
      dateFrom,
      dateTo,
    });
  }, [category, subCategory, assetType, status, building, floor, room, tenant, dateField, dateFrom, dateTo]);

  useEffect(() => {
    if (building === 'all') {
      setFloor('all');
      setRoom('all');
      setFloors([]);
      setRooms([]);
    } else {
      loadFloorsForBuilding(building);
      if (!isInitialBuildingEffect.current) {
        setFloor('all');
        setRoom('all');
      }
    }
    isInitialBuildingEffect.current = false;
  }, [building, loadFloorsForBuilding, setFloors, setRooms]);

  useEffect(() => {
    if (floor === 'all') {
      setRoom('all');
      setRooms([]);
    } else {
      loadRoomsForFloor(floor);
      if (!isInitialFloorEffect.current) {
        setRoom('all');
      }
    }
    isInitialFloorEffect.current = false;
  }, [floor, loadRoomsForFloor, setRooms]);

  useEffect(() => {
    if (category === 'all') {
      setSubCategory('all');
      setAssetType('all');
      setSubCategories([]);
      setTypes([]);
    } else {
      loadSubCategoriesForCategory(category);
      if (!isInitialCategoryEffect.current) {
        setSubCategory('all');
        setAssetType('all');
      }
    }
    isInitialCategoryEffect.current = false;
  }, [category, loadSubCategoriesForCategory, setSubCategories, setTypes]);

  useEffect(() => {
    if (subCategory === 'all') {
      setAssetType('all');
      setTypes([]);
    } else {
      loadTypesForSubCategory(subCategory);
      if (!isInitialSubCategoryEffect.current) {
        setAssetType('all');
      }
    }
    isInitialSubCategoryEffect.current = false;
  }, [subCategory, loadTypesForSubCategory, setTypes]);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">Additional Filters</h4>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Asset Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Sub Category</Label>
          <Select value={subCategory} onValueChange={setSubCategory} disabled={category === 'all'}>
            <SelectTrigger>
              <SelectValue placeholder={category === 'all' ? 'Select category first' : 'All Sub Categories'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub Categories</SelectItem>
              {subCategories.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Asset Type</Label>
          <Select value={assetType} onValueChange={setAssetType} disabled={subCategory === 'all'}>
            <SelectTrigger>
              <SelectValue placeholder={subCategory === 'all' ? 'Select sub category first' : 'All Types'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {types.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Building</Label>
          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger>
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Floor</Label>
          <Select value={floor} onValueChange={setFloor} disabled={building === 'all'}>
            <SelectTrigger>
              <SelectValue placeholder={building === 'all' ? 'Select building first' : 'All Floors'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {floors.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.floor_name || `Floor ${item.floor_number}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Room</Label>
          <Select value={room} onValueChange={setRoom} disabled={floor === 'all'}>
            <SelectTrigger>
              <SelectValue placeholder={floor === 'all' ? 'Select floor first' : 'All Rooms'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.room_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tenant</Label>
          <Select value={tenant} onValueChange={setTenant}>
            <SelectTrigger>
              <SelectValue placeholder="All Tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.company || item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date Field</Label>
          <Select value={dateField} onValueChange={setDateField}>
            <SelectTrigger>
              <SelectValue placeholder="No date filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">No Date Filter</SelectItem>
              <SelectItem value="purchase_date">Purchase Date</SelectItem>
              <SelectItem value="invoice_date">Invoice Date</SelectItem>
              <SelectItem value="boe_date">BOE Date</SelectItem>
              <SelectItem value="import_date">Import Date</SelectItem>
              <SelectItem value="warranty_date">Warranty Date</SelectItem>
              <SelectItem value="pm_date">PM Date</SelectItem>
              <SelectItem value="last_pm_date">Last PM Date</SelectItem>
              <SelectItem value="depreciation_date">Depreciation Date</SelectItem>
              <SelectItem value="last_depreciation_date">Last Depreciation Date</SelectItem>
              <SelectItem value="decommission_date">Decommission Date</SelectItem>
              <SelectItem value="created_at">Created At</SelectItem>
              <SelectItem value="updated_at">Updated At</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom((e.target as HTMLInputElement).value)} disabled={dateField === 'all'} />
        </div>

        <div>
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo((e.target as HTMLInputElement).value)} disabled={dateField === 'all'} />
        </div>
      </div>
    </div>
  );
}
