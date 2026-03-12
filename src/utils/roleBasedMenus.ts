import { 
  Building2, 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  BarChart3, 
  Settings, 
  Bell,
  Wrench,
  UserCheck,
  MapPin,
  TrendingUp,
  Activity,
  CreditCard,
  Home,
  User,
  MessageSquare,
  Eye,
  Shield,
  CheckCircle,
  Mail,
  FolderOpen,
  Headphones,
  Package,
  ClipboardCheck,
  Scan,
  Cog,
  List
} from "lucide-react";

export type UserRole = 'Super Admin' | 'Admin' | 'Accountant' | 'Maintenance Manager' | 'Viewer' | 'Custom' | 'Helpdesk' | 'Technician' | 'Tenant';

export interface MenuItem {
  title: string;
  url: string;
  icon: any;
  expandable?: boolean;
  subItems?: MenuItem[];
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
  expandable?: boolean;
  subItems?: MenuItem[];
}

const roleBasedMenus: Record<UserRole, MenuGroup[]> = {
  'Super Admin': [
    {
      title: "Dashboard",
      items: [
        { title: "Overview", url: "/admin/dashboard", icon: Home },
      ]
    },
    {
      title: "Companies",
      expandable: true,
      items: [],
      subItems: []
    },
    {
      title: "",
      items: [
        { title: "Tenants", url: "/admin/tenant-management", icon: Users },
        { title: "Buildings", url: "/admin/buildings", icon: Building2 },
        { title: "Accounts", url: "/admin/accounts", icon: DollarSign },
        { title: "Helpdesk", url: "/admin/helpdesk", icon: Headphones },
      ]
    },
    {
      title: "Asset Management",
      expandable: true,
      items: [
        { title: "Asset Master", url: "/assets/master", icon: Package },
        { title: "Asset Movement", url: "/assets/movement", icon: TrendingUp },
        { title: "Inventory", url: "/assets/inventory", icon: Package },
        { title: "Preventive Maintenance", url: "/assets/preventive-maintenance", icon: ClipboardCheck },
        { title: "Physical Audit", url: "/assets/physical-audit", icon: Scan },
        { title: "Configuration", url: "/assets/configuration", icon: Cog },
      ]
    },
    {
      title: "Master Settings",
      expandable: true,
      items: [],
      subItems: [
        { title: "Settings", url: "/admin/settings", icon: Settings },
        { title: "User Management", url: "/admin/user-management", icon: Shield },
        { 
          title: "Asset Form", 
          url: "/admin/master-settings", 
          icon: List,
          expandable: true,
          subItems: [
            { title: "Asset Types", url: "/admin/master-settings?tab=asset", icon: List },
            { title: "Categories", url: "/admin/master-settings?tab=asset&section=subcategories", icon: List },
            { title: "Sub-Categories", url: "/admin/master-settings?tab=asset&section=sub_subcategories", icon: List },
            { title: "Manufacturers", url: "/admin/master-settings?tab=asset&section=manufacturers", icon: List },
            { title: "Asset Status", url: "/admin/master-settings?tab=asset&section=asset_status", icon: List },
            { title: "SEZ Status", url: "/admin/master-settings?tab=asset&section=sez_status", icon: List },
            { title: "Customs Category", url: "/admin/master-settings?tab=asset&section=customs_category", icon: List },
          ]
        },
        { 
          title: "Tenant Form", 
          url: "/admin/master-settings?tab=tenant", 
          icon: Users,
          expandable: true,
          subItems: [
            { title: "General Charges", url: "/admin/master-settings?tab=tenant", icon: Users },
            { title: "Service Charges", url: "/admin/master-settings?tab=tenant&section=service_charges", icon: Users },
          ]
        },
        { 
          title: "Building Form", 
          url: "/admin/master-settings?tab=building", 
          icon: Building2,
          expandable: true,
          subItems: [
            { title: "Building Types", url: "/admin/master-settings?tab=building", icon: Building2 },
            { title: "Amenities", url: "/admin/master-settings?tab=building&section=amenities", icon: Building2 },
            { title: "Room Categories", url: "/admin/master-settings?tab=building&section=room_categories", icon: Building2 },
          ]
        },
      ]
    }
  ],
  'Admin': [
    {
      title: "Dashboard",
      items: [
        { title: "Overview", url: "/admin/dashboard", icon: Home },
      ]
    },
    {
      title: "Companies",
      expandable: true,
      items: [],
      subItems: []
    },
    {
      title: "",
      items: [
        { title: "Tenants", url: "/admin/tenant-management", icon: Users },
        { title: "Buildings", url: "/admin/buildings", icon: Building2 },
        { title: "Accounts", url: "/admin/accounts", icon: DollarSign },
        { title: "Helpdesk", url: "/admin/helpdesk", icon: Headphones },
      ]
    },
    {
      title: "Asset Management",
      expandable: true,
      items: [
        { title: "Asset Master", url: "/assets/master", icon: Package },
        { title: "Asset Movement", url: "/assets/movement", icon: TrendingUp },
        { title: "Inventory", url: "/assets/inventory", icon: Package },
        { title: "Preventive Maintenance", url: "/assets/preventive-maintenance", icon: ClipboardCheck },
        { title: "Physical Audit", url: "/assets/physical-audit", icon: Scan },
        { title: "Configuration", url: "/assets/configuration", icon: Cog },
      ]
    },
    {
      title: "Master Settings",
      expandable: true,
      items: [],
      subItems: [
        { title: "Settings", url: "/admin/settings", icon: Settings },
        { title: "User Management", url: "/admin/user-management", icon: Shield },
        { 
          title: "Asset Form", 
          url: "/admin/master-settings", 
          icon: List,
          expandable: true,
          subItems: [
            { title: "Asset Types", url: "/admin/master-settings?tab=asset", icon: List },
            { title: "Categories", url: "/admin/master-settings?tab=asset&section=subcategories", icon: List },
            { title: "Sub-Categories", url: "/admin/master-settings?tab=asset&section=sub_subcategories", icon: List },
            { title: "Manufacturers", url: "/admin/master-settings?tab=asset&section=manufacturers", icon: List },
            { title: "Asset Status", url: "/admin/master-settings?tab=asset&section=asset_status", icon: List },
            { title: "SEZ Status", url: "/admin/master-settings?tab=asset&section=sez_status", icon: List },
            { title: "Customs Category", url: "/admin/master-settings?tab=asset&section=customs_category", icon: List },
          ]
        },
        { 
          title: "Tenant Form", 
          url: "/admin/master-settings?tab=tenant", 
          icon: Users,
          expandable: true,
          subItems: [
            { title: "General Charges", url: "/admin/master-settings?tab=tenant", icon: Users },
            { title: "Service Charges", url: "/admin/master-settings?tab=tenant&section=service_charges", icon: Users },
          ]
        },
        { 
          title: "Building Form", 
          url: "/admin/master-settings?tab=building", 
          icon: Building2,
          expandable: true,
          subItems: [
            { title: "Building Types", url: "/admin/master-settings?tab=building", icon: Building2 },
            { title: "Amenities", url: "/admin/master-settings?tab=building&section=amenities", icon: Building2 },
            { title: "Room Categories", url: "/admin/master-settings?tab=building&section=room_categories", icon: Building2 },
          ]
        },
      ]
    }
  ],
  'Accountant': [
    {
      title: "Dashboard",
      items: [
        { title: "Overview", url: "/admin/dashboard", icon: Home },
        { title: "Accounts", url: "/admin/accounts", icon: DollarSign },
      ]
    },
    {
      title: "Companies",
      expandable: true,
      items: [],
      subItems: []
    }
  ],
  'Maintenance Manager': [
    {
      title: "Dashboard",
      items: [
        { title: "Helpdesk", url: "/admin/helpdesk", icon: Headphones },
      ]
    }
  ],
  'Viewer': [
    {
      title: "Dashboard",
      items: [
        { title: "Buildings", url: "/admin/buildings", icon: Building2 },
        { title: "Tenants", url: "/admin/tenant-management", icon: Users },
      ]
    },
    {
      title: "Companies",
      expandable: true,
      items: [],
      subItems: []
    }
  ],
  'Custom': [
    {
      title: "Dashboard",
      items: []
    }
  ],
  'Tenant': [
    {
      title: "Tenant Portal",
      items: [
        { title: "Dashboard", url: "/tenant/dashboard", icon: Home },
        { title: "My Lease", url: "/tenant/lease", icon: FileText },
        { title: "Invoices & Payments", url: "/tenant/invoices", icon: CreditCard },
        { title: "Documents", url: "/tenant/documents", icon: FolderOpen },
        { title: "Maintenance", url: "/tenant/maintenance-requests", icon: Wrench },
        { title: "My Assets", url: "/tenant/my-assets", icon: Package },
      ]
    }
  ],
  'Helpdesk': [
    {
      title: "Dashboard",
      items: [
        { title: "Helpdesk", url: "/admin/helpdesk", icon: Headphones },
      ]
    }
  ],
  'Technician': [
    {
      title: "Dashboard",
      items: [
        { title: "Helpdesk", url: "/admin/helpdesk", icon: Headphones },
      ]
    }
  ]
};

