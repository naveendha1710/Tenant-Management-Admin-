import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Eye, Clock, Users, CheckCircle, XCircle, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchTenantApplications, approveApplication, rejectApplication, TenantApplication } from '@/services/tenantApplicationService';

export default function TenantApplications() {
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<TenantApplication | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await fetchTenantApplications();
      setApplications(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tenant applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApp || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter a password for the tenant",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      await approveApplication(selectedApp.id, password);
      toast({
        title: "Success",
        description: "Tenant application approved and account created successfully",
      });
      setIsApprovalDialogOpen(false);
      setPassword('');
      setSelectedApp(null);
      loadApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve application",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApp) return;
    
    setProcessing(true);
    try {
      await rejectApplication(selectedApp.id, rejectNotes);
      toast({
        title: "Success",
        description: "Tenant application rejected",
      });
      setIsRejectDialogOpen(false);
      setRejectNotes('');
      setSelectedApp(null);
      loadApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject application",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'pending').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length
  };

  if (loading) {
    return (
      <DashboardLayout title="Tenant Applications" subtitle="Review and approve tenant applications">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading applications...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Tenant Applications" subtitle="Review and approve tenant applications from CRM">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Applications Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Space Type</TableHead>
                    <TableHead>Monthly Rent</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.company_name}</TableCell>
                      <TableCell>{app.contact_person}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell className="capitalize">{app.space_type}</TableCell>
                      <TableCell>₹{app.monthly_rent.toLocaleString()}</TableCell>
                      <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(app.status)}>
                          {app.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApp(app);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setIsApprovalDialogOpen(true);
                                }}
                                className="text-green-600 hover:text-green-700"
                                disabled={processing}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedApp(app);
                                  setIsRejectDialogOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700"
                                disabled={processing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Application Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Application Details - {selectedApp?.company_name}</DialogTitle>
            </DialogHeader>
            {selectedApp && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Company Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Company:</strong> {selectedApp.company_name}</div>
                      <div><strong>Contact Person:</strong> {selectedApp.contact_person}</div>
                      <div><strong>Email:</strong> {selectedApp.email}</div>
                      <div><strong>Phone:</strong> {selectedApp.phone}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Space Requirements</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Type:</strong> {selectedApp.space_type}</div>
                      <div><strong>Requirement:</strong> {selectedApp.space_requirement}</div>
                      <div><strong>Monthly Rent:</strong> ₹{selectedApp.monthly_rent.toLocaleString()}</div>
                      <div><strong>Security Deposit:</strong> ₹{selectedApp.security_deposit.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Application Status</h4>
                  <Badge className={getStatusColor(selectedApp.status)}>
                    {selectedApp.status.toUpperCase()}
                  </Badge>
                </div>
                {selectedApp.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm">{selectedApp.notes}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Approve Application - {selectedApp?.company_name}
              </DialogTitle>
              <DialogDescription>
                Create a tenant account by setting up login credentials. The tenant will receive their login details via email.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Email (Pre-filled)</Label>
                <Input
                  id="tenantEmail"
                  value={selectedApp?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenantPassword">Password *</Label>
                <Input
                  id="tenantPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for tenant account"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  This password will be sent to the tenant via email. They should change it on first login.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsApprovalDialogOpen(false);
                    setPassword('');
                    setSelectedApp(null);
                  }}
                  className="flex-1"
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1"
                  disabled={!password.trim() || processing}
                >
                  {processing ? 'Creating Account...' : 'Approve & Create Account'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Application Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Application</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this tenant application.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectNotes">Rejection Reason</Label>
                <Textarea
                  id="rejectNotes"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={4}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRejectDialogOpen(false);
                    setRejectNotes('');
                    setSelectedApp(null);
                  }}
                  className="flex-1"
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReject}
                  variant="destructive"
                  className="flex-1"
                  disabled={processing}
                >
                  {processing ? 'Rejecting...' : 'Reject Application'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}