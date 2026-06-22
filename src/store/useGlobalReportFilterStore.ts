import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GlobalReportFilters = {
  tenant?: string;
  building?: string;
  floor?: string;
  room?: string;
  category?: string;
  subCategory?: string;
  assetType?: string;
  status?: string;
  companyGroup?: string;
  tenantStatus?: string;
  agreementStatus?: string;
  isGstCompany?: string;
  isMainBranch?: string;
  dateField?: string;
  dateFrom?: string;
  dateTo?: string;
  sortOrder?: 'asc' | 'desc';
};

interface GlobalReportFilterStore {
  filters: GlobalReportFilters;
  setFilters: (filters: Partial<GlobalReportFilters>) => void;
  clearFilters: () => void;
}

const defaultFilters: GlobalReportFilters = {
  tenant: 'all',
  building: 'all',
  floor: 'all',
  room: 'all',
  category: 'all',
  subCategory: 'all',
  assetType: 'all',
  status: 'all',
  companyGroup: 'all',
  tenantStatus: 'all',
  agreementStatus: 'all',
  isGstCompany: 'all',
  isMainBranch: 'all',
  dateField: 'all',
  dateFrom: '',
  dateTo: '',
  sortOrder: 'asc',
};

export const useGlobalReportFilterStore = create<GlobalReportFilterStore>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      setFilters: (filters) => {
        set((state) => ({
          filters: {
            ...state.filters,
            ...filters,
          },
        }));
      },
      clearFilters: () => {
        set({ filters: defaultFilters });
      },
    }),
    {
      name: 'global-report-filters',
      partialize: (state) => ({ filters: state.filters }),
    }
  )
);

export const globalReportFilterDefaults = defaultFilters;
