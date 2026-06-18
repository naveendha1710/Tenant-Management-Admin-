import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssetFilterOptions } from '../shared/useAssetFilterOptions';
import { useHelpdeskFilterOptions } from '../shared/useHelpdeskFilterOptions';
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
  
  // Choose the appropriate filter options hook based on report type
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
    priorities,
    assignedTo,
    safetyRisks,
  } = reportType === 'asset'
    ? useAssetFilterOptions()
    : useHelpdeskFilterOptions();

  const [category, setCategory] = useState(filters.category || 'all');
  const [subCategory, setSubCategory] = useState(filters.subCategory || 'all');
  const [assetType, setAssetType] = useState(filters.assetType || 'all');
  const [status, setStatus] = useState(filters.status || 'all');
  const [building, setBuilding] = useState(filters.building || 'all');
  const [floor, setFloor] = useState(filters.floor || 'all');
  const [room, setRoom] = useState(filters.room || 'all');
  const [tenant, setTenant] = useState(filters.tenant || 'all');
  const [sortOrder, setSortOrder] = useState(filters.sortOrder || 'asc');

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

  useEffect(() => {
    if (building === 'all') {
      setFloor('all');
      setRoom('all');
    } else {
      loadFloorsForBuilding(building);
    }
  }, [building, loadFloorsForBuilding]);

  useEffect(() => {
    if (floor === 'all') {
      setRoom('all');
    } else {
      loadRoomsForFloor(floor);
    }
  }, [floor, loadRoomsForFloor]);

  useEffect(() => {
    if (category !== 'all' && reportType === 'asset') {
      loadSubCategoriesForCategory(category);
    }
  }, [category, loadSubCategoriesForCategory, reportType]);

  const handleApply = () => {
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
      };
    } else {
      // Helpdesk filters
      nextFilters = {
        ticketCategory,
        ticketSubCategory,
        priority,
        status,
        building,
        floor,
        room,
        assignedTo: assignedToUser,
        tenant,
        safetyRisk,
        previousOccurrence,
        createdDateRange,
        targetDateRange,
        resolvedDateRange,
        sortOrder,
      };
    }

    setFilters(nextFilters);
    
    // Update analytics filter count
    const activeFilterCount = Object.values(nextFilters).filter(
      (value) => value !== 'all' && value !== null && value !== undefined && value !== ''
    ).length;
    
    setAnalyticsFilters(activeFilterCount);

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

    // Helpdesk specific filters
    setTicketCategory('all');
    setTicketSubCategory('all');
    setPriority('all');
    setAssignedToUser('all');
    setSafetyRisk('all');
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
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger id="floor">
                  <SelectValue placeholder="Select floor" />
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
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger id="room">
                  <SelectValue placeholder="Select room" />
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
              <Select value={floor} onValueChange={setFloor}>
                <SelectTrigger id="floor">
                  <SelectValue placeholder="Select floor" />
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
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger id="room">
                  <SelectValue placeholder="Select room" />
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
                    <SelectItem key={user} value={user}>
                      {user}
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
              <Label htmlFor="safety-risk">Safety Risk</Label>
              <Select value={safetyRisk} onValueChange={setSafetyRisk}>
                <SelectTrigger id="safety-risk">
                  <SelectValue placeholder="Select risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  {safetyRisks.map((risk) => (
                    <SelectItem key={risk} value={risk}>
                      {risk}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <div className="flex space-x-2">
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
                  className="w-full rounded border px-2 py-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target-date-range">Target Date Range</Label>
              <div className="flex space-x-2">
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
                  className="w-full rounded border px-2 py-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="resolved-date-range">Resolved Date Range</Label>
              <div className="flex space-x-2">
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
                  className="w-full rounded border px-2 py-1"
                />
              </div>
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
