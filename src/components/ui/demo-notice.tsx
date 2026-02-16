import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function DemoNotice() {
  return (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Demo Mode:</strong> This application is running in demonstration mode with sample data. 
        No real data is saved or processed.
      </AlertDescription>
    </Alert>
  );
}