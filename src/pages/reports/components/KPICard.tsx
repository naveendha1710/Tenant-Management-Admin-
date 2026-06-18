import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { KPIData } from '../types';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/chartUtils';
import { cn } from '@/lib/utils';

interface KPICardProps {
  data: KPIData;
  loading?: boolean;
  onClick?: () => void;
}

export const KPICard = memo(function KPICard({
  data,
  loading = false,
  onClick,
}: KPICardProps) {
  const formatValue = (value: number | string, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
      default:
        return formatNumber(value);
    }
  };

  const getTrendIcon = () => {
    if (!data.change) return null;
    
    switch (data.changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeColor = () => {
    switch (data.changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
        <CardContent className="p-6 flex-1">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'h-full flex flex-col hover:shadow-lg transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-105'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6 flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {data.label}
            </p>
            <h3 className="text-3xl font-bold tracking-tight mb-2">
              {formatValue(data.value, data.format)}
            </h3>
            {data.change !== undefined && (
              <div className="flex items-center gap-1">
                {getTrendIcon()}
                <span className={cn('text-sm font-medium', getChangeColor())}>
                  {data.change.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  vs last period
                </span>
              </div>
            )}
          </div>
          {data.icon && (
            <div
              className={cn(
                'p-3 rounded-lg',
                data.color || 'bg-blue-100'
              )}
            >
              <div className="h-6 w-6" style={{ color: data.color || '#3b82f6' }}>
                {/* Icon placeholder - can be enhanced with lucide-react icons */}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
