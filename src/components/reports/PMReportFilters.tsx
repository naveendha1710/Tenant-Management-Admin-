import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PMReportFilters, PMReportType } from '@/types/pmReports';

interface PMReportFiltersProps {
  reportType: PMReportType;
  setReportType: (type: PMReportType) => void;
  filters: PMReportFilters;
  onChange: (filters: PMReportFilters) => void;
}

export default function PMReportFilters({ reportType, setReportType, filters, onChange }: PMReportFiltersProps) {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadBuildings();
    loadTenants();
    loadCategories();
    loadUsers();
  }, []);

  useEffect(() => {
    if (filters.buildingId) loadFloors(filters.buildingId);
    else setFloors([]);
  }, [filters.buildingId]);

  useEffect(() => {
    if (filters.floorId) loadRooms(filters.floorId);
    else setRooms([]);
  }, [filters.floorId]);

  useEffect(() => {
    if (filters.categoryId) loadSubCategories(filters.categoryId);
    else setSubCategories([]);
  }, [filters.categoryId]);

  useEffect(() => {
    if (filters.subCategoryId) loadTypes(filters.subCategoryId);
    else setTypes([]);
  }, [filters.subCategoryId]);

  async function loadBuildings() {
    const { data } = await supabase.from('buildings').select('id, name').order('name');
    setBuildings(data || []);
  }

  async function loadFloors(buildingId: string) {
    const { data } = await supabase
      .from('floors')
      .select('id, floor_name, floor_number')
      .eq('building_id', buildingId)
      .order('floor_number');
    setFloors(data || []);
  }

  async function loadRooms(floorId: string) {
    const { data } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('floor_id', floorId)
      .order('room_number');
    setRooms(data || []);
  }

  async function loadTenants() {
    const { data } = await supabase.from('tenants').select('id, company').order('company');
    setTenants(data || []);
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('assets')
      .select('asset_category')
      .not('asset_category', 'is', null);
    const unique = [...new Set(data?.map(d => d.asset_category))];
    setCategories(unique.sort());
  }

  async function loadSubCategories(category: string) {
    const { data } = await supabase
      .from('assets')
      .select('asset_sub_category')
      .eq('asset_category', category)
      .not('asset_sub_category', 'is', null);
    const unique = [...new Set(data?.map(d => d.asset_sub_category))];
    setSubCategories(unique.sort());
  }

  async function loadTypes(subCategory: string) {
    const { data } = await supabase
      .from('assets')
      .select('asset_type')
      .eq('asset_sub_category', subCategory)
      .not('asset_type', 'is', null);
    const unique = [...new Set(data?.map(d => d.asset_type))];
    setTypes(unique.sort());
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('asset_auditor', true)
      .order('name');
    setUsers(data || []);
  }

  const updateFilter = (key: keyof PMReportFilters, value: any) => {
    const updated = { ...filters, [key]: value };

    // Reset cascading filters
    if (key === 'buildingId') {
      updated.floorId = undefined;
      updated.roomId = undefined;
    }
    if (key === 'floorId') {
      updated.roomId = undefined;
    }
    if (key === 'categoryId') {
      updated.subCategoryId = undefined;
      updated.typeId = undefined;
    }
    if (key === 'subCategoryId') {
      updated.typeId = undefined;
    }

    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Report Type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">REPORT TYPE</label>
        <div className="inline-flex border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => setReportType('schedule')}
            className={`px-4 h-8 text-sm font-medium border-r border-gray-300 transition-all duration-200 ${
              reportType === 'schedule' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Schedule
          </button>
          <button
            onClick={() => setReportType('task')}
            className={`px-4 h-8 text-sm font-medium border-r border-gray-300 transition-all duration-200 ${
              reportType === 'task' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Task
          </button>
          <button
            onClick={() => setReportType('audit')}
            className={`px-4 h-8 text-sm font-medium transition-all duration-200 ${
              reportType === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Audit
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">DATE RANGE *</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={filters.dateRange.startDate}
            onChange={(e) => onChange({ ...filters, dateRange: { ...filters.dateRange, startDate: e.target.value } })}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary transition-colors duration-200"
          />
          <input
            type="date"
            value={filters.dateRange.endDate}
            onChange={(e) => onChange({ ...filters, dateRange: { ...filters.dateRange, endDate: e.target.value } })}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary transition-colors duration-200"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">LOCATION</label>
        <div className="grid grid-cols-3 gap-3">
          <select
            value={filters.buildingId || ''}
            onChange={(e) => updateFilter('buildingId', e.target.value || undefined)}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white transition-colors duration-200"
          >
            <option value="">Building</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={filters.floorId || ''}
            onChange={(e) => updateFilter('floorId', e.target.value || undefined)}
            disabled={!filters.buildingId}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors duration-200"
          >
            <option value="">Floor</option>
            {floors.map((f) => (
              <option key={f.id} value={f.id}>{f.floor_name || f.floor_number}</option>
            ))}
          </select>
          <select
            value={filters.roomId || ''}
            onChange={(e) => updateFilter('roomId', e.target.value || undefined)}
            disabled={!filters.floorId}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors duration-200"
          >
            <option value="">Room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.room_number}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ASSET</label>
        <div className="grid grid-cols-3 gap-3">
          <select
            value={filters.categoryId || ''}
            onChange={(e) => updateFilter('categoryId', e.target.value || undefined)}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white transition-colors duration-200"
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.subCategoryId || ''}
            onChange={(e) => updateFilter('subCategoryId', e.target.value || undefined)}
            disabled={!filters.categoryId}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors duration-200"
          >
            <option value="">Sub-Category</option>
            {subCategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filters.typeId || ''}
            onChange={(e) => updateFilter('typeId', e.target.value || undefined)}
            disabled={!filters.subCategoryId}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white disabled:bg-gray-100 disabled:text-gray-400 transition-colors duration-200"
          >
            <option value="">Type</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignment */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">ASSIGNMENT</label>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={filters.tenantId || ''}
            onChange={(e) => updateFilter('tenantId', e.target.value || undefined)}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white transition-colors duration-200"
          >
            <option value="">Tenant</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.company}</option>
            ))}
          </select>
          <select
            value={filters.assignedTo || ''}
            onChange={(e) => updateFilter('assignedTo', e.target.value || undefined)}
            className="h-9 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-primary bg-white transition-colors duration-200"
          >
            <option value="">Assigned User</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Exception Mode */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="exceptionMode"
          checked={filters.exceptionMode || false}
          onChange={(e) => updateFilter('exceptionMode', e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-0 focus:ring-offset-0 transition-colors duration-200"
        />
        <label htmlFor="exceptionMode" className="text-sm text-gray-700">
          Show only exceptions (Overdue / Failed)
        </label>
      </div>
    </div>
  );
}
