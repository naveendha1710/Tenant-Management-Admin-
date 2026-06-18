import { memo, useState, useRef, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import '../styles/grid-layout.css';
import { WidgetConfig } from '../types';
import { WidgetRenderer } from '../widgets/WidgetRenderer';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';

interface DashboardGridProps {
  widgets: WidgetConfig[];
  onLayoutChange?: (layout: any[]) => void;
  onRemoveWidget?: (widgetId: string) => void;
  editable?: boolean;
}

export const DashboardGrid = memo(function DashboardGrid({
  widgets,
  onLayoutChange,
  onRemoveWidget,
  editable = false,
}: DashboardGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width || 1200);
        setContainerWidth(w);
      }
    });

    ro.observe(containerRef.current);

    return () => ro.disconnect();
  }, []);

  const layout = widgets.map((widget) => ({
    i: widget.id,
    x: widget.position.x,
    y: widget.position.y,
    w: widget.size.w,
    h: widget.size.h,
    minW: widget.size.minW || 2,
    minH: widget.size.minH || 2,
    maxW: widget.size.maxW || 12,
    maxH: widget.size.maxH || 8,
  }));

  return (
    <div ref={containerRef} className="w-full">
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={100}
        width={containerWidth}
        isDraggable={editable}
        isResizable={editable}
        onLayoutChange={onLayoutChange}
        onDragStart={() => setIsDragging(true)}
        onDragStop={() => setIsDragging(false)}
        draggableHandle=".drag-handle"
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="relative h-full">
            {editable && (
              <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="drag-handle h-6 w-6 cursor-move"
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => onRemoveWidget?.(widget.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className={isDragging ? 'pointer-events-none h-full' : 'h-full'}>
              <WidgetRenderer widget={widget} />
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
});
