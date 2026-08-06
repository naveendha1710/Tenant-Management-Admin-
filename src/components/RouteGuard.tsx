import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/admin/dashboard': 'Overview',
  '/admin/overview': 'Overview',
  '/admin/buildings': 'Buildings',
  '/admin/tenants': 'Tenants',
  '/admin/company-group': 'Companies',
  '/admin/accounts': 'Companies',
  '/admin/tenant-management': 'Tenants',
  '/admin/invoices': 'Invoices',
  '/admin/expenses': 'Expenses',
  '/admin/deposits': 'Deposits',
  '/admin/reports': 'Financial Reports',
  '/admin/maintenance': 'Maintenance',
  '/admin/manage-tickets': 'Manage Tickets',
  '/admin/user-management': 'Users',
  '/admin/settings': 'Settings',
  '/admin/helpdesk': 'Manage Tickets',
  '/admin/technician': 'Technician',
  '/reports/assets': 'Asset Reports',
  '/reports/movement': 'Asset Movement Reports',
  '/reports/helpdesk': 'Helpdesk Reports',
  '/reports/tenant': 'Tenant Reports'
};

export const RouteGuard = ({ children, role }: { children: JSX.Element; role: string }) => {
  const { user, role: userRole, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (role !== userRole) return <Navigate to="/not-authorized" replace />;

  return children;
};

export const PermissionGuard = ({ children, path }: { children: JSX.Element; path: string }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (role?.toLowerCase() === 'super admin') {
    return children;
  }

  const moduleName = ROUTE_MODULE_MAP[path];
  
  if (!moduleName) {
    return children;
  }

  const hasSpecific = user?.appUser?.permissions?.some((p: any) => p.module === moduleName);
  const hasPermission = hasSpecific
    ? user?.appUser?.permissions?.some((p: any) => p.module === moduleName && p.view === true)
    : user?.appUser?.permissions?.some((p: any) => (p.module === 'Reports' || p.module === moduleName) && p.view === true);

  if (!hasPermission) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
};
