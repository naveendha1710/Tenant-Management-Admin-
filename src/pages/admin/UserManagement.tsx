import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { userService, auditService, type AppUser, type UserRole } from '@/data/userData';
import { hasPermission } from '@/utils/permissionUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserForm } from '@/components/admin/UserForm';
import { PermissionsEditor } from '@/components/admin/PermissionsEditor';
import { PermissionsManager } from '@/components/admin/PermissionsManager';
import { AuditLogs } from '@/components/admin/AuditLogs';
import LoadingScreen from '@/components/LoadingScreen';
import { 
  Users, 
  Plus, 
  Search, 
  Settings as SettingsIcon,
  Eye, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck,
  UserX,
  Key,
  Activity,
  Lock
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Pagination } from '@/components/ui/pagination';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isOtherUserForm, setIsOtherUserForm] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();

  // Check permissions for Users module
  const canView = hasPermission(user?.appUser, 'Users', 'view');
  const canAdd = hasPermission(user?.appUser, 'Users', 'add');
  const canEdit = hasPermission(user?.appUser, 'Users', 'edit');
  const canDelete = hasPermission(user?.appUser, 'Users', 'delete');

  // If user doesn't have view permission, show access denied
  if (!canView) {
    return (
      <DashboardLayout title="User Management" subtitle="Access Denied">
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to view Users. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
      setLoading(false);
    };
    
    loadUsers();
    
    const unsubscribe = userService.subscribe((updatedUsers) => {
      setUsers(updatedUsers);
    });
    
    return unsubscribe;
  }, []);

  const getRoleColor = (role: UserRole) => {
    const colors = {
      'Super Admin': 'bg-red-100 text-red-800 border-red-200',
      'Admin': 'bg-blue-100 text-blue-800 border-blue-200',
      'Accountant': 'bg-green-100 text-green-800 border-green-200',
      'Maintenance Manager': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Viewer': 'bg-gray-100 text-gray-800 border-gray-200',
      'Custom': 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[role];
  };

  const filteredUsers = users.filter(user =>
    user.role !== 'Tenant' && (
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const filteredTenants = users.filter(u => u.role === 'Tenant');
  const totalTenantPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const tenantStartIndex = (currentPage - 1) * itemsPerPage;
  const tenantEndIndex = tenantStartIndex + itemsPerPage;
  const paginatedTenants = filteredTenants.slice(tenantStartIndex, tenantEndIndex);

  const handleAddUser = () => {
    if (!canAdd) {
      toast({ title: "Error", description: "You don't have permission to add users", variant: "destructive" });
      return;
    }
    setSelectedUser(null);
    setIsOtherUserForm(false);
    setIsUserFormOpen(true);
  };

  const handleAddOtherUser = () => {
    if (!canAdd) {
      toast({ title: "Error", description: "You don't have permission to add users", variant: "destructive" });
      return;
    }
    setSelectedUser(null);
    setIsOtherUserForm(true);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: AppUser) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit users", variant: "destructive" });
      return;
    }
    setSelectedUser(user);
    setIsUserFormOpen(true);
  };

  const handleViewUser = (user: AppUser) => {
    setViewingUser(user);
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (!canDelete) {
      toast({ title: "Error", description: "You don't have permission to delete users", variant: "destructive" });
      return;
    }
    
    if (user.role === 'Super Admin') {
      toast({ 
        title: "Error", 
        description: "Cannot delete Super Admin user", 
        variant: "destructive" 
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      const success = await userService.deleteUser(user.id);
      if (success) {
        toast({ title: "Success", description: `${user.name} deleted successfully` });
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to delete user", 
          variant: "destructive" 
        });
      }
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit users", variant: "destructive" });
      return;
    }
    const updatedUser = await userService.updateUser(user.id, { isActive: !user.isActive });
    if (updatedUser) {
      toast({ 
        title: "Success", 
        description: `${user.name} ${user.isActive ? 'deactivated' : 'activated'} successfully` 
      });
    } else {
      toast({ 
        title: "Error", 
        description: "Failed to update user status", 
        variant: "destructive" 
      });
    }
  };

  const handleEditPermissions = (user: AppUser) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit permissions", variant: "destructive" });
      return;
    }
    setSelectedUser(user);
    setIsPermissionsOpen(true);
  };

  const handleResetPassword = (user: AppUser) => {
    // Simulate password reset
    toast({ 
      title: "Success", 
      description: `Password reset email sent to ${user.email}` 
    });
  };

  const handleToggleApprover = async (user: AppUser) => {
    if (!canEdit) {
      toast({ title: "Error", description: "You don't have permission to edit users", variant: "destructive" });
      return;
    }
    const updatedUser = await userService.updateUser(user.id, { isApprover: !user.isApprover });
    if (updatedUser) {
      toast({ 
        title: "Success", 
        description: `${user.name} ${user.isApprover ? 'removed from' : 'added as'} approver` 
      });
      // Refresh current user session if they updated their own approver status
      await refreshUser();
    } else {
      toast({ 
        title: "Error", 
        description: "Failed to update approver status", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveUser = async (userData: any) => {
    try {
      if (selectedUser) {
        const updatedUser = await userService.updateUser(selectedUser.id, userData);
        if (updatedUser) {
          toast({ title: "Success", description: "User updated successfully" });
        } else {
          toast({ title: "Error", description: "Failed to update user", variant: "destructive" });
          return;
        }
      } else {
        const newUser = await userService.addUser(userData);
        if (newUser) {
          toast({ title: "Success", description: "User created successfully" });
        } else {
          toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
          return;
        }
      }
      setIsUserFormOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "An error occurred", variant: "destructive" });
    }
  };

  const handleSavePermissions = async (permissions: any[]) => {
    if (selectedUser) {
      const success = await userService.updatePermissions(selectedUser.id, permissions);
      if (success) {
        toast({ title: "Success", description: "Permissions updated successfully" });
        // Refresh current user session if they updated their own permissions
        if (user?.id === selectedUser.id) {
          await refreshUser();
        }
      } else {
        toast({ title: "Error", description: "Failed to update permissions", variant: "destructive" });
        return;
      }
    }
    setIsPermissionsOpen(false);
  };

  const hasUsersAccess = !user?.appUser?.userManagementAccess || user.appUser.userManagementAccess.users !== false;
  const hasTenantUsersAccess = !user?.appUser?.userManagementAccess || user.appUser.userManagementAccess.tenantUsers !== false;
  const hasOtherUsersAccess = !user?.appUser?.userManagementAccess || user.appUser.userManagementAccess.otherUsers !== false;
  const defaultTab = hasUsersAccess ? 'users' : hasTenantUsersAccess ? 'tenants' : 'others';

  return (
    <DashboardLayout title="User Management" subtitle="Manage system users and permissions">
      <Tabs defaultValue={defaultTab} className="space-y-4 sm:space-y-6">
        <TabsList>
          {hasUsersAccess && (
            <TabsTrigger value="users">Users</TabsTrigger>
          )}
          {hasTenantUsersAccess && (
            <TabsTrigger value="tenants">Tenant Users</TabsTrigger>
          )}
          {hasOtherUsersAccess && (
            <TabsTrigger value="others">Other Users</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="users" className="space-y-4 sm:space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAuditLogsOpen(true)} className="w-full sm:w-auto">
              <Activity className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Audit Logs</span>
              <span className="sm:hidden">Logs</span>
            </Button>
            {canAdd ? (
              <Button onClick={handleAddUser} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add New User</span>
                <span className="sm:hidden">Add User</span>
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add users" className="w-full sm:w-auto">
                <Lock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add New User</span>
                <span className="sm:hidden">Add User</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{users.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                    {users.filter(u => u.isActive).length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive Users</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-gray-600">
                    {users.filter(u => !u.isActive).length}
                  </p>
                </div>
                <UserX className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>System Users</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingScreen />
              </div>
            ) : (
            <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">USER</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">MODULES</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">ROLES</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">STATUS</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">APPROVER</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">LAST LOGIN</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">2FA</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-gray-500">{user.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.permissions.filter(p => p.view).map(p => (
                              <Badge key={p.module} variant="outline" className="text-xs">
                                {p.module}
                              </Badge>
                            ))}
                            {user.permissions.filter(p => p.view).length === 0 && (
                              <Badge variant="secondary" className="text-xs">No Modules</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.selectedRoles && user.selectedRoles.length > 0 ? (
                              user.selectedRoles.map(role => (
                                <Badge key={role} variant="outline" className="text-xs">{role}</Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs">{user.role}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'success' : 'secondary'} className="capitalize">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isApprover ? 'default' : 'outline'} className="capitalize">
                            {user.isApprover ? 'Approver' : 'Non-Approver'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.twoFactorEnabled ? 'default' : 'outline'} className="capitalize">
                            {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            {canEdit ? (
                              <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                <SettingsIcon className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" disabled title="No Edit Permission" className="text-gray-400">
                                <Lock className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  </div>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showControls
                  />
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>

        </TabsContent>
        
        <TabsContent value="tenants" className="space-y-4 sm:space-y-6">
          {/* Sync Button */}
          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const { syncTenantUsers } = await import('@/utils/syncTenantUsers');
                  const result = await syncTenantUsers();
                  toast({ 
                    title: "Sync Complete", 
                    description: `Created ${result.created} user accounts, skipped ${result.skipped} existing users` 
                  });
                } catch (error) {
                  toast({ 
                    title: "Sync Failed", 
                    description: "Failed to sync tenant users", 
                    variant: "destructive" 
                  });
                }
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Sync Existing Tenants
            </Button>
          </div>
          
          {/* Tenant Users Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tenants</p>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{users.filter(u => u.role === 'Tenant').length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Tenants</p>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">
                      {users.filter(u => u.role === 'Tenant' && u.isActive).length}
                    </p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Inactive Tenants</p>
                    <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-gray-600">
                      {users.filter(u => u.role === 'Tenant' && !u.isActive).length}
                    </p>
                  </div>
                  <UserX className="h-8 w-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tenant Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Users</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingScreen />
                </div>
              ) : (
              <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">TENANT</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">COMPANY</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">STATUS</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">LAST LOGIN</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.role === 'Tenant').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No tenant users found. Tenant users are automatically created when you add a tenant.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTenants.map((user) => (
                        <TableRow key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                {user.phone && (
                                  <p className="text-sm text-gray-500">{user.phone}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700">{user.department || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'success' : 'secondary'} className="capitalize">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              {canEdit ? (
                                <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                  <SettingsIcon className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" disabled title="No Edit Permission" className="text-gray-400">
                                  <Lock className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {totalTenantPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {tenantStartIndex + 1} to {Math.min(tenantEndIndex, filteredTenants.length)} of {filteredTenants.length} tenants
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalTenantPages}
                      onPageChange={setCurrentPage}
                      showControls
                    />
                  </div>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="others" className="space-y-4 sm:space-y-6">
          {/* Header with Add Button */}
          <div className="flex justify-end">
            {canAdd ? (
              <Button onClick={handleAddOtherUser} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add New User</span>
                <span className="sm:hidden">Add User</span>
              </Button>
            ) : (
              <Button disabled title="You don't have permission to add users" className="w-full sm:w-auto">
                <Lock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Add New User</span>
                <span className="sm:hidden">Add User</span>
              </Button>
            )}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Other Users</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingScreen />
                </div>
              ) : (
              <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">USER</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">ROLE</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">STATUS</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs">LAST LOGIN</TableHead>
                      <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.filter(u => u.selectedRoles?.includes('Technician') || u.selectedRoles?.includes('Vendor')).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No other users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.filter(u => u.selectedRoles?.includes('Technician') || u.selectedRoles?.includes('Vendor')).map((user) => (
                        <TableRow key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                {user.phone && (
                                  <p className="text-sm text-gray-500">{user.phone}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.selectedRoles?.includes('Technician') && <Badge variant="outline" className="text-xs">Technician</Badge>}
                              {user.selectedRoles?.includes('Vendor') && <Badge variant="outline" className="text-xs">Vendor</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'success' : 'secondary'} className="capitalize">
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-center">
                              {canEdit ? (
                                <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                                  <SettingsIcon className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" disabled title="No Edit Permission" className="text-gray-400">
                                  <Lock className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Form Modal - Outside tabs so it works from any tab */}
      <UserForm
        isOpen={isUserFormOpen}
        onClose={() => {
          setIsUserFormOpen(false);
          setIsOtherUserForm(false);
        }}
        user={selectedUser}
        onSave={handleSaveUser}
        isOtherUserForm={isOtherUserForm}
        onDelete={(userId) => {
          const user = users.find(u => u.id === userId);
          if (user) handleDeleteUser(user);
        }}
        onResetPassword={(userId) => {
          const user = users.find(u => u.id === userId);
          if (user) handleResetPassword(user);
        }}
        onToggleApprover={(userId, isApprover) => {
          const user = users.find(u => u.id === userId);
          if (user) handleToggleApprover(user);
        }}
      />

      {/* Permissions Editor Modal */}
      <PermissionsEditor
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        user={selectedUser}
        onSave={handleSavePermissions}
      />

      {/* Audit Logs Modal */}
      <AuditLogs
        isOpen={isAuditLogsOpen}
        onClose={() => setIsAuditLogsOpen(false)}
      />

      {/* View User Dialog */}
      {viewingUser && (
        <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details - {viewingUser.name}</DialogTitle>
              <DialogDescription>
                Complete information for {viewingUser.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-sm">{viewingUser.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{viewingUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Badge className={getRoleColor(viewingUser.role)}>
                    {viewingUser.role}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={viewingUser.isActive ? 'default' : 'secondary'}>
                    {viewingUser.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p className="text-sm">{viewingUser.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">2FA Status</label>
                  <Badge variant={viewingUser.twoFactorEnabled ? 'default' : 'outline'}>
                    {viewingUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{new Date(viewingUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <p className="text-sm">
                    {viewingUser.lastLogin ? new Date(viewingUser.lastLogin).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              </div>
              
              {/* Permissions Summary */}
              <div className="border-t pt-4">
                <h3 className="text-base sm:text-lg font-medium mb-3">Permissions Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {viewingUser.permissions.map((permission) => (
                    <div key={permission.module} className="text-sm">
                      <span className="font-medium">{permission.module}:</span>
                      <div className="flex gap-1 mt-1">
                        {permission.view && <Badge variant="outline" className="text-xs">View</Badge>}
                        {permission.add && <Badge variant="outline" className="text-xs">Add</Badge>}
                        {permission.edit && <Badge variant="outline" className="text-xs">Edit</Badge>}
                        {permission.delete && <Badge variant="outline" className="text-xs">Delete</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setViewingUser(null)} className="flex-1">
                  Close
                </Button>
                {canEdit ? (
                  <Button onClick={() => {
                    setViewingUser(null);
                    handleEditUser(viewingUser);
                  }} className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit User
                  </Button>
                ) : (
                  <Button disabled title="You don't have permission to edit users" className="flex-1">
                    <Lock className="h-3 w-3 mr-1" />
                    Edit User
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

export default UserManagement;