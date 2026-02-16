import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { settingsService } from '@/services/settingsService';
import type { SystemSettings } from '@/data/settingsData';
import { 
  Settings as SettingsIcon, 
  Building, 
  CreditCard, 
  Mail, 
  FileText, 
  Calculator, 
  Database,
  Save,
  RotateCcw,
  Upload,
  Download,
  Eye,
  Lock,
  Bell
} from 'lucide-react';
import { CustomNotificationForm } from '@/components/admin/CustomNotificationForm';
import { NotificationEventManager } from '@/components/admin/NotificationEventManager';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/utils/permissionUtils';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [activeTab, setActiveTab] = useState('organization');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await settingsService.getSettings();
    if (data) setSettings(data);
  };

  const canView = hasPermission(user?.appUser, 'Settings', 'view');
  const canAdd = hasPermission(user?.appUser, 'Settings', 'add');
  const canEdit = hasPermission(user?.appUser, 'Settings', 'edit');
  const canDelete = hasPermission(user?.appUser, 'Settings', 'delete');

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

  const handleSave = async (section: keyof SystemSettings) => {
    if (!settings) return;
    try {
      const success = await settingsService.updateSettings(section, settings[section]);
      if (success) {
        toast({ title: "Success", description: "Settings saved successfully" });
      } else {
        toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    }
  };

  const handleReset = async () => {
    await loadSettings();
    toast({ title: "Success", description: "Settings reloaded" });
  };

  const handleBackup = () => {
    // Simulate backup
    toast({ title: "Success", description: "Backup created successfully" });
  };

  const handleRestore = () => {
    // Simulate restore
    toast({ title: "Success", description: "Data restored successfully" });
  };

  return (
    <DashboardLayout title="Settings" subtitle="System Configuration & Management">
      <div className="space-y-4 sm:space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="organization" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Settings
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Invoice
            </TabsTrigger>
            <TabsTrigger value="tax" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Tax/GST
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
          </TabsList>

          {/* Organization Profile */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organization Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Organization Name</Label>
                    <Input
                      value={settings?.organization?.name || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        organization: { ...settings.organization, name: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={settings?.organization?.phone || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        organization: { ...settings.organization, phone: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={settings?.organization?.email || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        organization: { ...settings.organization, email: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input
                      value={settings?.organization?.website || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        organization: { ...settings.organization, website: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  <Textarea
                    value={settings?.organization?.address || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      organization: { ...settings.organization, address: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Support Email</Label>
                  <Input
                    type="email"
                    value={settings?.organization?.supportEmail || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      organization: { ...settings.organization, supportEmail: e.target.value }
                    })}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => handleSave('organization')} disabled={!canEdit}>
                    {!canEdit && <Lock className="h-4 w-4 mr-2" />}
                    {canEdit && <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Cycle Configuration */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Payment Cycle Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Default Payment Cycle</Label>
                  <Select
                    value={settings?.paymentCycle?.defaultCycle || 'Monthly'}
                    onValueChange={(value: any) => setSettings({
                      ...settings,
                      paymentCycle: { ...settings.paymentCycle, defaultCycle: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                      <SelectItem value="Quarterly">Quarterly</SelectItem>
                      <SelectItem value="Half-yearly">Half-yearly</SelectItem>
                      <SelectItem value="Annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reminder Days (comma separated)</Label>
                  <Input
                    value={settings?.paymentCycle?.reminderDays?.join(', ') || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      paymentCycle: {
                        ...settings.paymentCycle,
                        reminderDays: e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
                      }
                    })}
                    placeholder="7, 3, 1"
                  />
                </div>
                <div>
                  <Label>Grace Period (days)</Label>
                  <Input
                    type="number"
                    value={settings?.paymentCycle?.gracePeriod || 0}
                    onChange={(e) => setSettings({
                      ...settings,
                      paymentCycle: { ...settings.paymentCycle, gracePeriod: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <Button onClick={() => handleSave('paymentCycle')} disabled={!canEdit}>
                  {!canEdit && <Lock className="h-4 w-4 mr-2" />}
                  {canEdit && <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification System */}
          <TabsContent value="notifications">
            <Tabs defaultValue="events" className="space-y-4">
              <TabsList>
                <TabsTrigger value="events">Event Management</TabsTrigger>
                <TabsTrigger value="custom">Send Custom</TabsTrigger>
              </TabsList>

              <TabsContent value="events">
                <NotificationEventManager />
              </TabsContent>

              <TabsContent value="custom">
                <CustomNotificationForm />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Configure email settings for system notifications and communications.</p>
                <Button onClick={() => window.location.href = '/admin/settings/email'}>
                  <Mail className="h-4 w-4 mr-2" />
                  Open Email Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Template */}
          <TabsContent value="invoice">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Template Customization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Default
                    </Button>
                  </div>
                </div>

                {/* Nested Tabs for Invoice Template */}
                <Tabs defaultValue="company" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="company">Company Info</TabsTrigger>
                    <TabsTrigger value="design">Design & Layout</TabsTrigger>
                    <TabsTrigger value="content">Content & Terms</TabsTrigger>
                    <TabsTrigger value="signature">Signature</TabsTrigger>
                  </TabsList>

                  {/* Company Info Tab */}
                  <TabsContent value="company" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Company Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Company Logo</Label>
                          <div className="flex items-center gap-2">
                            <Input type="file" accept="image/*" className="flex-1" />
                            <Button variant="outline" size="sm" disabled={!canAdd}>
                              {!canAdd ? <Lock className="h-4 w-4 mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                              Upload
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label>Company Name</Label>
                          <Input
                            value={settings?.organization?.name || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              organization: { ...settings.organization, name: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Address</Label>
                          <Textarea
                            value={settings?.organization?.address || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              organization: { ...settings.organization, address: e.target.value }
                            })}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Phone</Label>
                            <Input
                              value={settings?.organization?.phone || ''}
                              onChange={(e) => setSettings({
                                ...settings,
                                organization: { ...settings.organization, phone: e.target.value }
                              })}
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              value={settings?.organization?.email || ''}
                              onChange={(e) => setSettings({
                                ...settings,
                                organization: { ...settings.organization, email: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Website</Label>
                          <Input
                            value={settings?.organization?.website || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              organization: { ...settings.organization, website: e.target.value }
                            })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Design & Layout Tab */}
                  <TabsContent value="design" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Design & Layout Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Logo Position</Label>
                            <Select
                              value={settings?.invoiceTemplate?.logoPosition || 'left'}
                              onValueChange={(value: any) => setSettings({
                                ...settings,
                                invoiceTemplate: { ...settings.invoiceTemplate, logoPosition: value }
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Primary Color</Label>
                            <Input
                              type="color"
                              value={settings?.invoiceTemplate?.colorScheme || '#000000'}
                              onChange={(e) => setSettings({
                                ...settings,
                                invoiceTemplate: { ...settings.invoiceTemplate, colorScheme: e.target.value }
                              })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Font Family</Label>
                            <Select defaultValue="inter">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inter">Inter</SelectItem>
                                <SelectItem value="roboto">Roboto</SelectItem>
                                <SelectItem value="arial">Arial</SelectItem>
                                <SelectItem value="times">Times New Roman</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Font Size</Label>
                            <Select defaultValue="medium">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Content & Terms Tab */}
                  <TabsContent value="content" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Content & Terms</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Invoice Title</Label>
                          <Input defaultValue="INVOICE" placeholder="INVOICE" />
                        </div>
                        <div>
                          <Label>Footer Text</Label>
                          <Input
                            value={settings?.invoiceTemplate?.footerText || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              invoiceTemplate: { ...settings.invoiceTemplate, footerText: e.target.value }
                            })}
                          />
                        </div>
                        <div>
                          <Label>Terms & Conditions</Label>
                          <Textarea
                            value={settings?.invoiceTemplate?.termsConditions || ''}
                            onChange={(e) => setSettings({
                              ...settings,
                              invoiceTemplate: { ...settings.invoiceTemplate, termsConditions: e.target.value }
                            })}
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label>Payment Instructions</Label>
                          <Textarea
                            placeholder="Please make payment within 30 days..."
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Signature Tab */}
                  <TabsContent value="signature" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Signature Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={settings?.invoiceTemplate?.showSignature || false}
                            onCheckedChange={(checked) => setSettings({
                              ...settings,
                              invoiceTemplate: { ...settings.invoiceTemplate, showSignature: checked }
                            })}
                          />
                          <Label>Show Signature</Label>
                        </div>
                        {settings?.invoiceTemplate?.showSignature && (
                          <>
                            <div>
                              <Label>Signature Image</Label>
                              <div className="flex items-center gap-2">
                                <Input type="file" accept="image/*" className="flex-1" />
                                <Button variant="outline" size="sm" disabled={!canAdd}>
                                  {!canAdd ? <Lock className="h-4 w-4 mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                                  Upload
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label>Signatory Name</Label>
                              <Input placeholder="John Doe" />
                            </div>
                            <div>
                              <Label>Signatory Title</Label>
                              <Input placeholder="Finance Manager" />
                            </div>
                            <div>
                              <Label>Signature Text</Label>
                              <Textarea
                                placeholder="Authorized Signatory"
                                rows={2}
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <Button onClick={() => handleSave('invoiceTemplate')} disabled={!canEdit}>
                  {!canEdit && <Lock className="h-4 w-4 mr-2" />}
                  {canEdit && <Save className="h-4 w-4 mr-2" />}
                  Save Template
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax & GST Settings */}
          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax & GST Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings?.taxGST?.enableGST || false}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      taxGST: { ...settings.taxGST, enableGST: checked }
                    })}
                  />
                  <Label>Enable GST</Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>GST Rate (%)</Label>
                    <Input
                      type="number"
                      value={settings?.taxGST?.gstRate || 0}
                      onChange={(e) => setSettings({
                        ...settings,
                        taxGST: { ...settings.taxGST, gstRate: parseFloat(e.target.value) }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Tax Type</Label>
                    <Select
                      value={settings?.taxGST?.taxType || 'CGST/SGST'}
                      onValueChange={(value: any) => setSettings({
                        ...settings,
                        taxGST: { ...settings.taxGST, taxType: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CGST/SGST">CGST/SGST</SelectItem>
                        <SelectItem value="IGST">IGST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>HSN Code</Label>
                    <Input
                      value={settings?.taxGST?.hsnCode || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        taxGST: { ...settings.taxGST, hsnCode: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Company GSTIN</Label>
                    <Input
                      value={settings?.taxGST?.companyGSTIN || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        taxGST: { ...settings.taxGST, companyGSTIN: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <Button onClick={() => handleSave('taxGST')} disabled={!canEdit}>
                  {!canEdit && <Lock className="h-4 w-4 mr-2" />}
                  {canEdit && <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup & Restore */}
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>Data Backup & Restore</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings?.backup?.autoBackup || false}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, autoBackup: checked }
                    })}
                  />
                  <Label>Enable Auto Backup</Label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Backup Frequency</Label>
                    <Select
                      value={settings?.backup?.backupFrequency || 'Daily'}
                      onValueChange={(value: any) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, backupFrequency: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Backup Time</Label>
                    <Input
                      type="time"
                      value={settings?.backup?.backupTime || '00:00'}
                      onChange={(e) => setSettings({
                        ...settings,
                        backup: { ...settings.backup, backupTime: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Retention Period (days)</Label>
                  <Input
                    type="number"
                    value={settings?.backup?.retentionDays || 30}
                    onChange={(e) => setSettings({
                      ...settings,
                      backup: { ...settings.backup, retentionDays: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => handleSave('backup')} disabled={!canEdit}>
                    {!canEdit && <Lock className="h-4 w-4 mr-2" />}
                    {canEdit && <Save className="h-4 w-4 mr-2" />}
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={handleBackup} disabled={!canAdd}>
                    {!canAdd ? <Lock className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Create Backup Now
                  </Button>
                  <Button variant="outline" onClick={handleRestore} disabled={!canEdit}>
                    {!canEdit ? <Lock className="h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    Restore from Backup
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Global Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Global Actions</h3>
                <p className="text-sm text-muted-foreground">System-wide configuration options</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleReset} disabled={!canDelete}>
                  {!canDelete ? <Lock className="h-4 w-4 mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                  Reset All Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;