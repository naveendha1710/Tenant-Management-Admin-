import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SpaceManagement } from '@/components/admin/SpaceManagement';

export default function AdminSpacesPage() {
  return (
    <DashboardLayout title="Space Management" subtitle="Manage office spaces, cabins, and meeting rooms">
      <SpaceManagement />
    </DashboardLayout>
  );
}