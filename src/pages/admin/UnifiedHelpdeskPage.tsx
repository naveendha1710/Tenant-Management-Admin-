import { useAuth } from '@/contexts/AuthContext';
import ManageTicketsPage from './ManageTicketsPage';
import { hasPermission } from '@/utils/permissionUtils';

export default function UnifiedHelpdeskPage() {
  const { role, user } = useAuth();

  if (role === 'Maintenance Manager' || hasPermission(user?.appUser, 'Manage Tickets', 'view')) {
    return <ManageTicketsPage />;
  }

  return (
    <div className="p-6">Helpdesk module has been removed.</div>
  );
}
