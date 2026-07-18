import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SheetConfig = {
  id: string;
  name?: string;
  /** UI column keys that the user has selected for export */
  fields: string[];
  /** Keys of fields that should be summed in the final Excel totals row */
  totalsFor?: string[];
  additionalFilters?: Record<string, any>;
  sortOrder?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  // Legacy aliases for older saved templates and persisted state.
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
};

interface ReportSheetStore {
  sheets: SheetConfig[];
  addSheet: () => void;
  updateSheet: (id: string, updates: Partial<SheetConfig>) => void;
  removeSheet: (id: string) => void;
  clearAllSheets: () => void;
  setSheets: (sheets: SheetConfig[]) => void;
  getIsValid: () => boolean;
  loadedTemplateId?: string | null;
  setLoadedTemplateId: (id: string | null) => void;
}

const createSheet = (index: number): SheetConfig => ({
  id: crypto.randomUUID(),
  name: `Sheet ${index + 1}`,
  fields: [],
  totalsFor: [],
  additionalFilters: {},
});

export const useReportSheetStore = create<ReportSheetStore>()(
  persist(
    (set, get) => ({
      sheets: [createSheet(0)],
      addSheet: () => {
        set((state) => ({
          sheets: [...state.sheets, createSheet(state.sheets.length)],
        }));
      },
      updateSheet: (id, updates) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === id ? { ...sheet, ...updates } : sheet
          ),
        }));
      },
      /** Update only the totalsFor array for a given sheet */
      updateSheetTotals: (sheetId: string, totals: string[]) => {
        set((state) => ({
          sheets: state.sheets.map((sheet) =>
            sheet.id === sheetId ? { ...sheet, totalsFor: totals } : sheet
          ),
        }));
      },
      removeSheet: (id) => {
        set((state) => ({
          sheets: state.sheets.filter((sheet) => sheet.id !== id),
        }));
      },
      clearAllSheets: () => {
        set({ sheets: [createSheet(0)] });
      },
      setSheets: (sheets) => {
        set({ sheets });
      },
      getIsValid: () => {
        const { sheets } = get();
        return sheets.some((sheet) => sheet.fields.length > 0);
      },
      loadedTemplateId: null,
      setLoadedTemplateId: (id) => {
        set({ loadedTemplateId: id });
      },
    }),
    {
      name: 'report-sheets-storage',
    }
  )
);
