import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, BarChart3 } from 'lucide-react';

export function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <Card className={`${className} flex flex-col`}>
      <CardHeader>
        <div className="animate-pulse space-y-2">
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="animate-pulse space-y-3 h-full flex items-center justify-center">
          <div className="h-40 w-full bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function EmptyState({ 
  message = 'No data available',
  description = 'Try adjusting your filters or check back later.'
}: { 
  message?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-gray-100 rounded-full mb-4">
        <BarChart3 className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

export function ErrorState({ 
  message = 'Something went wrong',
  onRetry
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 bg-red-100 rounded-full mb-4">
        <BarChart3 className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-red-600">{message}</h3>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
