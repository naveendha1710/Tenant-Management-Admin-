import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AssetDataGrid } from '../components/AssetDataGrid';
import { useFilteredAssets } from '../hooks/useAnalytics';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';

export const DataTableWidget = memo(function DataTableWidget() {
  const { assets, loading, error, refetch } = useFilteredAssets();

  const handleExport = () => {
    // Export to CSV
    const headers = ['Asset ID', 'Name', 'Category', 'Status', 'Value', 'Vendor'];
    const rows = assets.map(a => [
      a.asset_id,
      a.asset_name,
      a.asset_category,
      a.asset_status,
      a.asset_value,
      a.vendor_name,
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets.csv';
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Asset Data Table</CardTitle>
            <CardDescription>
              {assets.length} assets • Advanced filtering and sorting
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-red-500">
            Error loading data: {error}
          </div>
        ) : (
          <AssetDataGrid data={assets} loading={loading} height={600} />
        )}
      </CardContent>
    </Card>
  );
});
