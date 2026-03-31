import { createContext, useContext, useEffect, useState } from "react";
import { userService } from '@/data/userData';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext<any>({
  user: null,
  setUser: () => {},
  login: async () => { throw new Error('AuthContext not initialized'); },
  logout: async () => {},
  role: null,
  loading: true,
  clearCache: () => {},
  refreshUser: async () => {}
});

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('demo_user');
      const savedRole = localStorage.getItem('demo_role');
      const loginTime = localStorage.getItem('login_time');
      
      // Check if session expired (8 hours)
      if (loginTime && Date.now() - parseInt(loginTime) > 8 * 60 * 60 * 1000) {
        localStorage.removeItem('demo_user');
        localStorage.removeItem('demo_role');
        localStorage.removeItem('login_time');
        setLoading(false);
        return;
      }
      
      if (savedUser && savedRole) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setRole(savedRole);
      } else if (savedUser && !savedRole) {
        const parsedUser = JSON.parse(savedUser);
        const roleFromUser = parsedUser.appUser?.role;
        setUser(parsedUser);
        setRole(roleFromUser);
      }
    } catch (err) {
      console.error('Error initializing auth:', err);
      setError('Failed to initialize authentication');
      // Clear potentially corrupted data
      localStorage.removeItem('demo_user');
      localStorage.removeItem('demo_role');
      localStorage.removeItem('login_time');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      let appUser: any = null;
      let passwordValid = false;
      
      // Check users table with encrypted password verification
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (!userError && userData) {
        // Verify password using RPC
        const { data: isValid } = await supabase
          .rpc('verify_user_password', { user_email: email, user_password: password });
        
        if (isValid) {
          appUser = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            isActive: userData.is_active,
            isApprover: userData.is_approver || false,
            assetMovementApprover: userData.asset_movement_approver || false,
            permissions: userData.permissions || [],
            notificationsEnabled: userData.notifications_enabled !== false,
            userManagementAccess: typeof userData.user_management_access === 'string' 
              ? JSON.parse(userData.user_management_access) 
              : (userData.user_management_access || { users: true, tenantUsers: true, otherUsers: true }),
            tenantId: userData.tenant_id || undefined
          };
          passwordValid = true;
        }
      } else {
        // Check tenants table
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (!tenantError && tenantData) {
          const { data: isValid } = await supabase
            .rpc('verify_tenant_password', { tenant_email: email, tenant_password: password });
          
          if (isValid) {
            appUser = {
              id: tenantData.id,
              name: tenantData.name,
              email: tenantData.email,
              role: 'Tenant',
              isActive: tenantData.status === 'Active',
              isApprover: false,
              permissions: [],
              phone: tenantData.phone,
              department: tenantData.company,
              branchAccess: tenantData.branch_access || []
            };
            passwordValid = true;
          }
        }
      }
      
      if (!appUser) {
        throw new Error('User not found');
      }
      
      if (!passwordValid) {
        throw new Error('Invalid credentials');
      }
      
      if (appUser.isActive === false) {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Update last login
      try {
        await userService.updateUser(appUser.id, {
          ...appUser,
          lastLogin: new Date().toISOString()
        });
      } catch (updateError) {
        // Ignore
      }

      const user = {
        id: appUser.id,
        email: appUser.email,
        full_name: appUser.name,
        isApprover: appUser.isApprover,
        appUser: {
          ...appUser,
          isApprover: appUser.isApprover,
          assetMovementApprover: appUser.assetMovementApprover,
          tenantId: appUser.tenantId
        }
      };

      localStorage.setItem('demo_user', JSON.stringify(user));
      localStorage.setItem('demo_role', appUser.role);
      localStorage.setItem('login_time', Date.now().toString());
      
      setUser(user);
      setRole(appUser.role);
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_role');
    localStorage.removeItem('login_time');
    setUser(null);
    setRole(null);
  };

  const clearCache = () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_role');
    localStorage.removeItem('login_time');
    localStorage.clear();
    setUser(null);
    setRole(null);
    setLoading(false);
    window.location.href = '/auth';
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const allUsers = await userService.getAllUsers();
      const updatedAppUser = allUsers.find(u => u.id === user.id);
      
      if (updatedAppUser) {
        const updatedUser = {
          ...user,
          isApprover: updatedAppUser.isApprover,
          appUser: {
            ...updatedAppUser,
            isApprover: updatedAppUser.isApprover,
            assetMovementApprover: updatedAppUser.assetMovementApprover,
            permissions: updatedAppUser.permissions,
            branchAccess: updatedAppUser.branchAccess || [],
            userManagementAccess: updatedAppUser.userManagementAccess,
            notificationsEnabled: updatedAppUser.notificationsEnabled,
            tenantId: updatedAppUser.tenantId
          }
        };
        
        localStorage.setItem('demo_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      // Continue with existing user data if refresh fails
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, role, loading, error, clearCache, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);