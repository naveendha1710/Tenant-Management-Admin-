import { memo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartSkeleton, EmptyState, ErrorState } from './LoadingStates';

interface ChartWidgetProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string;
  isEmpty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  actions?: ReactNode;
}

export const ChartWidget = memo(function ChartWidget({
  title,
  subtitle,
  loading = false,
  error,
  isEmpty = false,
  onRetry,
  children,
  actions,
}: ChartWidgetProps) {
  if (loading) {
    return <ChartSkeleton className="h-full" />;
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ErrorState message={error} onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <EmptyState />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">{children}</CardContent>
    </Card>
  );
});
