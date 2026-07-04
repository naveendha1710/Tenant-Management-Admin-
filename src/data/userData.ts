import { supabase } from '@/lib/supabase';

// User Management Data Structure
export type UserRole = 'Super Admin' | 'Admin' | 'Accountant' | 'Maintenance Manager' | 'Helpdesk' | 'Technician' | 'Viewer' | 'Custom' | 'Manage Tickets' | 'Tenant' | 'Vendor';
export type UserType = 'predefined' | 'custom';

export interface Permission {
  module: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType: UserType;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  permissions: Permission[];
  phone?: string;
  department?: string;
  twoFactorEnabled: boolean;
  isApprover: boolean;
  selectedRoles?: UserRole[]; // Store multiple selected roles
  technicianCategory?: string; // Category for technicians (Plumber, Electrician, etc.)
  branchAccess?: string[]; // Tenant IDs user can access (Tenant role only)
  tenantId?: string; // Links tenant users to their parent tenant
  assetMovementApprover?: boolean;
  assetIncharge?: boolean;
  assetAuditor?: boolean;
  canManageWorkflows?: boolean;
  canApproveTickets?: boolean;
  notificationsEnabled?: boolean;
  receiveTicketNotifications?: boolean;
  userManagementAccess?: {
    users: boolean;
    tenantUsers: boolean;
    otherUsers: boolean;
  };
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  device: string;
}

// Default permissions for each role
const defaultPermissions: Record<Exclude<UserRole, 'Custom'>, Permission[]> = {
  'Super Admin': [
    { module: 'Overview', view: true, add: true, edit: true, delete: true },
    { module: 'Buildings', view: true, add: true, edit: true, delete: true },
    { module: 'Tenants', view: true, add: true, edit: true, delete: true },
    { module: 'Companies', view: true, add: true, edit: true, delete: true },
    { module: 'Rent Collection', view: true, add: true, edit: true, delete: true },
    { module: 'Invoices', view: true, add: true, edit: true, delete: true },
    { module: 'Expenses', view: true, add: true, edit: true, delete: true },
    { module: 'Deposits', view: true, add: true, edit: true, delete: true },
    { module: 'Financial Reports', view: true, add: true, edit: true, delete: true },
    { module: 'Manage Tickets', view: true, add: true, edit: true, delete: true },
    { module: 'Assets', view: true, add: true, edit: true, delete: true },
    { module: 'Asset Master', view: true, add: true, edit: true, delete: true },
    { module: 'Asset Movement', view: true, add: true, edit: true, delete: true },
    { module: 'Inventory', view: true, add: true, edit: true, delete: true },
    { module: 'Preventive Maintenance', view: true, add: true, edit: true, delete: true },
    { module: 'Physical Audit', view: true, add: true, edit: true, delete: true },
    { module: 'Configuration', view: true, add: true, edit: true, delete: true },
    { module: 'Users', view: true, add: true, edit: true, delete: true },
    { module: 'Settings', view: true, add: true, edit: true, delete: true },
    { module: 'Asset Form', view: true, add: true, edit: true, delete: true },
    { module: 'Tenant Form', view: true, add: true, edit: true, delete: true },
    { module: 'Helpdesk', view: true, add: true, edit: true, delete: true }
  ],
  'Admin': [
    { module: 'Overview', view: true, add: true, edit: true, delete: true },
    { module: 'Buildings', view: true, add: true, edit: true, delete: true },
    { module: 'Tenants', view: true, add: true, edit: true, delete: true },
    { module: 'Companies', view: true, add: true, edit: true, delete: true },
    { module: 'Rent Collection', view: true, add: true, edit: true, delete: true },
    { module: 'Invoices', view: true, add: true, edit: true, delete: true },
    { module: 'Expenses', view: true, add: true, edit: true, delete: true },
    { module: 'Deposits', view: true, add: true, edit: true, delete: true },
    { module: 'Financial Reports', view: true, add: true, edit: true, delete: true },
    { module: 'Manage Tickets', view: true, add: true, edit: true, delete: true },
    { module: 'Assets', view: true, add: true, edit: true, delete: true },
    { module: 'Asset Master', view: true, add: true, edit: true, delete: true },
    { module: 'Asset Movement', view: true, add: true, edit: true, delete: true },
    { module: 'Inventory', view: true, add: true, edit: true, delete: true },
    { module: 'Preventive Maintenance', view: true, add: true, edit: true, delete: true },
    { module: 'Physical Audit', view: true, add: true, edit: true, delete: true },
    { module: 'Configuration', view: true, add: true, edit: true, delete: true },
    { module: 'Users', view: true, add: true, edit: true, delete: true },
    { module: 'Settings', view: true, add: true, edit: true, delete: true },
    { module: 'Asset Form', view: true, add: true, edit: true, delete: true },
    { module: 'Tenant Form', view: true, add: true, edit: true, delete: true },
    { module: 'Helpdesk', view: true, add: true, edit: true, delete: true }
  ],
  'Accountant': [
    { module: 'Rent Collection', view: true, add: true, edit: true, delete: false },
    { module: 'Invoices', view: true, add: true, edit: true, delete: false },
    { module: 'Expenses', view: true, add: true, edit: true, delete: false },
    { module: 'Deposits', view: true, add: true, edit: true, delete: false },
    { module: 'Financial Reports', view: true, add: false, edit: false, delete: false }
  ],
  'Maintenance Manager': [
    { module: 'Manage Tickets', view: true, add: true, edit: true, delete: true }
  ],
  'Helpdesk': [
    { module: 'Helpdesk', view: true, add: true, edit: true, delete: false }
  ],
  'Technician': [],
  'Viewer': [
    { module: 'Overview', view: true, add: false, edit: false, delete: false },
    { module: 'Buildings', view: true, add: false, edit: false, delete: false },
    { module: 'Tenants', view: true, add: false, edit: false, delete: false },
    { module: 'Companies', view: true, add: false, edit: false, delete: false },
    { module: 'Rent Collection', view: true, add: false, edit: false, delete: false },
    { module: 'Invoices', view: true, add: false, edit: false, delete: false },
    { module: 'Expenses', view: true, add: false, edit: false, delete: false },
    { module: 'Deposits', view: true, add: false, edit: false, delete: false },
    { module: 'Financial Reports', view: true, add: false, edit: false, delete: false },
    { module: 'Manage Tickets', view: true, add: false, edit: false, delete: false },
    { module: 'Helpdesk', view: true, add: false, edit: false, delete: false }
  ],
  'Manage Tickets': [
    { module: 'Manage Tickets', view: true, add: true, edit: true, delete: false }
  ],
  'Tenant': [],
  'Vendor': []
};

