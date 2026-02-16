import { createContext, useContext, useEffect, useState } from "react";
import { userService } from '@/data/userData';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('demo_user');
    const savedRole = localStorage.getItem('demo_role');
    
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
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Try to find user in Supabase, fallback to demo users if connection fails
      let appUser: any = null;
      let dbPassword = null;
      try {
        // First check users table
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (!error && data) {
          const allUsers = await userService.getAllUsers();
          appUser = allUsers.find(u => u.email === email);
          dbPassword = data.password;
        } else {
          // If not found in users table, check tenants table
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('email', email)
            .single();
          
          if (!tenantError && tenantData) {
            appUser = {
              id: tenantData.id,
              name: tenantData.name,
              email: tenantData.email,
              role: 'Tenant',
              isActive: tenantData.status === 'Active',
              isApprover: false,
              permissions: [],
              phone: tenantData.phone,
              department: tenantData.company
            };
            dbPassword = tenantData.password;
          }
        }
      } catch (supabaseError) {
        // Fallback demo users
        const demoUsers = [
          { id: '1', email: 'admin@rathinam.tec', name: 'Admin User', role: 'Super Admin', isActive: true, isApprover: true, permissions: [], password: 'admin123' },
          { id: '2', email: 'finance@rathinam.tec', name: 'Finance User', role: 'Accountant', isActive: true, isApprover: false, permissions: [], password: 'admin123' },
          { id: '3', email: 'crm@rathinam.tec', name: 'CRM User', role: 'CRM', isActive: true, isApprover: false, permissions: [], password: 'admin123' },
          { id: '4', email: 'maintenance@rathinam.edu', name: 'Maintenance User', role: 'Maintenance Manager', isActive: true, isApprover: false, permissions: [], password: 'admin123' },
          { id: '5', email: 'tenant@techstart.com', name: 'Tenant User', role: 'Tenant', isActive: true, isApprover: false, permissions: [], password: 'admin123' }
        ];
        const demoUser = demoUsers.find(u => u.email === email);
        if (demoUser) {
          appUser = demoUser;
          dbPassword = demoUser.password;
        }
      }
      
      if (!appUser) {
        throw new Error('User not found');
      }
      
      // Verify password from database
      if (!dbPassword || password !== dbPassword) {
        throw new Error('Invalid credentials');
      }
      
      if (appUser.isActive === false) {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      // Try to update last login (ignore if fails)
      try {
        await userService.updateUser(appUser.id, {
          ...appUser,
          lastLogin: new Date().toISOString()
        });
      } catch (updateError) {
        // Could not update last login
      }

      // Create user object
      const user = {
        id: appUser.id,
        email: appUser.email,
        full_name: appUser.name,
        isApprover: appUser.isApprover,
        appUser: {
          ...appUser,
          isApprover: appUser.isApprover // Ensure isApprover is in nested object too
        }
      };

      // Save to localStorage for persistence
      localStorage.setItem('demo_user', JSON.stringify(user));
      localStorage.setItem('demo_role', appUser.role);
      
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
    setUser(null);
    setRole(null);
  };

  const clearCache = () => {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_role');
    localStorage.clear(); // Clear everything
    setUser(null);
    setRole(null);
    setLoading(false);
    window.location.href = '/auth'; // Force redirect to login
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
            permissions: updatedAppUser.permissions
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
    <AuthContext.Provider value={{ user, setUser, login, logout, role, loading, clearCache, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);