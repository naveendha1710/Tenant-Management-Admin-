import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FloorPlansManager } from "@/components/admin/FloorPlansManager";

export default function SpaceAllocation() {
  return (
    <DashboardLayout 
      title="Floor Plans Management" 
      subtitle="Manage building layouts, floors, and units hierarchy"
    >
      <FloorPlansManager />
    </DashboardLayout>
  );
}