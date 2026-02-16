import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Key, Bell, Database, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    taxRate: 18,
    currency: 'INR',
    emailNotifications: true,
    smsNotifications: false,
    apiKeys: {
      payment: '',
      email: '',
      sms: ''
    },
    templates: {
      welcome: {
        subject: 'Welcome to TenantPro',
        body: 'Welcome {{tenant_name}} to our platform...'
      },
      invoice: {
        subject: 'Invoice Reminder - {{invoice_number}}',
        body: 'Dear {{tenant_name}}, your invoice {{invoice_number}} is due...'
      },
      maintenance: {
        subject: 'Maintenance Update - {{ticket_number}}',
        body: 'Your maintenance request {{ticket_number}} has been updated...'
      },
      renewal: {
        subject: 'Lease Renewal Notice',
        body: 'Dear {{tenant_name}}, your lease expires on {{expiry_date}}...'
      }
    }
  });
  
  const { toast } = useToast();

  const handleSaveSettings = async () => {
    try {
      // In a real app, you'd save to a settings table
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout 
      title="System Settings" 
      subtitle="Configure global system settings and integrations"
    >
      <div className="space-y-4 sm:space-y-6">
        <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Configure basic system settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label>Default Tax Rate (%)</Label>
                    <Input 
                      type="number" 
                      value={settings.taxRate}
                      onChange={(e) => setSettings({...settings, taxRate: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select 
                      value={settings.currency}
                      onValueChange={(value) => setSettings({...settings, currency: value})}
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
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send SMS notifications to users</p>
                    </div>
                    <Switch 
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4 sm:space-y-6">
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
                    value={settings.apiKeys.payment}
                    onChange={(e) => setSettings({
                      ...settings, 
                      apiKeys: {...settings.apiKeys, payment: e.target.value}
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email Service API Key</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter email service API key"
                    value={settings.apiKeys.email}
                    onChange={(e) => setSettings({
                      ...settings, 
                      apiKeys: {...settings.apiKeys, email: e.target.value}
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>SMS Service API Key</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter SMS service API key"
                    value={settings.apiKeys.sms}
                    onChange={(e) => setSettings({
                      ...settings, 
                      apiKeys: {...settings.apiKeys, sms: e.target.value}
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Email Notifications</h4>
                    {[
                      'New tenant registration',
                      'Payment received',
                      'Maintenance requests',
                      'Lease renewals',
                      'Document expiry alerts'
                    ].map((item) => (
                      <div key={item} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <span className="text-sm">{item}</span>
                        <Switch defaultChecked />
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">SMS Notifications</h4>
                    {[
                      'Payment reminders',
                      'Urgent maintenance',
                      'Security alerts',
                      'System downtime',
                      'Emergency notifications'
                    ].map((item) => (
                      <div key={item} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <span className="text-sm">{item}</span>
                        <Switch />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 sm:space-y-6">
            <Card>
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
                  
                  {Object.entries(settings.templates).map(([key, template]) => (
                    <TabsContent key={key} value={key} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Subject</Label>
                        <Input 
                          value={template.subject}
                          onChange={(e) => setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              [key]: { ...template, subject: e.target.value }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Template</Label>
                        <Textarea 
                          value={template.body}
                          onChange={(e) => setSettings({
                            ...settings,
                            templates: {
                              ...settings.templates,
                              [key]: { ...template, body: e.target.value }
                            }
                          })}
                          rows={6}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Available variables: {{tenant_name}}, {{invoice_number}}, {{ticket_number}}, {{expiry_date}}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} size="lg">
            <Save className="mr-2 h-4 w-4" />
            Save All Settings
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}