import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, 
  Eye, 
  Save, 
  RotateCcw, 
  FileText, 
  Image, 
  Settings,
  Download
} from 'lucide-react';

interface InvoiceTemplateSettings {
  companyLogo: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  headerColor: string;
  showWatermark: boolean;
  watermarkText: string;
  footerText: string;
  termsAndConditions: string;
  showSignature: boolean;
  signatureImage: string;
  signatureName: string;
  signatureDesignation: string;
  customFields: Array<{ label: string; value: string; enabled: boolean }>;
}

interface InvoiceTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: InvoiceTemplateSettings) => void;
}

export function InvoiceTemplate({ isOpen, onClose, onSave }: InvoiceTemplateProps) {
  const [settings, setSettings] = useState<InvoiceTemplateSettings>({
    companyLogo: '',
    companyName: 'Rathinam Nexus Suite',
    companyAddress: 'Rathinam College Campus, Eachanari, Coimbatore - 641021',
    companyPhone: '+91 422 2987654',
    companyEmail: 'accounts@rathinam.edu',
    companyWebsite: 'www.rathinam.edu',
    headerColor: '#2563eb',
    showWatermark: true,
    watermarkText: 'RATHINAM',
    footerText: 'Thank you for your business. Please make payment by the due date.',
    termsAndConditions: `Payment Terms:
1. Payment is due within 10 days of invoice date
2. Late payment charges of 2% per month will be applied
3. All payments should be made in favor of "Rathinam College"
4. For any queries, contact accounts department`,
    showSignature: true,
    signatureImage: '',
    signatureName: 'Finance Manager',
    signatureDesignation: 'Accounts Department',
    customFields: [
      { label: 'GST Number', value: '33AAAAA0000A1Z5', enabled: true },
      { label: 'PAN Number', value: 'AAAAA0000A', enabled: true },
      { label: 'Bank Details', value: 'HDFC Bank - A/c: 12345678901', enabled: false }
    ]
  });

  const [previewMode, setPreviewMode] = useState(false);

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    // Reset to default values
    setSettings({
      companyLogo: '',
      companyName: 'Rathinam Nexus Suite',
      companyAddress: 'Rathinam College Campus, Eachanari, Coimbatore - 641021',
      companyPhone: '+91 422 2987654',
      companyEmail: 'accounts@rathinam.edu',
      companyWebsite: 'www.rathinam.edu',
      headerColor: '#2563eb',
      showWatermark: true,
      watermarkText: 'RATHINAM',
      footerText: 'Thank you for your business. Please make payment by the due date.',
      termsAndConditions: `Payment Terms:
1. Payment is due within 10 days of invoice date
2. Late payment charges of 2% per month will be applied
3. All payments should be made in favor of "Rathinam College"
4. For any queries, contact accounts department`,
      showSignature: true,
      signatureImage: '',
      signatureName: 'Finance Manager',
      signatureDesignation: 'Accounts Department',
      customFields: [
        { label: 'GST Number', value: '33AAAAA0000A1Z5', enabled: true },
        { label: 'PAN Number', value: 'AAAAA0000A', enabled: true },
        { label: 'Bank Details', value: 'HDFC Bank - A/c: 12345678901', enabled: false }
      ]
    });
  };

  const addCustomField = () => {
    setSettings(prev => ({
      ...prev,
      customFields: [...prev.customFields, { label: '', value: '', enabled: true }]
    }));
  };

  const updateCustomField = (index: number, field: keyof typeof settings.customFields[0], value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeCustomField = (index: number) => {
    setSettings(prev => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Template Customization
          </DialogTitle>
          <DialogDescription>
            Customize your invoice template with company branding and layout preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                <Eye className="h-4 w-4 mr-2" />
                {previewMode ? 'Edit Mode' : 'Preview'}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>

          {previewMode ? (
            /* Preview Mode */
            <Card className="bg-white">
              <CardContent className="p-8">
                {/* Invoice Preview */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start" style={{ borderBottom: `3px solid ${settings.headerColor}`, paddingBottom: '1rem' }}>
                    <div>
                      {settings.companyLogo && (
                        <div className="mb-4">
                          <div className="w-32 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <Image className="h-8 w-8 text-gray-400" />
                          </div>
                        </div>
                      )}
                      <h1 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold" style={{ color: settings.headerColor }}>
                        {settings.companyName}
                      </h1>
                      <div className="text-sm text-gray-600 mt-2">
                        <p>{settings.companyAddress}</p>
                        <p>Phone: {settings.companyPhone}</p>
                        <p>Email: {settings.companyEmail}</p>
                        <p>Website: {settings.companyWebsite}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <h2 className="text-3xl font-bold" style={{ color: settings.headerColor }}>INVOICE</h2>
                      <p className="text-sm text-gray-600 mt-2">Invoice #: INV-2024-001</p>
                      <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">Due Date: {new Date(Date.now() + 10*24*60*60*1000).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Custom Fields */}
                  {settings.customFields.some(field => field.enabled) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {settings.customFields.filter(field => field.enabled).map((field, index) => (
                        <div key={index}>
                          <span className="font-medium">{field.label}: </span>
                          <span>{field.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bill To */}
                  <div>
                    <h3 className="font-bold text-lg mb-2">Bill To:</h3>
                    <div className="text-sm">
                      <p className="font-medium">TechStart Solutions</p>
                      <p>Block A - Floor 2</p>
                      <p>Contact: John Doe</p>
                      <p>Email: john@techstart.com</p>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  <div>
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr style={{ backgroundColor: settings.headerColor + '20' }}>
                          <th className="border border-gray-300 p-2 text-left">Description</th>
                          <th className="border border-gray-300 p-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2">Monthly Rent - January 2024</td>
                          <td className="border border-gray-300 p-2 text-right">₹50,000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">Maintenance Charges</td>
                          <td className="border border-gray-300 p-2 text-right">₹5,000</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2">GST (18%)</td>
                          <td className="border border-gray-300 p-2 text-right">₹9,900</td>
                        </tr>
                        <tr style={{ backgroundColor: settings.headerColor + '10' }}>
                          <td className="border border-gray-300 p-2 font-bold">Total Amount</td>
                          <td className="border border-gray-300 p-2 text-right font-bold">₹64,900</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Terms and Conditions */}
                  <div>
                    <h3 className="font-bold text-lg mb-2">Terms & Conditions:</h3>
                    <div className="text-sm whitespace-pre-line text-gray-700">
                      {settings.termsAndConditions}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-end">
                    <div className="text-sm text-gray-600">
                      {settings.footerText}
                    </div>
                    {settings.showSignature && (
                      <div className="text-center">
                        {settings.signatureImage && (
                          <div className="w-32 h-16 bg-gray-100 rounded mb-2 flex items-center justify-center">
                            <span className="text-xs text-gray-400">Signature</span>
                          </div>
                        )}
                        <div className="border-t border-gray-400 pt-1">
                          <p className="text-sm font-medium">{settings.signatureName}</p>
                          <p className="text-xs text-gray-600">{settings.signatureDesignation}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Watermark */}
                  {settings.showWatermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div 
                        className="text-6xl font-bold opacity-5 rotate-45"
                        style={{ color: settings.headerColor }}
                      >
                        {settings.watermarkText}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Edit Mode */
            <Tabs defaultValue="company" className="space-y-4">
              <TabsList>
                <TabsTrigger value="company">Company Info</TabsTrigger>
                <TabsTrigger value="design">Design & Layout</TabsTrigger>
                <TabsTrigger value="content">Content & Terms</TabsTrigger>
                <TabsTrigger value="signature">Signature</TabsTrigger>
                <TabsTrigger value="custom">Custom Fields</TabsTrigger>
              </TabsList>

              <TabsContent value="company" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="companyLogo">Company Logo</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="companyLogo"
                          type="file"
                          accept="image/*"
                          className="flex-1"
                        />
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={settings.companyName}
                        onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="companyAddress">Address</Label>
                      <Textarea
                        id="companyAddress"
                        value={settings.companyAddress}
                        onChange={(e) => setSettings(prev => ({ ...prev, companyAddress: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="companyPhone">Phone</Label>
                        <Input
                          id="companyPhone"
                          value={settings.companyPhone}
                          onChange={(e) => setSettings(prev => ({ ...prev, companyPhone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="companyEmail">Email</Label>
                        <Input
                          id="companyEmail"
                          value={settings.companyEmail}
                          onChange={(e) => setSettings(prev => ({ ...prev, companyEmail: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="companyWebsite">Website</Label>
                      <Input
                        id="companyWebsite"
                        value={settings.companyWebsite}
                        onChange={(e) => setSettings(prev => ({ ...prev, companyWebsite: e.target.value }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="design" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Design & Layout</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="headerColor">Header Color</Label>
                      <Input
                        id="headerColor"
                        type="color"
                        value={settings.headerColor}
                        onChange={(e) => setSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                        className="w-20 h-10"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="showWatermark"
                        checked={settings.showWatermark}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showWatermark: checked }))}
                      />
                      <Label htmlFor="showWatermark">Show Watermark</Label>
                    </div>
                    {settings.showWatermark && (
                      <div>
                        <Label htmlFor="watermarkText">Watermark Text</Label>
                        <Input
                          id="watermarkText"
                          value={settings.watermarkText}
                          onChange={(e) => setSettings(prev => ({ ...prev, watermarkText: e.target.value }))}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Content & Terms</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="footerText">Footer Text</Label>
                      <Textarea
                        id="footerText"
                        value={settings.footerText}
                        onChange={(e) => setSettings(prev => ({ ...prev, footerText: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
                      <Textarea
                        id="termsAndConditions"
                        value={settings.termsAndConditions}
                        onChange={(e) => setSettings(prev => ({ ...prev, termsAndConditions: e.target.value }))}
                        rows={6}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="signature" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Signature Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="showSignature"
                        checked={settings.showSignature}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showSignature: checked }))}
                      />
                      <Label htmlFor="showSignature">Show Signature</Label>
                    </div>
                    {settings.showSignature && (
                      <>
                        <div>
                          <Label htmlFor="signatureImage">Signature Image</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="signatureImage"
                              type="file"
                              accept="image/*"
                              className="flex-1"
                            />
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="signatureName">Name</Label>
                            <Input
                              id="signatureName"
                              value={settings.signatureName}
                              onChange={(e) => setSettings(prev => ({ ...prev, signatureName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="signatureDesignation">Designation</Label>
                            <Input
                              id="signatureDesignation"
                              value={settings.signatureDesignation}
                              onChange={(e) => setSettings(prev => ({ ...prev, signatureDesignation: e.target.value }))}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="custom" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Custom Fields</CardTitle>
                      <Button onClick={addCustomField} size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {settings.customFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 border rounded">
                        <Switch
                          checked={field.enabled}
                          onCheckedChange={(checked) => updateCustomField(index, 'enabled', checked)}
                        />
                        <Input
                          placeholder="Field Label"
                          value={field.label}
                          onChange={(e) => updateCustomField(index, 'label', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Field Value"
                          value={field.value}
                          onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeCustomField(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}