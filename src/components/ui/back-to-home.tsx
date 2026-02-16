import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface BackToHomeProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
}

const MODULE_ROUTES: Record<string, string> = {
  'Overview': '/admin/dashboard',
  'Buildings': '/admin/buildings',
  'Tenants': '/admin/tenants',
  'Companies': '/admin/companies',
  'Rent Collection': '/admin/rent-collection',
  'Invoices': '/admin/invoices',
  'Expenses': '/admin/expenses',
  'Deposits': '/admin/deposits',
  'Financial Reports': '/admin/reports',
  'Maintenance': '/admin/maintenance',
  'Users': '/admin/users',
  'Settings': '/admin/settings',
  'Helpdesk': '/admin/helpdesk',
  'Manage Tickets': '/admin/manage-tickets',
  'Technician': '/admin/technician'
};

export function BackToHome({ variant = "outline", size = "default", className = "" }: BackToHomeProps) {
  const navigate = useNavigate();
  const { role, user } = useAuth();

  const handleBackToHome = () => {
    let dashboardPath = '/dashboard';
    
    // For custom users, redirect to first available module
    if (role?.toLowerCase() === 'custom' && user?.appUser?.permissions) {
      const firstModule = user.appUser.permissions.find((p: any) => p.view === true);
      if (firstModule && MODULE_ROUTES[firstModule.module]) {
        dashboardPath = MODULE_ROUTES[firstModule.module];
        navigate(dashboardPath);
        return;
      }
    }
    
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'super admin':
        dashboardPath = '/admin/dashboard';
        break;
      case 'finance':
      case 'accountant':
        dashboardPath = '/admin/dashboard';
        break;
      case 'crm':
        dashboardPath = '/crm/dashboard';
        break;
      case 'tenant':
        dashboardPath = '/tenant/dashboard';
        break;
      case 'maintenance':
      case 'maintenance manager':
        dashboardPath = '/maintenance/dashboard';
        break;
      case 'helpdesk':
      case 'technician':
        dashboardPath = '/admin/helpdesk';
        break;
      case 'viewer':
        dashboardPath = '/admin/dashboard';
        break;
    }
    
    navigate(dashboardPath);
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