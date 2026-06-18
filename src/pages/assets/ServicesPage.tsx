import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ServicesTab from '@/components/assets/ServicesTab';

export default function ServicesPage() {
  return (
    <DashboardLayout title="Asset Services" subtitle="Manage asset service records and maintenance history">
      <ServicesTab />
    </DashboardLayout>
  );
}
