import { memo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard } from 'lucide-react';

export type DashboardTab = 'executive';

interface DashboardNavigationProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

export const DashboardNavigation = memo(function DashboardNavigation({
  activeTab,
    onTabChange,
}: DashboardNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as DashboardTab)}>
      <TabsList className="grid w-full grid-cols-1">
        <TabsTrigger value="executive" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Executive</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
});
