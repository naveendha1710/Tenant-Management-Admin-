import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, RotateCcw } from 'lucide-react';
import { DashboardGrid } from '../components/DashboardGrid';
import { useWidgetStore } from '../store/widgetStore';
import { WidgetConfig, ChartType } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export const CustomDashboard = memo(function CustomDashboard() {
  const { widgets, addWidget, removeWidget, updateLayout, resetLayout } = useWidgetStore();
  const [isEditing, setIsEditing] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const customWidgets = widgets.custom || [];

  const handleAddWidget = (config: Partial<WidgetConfig>) => {
    const newWidget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      type: config.type || 'chart',
      title: config.title || 'New Widget',
      subtitle: config.subtitle,
      size: { w: 4, h: 3 },
      position: { x: 0, y: 0 },
      dataSource: config.dataSource || 'asset_status',
      chartConfig: config.chartConfig,
    };

    addWidget('custom', newWidget);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Dashboard</CardTitle>
              <CardDescription>Build your own analytics dashboard</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Widget
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Widget</DialogTitle>
                    <DialogDescription>Configure your new widget</DialogDescription>
                  </DialogHeader>
                  <WidgetConfigForm onSubmit={handleAddWidget} />
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Lock Layout' : 'Edit Layout'}
              </Button>

              <Button variant="outline" onClick={() => resetLayout('custom')}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dashboard Grid */}
      {customWidgets.length > 0 ? (
        <DashboardGrid
          widgets={customWidgets}
          editable={isEditing}
          onLayoutChange={(layout) => updateLayout('custom', layout)}
          onRemoveWidget={(id) => removeWidget('custom', id)}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No widgets added yet</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Widget
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

function WidgetConfigForm({ onSubmit }: { onSubmit: (config: Partial<WidgetConfig>) => void }) {
  const [widgetType, setWidgetType] = useState<'chart' | 'kpi' | 'table'>('chart');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [dataSource, setDataSource] = useState('asset_status');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    onSubmit({
      type: widgetType,
      title: title || 'New Widget',
      dataSource,
      chartConfig: widgetType === 'chart' ? {
        type: chartType,
        data: { labels: [], series: [] },
      } : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Widget Title</Label>
        <Input
          placeholder="Enter widget title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <Label>Widget Type</Label>
        <Select value={widgetType} onValueChange={(v: any) => setWidgetType(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chart">Chart</SelectItem>
            <SelectItem value="kpi">KPI Card</SelectItem>
            <SelectItem value="table">Table</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {widgetType === 'chart' && (
        <div>
          <Label>Chart Type</Label>
          <Select value={chartType} onValueChange={(v: any) => setChartType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="donut">Donut Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="treemap">Treemap</SelectItem>
              <SelectItem value="gauge">Gauge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Data Source</Label>
        <Select value={dataSource} onValueChange={setDataSource}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asset_status">Asset Status</SelectItem>
            <SelectItem value="asset_category">Asset Category</SelectItem>
            <SelectItem value="vendor_name">Vendor</SelectItem>
            <SelectItem value="building">Building</SelectItem>
            <SelectItem value="condition">Condition</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleSubmit} className="w-full">
        Add Widget
      </Button>
    </div>
  );
}
