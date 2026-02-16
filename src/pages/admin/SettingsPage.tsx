import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Key, Bell, FileText, Building, Eye, Copy, RefreshCw, Trash2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

const mockTaxRules = [
  {
    id: 'TAX001',
    name: 'GST - 18%',
    type: 'GST',
    rate: 18,
    applicable_to: 'All Services',
    active: true
  },
  {
    id: 'TAX002',
    name: 'Service Tax - 12%',
    type: 'Service Tax',
    rate: 12,
    applicable_to: 'Maintenance Services',
    active: true
  },
  {
    id: 'TAX003',
    name: 'Security Deposit Tax - 0%',
    type: 'Exemption',
    rate: 0,
    applicable_to: 'Security Deposits',
    active: true
  }
];

const mockNotificationTemplates = [
  {
    id: 'NT001',
    name: 'Welcome Email',
    type: 'email',
    trigger: 'tenant_onboarding',
    subject: 'Welcome to Rathinam Nexus Suite',
    active: true
  },
  {
    id: 'NT002',
    name: 'Invoice Due Reminder',
    type: 'email',
    trigger: 'invoice_due',
    subject: 'Invoice Due Reminder - {{invoice_id}}',
    active: true
  },
  {
    id: 'NT003',
    name: 'Maintenance Ticket Created',
    type: 'sms',
    trigger: 'maintenance_created',
    subject: 'Maintenance ticket {{ticket_id}} created',
    active: true
  }
];

const mockApiKeys = [
  {
    id: 'API001',
    name: 'Payment Gateway API',
    key: 'pk_live_51H*********************',
    service: 'Stripe',
    created_date: '2024-01-01',
    last_used: '2024-01-20',
    status: 'active'
  },
  {
    id: 'API002',
    name: 'SMS Service API',
    key: 'sk_test_26*********************',
    service: 'Twilio',
    created_date: '2024-01-05',
    last_used: '2024-01-18',
    status: 'active'
  },
  {
    id: 'API003',
    name: 'Email Service API',
    key: 'SG.*********************',
    service: 'SendGrid',
    created_date: '2024-01-10',
    last_used: '2024-01-19',
    status: 'inactive'
  }
];

const mockAuditLogs = [
  {
    id: 'AL001',
    user: 'admin@rathinam.edu',
    action: 'Created new tenant',
    resource: 'Tenant: TechStart Solutions',
    timestamp: '2024-01-20 10:30:00',
    ip_address: '192.168.1.100'
  },
  {
    id: 'AL002',
    user: 'finance@rathinam.edu',
    action: 'Generated invoice',
    resource: 'Invoice: INV001',
    timestamp: '2024-01-20 09:15:00',
    ip_address: '192.168.1.101'
  },
  {
    id: 'AL003',
    user: 'admin@rathinam.edu',
    action: 'Updated system settings',
    resource: 'Tax Rules Configuration',
    timestamp: '2024-01-19 16:45:00',
    ip_address: '192.168.1.102'
  }
];

const mockBranches = [
  {
    id: 'BR001',
    name: 'Main Campus',
    address: 'Rathinam Campus, Eachanari, Coimbatore',
    contact_person: 'Dr. Admin',
    phone: '+91 9876543210',
    email: 'admin@rathinam.edu',
    active: true
  },
  {
    id: 'BR002',
    name: 'Innovation Hub',
    address: 'Rathinam Innovation Center, Coimbatore',
    contact_person: 'Mr. Innovation',
    phone: '+91 9876543211',
    email: 'innovation@rathinam.edu',
    active: true
  }
];

