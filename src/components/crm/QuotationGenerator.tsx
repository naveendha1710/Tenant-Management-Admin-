import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Building, 
  Calendar, 
  DollarSign, 
  FileText, 
  Mail, 
  Phone, 
  Printer,
  Send,
  Download
} from 'lucide-react';

interface QuotationData {
  quotationNumber: string;
  date: string;
  validUntil: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  spaceType: string;
  spaceSize: string;
  seats: number;
  monthlyRent: number;
  serviceCharges: number;
  securityDeposit: number;
  taxRate: number;
  terms: string;
}

interface QuotationGeneratorProps {
  leadData?: any;
  onSave?: (quotation: QuotationData) => void;
  onClose?: () => void;
}

export function QuotationGenerator({ leadData, onSave, onClose }: QuotationGeneratorProps) {
  const [quotationData, setQuotationData] = useState<QuotationData>({
    quotationNumber: `QUO-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    companyName: leadData?.company_name || '',
    contactPerson: leadData?.contact_person || '',
    email: leadData?.email || '',
    phone: leadData?.phone || '',
    spaceType: leadData?.space_type || 'office',
    spaceSize: '500',
    seats: parseInt(leadData?.space_requirement?.match(/\d+/)?.[0] || '10'),
    monthlyRent: leadData?.space_type === 'office' ? 25000 : leadData?.space_type === 'coworking' ? 8000 : 5000,
    serviceCharges: 2000,
    securityDeposit: 50000,
    taxRate: 18,
    terms: 'Payment terms: Monthly advance payment required. Security deposit refundable at the end of lease period.'
  });

  const calculateTotals = () => {
    const subtotal = quotationData.monthlyRent + quotationData.serviceCharges;
    const taxAmount = (subtotal * quotationData.taxRate) / 100;
    const total = subtotal + taxAmount;
    
    return {
      subtotal,
      taxAmount,
      total,
      totalWithDeposit: total + quotationData.securityDeposit
    };
  };

  const totals = calculateTotals();

  const handleInputChange = (field: keyof QuotationData, value: string | number) => {
    setQuotationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(quotationData);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    alert('PDF download functionality would be implemented here');
  };

  const handleSendEmail = () => {
    alert('Email sending functionality would be implemented here');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">Quotation Generator</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleSendEmail}>
            <Send className="mr-2 h-4 w-4" />
            Send Email
          </Button>
          <Button onClick={handleSave}>
            Save Quotation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Edit Quotation</CardTitle>
              <CardDescription>Modify quotation details before sending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={quotationData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input 
                  value={quotationData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={quotationData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={quotationData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Space Type</Label>
                <Select 
                  value={quotationData.spaceType}
                  onValueChange={(value) => handleInputChange('spaceType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Private Office</SelectItem>
                    <SelectItem value="coworking">Co-working Seat</SelectItem>
                    <SelectItem value="incubator">Incubator Seat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Space Size (sq ft)</Label>
                  <Input 
                    value={quotationData.spaceSize}
                    onChange={(e) => handleInputChange('spaceSize', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seats</Label>
                  <Input 
                    type="number"
                    value={quotationData.seats}
                    onChange={(e) => handleInputChange('seats', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Monthly Rent (₹)</Label>
                <Input 
                  type="number"
                  value={quotationData.monthlyRent}
                  onChange={(e) => handleInputChange('monthlyRent', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Service Charges (₹)</Label>
                <Input 
                  type="number"
                  value={quotationData.serviceCharges}
                  onChange={(e) => handleInputChange('serviceCharges', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Security Deposit (₹)</Label>
                <Input 
                  type="number"
                  value={quotationData.securityDeposit}
                  onChange={(e) => handleInputChange('securityDeposit', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input 
                  type="number"
                  value={quotationData.taxRate}
                  onChange={(e) => handleInputChange('taxRate', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Terms & Conditions</Label>
                <Textarea 
                  value={quotationData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="print:shadow-none print:border-none">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-primary">Rathinam Nexus Suite</h1>
                  <p className="text-muted-foreground">Rathinam College Tech Park</p>
                  <p className="text-sm text-muted-foreground">
                    Rathinam College Campus, Eachanari, Coimbatore - 641021<br/>
                    Phone: +91 422 2669000 | Email: info@rathinam.edu
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-2">QUOTATION</Badge>
                  <p className="text-sm"><strong>Quote #:</strong> {quotationData.quotationNumber}</p>
                  <p className="text-sm"><strong>Date:</strong> {new Date(quotationData.date).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>Valid Until:</strong> {new Date(quotationData.validUntil).toLocaleDateString()}</p>
                </div>
              </div>

              <Separator className="mb-6" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold mb-3">Bill To:</h3>
                  <div className="space-y-1">
                    <p className="font-medium">{quotationData.companyName}</p>
                    <p>{quotationData.contactPerson}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {quotationData.email}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {quotationData.phone}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Space Details:</h3>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{quotationData.spaceType} Space</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Size: {quotationData.spaceSize} sq ft</p>
                    <p className="text-sm text-muted-foreground">Seats: {quotationData.seats}</p>
                    <p className="text-sm text-muted-foreground">Location: Rathinam Tech Park</p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-semibold mb-4">Pricing Breakdown</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Description</th>
                        <th className="text-right p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-3">Monthly Rent</td>
                        <td className="text-right p-3">₹{quotationData.monthlyRent.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Service Charges</td>
                        <td className="text-right p-3">₹{quotationData.serviceCharges.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Subtotal</td>
                        <td className="text-right p-3">₹{totals.subtotal.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">GST ({quotationData.taxRate}%)</td>
                        <td className="text-right p-3">₹{totals.taxAmount.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t bg-muted font-semibold">
                        <td className="p-3">Monthly Total</td>
                        <td className="text-right p-3">₹{totals.total.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3">Security Deposit (One-time)</td>
                        <td className="text-right p-3">₹{quotationData.securityDeposit.toLocaleString()}</td>
                      </tr>
                      <tr className="border-t bg-primary/10 font-bold">
                        <td className="p-3">Total Initial Payment</td>
                        <td className="text-right p-3">₹{totals.totalWithDeposit.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-semibold mb-3">What's Included:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <ul className="space-y-1">
                    <li>• High-speed Internet (100 Mbps)</li>
                    <li>• 24/7 Access & Security</li>
                    <li>• Air Conditioning</li>
                    <li>• Power Backup</li>
                  </ul>
                  <ul className="space-y-1">
                    <li>• Meeting Room Access</li>
                    <li>• Parking Space</li>
                    <li>• Housekeeping Services</li>
                    <li>• Reception Services</li>
                  </ul>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-semibold mb-3">Terms & Conditions:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {quotationData.terms}
                </p>
              </div>

              <Separator className="mb-6" />

              <div className="text-center text-sm text-muted-foreground">
                <p>Thank you for considering Rathinam Nexus Suite for your workspace needs.</p>
                <p>For any queries, please contact us at +91 422 2669000 or info@rathinam.edu</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}