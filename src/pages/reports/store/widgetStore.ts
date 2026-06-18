import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WidgetConfig, DashboardSection } from '../types';

interface WidgetStore {
  widgets: Record<DashboardSection, WidgetConfig[]>;
  layouts: Record<DashboardSection, any[]>;
  addWidget: (section: DashboardSection, widget: WidgetConfig) => void;
  removeWidget: (section: DashboardSection, widgetId: string) => void;
  updateWidget: (section: DashboardSection, widgetId: string, updates: Partial<WidgetConfig>) => void;
  updateLayout: (section: DashboardSection, layout: any[]) => void;
  resetLayout: (section: DashboardSection) => void;
}

const defaultWidgets: Record<DashboardSection, WidgetConfig[]> = {
  executive: [],
  lifecycle: [],
  maintenance: [],
  vendor: [],
  custom: [],
};

export const useWidgetStore = create<WidgetStore>()(
  persist(
    (set, get) => ({
      widgets: defaultWidgets,
      layouts: {},

      addWidget: (section, widget) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [section]: [...state.widgets[section], widget],
          },
        }));
      },

      removeWidget: (section, widgetId) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [section]: state.widgets[section].filter((w) => w.id !== widgetId),
          },
        }));
      },

      updateWidget: (section, widgetId, updates) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [section]: state.widgets[section].map((w) =>
              w.id === widgetId ? { ...w, ...updates } : w
            ),
          },
        }));
      },

      updateLayout: (section, layout) => {
        set((state) => ({
          layouts: {
            ...state.layouts,
            [section]: layout,
          },
        }));
      },

      resetLayout: (section) => {
        set((state) => ({
          widgets: {
            ...state.widgets,
            [section]: [],
          },
          layouts: {
            ...state.layouts,
            [section]: [],
          },
        }));
      },
    }),
    {
      name: 'widget-store',
    }
  )
);