// Helper function to transform database row to AppUser
const transformDbUserToAppUser = (dbUser: any): AppUser => ({
  id: dbUser.id,
  name: dbUser.name,
  email: dbUser.email,
  role: dbUser.role as UserRole,
  userType: dbUser.user_type as UserType,
  isActive: dbUser.is_active,
  lastLogin: dbUser.last_login,
  createdAt: dbUser.created_at,
  permissions: typeof dbUser.permissions === 'string' ? JSON.parse(dbUser.permissions) : (dbUser.permissions || []),
  phone: dbUser.phone,
  department: dbUser.department,
  twoFactorEnabled: dbUser.two_factor_enabled,
  isApprover: dbUser.is_approver || false,
  assetMovementApprover: dbUser.asset_movement_approver || false,
  assetIncharge: dbUser.asset_incharge || false,
  assetAuditor: dbUser.asset_auditor || false,
  canManageWorkflows: dbUser.can_manage_workflows || false,
  canApproveTickets: dbUser.can_approve_tickets !== undefined ? dbUser.can_approve_tickets : true,
  selectedRoles: typeof dbUser.selected_roles === 'string' ? JSON.parse(dbUser.selected_roles) : (dbUser.selected_roles || []),
  technicianCategory: dbUser.technician_category || '',
  branchAccess: typeof dbUser.branch_access === 'string' ? JSON.parse(dbUser.branch_access) : (dbUser.branch_access || []),
  notificationsEnabled: dbUser.notifications_enabled !== undefined ? dbUser.notifications_enabled : true,
  receiveTicketNotifications: dbUser.receive_ticket_notifications !== undefined ? dbUser.receive_ticket_notifications : true,
  userManagementAccess: typeof dbUser.user_management_access === 'string' 
    ? JSON.parse(dbUser.user_management_access) 
    : (dbUser.user_management_access || { users: true, tenantUsers: true, otherUsers: true }),
  tenantId: dbUser.tenant_id || undefined
});

