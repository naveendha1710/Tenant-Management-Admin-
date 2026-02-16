import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, Users, AlertCircle, Eye, XCircle } from 'lucide-react';

export default function Approvals() {
  const [activeTab, setActiveTab] = useState('pending');

  const pendingApprovals = [
    {
      id: 'INV-2024-001',
      tenant: 'TechStart Solutions',
      amount: '₹75,000',
      category: 'Maintenance',
      type: 'Manual',
      status: 'Pending',
      approvers: ['Finance Head', 'Director']
    }
  ];

  return (
    <DashboardLayout title="Approvals" subtitle="Manage pending approvals and review requests">
      <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">1</div>
            <p className="text-xs text-muted-foreground">Awaiting your action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">0</div>
            <p className="text-xs text-muted-foreground">Processed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">2</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <AlertCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">1.5d</div>
            <p className="text-xs text-muted-foreground">Days per approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Approvals Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending (1)</TabsTrigger>
          <TabsTrigger value="all">All Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Tenant/Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Assigned Approvers</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingApprovals.map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">{approval.id}</TableCell>
                        <TableCell>{approval.tenant}</TableCell>
                        <TableCell className="font-medium">{approval.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{approval.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{approval.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Pending
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {approval.approvers.map((approver) => (
                              <Badge key={approver} variant="outline" className="text-xs">
                                {approver}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm">
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
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

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">All approval history will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}