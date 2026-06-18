import { memo, useMemo, useCallback } from 'react';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Asset } from '../types';
import { formatCurrency, formatNumber } from '../utils/chartUtils';
import { useTheme } from 'next-themes';

interface AssetDataGridProps {
  data: Asset[];
  loading?: boolean;
  onRowClick?: (asset: Asset) => void;
  height?: number;
}

export const AssetDataGrid = memo(function AssetDataGrid({
  data,
  loading = false,
  onRowClick,
  height = 600,
}: AssetDataGridProps) {
  const modules = useMemo(() => [AllCommunityModule], []);
  const { theme } = useTheme();

  const columnDefs = useMemo(
    () => [
      {
        field: 'asset_id',
        headerName: 'Asset ID',
        filter: 'agTextColumnFilter',
        pinned: 'left',
        width: 150,
      },
      {
        field: 'asset_name',
        headerName: 'Asset Name',
        filter: 'agTextColumnFilter',
        width: 200,
      },
      {
        field: 'asset_category',
        headerName: 'Category',
        filter: 'agTextColumnFilter',
        width: 150,
      },
      {
        field: 'asset_sub_category',
        headerName: 'Sub Category',
        filter: 'agTextColumnFilter',
        width: 150,
      },
      {
        field: 'asset_type',
        headerName: 'Type',
        filter: 'agTextColumnFilter',
        width: 150,
      },
      {
        field: 'asset_status',
        headerName: 'Status',
        filter: 'agTextColumnFilter',
        width: 130,
        cellStyle: (params: any) => {
          if (params.value === 'Working') {
            return { color: 'green', fontWeight: 'bold' };
          }
          if (params.value === 'Not Working' || params.value === 'Under Repair') {
            return { color: 'red', fontWeight: 'bold' };
          }
          return {};
        },
      },
      {
        field: 'asset_value',
        headerName: 'Value',
        filter: 'agNumberColumnFilter',
        width: 150,
        valueFormatter: (params: any) =>
          params.value ? formatCurrency(params.value) : '-',
      },
      {
        field: 'vendor_name',
        headerName: 'Vendor',
        filter: 'agTextColumnFilter',
        width: 180,
      },
      {
        field: 'building',
        headerName: 'Building',
        filter: 'agTextColumnFilter',
        width: 150,
      },
      {
        field: 'purchase_date',
        headerName: 'Purchase Date',
        filter: 'agDateColumnFilter',
        width: 150,
        valueFormatter: (params: any) =>
          params.value ? new Date(params.value).toLocaleDateString() : '-',
      },
      {
        field: 'warranty_date',
        headerName: 'Warranty Expiry',
        filter: 'agDateColumnFilter',
        width: 150,
        valueFormatter: (params: any) =>
          params.value ? new Date(params.value).toLocaleDateString() : '-',
      },
    ],
    []
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      resizable: true,
      filter: true,
      floatingFilter: true,
    }),
    []
  );

  const onRowClicked = useCallback(
    (event: any) => {
      if (onRowClick) {
        onRowClick(event.data);
      }
    },
    [onRowClick]
  );

  return (
    <div
      className={theme === 'dark' ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}
      style={{ height, width: '100%' }}
    >
      <AgGridProvider modules={modules}>
        <AgGridReact
          theme="legacy"
          rowData={data}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          onRowClicked={onRowClicked}
          loading={loading}
          animateRows={true}
          rowSelection={{ mode: 'single', enableClickSelection: true }}
          enableCellTextSelection={true}
        />
      </AgGridProvider>
    </div>
  );
});
