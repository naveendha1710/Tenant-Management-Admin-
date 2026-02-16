import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, User, Settings, Save, RotateCcw, Copy, Plus, Edit, Trash2 } from 'lucide-react';
import { userService, type AppUser, type Permission } from '@/data/userData';
import { useToast } from '@/hooks/use-toast';

const AVAILABLE_MODULES = [
  'Buildings', 'Tenants', 'Companies', 'Rent Collection', 
  'Invoices', 'Expenses', 'Deposits', 'Financial Reports', 
  'Users', 'Settings', 'Maintenance', 'CRM'
];

const PERMISSION_ACTIONS = [
  { key: 'view', label: 'View', description: 'Can view data' },
  { key: 'add', label: 'Add', description: 'Can create new records' },
  { key: 'edit', label: 'Edit', description: 'Can modify existing records' },
  { key: 'delete', label: 'Delete', description: 'Can remove records' }
];

export function PermissionsManager() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [originalPermissions, setOriginalPermissions] = useState<Permission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const permissionsChanged = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
    setHasChanges(permissionsChanged);
  }, [permissions, originalPermissions]);

  const loadUsers = async () => {
    const allUsers = await userService.getAllUsers();
    setUsers(allUsers);
  };

  const handleUserSelect = (user: AppUser) => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to switch users?')) {
        return;
      }
    }
    
    setSelectedUser(user);
    setPermissions([...user.permissions]);
    setOriginalPermissions([...user.permissions]);
    setHasChanges(false);
  };

  const updatePermission = (moduleIndex: number, action: keyof Permission, value: boolean) => {
    const newPermissions = [...permissions];
    newPermissions[moduleIndex] = {
      ...newPermissions[moduleIndex],
      [action]: value
    };
    setPermissions(newPermissions);
  };

  const addModule = () => {
    const availableModules = AVAILABLE_MODULES.filter(
      module => !permissions.find(p => p.module === module)
    );
    
    if (availableModules.length === 0) {
      toast({
        title: "No modules available",
        description: "All modules have been added to this user's permissions.",
        variant: "destructive"
      });
      return;
    }

    const newPermission: Permission = {
      module: availableModules[0],
      view: false,
      add: false,
      edit: false,
      delete: false
    };
    
    setPermissions([...permissions, newPermission]);
  };

  const removeModule = (index: number) => {
    const newPermissions = permissions.filter((_, i) => i !== index);
    setPermissions(newPermissions);
  };

  const updateModuleName = (index: number, newModule: string) => {
    const newPermissions = [...permissions];
    newPermissions[index] = {
      ...newPermissions[index],
      module: newModule
    };
    setPermissions(newPermissions);
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    const success = await userService.updatePermissions(selectedUser.id, permissions);
    
    if (success) {
      setOriginalPermissions([...permissions]);
      setHasChanges(false);
      
      // Update the user in the list
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, permissions: [...permissions] }
          : user
      );
      setUsers(updatedUsers);
      setSelectedUser({ ...selectedUser, permissions: [...permissions] });
      
      toast({
        title: "Success",
        description: "Permissions updated successfully"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update permissions",
        variant: "destructive"
      });
    }
  };

  const resetPermissions = () => {
    setPermissions([...originalPermissions]);
    setHasChanges(false);
  };

  const applyRoleTemplate = (role: string) => {
    if (!selectedUser) return;
    
    const defaultPermissions = userService.getDefaultPermissions(role as any);
    setPermissions([...defaultPermissions]);
    setIsTemplateOpen(false);
  };

  const copyPermissionsFrom = (sourceUser: AppUser) => {
    setPermissions([...sourceUser.permissions]);
    setIsTemplateOpen(false);
  };

  const toggleAllPermissions = (moduleIndex: number, enabled: boolean) => {
    const newPermissions = [...permissions];
    const actions: (keyof Permission)[] = ['view', 'add', 'edit', 'delete'];
    
    actions.forEach(action => {
      if (typeof newPermissions[moduleIndex][action] === 'boolean') {
        newPermissions[moduleIndex][action] = enabled;
      }
    });
    
    setPermissions(newPermissions);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roles = [...new Set(users.map(user => user.role).filter(role => role && role.trim() !== ''))];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* User Selection */}
            <div className="space-y-4">
              <div>
                <Label>Search Users</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Filter by Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.permissions.length} modules
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions Editor */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email} • {selectedUser.role}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTemplateOpen(true)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Templates
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addModule}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Module
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module</TableHead>
                          <TableHead className="text-center">View</TableHead>
                          <TableHead className="text-center">Add</TableHead>
                          <TableHead className="text-center">Edit</TableHead>
                          <TableHead className="text-center">Delete</TableHead>
                          <TableHead className="text-center">Approve</TableHead>
                          <TableHead className="text-center">All</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissions.map((permission, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Select
                                value={permission.module}
                                onValueChange={(value) => updateModuleName(index, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AVAILABLE_MODULES.map(module => (
                                    <SelectItem key={module} value={module}>
                                      {module}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={permission.view}
                                onCheckedChange={(checked) => updatePermission(index, 'view', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={permission.add}
                                onCheckedChange={(checked) => updatePermission(index, 'add', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={permission.edit}
                                onCheckedChange={(checked) => updatePermission(index, 'edit', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={permission.delete}
                                onCheckedChange={(checked) => updatePermission(index, 'delete', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={permission.approve || false}
                                onCheckedChange={(checked) => updatePermission(index, 'approve', checked)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={permission.view && permission.add && permission.edit && permission.delete}
                                onCheckedChange={(checked) => toggleAllPermissions(index, checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeModule(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {hasChanges && (
                    <div className="flex justify-between items-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800">You have unsaved changes</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" size="sm" onClick={resetPermissions}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button size="sm" onClick={savePermissions}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a user to manage their permissions</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Dialog */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Permission Templates</DialogTitle>
            <DialogDescription>
              Apply predefined permission templates or copy from another user
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="roles">Role Templates</TabsTrigger>
              <TabsTrigger value="users">Copy from User</TabsTrigger>
            </TabsList>
            
            <TabsContent value="roles" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {['Super Admin', 'Admin', 'Accountant', 'Maintenance Manager', 'Viewer'].map(role => (
                  <Card key={role} className="cursor-pointer hover:bg-gray-50" onClick={() => applyRoleTemplate(role)}>
                    <CardContent className="p-4">
                      <div className="font-medium">{role}</div>
                      <div className="text-sm text-muted-foreground">
                        {userService.getDefaultPermissions(role as any).length} modules
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {users.filter(u => u.id !== selectedUser?.id).map(user => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center p-3 border rounded cursor-pointer hover:bg-gray-50"
                    onClick={() => copyPermissionsFrom(user)}
                  >
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.role}</div>
                    </div>
                    <Badge variant="outline">
                      {user.permissions.length} modules
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}