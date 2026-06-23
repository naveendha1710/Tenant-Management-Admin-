import { useEffect, useMemo, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAssetFilterOptions } from '../shared/useAssetFilterOptions';
import { useHelpdeskFilterOptions } from '../shared/useHelpdeskFilterOptions';
import { useTenantReportFilterOptions } from '../shared/useTenantReportFilterOptions';
import { ReportType } from '@/types/report';

interface SheetFiltersProps {
  filters?: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  reportType: ReportType;
}

export function SheetFilters({ filters = {}, onChange, reportType }: SheetFiltersProps) {
  const initialFilters = filters ?? {};
  const isAsset = reportType === 'asset';
  const assetOptions = useAssetFilterOptions(isAsset);
  const helpdeskOptions = useHelpdeskFilterOptions(reportType === 'helpdesk');
  const tenantOptions = useTenantReportFilterOptions(reportType === 'tenant');
  const filterOptions: any = reportType === 'helpdesk'
    ? helpdeskOptions
    : reportType === 'tenant'
      ? tenantOptions
      : assetOptions;
  const {
    categories,
    subCategories,
    types,
    priorities,
    statuses,
    buildings,
    floors,
    rooms,
    tenants,
    companyGroups = [],
    tenantStatuses = [],
    agreementStatuses = [],
    setFloors,
    setRooms,
    loadFloorsForBuilding,
    loadRoomsForFloor,
    loadSubCategoriesForCategory,
    loadTypesForSubCategory,
    assignedTo: assignedToOptions,
  } = filterOptions;

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
  const [priority, setPriority] = useState(initialFilters.priority || 'all');
  const [assignedToUser, setAssignedToUser] = useState(initialFilters.assignedTo || 'all');
  const [companyGroup, setCompanyGroup] = useState(initialFilters.companyGroup || 'all');
  const [tenantStatus, setTenantStatus] = useState(initialFilters.tenantStatus || 'all');
  const [agreementStatus, setAgreementStatus] = useState(initialFilters.agreementStatus || 'all');
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
  const isInitialBuildingEffect = useRef(true);
  const isInitialFloorEffect = useRef(true);
  const isInitialCategoryEffect = useRef(true);
  const isInitialSubCategoryEffect = useRef(true);
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

  useEffect(() => {
    if (reportType === 'helpdesk') {
      onChangeRef.current({
        category,
        priority,
        status,
        building,
        floor,
        room,
        tenant,
        assignedTo: assignedToUser,
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
  }, [
    reportType,
    category,
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
    dateField,
    dateFrom,
    dateTo,
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

    if (category === 'all') {
      setSubCategory('all');
      assetOptions.setSubCategories([]);
      setAssetType('all');
      assetOptions.setTypes([]);
    } else {
      loadSubCategoriesForCategory(category);
      if (!isInitialCategoryEffect.current) {
        setSubCategory('all');
        setAssetType('all');
      }
    }
    isInitialCategoryEffect.current = false;
  }, [category, isAsset, loadSubCategoriesForCategory, assetOptions.setSubCategories, assetOptions.setTypes]);

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

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">
        {isHelpdesk ? 'Helpdesk Sheet Filters' : isTenant ? 'Tenant Sheet Filters' : 'Additional Filters'}
      </h4>

      {isHelpdesk ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Ticket Category</Label>
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
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {(priorities || []).map((item) => (
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
            <Label>Assigned To</Label>
            <Select value={assignedToUser} onValueChange={setAssignedToUser}>
              <SelectTrigger>
                <SelectValue placeholder="All Technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {(assignedToOptions || []).map((item: any) => (
                  <SelectItem key={item.id || item.name} value={item.id || item.name}>
                    {item.name || item.full_name || item.contact || item}
                  </SelectItem>
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
      ) : isTenant ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Company Group</Label>
            <Select value={companyGroup} onValueChange={setCompanyGroup}>
              <SelectTrigger>
                <SelectValue placeholder="All Company Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Company Groups</SelectItem>
                {companyGroups.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
              </Select>
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
              <Select value={tenantStatus} onValueChange={setTenantStatus}>
                <SelectTrigger>
                <SelectValue placeholder="All Tenant Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenant Statuses</SelectItem>
                {tenantStatuses.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Agreement Status</Label>
            <Select value={agreementStatus} onValueChange={setAgreementStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Agreement Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agreement Statuses</SelectItem>
                {agreementStatuses.map((item) => (
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
      )}
    </div>
  );
}
