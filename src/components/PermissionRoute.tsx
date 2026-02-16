import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

interface PermissionRouteProps {
  children: React.ReactNode;
  module: string;
  allowedRoles?: string[];
}

export const PermissionRoute: React.FC<PermissionRouteProps> = ({ 
  children, 
  module,
  allowedRoles 
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check role if specified
  if (allowedRoles && role && !allowedRoles.includes(normalizeRole(role))) {
    return <Navigate to="/not-authorized" replace />;
  }

  // Check module permission
  if (!hasPermission(user, module, 'view')) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <>{children}</>;
};

function normalizeRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'super admin':
    case 'accountant':
    case 'viewer':
    case 'custom':
    case 'helpdesk':
    case 'technician':
      return 'admin';
    case 'maintenance manager':
      return 'maintenance';
    default:
      return role.toLowerCase();
  }
}
