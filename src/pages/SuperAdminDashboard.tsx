import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import { Users, Building, Activity, Settings, Plus, Search, Edit, Trash2, Shield, Key, Bell, Database, Eye, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportTenantsToExcel, exportTenantsToPDF } from '@/utils/exportAdmin';
import { OccupancyChart, MonthlyRentChart, RevenueByPropertyChart, PendingPaymentsChart, TenantDistributionChart } from '@/components/charts/DashboardCharts';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBranches: 0,
    totalTenants: 0,
    systemHealth: 'Good'
  });
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState({
    taxRate: 18,
    currency: 'INR',
    emailNotifications: true,
    smsNotifications: false,
    apiKeys: {
      payment: '',
      email: '',
      sms: ''
    }
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data
      const mockUsers = [
        { id: '1', full_name: 'Super Admin', email: 'superadmin@rathinam.edu', role: 'super_admin', status: 'active', created_at: '2024-01-01' },
        { id: '2', full_name: 'Admin User', email: 'admin@rathinam.edu', role: 'admin', status: 'active', created_at: '2024-01-01' },
        { id: '3', full_name: 'Finance User', email: 'finance@rathinam.edu', role: 'finance', status: 'active', created_at: '2024-01-01' }
      ];
      
      const mockBranches = [
        { id: '1', name: 'Main Campus', city: 'Coimbatore', state: 'Tamil Nadu', phone: '+91-422-2987654' }
      ];
      
      const mockAuditLogs = [
        { id: '1', action: 'login', table_name: 'auth', created_at: '2024-01-20', user_id: '1', ip_address: '192.168.1.1' }
      ];

      setStats({
        totalUsers: mockUsers.length,
        totalBranches: mockBranches.length,
        totalTenants: 3,
        systemHealth: 'Good'
      });

      setUsers(mockUsers);
      setBranches(mockBranches);
      setAuditLogs(mockAuditLogs);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    toast({
      title: "Success",
      description: "User created successfully",
    });
    
    setIsUserDialogOpen(false);
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    toast({
      title: "Success",
      description: "User updated successfully",
    });
    
    setIsUserDialogOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async (userId: string) => {
    toast({
      title: "Success",
      description: "User deleted successfully",
    });
  };

  const handleCreateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    toast({
      title: "Success",
      description: "Branch created successfully",
    });
    
    setIsBranchDialogOpen(false);
  };

  const handleUpdateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    toast({
      title: "Success",
      description: "Branch updated successfully",
    });
    
    setIsBranchDialogOpen(false);
    setSelectedBranch(null);
  };

  const handleDeleteBranch = async (branchId: string) => {
    toast({
      title: "Success",
      description: "Branch deleted successfully",
    });
  };

  const handleSaveSettings = async () => {
    toast({
      title: "Success",
      description: "Settings saved successfully",
    });
  };

  const getRoleColor = (role: string) => {
    const colors = {
      super_admin: 'destructive',
      admin: 'default',
      finance: 'secondary',
      crm: 'outline',
      tenant: 'default',
      maintenance: 'secondary'
    };
    return colors[role as keyof typeof colors] || 'default';
  };

  return (
    <DashboardLayout title="Super Admin Dashboard" subtitle="System Overview & Management">
      <div className="space-y-4 sm:space-y-6">
        {/* Enhanced Stats Overview */}
        <DashboardStats userRole="super_admin" />

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          <OccupancyChart />
          <MonthlyRentChart />
          <RevenueByPropertyChart />
          <PendingPaymentsChart />
          <TenantDistributionChart />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage system users and their roles</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <ExportDropdown 
                      onExportExcel={() => {
                        const userData = users.map(user => ({
                          id: user.id,
                          company_name: user.full_name,
                          contact_person: user.full_name,
                          email: user.email,
                          phone: '',
                          status: user.status,
                          space_type: user.role,
                          monthly_rent: 0,
                          lease_start: user.created_at,
                          lease_end: '2024-12-31'
                        }));
                        exportTenantsToExcel(userData);
                      }}
                      onExportPDF={() => {
                        const userData = users.map(user => ({
                          id: user.id,
                          company_name: user.full_name,
                          contact_person: user.full_name,
                          email: user.email,
                          phone: '',
                          status: user.status,
                          space_type: user.role,
                          monthly_rent: 0,
                          lease_start: user.created_at,
                          lease_end: '2024-12-31'
                        }));
                        exportTenantsToPDF(userData);
                      }}
                    />
                    <Button onClick={() => { setSelectedUser(null); setIsUserDialogOpen(true); }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users..." className="max-w-sm" />
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={getRoleColor(user.role) as any}>
                                {user.role.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => { setSelectedUser(user); setIsUserDialogOpen(true); }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this user? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Branch Management</CardTitle>
                    <CardDescription>Manage branch locations and settings</CardDescription>
                  </div>
                  <Button onClick={() => { setSelectedBranch(null); setIsBranchDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Branch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((branch: any) => (
                        <TableRow key={branch.id}>
                          <TableCell className="font-medium">{branch.name}</TableCell>
                          <TableCell>{branch.city}, {branch.state}</TableCell>
                          <TableCell>{branch.phone}</TableCell>
                          <TableCell>
                            <Badge variant="default">Active</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => { setSelectedBranch(branch); setIsBranchDialogOpen(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Branch</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this branch? This will affect all associated users and data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteBranch(branch.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role-Based Permissions</CardTitle>
                <CardDescription>Configure permissions for each role</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { role: 'super_admin', name: 'Super Admin', color: 'bg-red-100 text-red-800' },
                    { role: 'admin', name: 'Admin', color: 'bg-blue-100 text-blue-800' },
                    { role: 'finance', name: 'Finance', color: 'bg-green-100 text-green-800' },
                    { role: 'crm', name: 'CRM/Sales', color: 'bg-purple-100 text-purple-800' },
                    { role: 'tenant', name: 'Tenant', color: 'bg-yellow-100 text-yellow-800' },
                    { role: 'maintenance', name: 'Maintenance', color: 'bg-orange-100 text-orange-800' }
                  ].map((roleInfo) => (
                    <Card key={roleInfo.role} className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="h-5 w-5" />
                        <Badge className={roleInfo.color}>{roleInfo.name}</Badge>
                      </div>
                      <div className="space-y-3">
                        {[
                          'View Dashboard',
                          'Manage Tenants',
                          'Manage Billing',
                          'View Analytics',
                          'Manage Maintenance',
                          'System Settings'
                        ].map((permission) => (
                          <div key={permission} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <span className="text-sm">{permission}</span>
                            <Switch 
                              defaultChecked={roleInfo.role === 'super_admin'}
                              disabled={roleInfo.role === 'super_admin'}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>System Audit Logs</CardTitle>
                    <CardDescription>Track system activities and user actions</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input placeholder="Search logs..." className="w-full sm:w-64" />
                    <Select defaultValue="all">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                        <SelectItem value="update">Update</SelectItem>
                        <SelectItem value="delete">Delete</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                      </SelectContent>
                    </Select>
                    <ExportDropdown 
                      onExportExcel={() => {
                        const logData = auditLogs.map(log => ({
                          id: log.id,
                          company_name: `Audit Log ${log.id}`,
                          contact_person: log.user_id || 'System',
                          email: log.action,
                          phone: log.ip_address || '',
                          status: log.table_name,
                          space_type: 'audit',
                          monthly_rent: 0,
                          lease_start: log.created_at,
                          lease_end: log.created_at
                        }));
                        exportTenantsToExcel(logData);
                      }}
                      onExportPDF={() => {
                        const logData = auditLogs.map(log => ({
                          id: log.id,
                          company_name: `Audit Log ${log.id}`,
                          contact_person: log.user_id || 'System',
                          email: log.action,
                          phone: log.ip_address || '',
                          status: log.table_name,
                          space_type: 'audit',
                          monthly_rent: 0,
                          lease_start: log.created_at,
                          lease_end: log.created_at
                        }));
                        exportTenantsToPDF(logData);
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length > 0 ? auditLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {log.user_id || 'System'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.action === 'delete' ? 'destructive' : 'default'}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.table_name}</TableCell>
                          <TableCell>{log.ip_address || 'N/A'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* General Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>Configure basic system settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Tax Rate (%)</Label>
                      <Input 
                        type="number" 
                        value={systemSettings.taxRate}
                        onChange={(e) => setSystemSettings({...systemSettings, taxRate: Number(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select 
                        value={systemSettings.currency}
                        onValueChange={(value) => setSystemSettings({...systemSettings, currency: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send email notifications to users</p>
                      </div>
                      <Switch 
                        checked={systemSettings.emailNotifications}
                        onCheckedChange={(checked) => setSystemSettings({...systemSettings, emailNotifications: checked})}
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">Send SMS notifications to users</p>
                      </div>
                      <Switch 
                        checked={systemSettings.smsNotifications}
                        onCheckedChange={(checked) => setSystemSettings({...systemSettings, smsNotifications: checked})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Keys */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys & Integrations
                  </CardTitle>
                  <CardDescription>Manage third-party service integrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Gateway API Key</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter payment gateway API key"
                      value={systemSettings.apiKeys.payment}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings, 
                        apiKeys: {...systemSettings.apiKeys, payment: e.target.value}
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email Service API Key</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter email service API key"
                      value={systemSettings.apiKeys.email}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings, 
                        apiKeys: {...systemSettings.apiKeys, email: e.target.value}
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>SMS Service API Key</Label>
                    <Input 
                      type="password" 
                      placeholder="Enter SMS service API key"
                      value={systemSettings.apiKeys.sms}
                      onChange={(e) => setSystemSettings({
                        ...systemSettings, 
                        apiKeys: {...systemSettings.apiKeys, sms: e.target.value}
                      })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Templates */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Templates
                  </CardTitle>
                  <CardDescription>Configure email and SMS templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="welcome" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="welcome">Welcome Email</TabsTrigger>
                      <TabsTrigger value="invoice">Invoice Reminder</TabsTrigger>
                      <TabsTrigger value="maintenance">Maintenance Alert</TabsTrigger>
                      <TabsTrigger value="renewal">Lease Renewal</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="welcome" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input placeholder="Welcome to TenantPro" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Textarea 
                          placeholder="Welcome {{tenant_name}} to our platform..."
                          rows={6}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="invoice" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input placeholder="Invoice Reminder - {{invoice_number}}" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Textarea 
                          placeholder="Dear {{tenant_name}}, your invoice {{invoice_number}} is due..."
                          rows={6}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="maintenance" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input placeholder="Maintenance Update - {{ticket_number}}" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Textarea 
                          placeholder="Your maintenance request {{ticket_number}} has been updated..."
                          rows={6}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="renewal" className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input placeholder="Lease Renewal Notice" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Textarea 
                          placeholder="Dear {{tenant_name}}, your lease expires on {{expiry_date}}..."
                          rows={6}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} size="lg">
                <Database className="mr-2 h-4 w-4" />
                Save All Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* User Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedUser ? 'Edit User' : 'Create New User'}</DialogTitle>
              <DialogDescription>
                {selectedUser ? 'Update user information and permissions' : 'Add a new user to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={selectedUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  defaultValue={selectedUser?.full_name || ''}
                  required 
                />
              </div>
              {!selectedUser && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={selectedUser?.phone || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={selectedUser?.role || ''} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="crm">CRM/Sales</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchId">Branch</Label>
                <Select name="branchId" defaultValue={selectedUser?.branch_id || ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedUser && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={selectedUser?.status || 'active'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button type="submit" className="w-full">
                {selectedUser ? 'Update User' : 'Create User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Branch Dialog */}
        <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedBranch ? 'Edit Branch' : 'Create New Branch'}</DialogTitle>
              <DialogDescription>
                {selectedBranch ? 'Update branch information' : 'Add a new branch location'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={selectedBranch ? handleUpdateBranch : handleCreateBranch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  defaultValue={selectedBranch?.name || ''}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea 
                  id="address" 
                  name="address" 
                  defaultValue={selectedBranch?.address || ''}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    defaultValue={selectedBranch?.city || ''}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input 
                    id="state" 
                    name="state" 
                    defaultValue={selectedBranch?.state || ''}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input 
                  id="postalCode" 
                  name="postalCode" 
                  defaultValue={selectedBranch?.postal_code || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  defaultValue={selectedBranch?.phone || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email"
                  defaultValue={selectedBranch?.email || ''}
                />
              </div>
              <Button type="submit" className="w-full">
                {selectedBranch ? 'Update Branch' : 'Create Branch'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}