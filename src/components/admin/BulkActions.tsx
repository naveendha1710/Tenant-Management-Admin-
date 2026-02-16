import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Download, FileText, Mail, MessageSquare, Phone } from 'lucide-react';

interface BulkActionsProps {
  selectedTenants: string[];
  tenants: any[];
  onClose: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({ selectedTenants, tenants, onClose }) => {
  const [action, setAction] = useState('');
  const [reminderType, setReminderType] = useState('email');
  const [customMessage, setCustomMessage] = useState('');

  const selectedTenantData = tenants.filter(t => selectedTenants.includes(t.id));

  const handleSendReminders = () => {
    console.log(`Sending ${reminderType} reminders to:`, selectedTenantData);
    // Implementation for bulk reminders
    onClose();
  };

  const handleExport = (format: string) => {
    console.log(`Exporting ${selectedTenants.length} tenants to ${format}`);
    // Implementation for export
    onClose();
  };

  const reminderTemplates = {
    email: 'Dear [Tenant Name], your rent payment of ₹[Amount] is due on [Due Date]. Please make the payment at your earliest convenience.',
    sms: 'Hi [Tenant Name], rent payment of ₹[Amount] due on [Due Date]. Pay now to avoid late fees.',
    whatsapp: 'Hello [Tenant Name]! 👋 Your rent of ₹[Amount] is due on [Due Date]. Please pay to avoid any inconvenience.'
  };

  return (
    <Dialog open={selectedTenants.length > 0} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Actions ({selectedTenants.length} tenants selected)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Selected Tenants Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selected Tenants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedTenantData.map(tenant => (
                  <Badge key={tenant.id} variant="secondary">
                    {tenant.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Action</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reminder">Send Payment Reminders</SelectItem>
                  <SelectItem value="export">Export Data</SelectItem>
                  <SelectItem value="status">Update Status</SelectItem>
                  <SelectItem value="group">Assign Company Group</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Send Reminders */}
            {action === 'reminder' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send Payment Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Reminder Method</label>
                    <Select value={reminderType} onValueChange={setReminderType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Message Template</label>
                    <Textarea
                      value={customMessage || reminderTemplates[reminderType as keyof typeof reminderTemplates]}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                      placeholder="Customize your reminder message..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use [Tenant Name], [Amount], [Due Date] as placeholders
                    </p>
                  </div>

                  <Button onClick={handleSendReminders} className="w-full">
                    Send Reminders to {selectedTenants.length} Tenants
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Export Data */}
            {action === 'export' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Tenant Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => handleExport('excel')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export to PDF
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Export includes: Tenant details, rent information, payment status, and contact information
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Update Status */}
            {action === 'status' && (
              <Card>
                <CardHeader>
                  <CardTitle>Update Tenant Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending Move-In">Pending Move-In</SelectItem>
                      <SelectItem value="Vacated">Vacated</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full">
                    Update Status for {selectedTenants.length} Tenants
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Assign Company Group */}
            {action === 'group' && (
              <Card>
                <CardHeader>
                  <CardTitle>Assign Company Group</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPAN Venture Pvt Ltd">SPAN Venture Pvt Ltd</SelectItem>
                      <SelectItem value="K. Palaniappa Memorial Education Trust">K. Palaniappa Memorial Education Trust</SelectItem>
                      <SelectItem value="RAR Foundation">RAR Foundation</SelectItem>
                      <SelectItem value="Rathinam Circular View">Rathinam Circular View</SelectItem>
                      <SelectItem value="Rathinam Business Park">Rathinam Business Park</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="w-full">
                    Assign Group to {selectedTenants.length} Tenants
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};