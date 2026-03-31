import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X } from 'lucide-react';
import type { TenantReportFilters } from '@/types/tenantReports';

interface TenantReportFiltersProps {
  filters: TenantReportFilters;
  onFiltersChange: (filters: TenantReportFilters) => void;
}

export function TenantReportFilters({ filters, onFiltersChange }: TenantReportFiltersProps) {
  const [tenants, setTenants] = useState<any[]>([]);
  const [companyGroups, setCompanyGroups] = useState<string[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [selectedCompanyGroups, setSelectedCompanyGroups] = useState<string[]>([]);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    const [tenantsRes, buildingsRes] = await Promise.all([
      supabase.from('tenants').select('id, name, company, companygroup').order('name'),
      supabase.from('buildings').select('id, name').order('name'),
    ]);

    if (tenantsRes.data) {
      setTenants(tenantsRes.data);
      const groups = [...new Set(tenantsRes.data.map(t => t.companygroup).filter(Boolean))];
      setCompanyGroups(groups as string[]);
    }

    if (buildingsRes.data) setBuildings(buildingsRes.data);
  };

  const updateFilter = (key: keyof TenantReportFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleTenant = (tenantId: string) => {
    const updated = selectedTenants.includes(tenantId)
      ? selectedTenants.filter(id => id !== tenantId)
      : [...selectedTenants, tenantId];
    setSelectedTenants(updated);
    updateFilter('tenantIds', updated.length > 0 ? updated : undefined);
  };

  const toggleCompanyGroup = (group: string) => {
    const updated = selectedCompanyGroups.includes(group)
      ? selectedCompanyGroups.filter(g => g !== group)
      : [...selectedCompanyGroups, group];
    setSelectedCompanyGroups(updated);
    updateFilter('companyGroups', updated.length > 0 ? updated : undefined);
  };

  const toggleBuilding = (buildingId: string) => {
    const updated = selectedBuildings.includes(buildingId)
      ? selectedBuildings.filter(id => id !== buildingId)
      : [...selectedBuildings, buildingId];
    setSelectedBuildings(updated);
    updateFilter('buildingIds', updated.length > 0 ? updated : undefined);
  };

  const removeTenant = (tenantId: string) => {
    const updated = selectedTenants.filter(id => id !== tenantId);
    setSelectedTenants(updated);
    updateFilter('tenantIds', updated.length > 0 ? updated : undefined);
  };

  const removeCompanyGroup = (group: string) => {
    const updated = selectedCompanyGroups.filter(g => g !== group);
    setSelectedCompanyGroups(updated);
    updateFilter('companyGroups', updated.length > 0 ? updated : undefined);
  };

  const removeBuilding = (buildingId: string) => {
    const updated = selectedBuildings.filter(id => id !== buildingId);
    setSelectedBuildings(updated);
    updateFilter('buildingIds', updated.length > 0 ? updated : undefined);
  };

  const updateDateRange = (key: 'startDate' | 'endDate', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        startDate: key === 'startDate' ? value : filters.dateRange?.startDate || '',
        endDate: key === 'endDate' ? value : filters.dateRange?.endDate || '',
      },
    });
  };

  const toggleStatus = (status: 'Active' | 'Pending Move-In' | 'Vacated') => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    updateFilter('status', updated.length > 0 ? updated : undefined);
  };

  return (
    <div className="space-y-4">
      {/* TENANT FILTERS */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          TENANT FILTERS
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tenants</label>
            <div className="space-y-2">
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      toggleTenant(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary transition-colors duration-200 rounded-md"
                >
                  <option value="">Select Tenants...</option>
                  {tenants
                    .filter(t => !selectedTenants.includes(t.id))
                    .map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.company || tenant.name}
                      </option>
                    ))}
                </select>
              </div>
              {selectedTenants.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedTenants.map(tenantId => {
                    const tenant = tenants.find(t => t.id === tenantId);
                    return (
                      <span
                        key={tenantId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                      >
                        {tenant?.company || tenant?.name}
                        <button
                          onClick={() => removeTenant(tenantId)}
                          className="hover:bg-primary/20 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Company Groups</label>
            <div className="space-y-2">
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      toggleCompanyGroup(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary transition-colors duration-200 rounded-md"
                >
                  <option value="">Select Groups...</option>
                  {companyGroups
                    .filter(g => !selectedCompanyGroups.includes(g))
                    .map(group => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                </select>
              </div>
              {selectedCompanyGroups.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedCompanyGroups.map(group => (
                    <span
                      key={group}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                    >
                      {group}
                      <button
                        onClick={() => removeCompanyGroup(group)}
                        className="hover:bg-primary/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Buildings</label>
            <div className="space-y-2">
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      toggleBuilding(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary transition-colors duration-200 rounded-md"
                >
                  <option value="">Select Buildings...</option>
                  {buildings
                    .filter(b => !selectedBuildings.includes(b.id))
                    .map(building => (
                      <option key={building.id} value={building.id}>{building.name}</option>
                    ))}
                </select>
              </div>
              {selectedBuildings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedBuildings.map(buildingId => {
                    const building = buildings.find(b => b.id === buildingId);
                    return (
                      <span
                        key={buildingId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                      >
                        {building?.name}
                        <button
                          onClick={() => removeBuilding(buildingId)}
                          className="hover:bg-primary/20 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DATE RANGE */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          AGREEMENT DATE RANGE
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.dateRange?.startDate || ''}
              onChange={(e) => updateDateRange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary transition-colors duration-200 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={filters.dateRange?.endDate || ''}
              onChange={(e) => updateDateRange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 bg-white text-sm focus:outline-none focus:border-primary transition-colors duration-200 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* STATUS */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          TENANT STATUS
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['Active', 'Pending Move-In', 'Vacated'] as const).map(status => (
            <label key={status} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.status?.includes(status) || false}
                onChange={() => toggleStatus(status)}
                className="w-4 h-4 text-primary border-gray-300 focus:ring-primary transition-colors duration-200 rounded"
              />
              <span className="text-sm text-gray-700">{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* COMPANY TYPE */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
          COMPANY TYPE
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isGstCompany === true}
              onChange={(e) => updateFilter('isGstCompany', e.target.checked ? true : undefined)}
              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary transition-colors duration-200 rounded"
            />
            <span className="text-sm text-gray-700">GST Company Only</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isMainBranch === true}
              onChange={(e) => updateFilter('isMainBranch', e.target.checked ? true : undefined)}
              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary transition-colors duration-200 rounded"
            />
            <span className="text-sm text-gray-700">Main Branch Only</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.isMainBranch === false}
              onChange={(e) => updateFilter('isMainBranch', e.target.checked ? false : undefined)}
              className="w-4 h-4 text-primary border-gray-300 focus:ring-primary transition-colors duration-200 rounded"
            />
            <span className="text-sm text-gray-700">Branch Only</span>
          </label>
        </div>
      </div>
    </div>
  );
}
