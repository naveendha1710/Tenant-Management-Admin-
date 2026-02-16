import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { type AppUser, type Permission, userService } from '@/data/userData';

interface PermissionsEditorProps {
  isOpen: boolean;
  onClose: () => void;
  user: AppUser | null;
  onSave: (permissions: Permission[]) => void;
}

export const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onSave 
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [useRoleDefaults, setUseRoleDefaults] = useState(true);
  const [isApprover, setIsApprover] = useState(false);

  useEffect(() => {
    if (user) {
      setPermissions([...user.permissions]);
      setIsApprover(user.isApprover || false);
      // Check if current permissions match role defaults
      const defaultPermissions = userService.getDefaultPermissions(user.role);
      const isDefault = JSON.stringify(user.permissions) === JSON.stringify(defaultPermissions);
      setUseRoleDefaults(isDefault);
    }
  }, [user, isOpen]);

  const handlePermissionChange = (module: string, field: keyof Permission, value: boolean) => {
    const newPermissions = [...permissions];
    const existingIndex = newPermissions.findIndex(p => p.module === module);
    
    if (existingIndex >= 0) {
      // Update existing permission
      (newPermissions[existingIndex] as any)[field] = value;
      // If view is turned off, turn off all other permissions
      if (field === 'view' && !value) {
        newPermissions[existingIndex].add = false;
        newPermissions[existingIndex].edit = false;
        newPermissions[existingIndex].delete = false;
      }
    } else {
      // Create new permission
      const newPermission: Permission = {
        module,
        view: false,
        add: false,
        edit: false,
        delete: false
      };
      (newPermission as any)[field] = value;
      newPermissions.push(newPermission);
    }
    
    setPermissions(newPermissions);
    setUseRoleDefaults(false);
  };

  const handleUseDefaults = (useDefaults: boolean) => {
    setUseRoleDefaults(useDefaults);
    if (useDefaults && user) {
      setPermissions(userService.getDefaultPermissions(user.role));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      await userService.updateUser(user.id, { permissions, isApprover });
      onSave(permissions);
      onClose();
    }
  };

  if (!user) return null;

  const moduleGroups = {
    'Dashboard': ['Overview'],
    'Buildings': ['Buildings'],
    'Tenants': ['Tenants'],
    'Companies': ['Companies'],
    'Accounts': ['Rent Collection', 'Invoices', 'Expenses', 'Deposits', 'Financial Reports'],
    'Maintenance': ['Manage Tickets'],
    'Assets': ['Assets', 'Asset Master', 'Asset Movement', 'Inventory', 'Preventive Maintenance', 'Physical Audit', 'Configuration'],
    'User Management': ['Users'],
    'Master Settings': ['Settings', 'Asset Form', 'Tenant Form'],
    'Roles': ['Helpdesk']
  };

  const allModules = Object.values(moduleGroups).flat();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Permissions - {user.name}</DialogTitle>
          <DialogDescription>
            Configure module access permissions for {user.name} ({user.role})
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Role Default Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permission Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="useDefaults"
                  checked={useRoleDefaults}
                  onCheckedChange={handleUseDefaults}
                />
                <Label htmlFor="useDefaults">
                  Use default permissions for {user.role} role
                </Label>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isApprover"
                  checked={isApprover}
                  onCheckedChange={setIsApprover}
                />
                <Label htmlFor="isApprover">
                  User is an Approver
                </Label>
                <Badge variant={isApprover ? "default" : "outline"}>
                  {isApprover ? "Approver" : "Non-Approver"}
                </Badge>
              </div>
              
              {!useRoleDefaults && (
                <p className="text-sm text-muted-foreground">
                  Custom permissions are configured for this user
                </p>
              )}
            </CardContent>
          </Card>

          {/* Permissions Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Module Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-2 border-b">
                  <div className="font-medium">Module</div>
                  <div className="font-medium text-center">View</div>
                  <div className="font-medium text-center">Add</div>
                  <div className="font-medium text-center">Edit</div>
                  <div className="font-medium text-center">Delete</div>
                </div>

                {/* Permission Rows by Module Groups */}
                {Object.entries(moduleGroups).map(([groupName, modules]) => (
                  <div key={groupName}>
                    {/* Group Header */}
                    <div className="bg-muted/50 px-3 py-2 rounded-md mb-2 mt-4">
                      <h4 className="font-semibold text-sm">{groupName}</h4>
                    </div>
                    
                    {/* Modules in Group */}
                    {modules.map((module) => {
                      const permission = permissions.find(p => p.module === module) || {
                        module,
                        view: false,
                        add: false,
                        edit: false,
                        delete: false
                      };

                      return (
                        <div key={module} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center py-2 pl-4">
                          <div className="font-medium text-sm">{module}</div>
                          <div className="flex justify-center">
                            {useRoleDefaults ? (
                              <Lock className="h-4 w-4 text-muted-foreground" title="Using role defaults" />
                            ) : (
                              <Switch
                                checked={permission.view}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module, 'view', checked)
                                }
                              />
                            )}
                          </div>
                          <div className="flex justify-center">
                            {useRoleDefaults || !permission.view ? (
                              <Lock className="h-4 w-4 text-muted-foreground" title={useRoleDefaults ? "Using role defaults" : "View permission required"} />
                            ) : (
                              <Switch
                                checked={permission.add}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module, 'add', checked)
                                }
                              />
                            )}
                          </div>
                          <div className="flex justify-center">
                            {useRoleDefaults || !permission.view ? (
                              <Lock className="h-4 w-4 text-muted-foreground" title={useRoleDefaults ? "Using role defaults" : "View permission required"} />
                            ) : (
                              <Switch
                                checked={permission.edit}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module, 'edit', checked)
                                }
                              />
                            )}
                          </div>
                          <div className="flex justify-center">
                            {useRoleDefaults || !permission.view ? (
                              <Lock className="h-4 w-4 text-muted-foreground" title={useRoleDefaults ? "Using role defaults" : "View permission required"} />
                            ) : (
                              <Switch
                                checked={permission.delete}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(module, 'delete', checked)
                                }
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Permission Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Permission Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissions.filter(p => p.view).map((permission) => (
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
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Save Permissions
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};