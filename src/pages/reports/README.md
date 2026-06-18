# Enterprise Asset Management Reporting System

## Architecture Overview

This is a scalable, enterprise-grade analytics dashboard built with:
- **React** + **TypeScript** for type-safe development
- **Apache ECharts** for high-performance charting
- **Zustand** for global state management
- **AG Grid** for enterprise data tables (coming soon)
- **react-grid-layout** for dynamic widget positioning (coming soon)

## Folder Structure

```
src/pages/reports/
├── Reports.tsx              # Main dashboard entry point
├── components/              # Reusable UI components
│   ├── KPICard.tsx         # KPI metric cards
│   ├── ChartWidget.tsx     # Chart container wrapper
│   ├── DashboardNavigation.tsx  # Tab navigation
│   └── LoadingStates.tsx   # Loading/empty/error states
├── charts/                  # Chart rendering system
│   ├── BaseChart.tsx       # ECharts wrapper with theme support
│   ├── ChartRenderer.tsx   # Chart factory component
│   └── chartConfigs.ts     # Chart configuration builders
├── widgets/                 # Dashboard sections
│   ├── ExecutiveOverview.tsx    # Executive dashboard
│   ├── LifecycleAnalytics.tsx   # Lifecycle management (coming)
│   ├── MaintenanceHealth.tsx    # Maintenance analytics (coming)
│   └── VendorAnalytics.tsx      # Vendor performance (coming)
├── hooks/                   # Custom React hooks
│   └── useAnalytics.ts     # Data fetching hooks
├── services/                # API and data services
│   └── analytics.service.ts # Analytics data layer
├── store/                   # State management
│   └── filterStore.ts      # Global filter store (Zustand)
├── types/                   # TypeScript definitions
│   └── index.ts            # All type definitions
└── utils/                   # Utility functions
    └── chartUtils.ts       # Chart helpers and formatters
```

## Key Features

### 1. Global Filter System
- Centralized filter state using Zustand
- Cross-widget synchronization
- Persistent filters (localStorage)
- Cascading filters (Building → Floor → Room, Category → Sub → Type)

### 2. Chart System
- Factory pattern for chart rendering
- Supported types: Donut, Bar, Line, Stacked Bar, Treemap, Gauge
- Theme-aware (light/dark mode)
- Responsive and interactive
- Click event handling for cross-filtering

### 3. Performance Optimizations
- React.memo for component memoization
- Debounced filter updates
- Lazy loading ready
- Virtualization ready for large datasets

### 4. Dashboard Sections
- **Executive Overview**: KPIs, status distribution, category breakdown
- **Lifecycle Analytics**: Asset age, warranty, depreciation (coming)
- **Maintenance & Health**: PM compliance, failure trends (coming)
- **Vendor Analytics**: Vendor performance, spend analysis (coming)

## Usage Examples

### Using the Filter Store

```tsx
import { useFilterStore } from './store/filterStore';

function MyComponent() {
  const { filters, setFilter, resetFilters } = useFilterStore();
  
  // Set a filter
  setFilter('category', 'IT Equipment');
  
  // Reset all filters
  resetFilters();
}
```

### Fetching Data with Hooks

```tsx
import { useKPIMetrics, useAggregatedData } from './hooks/useAnalytics';

function Dashboard() {
  const { metrics, loading } = useKPIMetrics();
  const { data } = useAggregatedData('asset_status');
  
  return <div>{metrics?.totalAssets}</div>;
}
```

### Rendering Charts

```tsx
import { ChartRenderer } from './charts/ChartRenderer';
import { transformToChartData } from './utils/chartUtils';

function MyChart({ data }) {
  return (
    <ChartRenderer
      config={{
        type: 'donut',
        title: 'Asset Distribution',
        data: transformToChartData(data),
        height: 400,
        onClick: (params) => console.log(params),
      }}
    />
  );
}
```

### Creating KPI Cards

```tsx
import { KPICard } from './components/KPICard';

function KPISection() {
  return (
    <KPICard
      data={{
        label: 'Total Assets',
        value: 1250,
        format: 'number',
        change: 5.2,
        changeType: 'increase',
      }}
    />
  );
}
```

## Next Steps (Phases 5-14)

1. **Lifecycle Management Page** - Asset age, warranty tracking, depreciation
2. **Maintenance & Health Page** - PM compliance, failure analysis
3. **Vendor Analytics Page** - Vendor performance, spend analysis
4. **Dynamic Widget Engine** - Drag-and-drop dashboard customization
5. **Cross Filtering System** - Power BI style interactions
6. **AG Grid Integration** - Enterprise data tables
7. **Performance Optimization** - Virtualization, caching, lazy loading
8. **Advanced Charts** - Heatmaps, Sankey, Timeline, Histogram

## Best Practices

1. **Always use the filter store** for global filters
2. **Memoize expensive components** with React.memo
3. **Use custom hooks** for data fetching
4. **Handle loading/error states** in all widgets
5. **Keep chart configs separate** from components
6. **Type everything** with TypeScript
7. **Test with large datasets** (100K+ assets)

## Dependencies

```json
{
  "echarts": "^5.x",
  "echarts-for-react": "^3.x",
  "zustand": "^4.x",
  "ag-grid-react": "^31.x",
  "react-grid-layout": "^1.x"
}
```
