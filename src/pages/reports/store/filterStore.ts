import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ReportFilters } from '../types';

interface FilterStore {
  filters: ReportFilters;
  activeFilters: number;
  setFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  setFilters: (filters: Partial<ReportFilters>) => void;
  resetFilters: () => void;
  clearFilter: (key: keyof ReportFilters) => void;
  getActiveFilterCount: () => number;
}

// Update the type definition to support arrays for multi-select filters
export type ReportFilters = {
  category?: string | string[];
  subCategory?: string | string[];
  type?: string | string[];
  status?: string | string[];
  building?: string | string[];
  floor?: string | string[];
  room?: string | string[];
  tenant?: string | string[];
  vendor?: string;
  sezStatus?: string | string[];
  warrantyStatus?: string;
  sortOrder?: 'asc' | 'desc';
};

const defaultFilters: ReportFilters = {
  category: 'all',
  subCategory: 'all',
  type: 'all',
  status: 'all',
  building: 'all',
  floor: 'all',
  room: 'all',
  tenant: 'all',
  vendor: 'all',
  sezStatus: 'all',
  warrantyStatus: 'all',
  sortOrder: 'asc',
};

export const useFilterStore = create<FilterStore>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      activeFilters: 0,

      setFilter: (key, value) => {
        set((state) => {
          const newFilters = { ...state.filters, [key]: value };
          return {
            filters: newFilters,
            activeFilters: countActiveFilters(newFilters),
          };
        });
      },

      setFilters: (filters) => {
        set((state) => {
          const newFilters = { ...state.filters, ...filters };
          return {
            filters: newFilters,
            activeFilters: countActiveFilters(newFilters),
          };
        });
      },

      resetFilters: () => {
        set({
          filters: defaultFilters,
          activeFilters: 0,
        });
      },

      clearFilter: (key) => {
        set((state) => {
          const newFilters = { ...state.filters };
          delete newFilters[key];
          return {
            filters: newFilters,
            activeFilters: countActiveFilters(newFilters),
          };
        });
      },

      getActiveFilterCount: () => {
        return countActiveFilters(get().filters);
      },
    }),
    {
      name: 'report-filters',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);

function countActiveFilters(filters: ReportFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === 'sortOrder') return false;
    if (Array.isArray(value)) {
      return value.length > 0 && !value.every(v => v === 'all');
    }
    if (value === 'all' || value === undefined || value === null) return false;
    if (key === 'dateRange' && (!value.from || !value.to)) return false;
    return true;
  }).length;
}
