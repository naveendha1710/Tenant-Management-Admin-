import { useEffect, useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAssetFilterOptions } from '../shared/useAssetFilterOptions';
import { useHelpdeskFilterOptions } from '../shared/useHelpdeskFilterOptions';
import { useTenantReportFilterOptions } from '../shared/useTenantReportFilterOptions';
import { useMovementFilterOptions } from '../shared/useMovementFilterOptions';
import { ReportType } from '@/types/report';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

interface SheetFiltersProps {
  filters?: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  reportType: ReportType;
}

type MultiSelectOption = {
  value: string;
  label: string;
};

function MultiSelectPopover({
  value,
  options,
  placeholder,
  allLabel,
  onChange,
}: {
  value: string | string[];
  options: MultiSelectOption[];
  placeholder: string;
  allLabel: string;
  onChange: (value: string[] | 'all') => void;
}) {
  const selectedValues = Array.isArray(value) ? value : value === 'all' || !value ? [] : [value];
  const selectedCount = selectedValues.length;
  const selectedLabels = options
    .filter((option) => selectedValues.includes(option.value))
    .map((option) => option.label);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between">
          <span className="truncate">
            {selectedCount > 0 ? selectedLabels.join(', ') : placeholder}
          </span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
            <Checkbox
              checked={selectedCount === 0}
              onCheckedChange={() => onChange('all')}
            />
            <span>{allLabel}</span>
          </label>
          {options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label key={option.value} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(nextChecked) => {
                    const nextValues = nextChecked
                      ? Array.from(new Set([...selectedValues, option.value]))
                      : selectedValues.filter((current) => current !== option.value);
                    onChange(nextValues.length > 0 ? nextValues : 'all');
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('all')}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SheetFilters({ filters = {}, onChange, reportType }: SheetFiltersProps) {
  const initialFilters = filters ?? {};
  const isAsset = reportType === 'asset';
  const assetOptions = useAssetFilterOptions(isAsset);
  const helpdeskOptions = useHelpdeskFilterOptions(reportType === 'helpdesk');
  const tenantOptions = useTenantReportFilterOptions(reportType === 'tenant');
  const movementOptions = useMovementFilterOptions(reportType === 'movement');
  const filterOptions: any = reportType === 'helpdesk'
    ? helpdeskOptions
    : reportType === 'tenant'
      ? tenantOptions
    : reportType === 'movement'
      ? movementOptions
      : assetOptions;
  const {
    categories = [],
    subCategories = [],
    types = [],
    priorities = [],
    statuses = [],
    buildings = [],
    floors = [],
    rooms = [],
    tenants = [],
    companyGroups = [],
    tenantStatuses = [],
    agreementStatuses = [],
    setFloors,
    setRooms,
    loadFloorsForBuilding,
    loadRoomsForFloor,
    loadSubCategoriesForCategory,
    loadTypesForSubCategory,
    assignedTo: assignedToOptions = [],
  } = filterOptions || {};

  const normalizeAssetCategorySelection = (value: any): string[] => {
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(String);
    }
    if (!value || value === 'all') {
      return [];
    }
    return [String(value)];
  };

  // Multi-select state for fields that should support multiple selections
  const [category, setCategory] = useState<string | string[]>(initialFilters.category || 'all');
  const [assetCategories, setAssetCategories] = useState<string[]>(normalizeAssetCategorySelection(initialFilters.category));
  const [subCategory, setSubCategory] = useState<string | string[]>(initialFilters.subCategory || 'all');
  const [assetType, setAssetType] = useState<string | string[]>(initialFilters.assetType || 'all');
  const [status, setStatus] = useState<string | string[]>(initialFilters.status || 'all');
  const [building, setBuilding] = useState<string | string[]>(initialFilters.building || 'all');
  const [floor, setFloor] = useState<string | string[]>(initialFilters.floor || 'all');
  const [room, setRoom] = useState<string | string[]>(initialFilters.room || 'all');
  const [tenant, setTenant] = useState<string | string[]>(initialFilters.tenant || 'all');
  const [dateField, setDateField] = useState(initialFilters.dateField || 'all');
  const [dataField, setDataField] = useState(initialFilters.dataField || 'all');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || '');
  const [priority, setPriority] = useState<string | string[]>(initialFilters.priority || 'all');
  const [assignedToUser, setAssignedToUser] = useState<string | string[]>(initialFilters.assignedTo || 'all');
  const [companyGroup, setCompanyGroup] = useState<string | string[]>(initialFilters.companyGroup || 'all');
  const [tenantStatus, setTenantStatus] = useState<string | string[]>(initialFilters.tenantStatus || 'all');
  const [agreementStatus, setAgreementStatus] = useState<string | string[]>(initialFilters.agreementStatus || 'all');
  const [gstCompany, setGstCompany] = useState(
    initialFilters.isGstCompany === true ? 'yes' : initialFilters.isGstCompany === false ? 'no' : initialFilters.isGstCompany || 'all'
  );
  const [mainBranch, setMainBranch] = useState(
    initialFilters.isMainBranch === true ? 'main' : initialFilters.isMainBranch === false ? 'branch' : initialFilters.isMainBranch || 'all'
  );
  const [safetyRisk, setSafetyRisk] = useState(
    initialFilters.safetyRisk === true
      ? 'yes'
      : initialFilters.safetyRisk === false
        ? 'no'
        : initialFilters.safetyRisk || 'all'
  );
  const [previousOccurrence, setPreviousOccurrence] = useState(
    initialFilters.previousOccurrence === true
      ? 'yes'
      : initialFilters.previousOccurrence === false
        ? 'no'
        : initialFilters.previousOccurrence || 'all'
  );
  // Movement-specific state variables
  const [movementType, setMovementType] = useState<string | string[]>(initialFilters.movementType || 'all');
  const [movementStatus, setMovementStatus] = useState<string | string[]>(initialFilters.movementStatus || 'all');
  const [approvalStatus, setApprovalStatus] = useState<string | string[]>(initialFilters.approvalStatus || 'all');
  const [vendor, setVendor] = useState<string | string[]>(initialFilters.vendor || 'all');
  const [handoverTo, setHandoverTo] = useState<string | string[]>(initialFilters.handoverTo || 'all');
  const [fromTenant, setFromTenant] = useState<string | string[]>(initialFilters.fromTenant || 'all');
  const [toTenant, setToTenant] = useState<string | string[]>(initialFilters.toTenant || 'all');
  const isInitialBuildingEffect = useRef(true);
  const isInitialFloorEffect = useRef(true);
  const isInitialCategoryEffect = useRef(true);
  const isInitialSubCategoryEffect = useRef(true);
  const assetCategoryCount = assetCategories.length;
  const tenantOptionsForCompanyGroup = useMemo(() => {
    if (reportType !== 'tenant') return tenants;
    if (companyGroup === 'all') return tenants;
    return tenants.filter((item: any) => item.companygroup === companyGroup);
  }, [reportType, tenants, companyGroup]);

  useEffect(() => {
    if (reportType !== 'tenant') return;
    if (tenant === 'all') return;
    const currentTenant = tenants.find((item: any) => item.id === tenant);
    if (!currentTenant) return;
    if (companyGroup !== 'all' && currentTenant.companygroup !== companyGroup) {
      setTenant('all');
    }
  }, [companyGroup, reportType, tenant, tenants]);

  // Keep the onChange handler reference stable to avoid infinite loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Helper to normalise filter values before sending upstream.
  // - If the value is an array, remove any sentinel 'all' entries.
  // - If the resulting array is empty, return the string 'all'.
  // - Otherwise return the cleaned array.
  // - Non‑array values are returned unchanged.
  const normaliseFilter = (val: any) => {
    if (Array.isArray(val)) {
      const filtered = val.filter((v) => v !== 'all');
      return filtered.length === 0 ? 'all' : filtered;
    }
    return val;
  };

  useEffect(() => {
    if (reportType === 'helpdesk') {
      onChangeRef.current({
        category: normaliseFilter(category),
        priority: normaliseFilter(priority),
        status: normaliseFilter(status),
        building: normaliseFilter(building),
        floor: normaliseFilter(floor),
        room: normaliseFilter(room),
        tenant: normaliseFilter(tenant),
        assignedTo: normaliseFilter(assignedToUser),
        safetyRisk,
        previousOccurrence,
        dateField,
        dateFrom,
        dateTo,
      });
      return;
    }

    if (reportType === 'tenant') {
      onChangeRef.current({
        tenant,
        companyGroup,
        tenantStatus,
        agreementStatus,
        building,
        floor,
        room,
        isGstCompany: gstCompany,
        isMainBranch: mainBranch,
        dateField,
        dateFrom,
        dateTo,
      });
      return;
    }

    if (reportType === 'movement') {
      onChangeRef.current({
        movementType,
        movementStatus,
        approvalStatus,
        vendor,
        handoverTo,
        fromTenant,
        toTenant,
        building,
        floor,
        room,
        dateFrom,
        dateTo,
      });
      return;
    }

    // Default asset case
    onChangeRef.current({
      category: assetCategories,
      subCategory,
      assetType,
      status,
      building,
      floor,
      room,
      tenant,
      dataField,
      dateFrom,
      dateTo,
      previousOccurrence,
    });
  }, [
    reportType,
    assetCategories,
    assetType,
    priority,
    status,
    building,
    floor,
    room,
    tenant,
    assignedToUser,
    safetyRisk,
    previousOccurrence,
    companyGroup,
    tenantStatus,
    agreementStatus,
    gstCompany,
    mainBranch,
    dataField,
    dateFrom,
    dateTo,
    // movement variables
    movementType,
    movementStatus,
    approvalStatus,
    vendor,
    handoverTo,
    fromTenant,
    toTenant,
  ]);

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
    if (import.meta.env.DEV) {
      console.log('setSubCategories:', assetOptions.setSubCategories);
      console.log('typeof:', typeof assetOptions.setSubCategories);
    }

    if (!isAsset) {
      isInitialCategoryEffect.current = false;
      return;
    }

    if (assetCategories.length === 0) {
      setSubCategory('all');
      assetOptions.setSubCategories([]);
      setAssetType('all');
      assetOptions.setTypes([]);
    } else {
      loadSubCategoriesForCategory(assetCategories);
      if (!isInitialCategoryEffect.current) {
        setSubCategory('all');
        setAssetType('all');
      }
    }
    isInitialCategoryEffect.current = false;
  }, [assetCategories, isAsset, loadSubCategoriesForCategory, assetOptions.setSubCategories, assetOptions.setTypes]);

  useEffect(() => {
    if (!isAsset) {
      isInitialSubCategoryEffect.current = false;
      return;
    }

    if (subCategory === 'all') {
      setAssetType('all');
      assetOptions.setTypes([]);
    } else {
      loadTypesForSubCategory(subCategory);
      if (!isInitialSubCategoryEffect.current) {
        setAssetType('all');
      }
    }
    isInitialSubCategoryEffect.current = false;
  }, [isAsset, subCategory, loadTypesForSubCategory, assetOptions.setTypes]);

  const isHelpdesk = reportType === 'helpdesk';
  const isTenant = reportType === 'tenant';
  const isMovement = reportType === 'movement';

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">
        {isHelpdesk ? 'Helpdesk Sheet Filters' : isMovement ? 'Movement Sheet Filters' : isTenant ? 'Tenant Sheet Filters' : 'Additional Filters'}
      </h4>

      {isHelpdesk ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Ticket Category</Label>
            <MultiSelectPopover
              value={category}
              options={categories.map((item) => ({ value: item, label: item }))}
              placeholder="All Categories"
              allLabel="All Categories"
              onChange={(nextValue) => setCategory(nextValue)}
            />
          </div>

          <div>
            <Label>Priority</Label>
            <MultiSelectPopover
              value={priority}
              options={(priorities || []).map((item) => ({ value: item, label: item }))}
              placeholder="All Priorities"
              allLabel="All Priorities"
              onChange={(nextValue) => setPriority(nextValue)}
            />
          </div>

          <div>
            <Label>Status</Label>
            <MultiSelectPopover
              value={status}
              options={statuses.map((item) => ({ value: item, label: item }))}
              placeholder="All Statuses"
              allLabel="All Statuses"
              onChange={(nextValue) => setStatus(nextValue)}
            />
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
            <Label>Assigned To</Label>
            <MultiSelectPopover
              value={assignedToUser}
              options={(assignedToOptions || []).map((item: any) => ({
                value: String(item.id),
                label: item.name || item.full_name || item.contact || 'Unknown',
              }))}
              placeholder="All Technicians"
              allLabel="All Technicians"
              onChange={(nextValue) => setAssignedToUser(nextValue)}
            />
          </div>

          <div>
            <Label>Tenant</Label>
            <MultiSelectPopover
              value={tenant}
              options={tenants.map((item) => ({ value: item.id, label: item.company || item.name }))}
              placeholder="All Tenants"
              allLabel="All Tenants"
              onChange={(nextValue) => setTenant(nextValue)}
            />
          </div>

          <div>
            <Label>Safety Risk</Label>
            <Select value={String(safetyRisk)} onValueChange={setSafetyRisk}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Previous Occurrence</Label>
            <Select value={String(previousOccurrence)} onValueChange={setPreviousOccurrence}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
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
                <SelectItem value="created_at">Created At</SelectItem>
                <SelectItem value="target_date">Target Date</SelectItem>
                <SelectItem value="resolved_at">Resolved At</SelectItem>
                <SelectItem value="updated_at">Updated At</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom((e.target as HTMLInputElement).value)}
              disabled={dateField === 'all'}
            />
          </div>

          <div>
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo((e.target as HTMLInputElement).value)}
              disabled={dateField === 'all'}
            />
          </div>
        </div>
      ) : isMovement ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="movement-type">Movement Type</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger id="movement-type">
                  <SelectValue placeholder="Select movement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {movementOptions.movementTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="movement-status">Movement Status</Label>
              <Select value={movementStatus} onValueChange={setMovementStatus}>
                <SelectTrigger id="movement-status">
                  <SelectValue placeholder="Select movement status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {movementOptions.movementStatuses.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="approval-status">Approval Status</Label>
              <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                <SelectTrigger id="approval-status">
                  <SelectValue placeholder="Select approval status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approvals</SelectItem>
                  {movementOptions.approvalStatuses.map((appr) => (
                    <SelectItem key={appr} value={appr}>
                      {appr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Select value={vendor} onValueChange={setVendor}>
                <SelectTrigger id="vendor">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {movementOptions.vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="handover-to">Handover To</Label>
              <Select value={handoverTo} onValueChange={setHandoverTo}>
                <SelectTrigger id="handover-to">
                  <SelectValue placeholder="Select handover" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {movementOptions.handoverToOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="from-tenant">From Tenant</Label>
              <Select value={fromTenant} onValueChange={setFromTenant}>
                <SelectTrigger id="from-tenant">
                  <SelectValue placeholder="Select from tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {movementOptions.tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="to-tenant">To Tenant</Label>
              <Select value={toTenant} onValueChange={setToTenant}>
                <SelectTrigger id="to-tenant">
                  <SelectValue placeholder="Select to tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {movementOptions.tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Building/Floor/Room filters */}
            <div>
              <Label htmlFor="building">Building</Label>
              <Select value={building} onValueChange={setBuilding}>
                <SelectTrigger id="building">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {(buildings || []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="floor">Floor</Label>
              <Select value={floor} onValueChange={setFloor} disabled={building === 'all'}>
                <SelectTrigger id="floor">
                  <SelectValue placeholder={building === 'all' ? "Select building first" : "Select floor"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {(floors || []).map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="room">Room</Label>
              <Select value={room} onValueChange={setRoom} disabled={!building || building === 'all'}>
                <SelectTrigger id="room">
                  <SelectValue placeholder={building === 'all' ? "Select building first" : "Select room"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {(rooms || []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-from">Date From</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>

            <div>
              <Label htmlFor="date-to">Date To</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </>
      ) : isTenant ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Company Group</Label>
            <MultiSelectPopover
              value={companyGroup}
              options={companyGroups.map((item) => ({ value: item, label: item }))}
              placeholder="All Company Groups"
              allLabel="All Company Groups"
              onChange={(nextValue) => setCompanyGroup(nextValue)}
            />
          </div>

          <div>
            <Label>Tenant</Label>
            <Select value={tenant} onValueChange={setTenant}>
              <SelectTrigger>
                <SelectValue placeholder={companyGroup === 'all' ? 'All Tenants' : 'Select tenant in group'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {tenantOptionsForCompanyGroup.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.company || item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tenant Status</Label>
            <MultiSelectPopover
              value={tenantStatus}
              options={tenantStatuses.map((item) => ({ value: item, label: item }))}
              placeholder="All Tenant Statuses"
              allLabel="All Tenant Statuses"
              onChange={(nextValue) => setTenantStatus(nextValue)}
            />
          </div>

          <div>
            <Label>Agreement Status</Label>
            <MultiSelectPopover
              value={agreementStatus}
              options={agreementStatuses.map((item) => ({ value: item, label: item }))}
              placeholder="All Agreement Statuses"
              allLabel="All Agreement Statuses"
              onChange={(nextValue) => setAgreementStatus(nextValue)}
            />
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
                    {item.floor_name || item.name || `Floor ${item.floor_number}`}
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
                  <SelectItem key={item.id} value={item.id}>{item.room_number || item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>GST Company</Label>
            <Select value={gstCompany} onValueChange={setGstCompany}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Main Branch</Label>
            <Select value={mainBranch} onValueChange={setMainBranch}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="main">Main Branch</SelectItem>
                <SelectItem value="branch">Branch Only</SelectItem>
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
                <SelectItem value="lease_agreement_date">Lease Agreement Date</SelectItem>
                <SelectItem value="operation_date">Operation Date</SelectItem>
                <SelectItem value="rent_commencement_date">Rent Commencement Date</SelectItem>
                <SelectItem value="lease_end_date">Lease End Date</SelectItem>
                <SelectItem value="created_at">Tenant Created At</SelectItem>
                <SelectItem value="updated_at">Tenant Updated At</SelectItem>
                <SelectItem value="agreement_created_at">Agreement Created At</SelectItem>
                <SelectItem value="agreement_updated_at">Agreement Updated At</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom((e.target as HTMLInputElement).value)}
              disabled={dateField === 'all'}
            />
          </div>

          <div>
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo((e.target as HTMLInputElement).value)}
              disabled={dateField === 'all'}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Asset Category</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  <span>{assetCategoryCount > 0 ? `${assetCategoryCount} selected` : 'All Categories'}</span>
                  {assetCategoryCount > 0 && <Badge variant="secondary" className="ml-2">{assetCategoryCount}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                    <Checkbox
                      checked={assetCategories.length === 0}
                      onCheckedChange={() => setAssetCategories([])}
                    />
                    <span>All Categories</span>
                  </label>
                  {categories.map((item) => {
                    const checked = assetCategories.includes(item);
                    return (
                      <label key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            setAssetCategories((current) => {
                              const next = nextChecked
                                ? Array.from(new Set([...current, item]))
                                : current.filter((value) => value !== item);
                              return next;
                            });
                          }}
                        />
                        <span>{item}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setAssetCategories([])}>
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Sub Category</Label>
            <Select value={subCategory} onValueChange={setSubCategory} disabled={assetCategories.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={assetCategories.length === 0 ? 'Select category first' : 'All Sub Categories'} />
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
            {/* Multi-select for status */}
            {Array.isArray(status) ? (
              <Select
                value={status}
                onValueChange={(value) => setStatus(value)}
                isMulti
                placeholder="Select statuses"
              >
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
            ) : (
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
            )}
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
            {/* Multi-select for tenant */}
            {Array.isArray(tenant) ? (
              <Select
                value={tenant}
                onValueChange={(value) => setTenant(value)}
                isMulti
                placeholder="Select tenants"
              >
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
            ) : (
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
            )}
          </div>

          <div>
            <Label>Date Field</Label>
            <Select value={dataField} onValueChange={setDataField}>
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
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom((e.target as HTMLInputElement).value)}
              disabled={dataField === 'all'}
            />
          </div>

          <div>
            <Label>To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo((e.target as HTMLInputElement).value)}
              disabled={dataField === 'all'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
