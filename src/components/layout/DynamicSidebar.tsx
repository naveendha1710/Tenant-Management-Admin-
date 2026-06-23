import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getAccessibleModules } from '@/utils/permissionUtils';
import type { AppUser } from '@/data/userData';
import {
  Users,
  FileText,
  DollarSign,
  PiggyBank,
  Receipt,
  Wrench,
  BarChart3,
  Settings,
  UserCog
} from 'lucide-react';

interface DynamicSidebarProps {
  user: AppUser;
}

const moduleIcons = {
  'Tenants': Users,
  'Companies': Users,
  'Invoices': FileText,
  'Rent Collection': DollarSign,
  'Deposits': PiggyBank,
  'Expenses': Receipt,
  'Reports': BarChart3,
  'Settings': Settings,
  'Users': UserCog,
  'Helpdesk': Wrench
};

const moduleRoutes = {
  'Tenants': '/admin/tenants',
  'Companies': '/admin/company-group',
  'Invoices': '/admin/invoices',
  'Rent Collection': '/admin/rent-collection',
  'Deposits': '/admin/deposits',
  'Expenses': '/admin/expenses',
  'Reports': '/reports/assets',
  'Settings': '/admin/settings',
  'Users': '/admin/user-management',
  'Helpdesk': '/admin/helpdesk'
};

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({ user }) => {
  const location = useLocation();
  const accessibleModules = getAccessibleModules(user);

  return (
    <nav className="space-y-2">
      {accessibleModules.map((module) => {
        const Icon = moduleIcons[module as keyof typeof moduleIcons];
        const route = moduleRoutes[module as keyof typeof moduleRoutes];
        const isActive = location.pathname === route;

        return (
          <Link
            key={module}
            to={route}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
              isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {module}
          </Link>
        );
      })}
    </nav>
  );
};