// Helper function to transform AppUser to database format
const transformAppUserToDb = (user: Partial<AppUser & { password?: string }>) => {
  const dbUser: any = {};
  
  if (user.name !== undefined) dbUser.name = user.name;
  if (user.email !== undefined) dbUser.email = user.email;
  if (user.role !== undefined) dbUser.role = user.role;
  if (user.userType !== undefined) dbUser.user_type = user.userType;
  if (user.isActive !== undefined) dbUser.is_active = user.isActive;
  if (user.lastLogin !== undefined) dbUser.last_login = user.lastLogin;
  if (user.phone !== undefined) dbUser.phone = user.phone;
  if (user.department !== undefined) dbUser.department = user.department;
  if (user.twoFactorEnabled !== undefined) dbUser.two_factor_enabled = user.twoFactorEnabled;
  if (user.permissions !== undefined) dbUser.permissions = user.permissions;
  if (user.isApprover !== undefined) dbUser.is_approver = user.isApprover;
  if ((user as any).assetMovementApprover !== undefined) dbUser.asset_movement_approver = (user as any).assetMovementApprover;
  if ((user as any).assetIncharge !== undefined) dbUser.asset_incharge = (user as any).assetIncharge;
  if ((user as any).assetAuditor !== undefined) dbUser.asset_auditor = (user as any).assetAuditor;
  if ((user as any).canManageWorkflows !== undefined) dbUser.can_manage_workflows = (user as any).canManageWorkflows;
  if ((user as any).canApproveTickets !== undefined) dbUser.can_approve_tickets = (user as any).canApproveTickets;
  if (user.selectedRoles !== undefined) dbUser.selected_roles = user.selectedRoles;
  if (user.technicianCategory !== undefined) dbUser.technician_category = user.technicianCategory;
  if (user.branchAccess !== undefined) dbUser.branch_access = user.branchAccess;
  if ((user as any).notificationsEnabled !== undefined) dbUser.notifications_enabled = (user as any).notificationsEnabled;
  if ((user as any).receiveTicketNotifications !== undefined) dbUser.receive_ticket_notifications = (user as any).receiveTicketNotifications;
  if ((user as any).userManagementAccess !== undefined) dbUser.user_management_access = (user as any).userManagementAccess;
  if (user.tenantId !== undefined) dbUser.tenant_id = user.tenantId;
  
  if (user.password && user.password.trim() !== '') {
    dbUser.password = user.password;
  }
  
  return dbUser;
};

type UserChangeListener = (users: AppUser[]) => void;
const userListeners: UserChangeListener[] = [];

const notifyUserListeners = async () => {
  const users = await userService.getAllUsers();
  userListeners.forEach(listener => listener(users));
};