export function getMenusForRole(role: UserRole | null, isApprover?: boolean, userPermissions?: any[]): MenuGroup[] {
  if (!role) return [];
  
  // Get menus for the role, return empty array if role not found
  let menus = roleBasedMenus[role] ? [...roleBasedMenus[role]] : [];
  
  // Filter tenant menus based on permissions
  if (role === 'Tenant' && userPermissions && userPermissions.length > 0) {
    menus = menus.map(group => ({
      ...group,
      items: group.items.filter(item => {
        const perm = userPermissions.find(p => 
          (item.title === 'Dashboard' && p.module === 'Dashboard') ||
          (item.title === 'My Lease' && p.module === 'My Lease') ||
          (item.title === 'Invoices & Payments' && p.module === 'Invoices') ||
          (item.title === 'Documents' && p.module === 'Documents') ||
          (item.title === 'Maintenance' && p.module === 'Maintenance') ||
          (item.title === 'My Assets' && p.module === 'My Assets')
        );
        return perm ? perm.view : true;
      })
    }));
  }
  
  return menus;
}

export function isRouteAllowedForRole(route: string, role: UserRole | null): boolean {
  if (!role) return false;
  
  // Always allow dashboard access for authenticated users
  if (route === '/dashboard' || route === '/') return true;
  
  // Check if route starts with role-specific prefix
  const rolePrefix = `/${role.replace('_', '-')}/`;
  if (route.startsWith(rolePrefix)) return true;
  
  const menus = getMenusForRole(role);
  return menus.some(group => 
    group.items.some(item => {
      // Exact match
      if (item.url === route) return true;
      // Sub-route match (ensure it's a proper sub-path)
      if (route.startsWith(item.url + '/')) return true;
      return false;
    })
  );
}