export default function SettingsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const canView = hasPermission(user, 'Settings', 'view');
  const canAdd = hasPermission(user, 'Settings', 'add');
  const canEdit = hasPermission(user, 'Settings', 'edit');
  const canDelete = hasPermission(user, 'Settings', 'delete');

  if (!canView) {
    return (
      <DashboardLayout title="Settings" subtitle="System configuration">
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <Lock className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Access Denied</h3>
              <p className="text-muted-foreground">You don't have permission to view settings.</p>
            </div>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  const handleSaveTaxRule = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Success",
      description: "Tax rule saved successfully",
    });
  };

  const handleSaveNotificationSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: "Success",
      description: "Notification settings saved successfully",
    });
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const regenerateApiKey = (keyId: string) => {
    toast({
      title: "API Key Regenerated",
      description: "New API key has been generated",
    });
  };

  return (
    <DashboardLayout title="System Settings" subtitle="Configure system-wide settings">
      <div className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="tax" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="tax">Tax Rules</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
          </TabsList>

          {/* Tax Rules Tab */}
          <TabsContent value="tax" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add/Edit Tax Rule</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveTaxRule} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax-name">Tax Name *</Label>
                      <Input id="tax-name" name="tax-name" placeholder="e.g., GST - 18%" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-type">Tax Type *</Label>
                      <Input id="tax-type" name="tax-type" placeholder="e.g., GST, Service Tax" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax-rate">Tax Rate (%) *</Label>
                      <Input id="tax-rate" name="tax-rate" type="number" min="0" max="100" step="0.01" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicable-to">Applicable To *</Label>
                      <Input id="applicable-to" name="applicable-to" placeholder="e.g., All Services, Rent Only" required />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="tax-active" />
                      <Label htmlFor="tax-active">Active</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={!canAdd}>
                      {!canAdd && <Lock className="mr-2 h-4 w-4" />}
                      Save Tax Rule
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Tax Rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTaxRules.map((rule: any) => (
                      <div key={rule.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{rule.name}</h4>
                          <Badge variant={rule.active ? "default" : "secondary"}>
                            {rule.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Type: {rule.type}</div>
                          <div>Rate: {rule.rate}%</div>
                          <div>Applies to: {rule.applicable_to}</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" disabled={!canEdit}>
                            {!canEdit && <Lock className="mr-1 h-3 w-3" />}
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" disabled={!canEdit}>
                            {!canEdit && <Lock className="mr-1 h-3 w-3" />}
                            {rule.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveNotificationSettings} className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Send email notifications to users</p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Send SMS notifications for urgent matters</p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div>
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Send push notifications to mobile app</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={!canEdit}>
                      {!canEdit && <Lock className="mr-2 h-4 w-4" />}
                      Save Settings
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockNotificationTemplates.map((template: any) => (
                      <div key={template.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Badge variant="outline" className="capitalize">{template.type}</Badge>
                            <Badge variant={template.active ? "default" : "secondary"}>
                              {template.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>Trigger: {template.trigger.replace('_', ' ')}</div>
                          <div>Subject: {template.subject}</div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={!canEdit}
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsTemplateDialogOpen(true);
                            }}
                          >
                            {!canEdit && <Lock className="mr-1 h-3 w-3" />}
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">Preview</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>API Key Management</CardTitle>
                  <Button onClick={() => setIsApiKeyDialogOpen(true)} disabled={!canAdd}>
                    {!canAdd ? <Lock className="mr-2 h-4 w-4" /> : <Key className="mr-2 h-4 w-4" />}
                    Add API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockApiKeys.map((apiKey: any) => (
                        <TableRow key={apiKey.id}>
                          <TableCell className="font-medium">{apiKey.name}</TableCell>
                          <TableCell>{apiKey.service}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {apiKey.key}
                              </code>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => copyApiKey(apiKey.key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={apiKey.status === 'active' ? "default" : "secondary"}>
                              {apiKey.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(apiKey.last_used).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={!canEdit}
                                onClick={() => regenerateApiKey(apiKey.id)}
                              >
                                {!canEdit ? <Lock className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                              </Button>
                              <Button variant="outline" size="sm" disabled={!canDelete}>
                                {!canDelete ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
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

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAuditLogs.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.user}</TableCell>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.resource}</TableCell>
                          <TableCell>{log.timestamp}</TableCell>
                          <TableCell>{log.ip_address}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cache Tab */}
          <TabsContent value="cache" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Clear Browser Cache</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Clear cached data to see the latest updates. This will reload the application.
                </p>
                <Button 
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Clear Cache & Reload
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Multi-Branch Configuration</CardTitle>
                  <Button disabled={!canAdd}>
                    {!canAdd ? <Lock className="mr-2 h-4 w-4" /> : <Building className="mr-2 h-4 w-4" />}
                    Add Branch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mockBranches.map((branch: any) => (
                    <Card key={branch.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <CardTitle className="text-lg">{branch.name}</CardTitle>
                          <Badge variant={branch.active ? "default" : "secondary"}>
                            {branch.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Address:</span>
                            <p className="text-muted-foreground">{branch.address}</p>
                          </div>
                          <div>
                            <span className="font-medium">Contact Person:</span>
                            <p className="text-muted-foreground">{branch.contact_person}</p>
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span>
                            <p className="text-muted-foreground">{branch.phone}</p>
                          </div>
                          <div>
                            <span className="font-medium">Email:</span>
                            <p className="text-muted-foreground">{branch.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1" disabled={!canEdit}>
                            {!canEdit && <Lock className="mr-1 h-3 w-3" />}
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1" disabled={!canEdit}>
                            {!canEdit && <Lock className="mr-1 h-3 w-3" />}
                            {branch.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Template Edit Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Notification Template</DialogTitle>
              <DialogDescription>
                Customize notification template content
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input 
                    id="template-subject" 
                    defaultValue={selectedTemplate.subject}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-content">Content</Label>
                  <Textarea 
                    id="template-content" 
                    rows={8}
                    placeholder="Enter template content..."
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button className="flex-1" disabled={!canEdit}>
                    {!canEdit && <Lock className="mr-2 h-4 w-4" />}
                    Save Template
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* API Key Dialog */}
        <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add API Key</DialogTitle>
              <DialogDescription>
                Add a new API key for external service integration
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-name">API Name *</Label>
                <Input id="api-name" placeholder="e.g., Payment Gateway API" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-service">Service *</Label>
                <Input id="api-service" placeholder="e.g., Stripe, Twilio" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key *</Label>
                <Input id="api-key" placeholder="Enter API key" required />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button className="flex-1" disabled={!canAdd}>
                  {!canAdd && <Lock className="mr-2 h-4 w-4" />}
                  Add API Key
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}