export const userService = {
  // Get all users
  getAllUsers: async (): Promise<AppUser[]> => {
    if (!supabase) {
      console.warn('Supabase not available - returning empty users list');
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data?.map(transformDbUserToAppUser) || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },
  
  // Get user by ID
  getUserById: async (id: string): Promise<AppUser | null> => {
    if (!supabase) {
      console.warn('Supabase not available - cannot fetch user by ID');
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data ? transformDbUserToAppUser(data) : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },
  
  // Add new user
  addUser: async (userData: Omit<AppUser, 'id' | 'createdAt' | 'permissions'>): Promise<AppUser | null> => {
    try {
      // First, ensure the email is not already taken – the users table has a unique constraint on email.
      const { data: existing, error: existingError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        // Conflict – user with this email already exists.
        console.error('User with this email already exists');
        return null;
      }

      const permissions = userData.userType === 'custom' ? [] : defaultPermissions[userData.role as Exclude<UserRole, 'Custom'>];
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...transformAppUserToDb({ ...userData, permissions }),
          permissions
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newUser = transformDbUserToAppUser(data);
      
      // Log the action
      await auditService.addLog({
        userId: '1',
        userName: 'System Administrator',
        action: 'Create User',
        module: 'Users',
        details: `Created new user: ${newUser.name} (${newUser.role})`,
        ipAddress: '192.168.1.100',
        device: 'Chrome on Windows'
      });
      
      notifyUserListeners();
      return newUser;
    } catch (error) {
      console.error('Error adding user:', error);
      return null;
    }
  },
  
  // Update user
  updateUser: async (id: string, updates: Partial<AppUser & { password?: string }>): Promise<AppUser | null> => {
    if (!supabase) {
      console.warn('Supabase not available - cannot update user');
      return null;
    }
    
    try {
      const currentUser = await userService.getUserById(id);
      if (!currentUser) return null;
      
      let finalUpdates = { ...updates };
      
      
      // Update permissions if role changed
      if (updates.role && updates.role !== currentUser.role && currentUser.userType === 'predefined' && updates.role !== 'Custom') {
        finalUpdates.permissions = defaultPermissions[updates.role as Exclude<UserRole, 'Custom'>];
      }
      
      const dbData = transformAppUserToDb(finalUpdates);
      
      const { data, error } = await supabase
        .from('users')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedUser = transformDbUserToAppUser(data);
      
      // Log the action
      await auditService.addLog({
        userId: '1',
        userName: 'System Administrator',
        action: 'Update User',
        module: 'Users',
        details: `Updated user: ${updatedUser.name}`,
        ipAddress: '192.168.1.100',
        device: 'Chrome on Windows'
      });
      
      notifyUserListeners();
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  },
  
  // Delete user
  deleteUser: async (id: string): Promise<boolean> => {
    try {
      const user = await userService.getUserById(id);
      if (!user) return false;
      
      // Check if user is a main tenant user (email matches a tenant in tenants table)
      if (user.role === 'Tenant') {
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        
        if (tenantError) throw tenantError;
        
        if (tenant) {
          throw new Error('Cannot delete main tenant user. Please delete the tenant from Tenant Management instead.');
        }
      }
      
      // Check if user has workflow actions
      const { data: workflowActions, error: workflowError } = await supabase
        .from('workflow_actions')
        .select('id')
        .eq('action_by', id)
        .limit(1);
      
      if (workflowError) throw workflowError;
      
      if (workflowActions && workflowActions.length > 0) {
        throw new Error('Cannot delete user who has participated in workflow approvals. User has approval history that must be preserved.');
      }
      
      // Check if user has created any movements
      const { data: movements, error: movementsError } = await supabase
        .from('asset_movements')
        .select('id')
        .eq('requested_by', id)
        .limit(1);
      
      if (movementsError) throw movementsError;
      
      if (movements && movements.length > 0) {
        throw new Error('Cannot delete user who has created asset movements. User has movement history that must be preserved.');
      }
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Log the action
      await auditService.addLog({
        userId: '1',
        userName: 'System Administrator',
        action: 'Delete User',
        module: 'Users',
        details: `Deleted user: ${user.name}`,
        ipAddress: '192.168.1.100',
        device: 'Chrome on Windows'
      });
      
      notifyUserListeners();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
  
  // Update user permissions
  updatePermissions: async (id: string, permissions: Permission[]): Promise<boolean> => {
    try {
      const user = await userService.getUserById(id);
      if (!user) return false;
      
      const { error } = await supabase
        .from('users')
        .update({ permissions })
        .eq('id', id);
      
      if (error) throw error;
      
      // Log the action
      await auditService.addLog({
        userId: '1',
        userName: 'System Administrator',
        action: 'Update Permissions',
        module: 'Users',
        details: `Updated permissions for: ${user.name}`,
        ipAddress: '192.168.1.100',
        device: 'Chrome on Windows'
      });
      
      notifyUserListeners();
      return true;
    } catch (error) {
      console.error('Error updating permissions:', error);
      return false;
    }
  },
  
  // Subscribe to user changes
  subscribe: (listener: UserChangeListener): (() => void) => {
    userListeners.push(listener);
    // Initial load
    userService.getAllUsers().then(users => listener(users));
    return () => {
      const index = userListeners.indexOf(listener);
      if (index > -1) userListeners.splice(index, 1);
    };
  },
  
  // Get default permissions for role
  getDefaultPermissions: (role: UserRole): Permission[] => {
    if (role === 'Custom' || role === 'Tenant') return [];
    const rolePermissions = defaultPermissions[role as Exclude<UserRole, 'Custom' | 'Tenant'>];
    return rolePermissions ? [...rolePermissions] : [];
  },
  
  // Get users with specific permission
  getUsersWithPermission: async (module: string, action: keyof Permission): Promise<AppUser[]> => {
    const users = await userService.getAllUsers();
    return users.filter(user => {
      const permission = user.permissions.find(p => p.module === module);
      return permission && permission[action] === true;
    });
  }
};

export const auditService = {
  // Get all audit logs
  getAllLogs: async (): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      
      return data?.map(log => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        module: log.module,
        details: log.details,
        timestamp: log.timestamp,
        ipAddress: log.ip_address,
        device: log.device
      })) || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  },
  
  // Add new audit log
  addLog: async (logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> => {
    if (!supabase) {
      console.warn('Supabase not available - cannot add audit log');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: logData.userId,
          user_name: logData.userName,
          action: logData.action,
          module: logData.module,
          details: logData.details,
          ip_address: logData.ipAddress,
          device: logData.device
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error adding audit log:', error);
    }
  },
  
  // Get logs by user
  getLogsByUser: async (userId: string): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(log => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        module: log.module,
        details: log.details,
        timestamp: log.timestamp,
        ipAddress: log.ip_address,
        device: log.device
      })) || [];
    } catch (error) {
      console.error('Error fetching user logs:', error);
      return [];
    }
  },
  
  // Get logs by module
  getLogsByModule: async (module: string): Promise<AuditLog[]> => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', module)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(log => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        action: log.action,
        module: log.module,
        details: log.details,
        timestamp: log.timestamp,
        ipAddress: log.ip_address,
        device: log.device
      })) || [];
    } catch (error) {
      console.error('Error fetching module logs:', error);
      return [];
    }
  },
  
  // Clear old logs
  clearOldLogs: async (daysOld: number): Promise<void> => {
    try {
      const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000)).toISOString();
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error clearing old logs:', error);
    }
  }
};