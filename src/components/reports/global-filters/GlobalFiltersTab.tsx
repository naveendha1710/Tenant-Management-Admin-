import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssetFilterOptions } from '../shared/useAssetFilterOptions';
import { useHelpdeskFilterOptions } from '../shared/useHelpdeskFilterOptions';
import { useTenantReportFilterOptions } from '../shared/useTenantReportFilterOptions';
import { useMovementFilterOptions } from '../shared/useMovementFilterOptions';
import { useGlobalReportFilterStore } from '@/store/useGlobalReportFilterStore';
import { useFilterStore } from '@/pages/reports/store/filterStore';
import { ReportType } from '@/types/report';

interface GlobalFiltersTabProps {
  onApply?: () => void;
  reportType: ReportType;
}

export function GlobalFiltersTab({ onApply, reportType }: GlobalFiltersTabProps) {
  const { filters, setFilters, clearFilters } = useGlobalReportFilterStore();
  const { setFilters: setAnalyticsFilters } = useFilterStore();
  const noop = () => {};

  const assetOptions = useAssetFilterOptions(reportType === 'asset');
  const helpdeskOptions = useHelpdeskFilterOptions(reportType === 'helpdesk');
  const tenantOptions = useTenantReportFilterOptions(reportType === 'tenant');
  const movementOptions = useMovementFilterOptions(reportType === 'movement');

  const isAsset = reportType === 'asset';
  const isHelpdesk = reportType === 'helpdesk';
  const isMovement = reportType === 'movement';

  const activeOptions = isAsset ? assetOptions : isHelpdesk ? helpdeskOptions : isMovement ? movementOptions : tenantOptions;
  const {
    categories = [],
    subCategories = [],
    types = [],
    statuses = [],
    buildings = [],
    floors = [],
    rooms = [],
    tenants = [],
    movementTypes = [],
    movementStatuses = [],
    approvalStatuses = [],
    vendors = [],
    handoverToOptions = [],
    companyGroups = [],
    tenantStatuses = [],
    agreementStatuses = [],
    priorities = [],
    assignedTo = [],
    safetyRisks = [],
  } = (activeOptions || {}) as any;

  const setSubCategories = isAsset && typeof assetOptions.setSubCategories === 'function'
    ? assetOptions.setSubCategories
    : noop;
  const setTypes = isAsset && typeof assetOptions.setTypes === 'function'
    ? assetOptions.setTypes
    : noop;
  const setFloors = isAsset && typeof assetOptions.setFloors === 'function'
    ? assetOptions.setFloors
    : tenantOptions.setFloors;
  const setRooms = isAsset ? assetOptions.setRooms : tenantOptions.setRooms;
  const loadFloorsForBuilding = isAsset
    ? assetOptions.loadFloorsForBuilding || noop
    : isHelpdesk
      ? helpdeskOptions.loadFloorsForBuilding || noop
      : tenantOptions.loadFloorsForBuilding || noop;
  const loadRoomsForFloor = isAsset
    ? assetOptions.loadRoomsForFloor || noop
    : isHelpdesk
      ? helpdeskOptions.loadRoomsForFloor || noop
      : tenantOptions.loadRoomsForFloor || noop;
  const loadSubCategoriesForCategory = isAsset
    ? assetOptions.loadSubCategoriesForCategory || noop
    : noop;

  const [category, setCategory] = useState(filters.category || 'all');
  const [subCategory, setSubCategory] = useState(filters.subCategory || 'all');
  const [assetType, setAssetType] = useState(filters.assetType || 'all');
  const [status, setStatus] = useState(filters.status || 'all');
  // Movement specific state
  const [movementType, setMovementType] = useState(filters.movementType || 'all');
  const [movementStatus, setMovementStatus] = useState(filters.movementStatus || 'all');
  const [approvalStatus, setApprovalStatus] = useState(filters.approvalStatus || 'all');
  const [vendor, setVendor] = useState(filters.vendor || 'all');
  const [handoverTo, setHandoverTo] = useState(filters.handoverTo || 'all');
  const [fromTenant, setFromTenant] = useState(filters.fromTenant || 'all');
  const [toTenant, setToTenant] = useState(filters.toTenant || 'all');
  const [building, setBuilding] = useState(filters.building || 'all');
  const [floor, setFloor] = useState(filters.floor || 'all');
  const [room, setRoom] = useState(filters.room || 'all');
  const [tenant, setTenant] = useState(filters.tenant || 'all');
  const [sortOrder, setSortOrder] = useState(filters.sortOrder || 'asc');
  const [companyGroup, setCompanyGroup] = useState(filters.companyGroup || 'all');
  const [tenantStatus, setTenantStatus] = useState(filters.tenantStatus || 'all');
  const [agreementStatus, setAgreementStatus] = useState(filters.agreementStatus || 'all');
  const [isGstCompany, setIsGstCompany] = useState(
    filters.isGstCompany === true ? 'yes' : filters.isGstCompany === false ? 'no' : filters.isGstCompany || 'all'
  );
  const [isMainBranch, setIsMainBranch] = useState(
    filters.isMainBranch === true ? 'main' : filters.isMainBranch === false ? 'branch' : filters.isMainBranch || 'all'
  );
  const [dateField, setDateField] = useState(filters.dateField || 'all');
  const [dateFrom, setDateFrom] = useState(filters.dateFrom || '');
  const [dateTo, setDateTo] = useState(filters.dateTo || '');
  const [dataField, setDataField] = useState(filters.dataField || 'all');

  // Helpdesk specific filters
  const [ticketCategory, setTicketCategory] = useState(filters.ticketCategory || 'all');
  const [ticketSubCategory, setTicketSubCategory] = useState(filters.ticketSubCategory || 'all');
  const [priority, setPriority] = useState(filters.priority || 'all');
  const [assignedToUser, setAssignedToUser] = useState(filters.assignedTo || 'all');
  const [safetyRisk, setSafetyRisk] = useState(filters.safetyRisk || 'all');
  const [previousOccurrence, setPreviousOccurrence] = useState<boolean | null>(filters.previousOccurrence === true ? true : filters.previousOccurrence === false ? false : null);

  // Date range filters
  const [createdDateRange, setCreatedDateRange] = useState<[string, string]>([filters.createdDateRange?.[0] || '', filters.createdDateRange?.[1] || '']);
  const [targetDateRange, setTargetDateRange] = useState<[string, string]>([filters.targetDateRange?.[0] || '', filters.targetDateRange?.[1] || '']);
  const [resolvedDateRange, setResolvedDateRange] = useState<[string, string]>([filters.resolvedDateRange?.[0] || '', filters.resolvedDateRange?.[1] || '']);
  const tenantOptionsForCompanyGroup = useMemo(() => {
    if (reportType !== 'tenant') return tenants;
    if (companyGroup === 'all') return tenants;
    return tenants.filter((item: any) => item.companygroup === companyGroup);
  }, [reportType, tenants, companyGroup]);

  useEffect(() => {
    setCategory(filters.category || 'all');
    setSubCategory(filters.subCategory || 'all');
    setAssetType(filters.assetType || 'all');
    setStatus(filters.status || 'all');
    setMovementType(filters.movementType || 'all');
    setMovementStatus(filters.movementStatus || 'all');
    setApprovalStatus(filters.approvalStatus || 'all');
    setVendor(filters.vendor || 'all');
    setHandoverTo(filters.handoverTo || 'all');
    setFromTenant(filters.fromTenant || 'all');
    setToTenant(filters.toTenant || 'all');
    setBuilding(filters.building || 'all');
    setFloor(filters.floor || 'all');
    setRoom(filters.room || 'all');
    setTenant(filters.tenant || 'all');
    setSortOrder(filters.sortOrder || 'asc');
    setCompanyGroup(filters.companyGroup || 'all');
    setTenantStatus(filters.tenantStatus || 'all');
    setAgreementStatus(filters.agreementStatus || 'all');
    setIsGstCompany(
      filters.isGstCompany === true ? 'yes' : filters.isGstCompany === false ? 'no' : filters.isGstCompany || 'all'
    );
    setIsMainBranch(
      filters.isMainBranch === true ? 'main' : filters.isMainBranch === false ? 'branch' : filters.isMainBranch || 'all'
    );
    setDateField(filters.dateField || 'all');
    setDateFrom(filters.dateFrom || '');
    setDateTo(filters.dateTo || '');
    setDataField(filters.dataField || 'all');
    setTicketCategory(filters.ticketCategory || 'all');
    setTicketSubCategory(filters.ticketSubCategory || 'all');
    setPriority(filters.priority || 'all');
    setAssignedToUser(filters.assignedTo || 'all');
    setSafetyRisk(filters.safetyRisk || 'all');
    setPreviousOccurrence(filters.previousOccurrence === true ? true : filters.previousOccurrence === false ? false : null);
    setCreatedDateRange([filters.createdDateRange?.[0] || '', filters.createdDateRange?.[1] || '']);
    setTargetDateRange([filters.targetDateRange?.[0] || '', filters.targetDateRange?.[1] || '']);
    setResolvedDateRange([filters.resolvedDateRange?.[0] || '', filters.resolvedDateRange?.[1] || '']);
  }, [filters]);

  useEffect(() => {
    if (reportType !== 'tenant') return;
    if (tenant === 'all') return;
    const currentTenant = tenants.find((item: any) => item.id === tenant);
    if (!currentTenant) return;
    if (companyGroup !== 'all' && currentTenant.companygroup !== companyGroup) {
      setTenant('all');
    }
  }, [companyGroup, reportType, tenant, tenants]);

  // Cascading: Building -> Floor -> Room (for both asset and helpdesk)
  useEffect(() => {
    const loadFloors = async () => {
      if (building === 'all') {
        setFloor('all');
        setRoom('all');
      } else {
        await loadFloorsForBuilding(building);
      }
    };
    loadFloors();
  }, [building, loadFloorsForBuilding]);

  useEffect(() => {
    const loadRooms = async () => {
      if (floor === 'all') {
        setRoom('all');
      } else {
        await loadRoomsForFloor(floor);
      }
    };
    loadRooms();
  }, [floor, loadRoomsForFloor]);

  useEffect(() => {
    if (category !== 'all' && reportType === 'asset') {
      loadSubCategoriesForCategory(category);
    }
  }, [category, loadSubCategoriesForCategory, reportType]);

  const handleApply = () => {
    // Helper to serialize array values into comma‑separated strings
    const formatFilterValue = (value: any) => {
      return Array.isArray(value) ? value.join(',') : value;
    };

    // Build the filter object based on report type
    let nextFilters: any = {};
    
    if (reportType === 'asset') {
      nextFilters = {
        category,
        subCategory,
        assetType,
        status,
        building,
        floor,
        room,
        tenant,
        sortOrder,
        dataField,
      };
    } else if (reportType === 'tenant') {
      nextFilters = {
        tenant,
        companyGroup,
        tenantStatus,
        agreementStatus,
        building,
        floor,
        room,
        isGstCompany,
        isMainBranch,
        dateField,
        dateFrom,
        dateTo,
        sortOrder,
      };
    } else if (reportType === 'movement') {
      nextFilters = {
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
        sortOrder,
      };
    } else {
      // Helpdesk filters – serialize any array values
      nextFilters = {
        ticketCategory: formatFilterValue(ticketCategory),
        ticketSubCategory: formatFilterValue(ticketSubCategory),
        priority: formatFilterValue(priority),
        status: formatFilterValue(status),
        building: formatFilterValue(building),
        floor: formatFilterValue(floor),
        room: formatFilterValue(room),
        assignedTo: formatFilterValue(assignedToUser),
        tenant: formatFilterValue(tenant),
        safetyRisk: formatFilterValue(safetyRisk),
        previousOccurrence: formatFilterValue(previousOccurrence),
        createdDateRange: formatFilterValue(createdDateRange),
        targetDateRange: formatFilterValue(targetDateRange),
        resolvedDateRange: formatFilterValue(resolvedDateRange),
        sortOrder: formatFilterValue(sortOrder),
      };
    }

    setFilters(nextFilters);
    
    // Update analytics filter count
    const activeFilterCount = Object.values(nextFilters).filter(
      (value) => value !== 'all' && value !== null && value !== undefined && value !== ''
    ).length;
    
    if (reportType !== 'tenant') {
      setAnalyticsFilters(activeFilterCount);
    }

    if (onApply) {
      onApply();
    }
  };

  const handleClear = () => {
    // Reset all filter states to default
    setCategory('all');
    setSubCategory('all');
    setAssetType('all');
    setStatus('all');
    setBuilding('all');
    setFloor('all');
    setRoom('all');
    setTenant('all');
    setSortOrder('asc');
    setCompanyGroup('all');
    setTenantStatus('all');
    setAgreementStatus('all');
    setIsGstCompany('all');
    setIsMainBranch('all');
    setDateField('all');
    setDateFrom('');
    setDateTo('');
    setDataField('all');

    // Helpdesk specific filters
    setTicketCategory('all');
    setTicketSubCategory('all');
    setPriority('all');
    setAssignedToUser('all');
    setSafetyRisk(null);
    setPreviousOccurrence(null);
    
    // Reset date ranges
    setCreatedDateRange(['', '']);
    setTargetDateRange(['', '']);
    setResolvedDateRange(['', '']);

    // Clear the store
    clearFilters();
    
    // Reset dependent dropdowns
    if (reportType === 'asset') {
      setSubCategories([]);
      setTypes([]);
      setFloors([]);
      setRooms([]);
    } else if (reportType === 'tenant') {
      setFloors([]);
      setRooms([]);
    }
  };

  return (
    <div className="space-y-6">
      {reportType === 'asset' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="category">Asset Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sub-category">Asset Sub Category</Label>
              <Select value={subCategory} onValueChange={setSubCategory}>
                <SelectTrigger id="sub-category">
                  <SelectValue placeholder="Select sub category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Categories</SelectItem>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="asset-type">Asset Type</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger id="asset-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Asset Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="building">Building</Label>
              <Select value={building} onValueChange={setBuilding}>
                <SelectTrigger id="building">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((b) => (
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
                  {floors.map((f) => (
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
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={tenant} onValueChange={setTenant}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data-field">Data Field</Label>
              <Select value={dataField} onValueChange={setDataField}>
                <SelectTrigger id="data-field">
                  <SelectValue placeholder="Select data field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
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
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear Filters
            </Button>
            <Button type="button" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </>
      )}

        {reportType === 'movement' && (
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
                    {movementTypes.map((type) => (
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
                    {movementStatuses.map((stat) => (
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
                    {approvalStatuses.map((appr) => (
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
                    {vendors.map((v) => (
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
                    {handoverToOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
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
                    {tenants.map((t) => (
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
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reuse existing building/floor/room selects */}
              <div>
                <Label htmlFor="building">Building</Label>
                <Select value={building} onValueChange={setBuilding}>
                  <SelectTrigger id="building">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buildings</SelectItem>
                    {buildings?.map((b) => (
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

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleClear}>
                Clear Filters
              </Button>
              <Button type="button" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </>
        )}
      {reportType === 'tenant' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="company-group">Company Group</Label>
              <Select value={companyGroup} onValueChange={setCompanyGroup}>
                <SelectTrigger id="company-group">
                  <SelectValue placeholder="Select company group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Company Groups</SelectItem>
                  {companyGroups.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={tenant} onValueChange={setTenant}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder={companyGroup === 'all' ? 'Select tenant' : 'Select tenant in group'} />
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
              <Label htmlFor="tenant-status">Tenant Status</Label>
              <Select value={tenantStatus} onValueChange={setTenantStatus}>
                <SelectTrigger id="tenant-status">
                  <SelectValue placeholder="Select tenant status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenant Statuses</SelectItem>
                  {tenantStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="agreement-status">Agreement Status</Label>
              <Select value={agreementStatus} onValueChange={setAgreementStatus}>
                <SelectTrigger id="agreement-status">
                  <SelectValue placeholder="Select agreement status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agreement Statuses</SelectItem>
                  {agreementStatuses.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="building">Building</Label>
              <Select value={building} onValueChange={setBuilding}>
                <SelectTrigger id="building">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((b) => (
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
                  <SelectValue placeholder={building === 'all' ? 'Select building first' : 'Select floor'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Floors</SelectItem>
                  {floors.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name || f.floor_name || `Floor ${f.floor_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="room">Room</Label>
              <Select value={room} onValueChange={setRoom} disabled={floor === 'all'}>
                <SelectTrigger id="room">
                  <SelectValue placeholder={floor === 'all' ? 'Select floor first' : 'Select room'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name || r.room_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gst-company">GST Company</Label>
              <Select value={isGstCompany} onValueChange={setIsGstCompany}>
                <SelectTrigger id="gst-company">
                  <SelectValue placeholder="Select GST filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="main-branch">Main Branch</Label>
              <Select value={isMainBranch} onValueChange={setIsMainBranch}>
                <SelectTrigger id="main-branch">
                  <SelectValue placeholder="Select branch type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="main">Main Branch</SelectItem>
                  <SelectItem value="branch">Branch Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-field">Date Field</Label>
              <Select value={dateField} onValueChange={setDateField}>
                <SelectTrigger id="date-field">
                  <SelectValue placeholder="Select date field" />
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

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear Filters
            </Button>
            <Button type="button" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </>
      )}

      {reportType === 'helpdesk' && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ticket-category">Ticket Category</Label>
              <Select value={ticketCategory} onValueChange={setTicketCategory}>
                <SelectTrigger id="ticket-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ticket-sub-category">Ticket Sub Category</Label>
              <Select value={ticketSubCategory} onValueChange={setTicketSubCategory}>
                <SelectTrigger id="ticket-sub-category">
                  <SelectValue placeholder="Select sub category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub Categories</SelectItem>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {priorities.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((stat) => (
                    <SelectItem key={stat} value={stat}>
                      {stat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="building">Building</Label>
              <Select value={building} onValueChange={setBuilding}>
                <SelectTrigger id="building">
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buildings</SelectItem>
                  {buildings.map((b) => (
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
                  {floors.map((f) => (
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
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="assigned-to">Assigned To</Label>
              <Select value={assignedToUser} onValueChange={setAssignedToUser}>
                <SelectTrigger id="assigned-to">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {assignedTo.map((user) => (
                    // Render each technician by its id/value and display name
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tenant">Tenant</Label>
              <Select value={tenant} onValueChange={setTenant}>
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="safety-risk"
                checked={safetyRisk === true}
                onChange={(e) => setSafetyRisk(e.target.checked ? true : null)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="safety-risk">Safety Risk</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="previous-occurrence"
                checked={previousOccurrence === true}
                onChange={(e) => setPreviousOccurrence(e.target.checked ? true : null)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="previous-occurrence">Previous Occurrence</Label>
            </div>

            <div>
              <Label htmlFor="created-date-range">Created Date Range</Label>
              <input
                type="date"
                value={createdDateRange[0]}
                onChange={(e) => setCreatedDateRange([e.target.value, createdDateRange[1]])}
                className="w-full rounded border px-2 py-1"
              />
              <input
                type="date"
                value={createdDateRange[1]}
                onChange={(e) => setCreatedDateRange([createdDateRange[0], e.target.value])}
                className="w-full rounded border px-2 py-1 mt-1"
              />
            </div>

            <div>
              <Label htmlFor="target-date-range">Target Date Range</Label>
              <input
                type="date"
                value={targetDateRange[0]}
                onChange={(e) => setTargetDateRange([e.target.value, targetDateRange[1]])}
                className="w-full rounded border px-2 py-1"
              />
              <input
                type="date"
                value={targetDateRange[1]}
                onChange={(e) => setTargetDateRange([targetDateRange[0], e.target.value])}
                className="w-full rounded border px-2 py-1 mt-1"
              />
            </div>

            <div>
              <Label htmlFor="resolved-date-range">Resolved Date Range</Label>
              <input
                type="date"
                value={resolvedDateRange[0]}
                onChange={(e) => setResolvedDateRange([e.target.value, resolvedDateRange[1]])}
                className="w-full rounded border px-2 py-1"
              />
              <input
                type="date"
                value={resolvedDateRange[1]}
                onChange={(e) => setResolvedDateRange([resolvedDateRange[0], e.target.value])}
                className="w-full rounded border px-2 py-1 mt-1"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleClear}>
              Clear Filters
            </Button>
            <Button type="button" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
