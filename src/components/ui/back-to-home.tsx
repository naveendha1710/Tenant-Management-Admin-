import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/utils/permissionUtils";
import { getMenusForRole } from "@/utils/roleBasedMenus";

interface BackToHomeProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

const MODULE_ROUTES: Record<string, string> = {
  'Overview': '/admin/dashboard',
  'Buildings': '/admin/buildings',
  'Tenants': '/admin/tenant-management',
  'Companies': '/admin/companies',
  'Rent Collection': '/admin/rent-collection',
  'Invoices': '/admin/invoices',
  'Expenses': '/admin/expenses',
  'Deposits': '/admin/deposits',
  'Financial Reports': '/admin/reports',
  'Maintenance': '/admin/maintenance',
  'Users': '/admin/user-management',
  'Settings': '/admin/settings',
  'Helpdesk': '/admin/helpdesk',
  'Manage Tickets': '/admin/manage-tickets',
  'Technician': '/admin/technician',
  'Assets': '/assets/master',
  'Asset Master': '/assets/master',
  'Accounts': '/admin/accounts'
};

export function BackToHome({ variant = "outline", size = "default", className = "" }: BackToHomeProps) {
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const getFirstAvailableRoute = () => {
    // For Super Admin, always go to overview
    if (role === 'Super Admin') {
      return '/admin/dashboard';
    }

    // For Tenant, check tenant permissions
    if (role === 'Tenant') {
      const menus = getMenusForRole('Tenant', false, user?.appUser?.permissions);
      if (menus.length > 0 && menus[0].items.length > 0) {
        return menus[0].items[0].url;
      }
      return '/tenant/dashboard';
    }

    // For Admin and Custom roles, check permissions
    if (role === 'Admin' || role === 'Custom') {
      // Check if user has Overview permission
      if (hasPermission(user?.appUser, 'Overview', 'view')) {
        return '/admin/dashboard';
      }

      // Get all menus for the user
      const menus = getMenusForRole('Admin', user?.isApprover || user?.appUser?.isApprover, user?.appUser?.permissions);
      
      // Find first available menu item
      for (const group of menus) {
        if (group.items && group.items.length > 0) {
          for (const item of group.items) {
            // Check permission for this item
            if (item.title === 'Buildings' && hasPermission(user?.appUser, 'Buildings', 'view')) {
              return item.url;
            }
            if (item.title === 'Tenants' && hasPermission(user?.appUser, 'Tenants', 'view')) {
              return item.url;
            }
            if (item.title === 'Accounts' && hasPermission(user?.appUser, 'Invoices', 'view')) {
              return item.url;
            }
            if (item.title === 'Helpdesk' && (hasPermission(user?.appUser, 'Helpdesk', 'view') || hasPermission(user?.appUser, 'Manage Tickets', 'view'))) {
              return item.url;
            }
          }
        }
        
        // Check expandable groups
        if (group.expandable && group.items && group.items.length > 0) {
          const firstItem = group.items[0];
          if (firstItem) {
            return firstItem.url;
          }
        }
      }

      // Fallback to first permission module route
      if (user?.appUser?.permissions) {
        const firstModule = user.appUser.permissions.find((p: any) => p.view === true);
        if (firstModule && MODULE_ROUTES[firstModule.module]) {
          return MODULE_ROUTES[firstModule.module];
        }
      }
    }

    // Role-based fallbacks
    switch (role?.toLowerCase()) {
      case 'accountant':
      case 'finance':
        return '/admin/accounts';
      case 'maintenance manager':
      case 'maintenance':
        return '/admin/helpdesk';
      case 'helpdesk':
      case 'technician':
        return '/admin/helpdesk';
      case 'viewer':
        return '/admin/buildings';
      default:
        return '/admin/dashboard';
    }
  };

  const handleBackToHome = () => {
    const route = getFirstAvailableRoute();
    navigate(route);
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleBackToHome}
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <Home className="h-4 w-4" />
      Back to Home
    </Button>
  );
}