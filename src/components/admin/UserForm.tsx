import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { type AppUser, type UserRole, type UserType, type Permission, userService } from '@/data/userData';
import { X, User, Shield, Lock, Trash2, KeyRound, AlertTriangle, ShieldCheck, Eye, EyeOff, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  onSave: (userData: Omit<AppUser, 'id' | 'createdAt' | 'permissions'> & { password?: string }) => void;
  onDelete?: (userId: string) => void;
  onResetPassword?: (userId: string) => void;
  onToggleApprover?: (userId: string, isApprover: boolean) => void;
  isOtherUserForm?: boolean;
  isTenantUserForm?: boolean;
}

export const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, user, onSave, onDelete, onResetPassword, onToggleApprover, isOtherUserForm = false, isTenantUserForm = false }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'access' | 'branches' | 'sidebar' | 'permissions' | 'otherAccess' | 'security'>(isOtherUserForm ? 'access' : 'profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    department: '',
    role: 'Viewer' as UserRole,
    selectedRoles: [] as UserRole[],
    userType: 'custom' as UserType,
    isActive: true,
    twoFactorEnabled: false,
    isApprover: false,
    assetMovementApprover: false,
    assetIncharge: false,
    assetAuditor: false,
    canManageWorkflows: false,
    canApproveTickets: true,
    technicianCategory: '',
    notificationsEnabled: true,
    receiveTicketNotifications: true,
    userManagementAccess: {
      users: true,
      tenantUsers: true,
      otherUsers: true
    },
    tenantSidebarPermissions: {
      profile: true,
      dashboard: true,
      myLease: true,
      invoices: true,
      documents: true,
      maintenance: true,
      myAssets: true,
      assetMovement: true,
      services: true,
      vendors: true
    },
    branchAccess: [] as string[],
    tenantId: '' as string
  });
  const [initialData, setInitialData] = useState(formData);
  const [hasChanges, setHasChanges] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [useRoleDefaults, setUseRoleDefaults] = useState(true);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [userType, setUserType] = useState<'Main User' | 'Sub User'>('Sub User');

  const roles: UserRole[] = ['Super Admin', 'Admin', 'Accountant', 'Maintenance Manager', 'Technician', 'Viewer', 'Manage Tickets', 'Vendor', 'Asset Manager'];

  const mergeRolePermissions = (roles: UserRole[]): Permission[] => {
    const permMap = new Map<string, Permission>();
    
    roles.forEach(role => {
      const rolePerms = userService.getDefaultPermissions(role);
      rolePerms.forEach(perm => {
        const existing = permMap.get(perm.module);
        if (!existing) {
          permMap.set(perm.module, { ...perm });
        } else {
          permMap.set(perm.module, {
            module: perm.module,
            view: existing.view || perm.view,
            add: existing.add || perm.add,
            edit: existing.edit || perm.edit,
            delete: existing.delete || perm.delete
          });
        }
      });
    });
    
    return Array.from(permMap.values());
  };

  const handleRoleToggle = (role: UserRole) => {
    let newRoles: UserRole[];

    if (formData.selectedRoles.includes(role)) {
      newRoles = formData.selectedRoles.filter(r => r !== role);
    } else {
      // Helpdesk role is not available via this UI; simply toggle the selected role
      newRoles = [...formData.selectedRoles, role];
    }

    setFormData({ ...formData, selectedRoles: newRoles });

    // Merge permissions from all selected roles
    const mergedPerms = mergeRolePermissions(newRoles);
    setPermissions(mergedPerms);
    setHasChanges(true);
  };

  useEffect(() => {
    // Load tenants first for tenant users
    if (isTenantUserForm || user?.role === 'Tenant') {
      loadAllTenants();
    }
    
    if (user?.role === 'Tenant') {
      loadTenants();
    }
  }, [isOpen, isTenantUserForm, user?.role]);

  useEffect(() => {
    if (user) {
      const data = {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
        department: user.department || '',
        role: user.role,
        selectedRoles: user.selectedRoles && user.selectedRoles.length > 0 ? user.selectedRoles : [user.role],
        userType: 'custom' as UserType,
        isActive: user.isActive,
        twoFactorEnabled: user.twoFactorEnabled,
        isApprover: user.isApprover || false,
        assetMovementApprover: (user as any).assetMovementApprover || false,
        assetIncharge: (user as any).assetIncharge || false,
        assetAuditor: (user as any).assetAuditor || false,
        canManageWorkflows: (user as any).canManageWorkflows || false,
        canApproveTickets: (user as any).canApproveTickets !== undefined ? (user as any).canApproveTickets : true,
        technicianCategory: user.technicianCategory || '',
        notificationsEnabled: (user as any).notificationsEnabled !== undefined ? (user as any).notificationsEnabled : true,
        receiveTicketNotifications: (user as any).receiveTicketNotifications !== undefined ? (user as any).receiveTicketNotifications : true,
        userManagementAccess: (user as any).userManagementAccess || {
          users: true,
          tenantUsers: true,
          otherUsers: true
        },
        tenantSidebarPermissions: user.role === 'Tenant' && user.permissions?.length > 0 ? {
          profile: user.permissions.some((p: any) => p.module === 'Profile' && p.view),
          dashboard: user.permissions.some((p: any) => p.module === 'Dashboard' && p.view),
          myLease: user.permissions.some((p: any) => p.module === 'My Lease' && p.view),
          invoices: user.permissions.some((p: any) => p.module === 'Invoices' && p.view),
          documents: user.permissions.some((p: any) => p.module === 'Documents' && p.view),
          maintenance: user.permissions.some((p: any) => p.module === 'Maintenance' && p.view),
          myAssets: user.permissions.some((p: any) => p.module === 'My Assets' && p.view),
          assetMovement: user.permissions.some((p: any) => p.module === 'Asset Movement' && p.view),
          services: user.permissions.some((p: any) => p.module === 'Services' && p.view),
          vendors: user.permissions.some((p: any) => p.module === 'Vendors' && p.view)
        } : {
          profile: true,
          dashboard: true,
          myLease: true,
          invoices: true,
          documents: true,
          maintenance: true,
          myAssets: true,
          assetMovement: true,
          services: true,
          vendors: true
        },
        branchAccess: user.branchAccess || [],
        tenantId: user.tenantId || ''
      };
      setFormData(data);
      setInitialData(data);
      setPermissions([...user.permissions]);
    } else {
      const data = {
        name: '',
        email: '',
        phone: '',
        password: '',
        department: '',
        role: 'Viewer' as UserRole,
        selectedRoles: [] as UserRole[],
        userType: 'custom' as UserType,
        isActive: true,
        twoFactorEnabled: false,
        isApprover: false,
        assetMovementApprover: false,
        assetIncharge: false,
        assetAuditor: false,
        canApproveTickets: true,
        technicianCategory: '',
        notificationsEnabled: true,
        receiveTicketNotifications: true,
        userManagementAccess: {
          users: true,
          tenantUsers: true
        },
        tenantSidebarPermissions: {
          profile: true,
          dashboard: true,
          myLease: true,
          invoices: true,
          documents: true,
          maintenance: true,
          myAssets: true,
          services: true,
          vendors: true
        },
        branchAccess: [],
        tenantId: ''
      };
      setFormData(data);
      setInitialData(data);
      setPermissions([]);
    }
    setHasChanges(false);
    setActiveTab(isOtherUserForm ? 'access' : 'profile');
    
    // Load branches after tenants are loaded and tenantId is set
    if ((isTenantUserForm || user?.role === 'Tenant') && formData.tenantId && allTenants.length > 0) {
      loadTenantBranches();
    }
  }, [user, isOpen, isOtherUserForm, isTenantUserForm, allTenants.length]);

  const loadTenantBranches = async () => {
    const { supabase } = await import('@/lib/supabaseClient');
    
    if (!formData.tenantId) return;
    
    try {
      // Get the selected tenant
      const { data: selectedTenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', formData.tenantId)
        .maybeSingle();
      
      if (tenantError) {
        console.error('Error loading selected tenant:', tenantError);
        return;
      }
      
      if (!selectedTenant) return;
      
      // Get parent tenant ID (if this is a branch, get parent; if main, use own ID)
      const parentId = selectedTenant.parent_tenant_id || selectedTenant.id;
      
      // Get all tenants in this group (parent + branches)
      const { data: groupTenants, error: groupError } = await supabase
        .from('tenants')
        .select('*')
        .or(`id.eq.${parentId},parent_tenant_id.eq.${parentId}`);
      
      if (groupError) {
        console.error('Error loading group tenants:', groupError);
        return;
      }
      
      if (groupTenants) {
        // Filter out the main tenant itself
        const branches = groupTenants.filter(t => t.id !== formData.tenantId);
        setTenants(branches);
      }
    } catch (error) {
      console.error('Error in loadTenantBranches:', error);
    }
  };

  const loadAllTenants = async () => {
    const { supabase } = await import('@/lib/supabaseClient');
    const { data } = await supabase.from('tenants').select('*').order('company');
    if (data) {
      setAllTenants(data);
      if (user) {
        const isMainUser = data.some(t => t.email === user.email);
        setUserType(isMainUser ? 'Main User' : 'Sub User');
      }
    }
  };

  const loadTenants = async () => {
    const { tenantDataService } = await import('@/data/tenantData');
    const { supabase } = await import('@/lib/supabaseClient');
    
    if (!user) return;
    
    try {
      // Find the tenant record for this user using tenantId if available
      let userTenant;
      
      if (user.tenantId) {
        // If user has tenantId, use it directly
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', user.tenantId)
          .maybeSingle();
        
        if (error) {
          console.error('Error loading tenant by ID:', error);
          return;
        }
        userTenant = data;
      } else {
        // Fallback to email lookup for main tenant users
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (error) {
          console.error('Error loading tenant by email:', error);
          return;
        }
        userTenant = data;
      }
      
      if (!userTenant) return;
      
      // Get parent tenant ID (if this is a branch, get parent; if main, use own ID)
      const parentId = userTenant.parent_tenant_id || userTenant.id;
      
      // Get all tenants in this group (parent + branches)
      const { data: groupTenants, error: groupError } = await supabase
        .from('tenants')
        .select('*')
        .or(`id.eq.${parentId},parent_tenant_id.eq.${parentId}`);
      
      if (groupError) {
        console.error('Error loading group tenants:', groupError);
        return;
      }
      
      if (groupTenants) {
        // Filter out the user's own tenant to show only other branches
        const branches = groupTenants.filter(t => t.id !== userTenant.id);
        const all = await tenantDataService.getAllTenants();
        const filtered = branches.map(t => all.find(at => at.id === t.id)).filter(Boolean);
        setTenants(filtered as any[]);
      } else {
        setTenants([]);
      }
    } catch (error) {
      console.error('Error in loadTenants:', error);
      setTenants([]);
    }
  };

  useEffect(() => {
    if (!user) {
      setHasChanges(true);
      return;
    }
    const changed = Object.keys(formData).some(key => {
      if (key === 'password') return formData.password !== '';
      return formData[key as keyof typeof formData] !== initialData[key as keyof typeof initialData];
    });
    setHasChanges(changed);
  }, [formData, initialData, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isTenantUserForm && !formData.tenantId) {
      alert('Please select a tenant');
      return;
    }
    
    let finalPermissions = displayPermissions;
    if (isTenantUserForm || user?.role === 'Tenant') {
      finalPermissions = [
        { module: 'Profile', view: formData.tenantSidebarPermissions.profile, add: false, edit: false, delete: false },
        { module: 'Dashboard', view: formData.tenantSidebarPermissions.dashboard, add: false, edit: false, delete: false },
        { module: 'My Lease', view: formData.tenantSidebarPermissions.myLease, add: false, edit: false, delete: false },
        { module: 'Invoices', view: formData.tenantSidebarPermissions.invoices, add: false, edit: false, delete: false },
        { module: 'Documents', view: formData.tenantSidebarPermissions.documents, add: false, edit: false, delete: false },
        { module: 'Maintenance', view: formData.tenantSidebarPermissions.maintenance, add: false, edit: false, delete: false },
        { module: 'My Assets', view: formData.tenantSidebarPermissions.myAssets, add: false, edit: false, delete: false },
        { module: 'Asset Movement', view: formData.tenantSidebarPermissions.assetMovement, add: false, edit: false, delete: false },
        { module: 'Services', view: formData.tenantSidebarPermissions.services, add: false, edit: false, delete: false },
        { module: 'Vendors', view: formData.tenantSidebarPermissions.vendors, add: false, edit: false, delete: false }
      ];
    }
    
    const finalSelectedRoles = (isTenantUserForm || user?.role === 'Tenant') ? ['Tenant'] : formData.selectedRoles;
    const finalRole = (isTenantUserForm || user?.role === 'Tenant') ? 'Tenant' : (formData.selectedRoles.length > 0 ? formData.selectedRoles[0] : 'Viewer');
    
    const userData: any = { 
      ...formData, 
      userType: 'custom', 
      permissions: finalPermissions, 
      role: finalRole,
      selectedRoles: finalSelectedRoles,
      tenantId: (isTenantUserForm || user?.role === 'Tenant') ? formData.tenantId : undefined
    };
    
    if (!userData.password || userData.password.trim() === '') {
      delete userData.password;
    }
    
    onSave(userData);
  };

  const handlePermissionChange = (module: string, field: keyof Permission, value: boolean) => {
    const newPermissions = [...permissions];
    const existingIndex = newPermissions.findIndex(p => p.module === module);
    
    if (existingIndex >= 0) {
      (newPermissions[existingIndex] as any)[field] = value;
      if (field === 'view' && !value) {
        newPermissions[existingIndex].add = false;
        newPermissions[existingIndex].edit = false;
        newPermissions[existingIndex].delete = false;
      }
    } else {
      const newPermission: Permission = { module, view: false, add: false, edit: false, delete: false };
      (newPermission as any)[field] = value;
      newPermissions.push(newPermission);
    }
    
    setPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleUseDefaults = (useDefaults: boolean) => {
    setUseRoleDefaults(useDefaults);
    if (useDefaults && user) {
      setPermissions(userService.getDefaultPermissions(user.role));
      setHasChanges(true);
    }
  };

  const moduleGroups = {
    'Dashboard': ['Overview'],
    'Buildings': ['Buildings'],
    'Tenants': ['Tenants'],
    'Companies': ['Companies'],
    'Accounts': ['Rent Collection', 'Invoices', 'Expenses', 'Deposits', 'Financial Reports'],
    'Maintenance': ['Manage Tickets'],
    'Assets': ['Assets', 'Asset Master', 'Asset Movement', 'Inventory', 'Preventive Maintenance', 'Physical Audit', 'Configuration'],
    'Reports': ['Asset Reports', 'Asset Movement Reports', 'Helpdesk Reports', 'Tenant Reports'],
    'User Management': ['Users'],
    'Master Settings': ['Settings', 'Asset Form', 'Tenant Form', 'Building Form', 'Services', 'Vendors'],
    // 'Roles' group omitted — Helpdesk access handled separately outside this UI
    'Workflows': ['Workflow Manager']
  };

  // Get all modules from moduleGroups
  const allModules = Object.values(moduleGroups).flat();

  // Create permission objects for all modules
  const displayPermissions = allModules.map(module => {
    const existing = permissions.find(p => p.module === module);
    return existing || { module, view: false, add: false, edit: false, delete: false };
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    ...(user?.role === 'Tenant' || isTenantUserForm ? [
      { id: 'branches' as const, label: 'Branches', icon: Building2 },
      { id: 'sidebar' as const, label: 'Sidebar', icon: Shield }
    ] : [
      { id: 'access' as const, label: 'Access', icon: Shield },
      ...(user?.role !== 'Tenant' && !user?.selectedRoles?.includes('Technician') && !user?.selectedRoles?.includes('Vendor') && !isOtherUserForm ? [{ id: 'permissions' as const, label: 'Permissions', icon: ShieldCheck }] : [])
    ]),
    { id: 'otherAccess' as const, label: 'Other Access', icon: KeyRound },
    { id: 'security' as const, label: 'Security', icon: Lock }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="bg-black/50 z-[100]" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }} />
      
      {/* Side Sheet */}
      <div className="w-[480px] bg-background shadow-2xl z-[101] flex flex-col" style={{ position: 'fixed', top: 0, right: 0, height: '100vh' }}>
        {/* Header */}
        <div className="border-b">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {user ? getInitials(formData.name) : <User className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold">{user ? formData.name : 'New User'}</h2>
                  {user?.role === 'Tenant' && (
                    <Badge variant={userType === 'Main User' ? 'default' : 'outline'} className="text-xs">
                      {userType}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{user ? formData.email : 'Create system user'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex px-6 border-t">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Tab 1: Profile */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                {(isTenantUserForm || user?.role === 'Tenant') && (
                  <div>
                    <Label htmlFor="tenantId" className="text-sm font-medium">Select Tenant</Label>
                    <Select 
                      value={formData.tenantId} 
                      onValueChange={(value) => {
                        setFormData({ ...formData, tenantId: value });
                        // Load branches when tenant is selected
                        setTimeout(() => loadTenantBranches(), 100);
                      }}
                      required={isTenantUserForm}
                    >
                      <SelectTrigger id="tenantId" className="mt-1.5">
                        <SelectValue placeholder="Choose tenant" />
                      </SelectTrigger>
                      <SelectContent className="z-[103]">
                        {allTenants.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading tenants...</div>
                        ) : (
                          allTenants.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.company} - {t.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">This user will belong to the selected tenant</p>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5 focus:ring-2"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1.5 focus:ring-2"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="mt-1.5 focus:ring-2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="department" className="text-sm font-medium">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Finance, IT, Maintenance"
                    className="mt-1.5 focus:ring-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Optional organizational unit</p>
                </div>
                
                {formData.selectedRoles.includes('Technician') && (
                  <div>
                    <Label htmlFor="technicianCategory" className="text-sm font-medium">Technician Category</Label>
                    <Select value={formData.technicianCategory} onValueChange={(value) => setFormData({ ...formData, technicianCategory: value })}>
                      <SelectTrigger id="technicianCategory" className="mt-1.5">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="z-[103]">
                        <SelectItem value="Plumber">Plumber</SelectItem>
                        <SelectItem value="Electrician">Electrician</SelectItem>
                        <SelectItem value="HVAC Technician">HVAC Technician</SelectItem>
                        <SelectItem value="Carpenter">Carpenter</SelectItem>
                        <SelectItem value="Painter">Painter</SelectItem>
                        <SelectItem value="General Maintenance">General Maintenance</SelectItem>
                        <SelectItem value="IT Support">IT Support</SelectItem>
                        <SelectItem value="Cleaner">Cleaner</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1.5">Required for technician assignment</p>
                  </div>
                )}
                
                {/* Note: Account Status, Notifications & Access Toggles moved to 'Other Access' tab */}
              </div>
            )}

            {/* Tab 2: Branches (Tenant only) */}
            {activeTab === 'branches' && (user?.role === 'Tenant' || isTenantUserForm) && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Branch Access:</strong> Select which tenant branches this user can access. Empty = access to all branches.
                  </p>
                </div>
                
                <div className="space-y-2 border rounded-lg p-3 max-h-96 overflow-y-auto">
                  {tenants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No branches available</p>
                  ) : (
                    tenants.map(t => (
                      <div key={t.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={`branch-${t.id}`}
                          checked={formData.branchAccess.includes(t.id)}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              branchAccess: checked
                                ? [...formData.branchAccess, t.id]
                                : formData.branchAccess.filter(id => id !== t.id)
                            });
                          }}
                        />
                        <Label htmlFor={`branch-${t.id}`} className="flex-1 cursor-pointer flex items-center gap-2 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-gray-500" />
                          <div>
                            <p className="font-medium">{t.company}</p>
                            <p className="text-xs text-muted-foreground">{t.email}</p>
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selected: {formData.branchAccess.length} {formData.branchAccess.length === 0 && '(Access to all branches)'}
                </p>
              </div>
            )}

            {/* Tab 3: Sidebar (Tenant only) */}
            {activeTab === 'sidebar' && (user?.role === 'Tenant' || isTenantUserForm) && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Sidebar Permissions:</strong> Control which sidebar tabs are visible for this tenant user.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Visible Sidebar Tabs</Label>
                  
                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-profile" className="text-sm">Profile</Label>
                      <Switch
                        id="sidebar-profile"
                        checked={formData.tenantSidebarPermissions.profile}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, profile: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-dashboard" className="text-sm">Dashboard</Label>
                      <Switch
                        id="sidebar-dashboard"
                        checked={formData.tenantSidebarPermissions.dashboard}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, dashboard: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-mylease" className="text-sm">My Lease</Label>
                      <Switch
                        id="sidebar-mylease"
                        checked={formData.tenantSidebarPermissions.myLease}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, myLease: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-invoices" className="text-sm">Invoices & Payments</Label>
                      <Switch
                        id="sidebar-invoices"
                        checked={formData.tenantSidebarPermissions.invoices}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, invoices: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-documents" className="text-sm">Documents</Label>
                      <Switch
                        id="sidebar-documents"
                        checked={formData.tenantSidebarPermissions.documents}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, documents: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-maintenance" className="text-sm">Maintenance</Label>
                      <Switch
                        id="sidebar-maintenance"
                        checked={formData.tenantSidebarPermissions.maintenance}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, maintenance: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-myassets" className="text-sm">My Assets</Label>
                      <Switch
                        id="sidebar-myassets"
                        checked={formData.tenantSidebarPermissions.myAssets}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, myAssets: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-assetmovement" className="text-sm">Asset Movement</Label>
                      <Switch
                        id="sidebar-assetmovement"
                        checked={formData.tenantSidebarPermissions.assetMovement}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, assetMovement: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-services" className="text-sm">Services</Label>
                      <Switch
                        id="sidebar-services"
                        checked={formData.tenantSidebarPermissions.services}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, services: checked }
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="sidebar-vendors" className="text-sm">Vendors</Label>
                      <Switch
                        id="sidebar-vendors"
                        checked={formData.tenantSidebarPermissions.vendors}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          tenantSidebarPermissions: { ...formData.tenantSidebarPermissions, vendors: checked }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Access & Role */}
            {activeTab === 'access' && (user?.selectedRoles?.includes('Technician') || user?.selectedRoles?.includes('Vendor') || isOtherUserForm) && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Role</Label>
                  <div className="space-y-2 border rounded-lg p-3">
                    <div className="flex items-center space-x-2 py-2 px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id="role-Technician"
                        checked={formData.selectedRoles.includes('Technician')}
                        onCheckedChange={() => handleRoleToggle('Technician')}
                      />
                      <Label htmlFor="role-Technician" className="text-sm flex-1 cursor-pointer">Technician</Label>
                    </div>
                    <div className="flex items-center space-x-2 py-2 px-2 rounded hover:bg-muted/50">
                      <Checkbox
                        id="role-Vendor"
                        checked={formData.selectedRoles.includes('Vendor')}
                        onCheckedChange={() => handleRoleToggle('Vendor')}
                      />
                      <Label htmlFor="role-Vendor" className="text-sm flex-1 cursor-pointer">Vendor</Label>
                    </div>
                  </div>
                  {formData.selectedRoles.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs font-medium">Selected:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.selectedRoles.map(role => (
                          <Badge key={role} variant="default" className="text-xs">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between py-3 border-y">
                  <div>
                    <Label htmlFor="isActive" className="text-sm font-medium">Account Status</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Enable or disable user access</p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Access & Role */}
            {activeTab === 'access' && user?.role !== 'Tenant' && !user?.selectedRoles?.includes('Technician') && !user?.selectedRoles?.includes('Vendor') && !isOtherUserForm && (
              <div className="space-y-5">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Roles (Multiple)</Label>
                  <div className="space-y-2 border rounded-lg p-3 max-h-64 overflow-y-auto">
                    {roles.map((role) => {
                      const isDisabled = false;
                      
                      return (
                        <div key={role} className={`flex items-center space-x-2 py-2 px-2 rounded ${isDisabled ? 'opacity-50' : 'hover:bg-muted/50'}`}>
                          <Checkbox
                            id={`role-${role}`}
                            checked={formData.selectedRoles.includes(role)}
                            onCheckedChange={() => handleRoleToggle(role)}
                            disabled={isDisabled}
                          />
                          <Label htmlFor={`role-${role}`} className={`text-sm flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{role}</Label>
                        </div>
                      );
                    })}
                  </div>
                  {/* Helpdesk removed from this UI; mutual-exclusion notice omitted */}
                  <p className="text-xs text-muted-foreground mt-2">Permissions auto-merge from selected roles</p>
                  {formData.selectedRoles.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs font-medium">Selected:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formData.selectedRoles.map(role => (
                          <Badge key={role} variant="default" className="text-xs">{role}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Note: Special Access Flags moved to 'Other Access' tab */}
              </div>
            )}

            {/* Tab 3: Permissions */}
            {activeTab === 'permissions' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Auto-Applied:</strong> Permissions are automatically merged from selected roles. Customize below if needed.
                  </p>
                </div>

                {formData.selectedRoles.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Please select at least one role in the Access tab
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-5 gap-2 text-xs font-medium pb-2 border-b">
                      <div>Module</div>
                      <div className="text-center">View</div>
                      <div className="text-center">Add</div>
                      <div className="text-center">Edit</div>
                      <div className="text-center">Del</div>
                    </div>

                    {displayPermissions.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Selected role(s) have no module permissions
                      </div>
                    ) : (
                      displayPermissions.map((permission) => (
                        <div key={permission.module} className="grid grid-cols-5 gap-2 items-center py-1.5 text-xs border-b">
                          <div className="font-medium truncate">{permission.module}</div>
                          <div className="flex justify-center">
                            <Switch checked={permission.view} onCheckedChange={(c) => handlePermissionChange(permission.module, 'view', c)} className="scale-75" />
                          </div>
                          <div className="flex justify-center">
                            <Switch checked={permission.add} onCheckedChange={(c) => handlePermissionChange(permission.module, 'add', c)} disabled={!permission.view} className="scale-75" />
                          </div>
                          <div className="flex justify-center">
                            <Switch checked={permission.edit} onCheckedChange={(c) => handlePermissionChange(permission.module, 'edit', c)} disabled={!permission.view} className="scale-75" />
                          </div>
                          <div className="flex justify-center">
                            <Switch checked={permission.delete} onCheckedChange={(c) => handlePermissionChange(permission.module, 'delete', c)} disabled={!permission.view} className="scale-75" />
                          </div>
                        </div>
                      ))
                    )}

                    <div className="border-t pt-3 mt-4">
                      <Label className="text-xs font-medium mb-2 block">Active Modules</Label>
                      <div className="flex flex-wrap gap-1">
                        {displayPermissions.filter(p => p.view).map((p) => <Badge key={p.module} variant="outline" className="text-xs">{p.module}</Badge>)}
                        {displayPermissions.filter(p => p.view).length === 0 && <span className="text-xs text-muted-foreground">No modules</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Other Access */}
            {activeTab === 'otherAccess' && (
              <div className="space-y-6">
                {/* Section 1: Special Role-Based Access Flags */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Special Role-Based Access Flags</h3>
                    <p className="text-xs text-muted-foreground">Operational approval & responsibility privileges</p>
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    {/* 1. Account Status */}
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label htmlFor="isActive" className="text-sm font-medium">Account Status</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Enable or disable user access</p>
                      </div>
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      />
                    </div>

                    {/* 2. Approver Status */}
                    {(() => {
                      const isAllowed = user?.role !== 'Tenant';
                      return (
                        <div className={`flex items-center justify-between py-2 border-t ${!isAllowed ? 'opacity-50' : ''}`}>
                          <div>
                            <Label htmlFor="isApprover" className="text-sm font-medium">Approver Status</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Can approve financial transactions {!isAllowed && '(Not available for Tenant users)'}
                            </p>
                          </div>
                          <Switch
                            id="isApprover"
                            checked={formData.isApprover}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, isApprover: checked })}
                          />
                        </div>
                      );
                    })()}

                    {/* 3. Asset Movement Approver */}
                    {(() => {
                      const isAllowed = permissions.some(p => p.module === 'Asset Movement' && p.view);
                      return (
                        <div className={`flex items-center justify-between py-2 border-t ${!isAllowed ? 'opacity-50' : ''}`}>
                          <div>
                            <Label htmlFor="assetMovementApprover" className="text-sm font-medium">Asset Movement Approver</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Can approve/reject asset movements {!isAllowed && '(Requires View permission for Asset Movement)'}
                            </p>
                          </div>
                          <Switch
                            id="assetMovementApprover"
                            checked={formData.assetMovementApprover}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, assetMovementApprover: checked })}
                          />
                        </div>
                      );
                    })()}

                    {/* 4. Asset Incharge */}
                    {(() => {
                      const isAllowed = permissions.some(p => p.module === 'Asset Master' && p.view) || formData.selectedRoles.includes('Asset Manager');
                      return (
                        <div className={`flex items-center justify-between py-2 border-t ${!isAllowed ? 'opacity-50' : ''}`}>
                          <div>
                            <Label htmlFor="assetIncharge" className="text-sm font-medium">Asset Incharge</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Responsible for asset management {!isAllowed && '(Requires Asset Master view access or Asset Manager role)'}
                            </p>
                          </div>
                          <Switch
                            id="assetIncharge"
                            checked={formData.assetIncharge}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, assetIncharge: checked })}
                          />
                        </div>
                      );
                    })()}

                    {/* 5. Asset Auditor */}
                    {(() => {
                      const isAllowed = permissions.some(p => p.module === 'Physical Audit' && p.view) || permissions.some(p => p.module === 'Preventive Maintenance' && p.view);
                      return (
                        <div className={`flex items-center justify-between py-2 border-t ${!isAllowed ? 'opacity-50' : ''}`}>
                          <div>
                            <Label htmlFor="assetAuditor" className="text-sm font-medium">Asset Auditor</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Can be assigned PM audits {!isAllowed && '(Requires Physical Audit or PM view access)'}
                            </p>
                          </div>
                          <Switch
                            id="assetAuditor"
                            checked={formData.assetAuditor}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, assetAuditor: checked })}
                          />
                        </div>
                      );
                    })()}

                    {/* 6. Can Approve/Reject Tickets */}
                    {(() => {
                      const isAllowed = permissions.some(p => p.module === 'Manage Tickets' && p.view);
                      return (
                        <div className={`flex items-center justify-between py-2 border-t ${!isAllowed ? 'opacity-50' : ''}`}>
                          <div>
                            <Label htmlFor="canApproveTickets" className="text-sm font-medium">Can Approve/Reject Tickets</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Enable approval/rejection buttons in Manage Tickets page {!isAllowed && '(Requires Manage Tickets view access)'}
                            </p>
                          </div>
                          <Switch
                            id="canApproveTickets"
                            checked={formData.canApproveTickets}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, canApproveTickets: checked })}
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Section 2: Notifications & Sub-Access Toggles */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">Notification & Sub-Access Settings</h3>
                    <p className="text-xs text-muted-foreground">Notification preferences & user management tab access</p>
                  </div>

                  <div className="space-y-3 border rounded-lg p-3">
                    {/* 1. Notifications */}
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label htmlFor="notificationsEnabled" className="text-sm font-medium">Notifications</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Enable or disable system notifications</p>
                      </div>
                      <Switch
                        id="notificationsEnabled"
                        checked={formData.notificationsEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, notificationsEnabled: checked })}
                      />
                    </div>

                    {/* 2. Ticket Email Notifications */}
                    {(() => {
                      const isAllowed = formData.selectedRoles.includes('Manage Tickets') || formData.selectedRoles.includes('Tenant') || user?.role === 'Tenant';
                      return (
                        <div className={`flex items-center justify-between py-2 border-t ${!isAllowed ? 'opacity-50' : ''}`}>
                          <div>
                            <Label htmlFor="receiveTicketNotifications" className="text-sm font-medium">Ticket Email Notifications</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Receive email notifications for ticket events {!isAllowed && '(Requires Manage Tickets or Tenant role)'}
                            </p>
                          </div>
                          <Switch
                            id="receiveTicketNotifications"
                            checked={formData.receiveTicketNotifications}
                            disabled={!isAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, receiveTicketNotifications: checked })}
                          />
                        </div>
                      );
                    })()}

                    {/* 3-5. User Management Sub-Access */}
                    {(() => {
                      const isAllowed = permissions.some(p => p.module === 'Users' && p.view);
                      return (
                        <div className={`space-y-2 border-t pt-3 ${!isAllowed ? 'opacity-50' : ''}`}>
                          <Label className="text-sm font-medium">User Management Access</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Control access to user management tabs {!isAllowed && '(Requires View permission for Users module)'}
                          </p>
                          <div className="flex items-center justify-between py-1.5">
                            <Label htmlFor="access-users" className="text-sm">Users Tab</Label>
                            <Switch
                              id="access-users"
                              checked={formData.userManagementAccess.users}
                              disabled={!isAllowed}
                              onCheckedChange={(checked) => setFormData({ 
                                ...formData, 
                                userManagementAccess: { ...formData.userManagementAccess, users: checked }
                              })}
                            />
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <Label htmlFor="access-tenant-users" className="text-sm">Tenant Users Tab</Label>
                            <Switch
                              id="access-tenant-users"
                              checked={formData.userManagementAccess.tenantUsers}
                              disabled={!isAllowed}
                              onCheckedChange={(checked) => setFormData({ 
                                ...formData, 
                                userManagementAccess: { ...formData.userManagementAccess, tenantUsers: checked }
                              })}
                            />
                          </div>
                          <div className="flex items-center justify-between py-1.5">
                            <Label htmlFor="access-other-users" className="text-sm">Other Users Tab</Label>
                            <Switch
                              id="access-other-users"
                              checked={formData.userManagementAccess.otherUsers}
                              disabled={!isAllowed}
                              onCheckedChange={(checked) => setFormData({ 
                                ...formData, 
                                userManagementAccess: { ...formData.userManagementAccess, otherUsers: checked }
                              })}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === 'security' && (
              <div className="space-y-5">
                <div>
                  <Label htmlFor="oldPassword" className="text-sm font-medium">Current Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="oldPassword"
                      type={showOldPassword ? "text" : "password"}
                      placeholder="Enter current password"
                      className="pr-10 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Required to change password</p>
                </div>
                
                <div>
                  <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      type={showNewPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter new password"
                      className="pr-10 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Minimum 8 characters recommended</p>
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      className="pr-10 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Must match new password</p>
                </div>
                
                <div className="flex items-center justify-between py-3 border-y">
                  <div>
                    <Label htmlFor="twoFactorEnabled" className="text-sm font-medium">Two-Factor Authentication</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Add extra security layer</p>
                  </div>
                  <Switch
                    id="twoFactorEnabled"
                    checked={formData.twoFactorEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, twoFactorEnabled: checked })}
                  />
                </div>

                {user && (
                  <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
                    </div>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete ${user.name}? This cannot be undone.`)) {
                            onDelete?.(user.id);
                            onClose();
                          }
                        }}
                        className="w-full justify-start"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t px-6 py-3 bg-muted/20">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" size="sm">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={!hasChanges} size="sm">{user ? 'Save Changes' : 'Create User'}</Button>
          </div>
        </div>
      </div>
    </>
  );
};