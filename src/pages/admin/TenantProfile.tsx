import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Building, CreditCard, History, FileText, MessageSquare, Edit, Mail, Phone, MapPin } from 'lucide-react';

const TenantProfile: React.FC = () => {
  const [notes, setNotes] = useState('');

  // Mock tenant data
  const tenant = {
    id: '1',
    name: 'John Smith',
    company: 'TechStart Solutions',
    email: 'john@techstart.com',
    phone: '+91-9876543210',
    address: '123 Business District, Coimbatore, Tamil Nadu',
    idProof: 'Aadhaar: 1234-5678-9012',
    space: 'Office #102',
    building: 'Block A',
    floor: '1st Floor',
    area: '500 sqft',
    rentAmount: 25000,
    securityDeposit: 50000,
    leaseStart: '2023-01-15',
    leaseEnd: '2024-01-15',
    paymentCycle: 'Monthly',
    status: 'Active',
    nextDueDate: '2024-02-15'
  };

  const paymentHistory = [
    { id: '1', date: '2024-01-15', amount: 25000, status: 'Paid', method: 'Bank Transfer' },
    { id: '2', date: '2023-12-15', amount: 25000, status: 'Paid', method: 'UPI' },
    { id: '3', date: '2023-11-15', amount: 25000, status: 'Paid', method: 'Cash' },
    { id: '4', date: '2023-10-15', amount: 25000, status: 'Paid', method: 'Bank Transfer' }
  ];

  const maintenanceRequests = [
    { id: '1', date: '2024-01-20', issue: 'AC not working', status: 'In Progress', priority: 'High' },
    { id: '2', date: '2024-01-10', issue: 'WiFi connectivity issues', status: 'Closed', priority: 'Medium' },
    { id: '3', date: '2023-12-25', issue: 'Water leakage in washroom', status: 'Closed', priority: 'High' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': case 'Active': case 'Closed': return 'default';
      case 'Pending': case 'In Progress': return 'secondary';
      case 'Overdue': case 'High': return 'destructive';
      case 'Medium': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout title="Tenant Profile" subtitle={`${tenant.name} - ${tenant.company}`}>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenant List
          </Button>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
          </div>
        </div>

        {/* Tenant Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{tenant.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">{tenant.company}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{tenant.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{tenant.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium text-sm">{tenant.address}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Space Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Space</p>
                <p className="font-medium">{tenant.space}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Building</p>
                <p className="font-medium">{tenant.building}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Floor</p>
                <p className="font-medium">{tenant.floor}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Area</p>
                <p className="font-medium">{tenant.area}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusColor(tenant.status) as any}>{tenant.status}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Rent & Lease Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-medium text-lg">₹{tenant.rentAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Security Deposit</p>
                <p className="font-medium">₹{tenant.securityDeposit.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lease Period</p>
                <p className="font-medium">{tenant.leaseStart} to {tenant.leaseEnd}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Due</p>
                <p className="font-medium">{tenant.nextDueDate}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Requests</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notes">Notes & Remarks</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
            <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.date}</TableCell>
                        <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(payment.status) as any}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{payment.method}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Requests</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
            <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.date}</TableCell>
                        <TableCell>{request.issue}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.priority) as any}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.status) as any}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documents & Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No documents uploaded yet</p>
                    <Button className="mt-2">Upload Documents</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Admin Notes & Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Add internal notes about this tenant..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={6}
                  />
                  <Button>Save Notes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TenantProfile;