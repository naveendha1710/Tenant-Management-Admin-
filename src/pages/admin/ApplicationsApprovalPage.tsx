import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, Download, Check, X, Building, Users, Calendar, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const mockApplications = [
  {
    id: 'APP001',
    lead_id: 'LD003',
    company_name: 'StartUp Hub',
    contact_person: 'Mike Johnson',
    email: 'mike@startuphub.com',
    phone: '+91 9876543216',
    space_type: 'Incubator',
    team_size: 5,
    budget: '₹20,000 - ₹35,000',
    requirements: 'Co-working space for 5 team members with mentorship access',
    status: 'CRM Approved',
    crm_approved_date: '2024-01-15',
    created_date: '2024-01-15',
    lead_score: 95
  },
  {
    id: 'APP002',
    lead_id: 'LD005',
    company_name: 'Tech Innovators',
    contact_person: 'John Smith',
    email: 'john@techinnovators.com',
    phone: '+91 9876543218',
    space_type: 'Office',
    team_size: 20,
    budget: '₹60,000 - ₹80,000',
    requirements: 'Large office space with conference rooms and parking',
    status: 'CRM Approved',
    crm_approved_date: '2024-01-18',
    created_date: '2024-01-16',
    lead_score: 88
  },
  {
    id: 'APP003',
    lead_id: 'LD006',
    company_name: 'Creative Studios',
    contact_person: 'Lisa Johnson',
    email: 'lisa@creativestudios.com',
    phone: '+91 9876543219',
    space_type: 'Co-working',
    team_size: 8,
    budget: '₹35,000 - ₹50,000',
    requirements: 'Creative workspace with design facilities',
    status: 'Admin Approved',
    crm_approved_date: '2024-01-12',
    admin_approved_date: '2024-01-20',
    created_date: '2024-01-10',
    lead_score: 92
  }
];

const mockSpaces = [
  'Building A → Floor 1 → Office 101',
  'Building A → Floor 2 → Office 205',
  'Building B → Floor 1 → Co-working Space 1',
  'Innovation Center → Floor 1 → Incubator 12',
  'Innovation Center → Floor 2 → Office 215'
];

export default function ApplicationsApprovalPage() {
  const [applications, setApplications] = useState(mockApplications);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSpace, setSelectedSpace] = useState('');
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    const colors = {
      'CRM Approved': 'bg-yellow-100 text-yellow-800',
      'Admin Approved': 'bg-green-100 text-green-800',
      'Tenant Created': 'bg-blue-100 text-blue-800',
      'Rejected': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSpaceTypeColor = (type: string) => {
    const colors = {
      'Office': 'bg-blue-100 text-blue-800',
      'Co-working': 'bg-green-100 text-green-800',
      'Incubator': 'bg-purple-100 text-purple-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const exportData = (format: string) => {
    toast({
      title: "Export Started",
      description: `Exporting applications data as ${format.toUpperCase()}`,
    });
  };

  const handleApproveApplication = async (applicationId: string, assignedSpace: string) => {
    const application = applications.find(app => app.id === applicationId);
    if (!application) return;

    try {
      // Simulate tenant creation API call
      const tenantData = {
        company_name: application.company_name,
        contact_person: application.contact_person,
        email: application.email,
        phone: application.phone,
        assigned_space: assignedSpace,
        status: 'Active'
      };

      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update application status
      setApplications(applications.map(app => 
        app.id === applicationId 
          ? { ...app, status: 'Tenant Created', admin_approved_date: new Date().toISOString().split('T')[0] }
          : app
      ));

      toast({
        title: "Application Approved",
        description: `Tenant created successfully for ${application.company_name}`,
      });

      setIsApprovalDialogOpen(false);
      setSelectedApplication(null);
      setSelectedSpace('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tenant. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectApplication = (applicationId: string) => {
    setApplications(applications.map(app => 
      app.id === applicationId ? { ...app, status: 'Rejected' } : app
    ));
    toast({
      title: "Application Rejected",
      description: "Application has been rejected",
      variant: "destructive"
    });
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(app => app.status === 'CRM Approved').length,
    approved: applications.filter(app => app.status === 'Admin Approved' || app.status === 'Tenant Created').length,
    rejected: applications.filter(app => app.status === 'Rejected').length
  };

  return (
    <DashboardLayout title="Applications Approval" subtitle="Review and approve CRM-validated applications">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Pending Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Status */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">New Lead</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">CRM Approved</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Admin Approved</span>
                </div>
                <div className="text-gray-400">→</div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Tenant Created</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Applications Pending Approval</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => exportData('excel')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={() => exportData('pdf')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search applications..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="CRM Approved">CRM Approved</SelectItem>
                  <SelectItem value="Admin Approved">Admin Approved</SelectItem>
                  <SelectItem value="Tenant Created">Tenant Created</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Space Type</TableHead>
                    <TableHead>Team Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CRM Approved</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.id}</TableCell>
                      <TableCell>{app.company_name}</TableCell>
                      <TableCell>{app.contact_person}</TableCell>
                      <TableCell>
                        <Badge className={getSpaceTypeColor(app.space_type)} variant="outline">
                          {app.space_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {app.team_size}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(app.status)}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(app.crm_approved_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(app);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {app.status === 'CRM Approved' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setIsApprovalDialogOpen(true);
                                }}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRejectApplication(app.id)}
                                className="text-red-600 hover:text-red-700"
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
              <DialogTitle>Application Details - {selectedApplication?.company_name}</DialogTitle>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Company Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Company:</strong> {selectedApplication.company_name}</div>
                      <div><strong>Contact:</strong> {selectedApplication.contact_person}</div>
                      <div><strong>Email:</strong> {selectedApplication.email}</div>
                      <div><strong>Phone:</strong> {selectedApplication.phone}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Space Type:</strong> {selectedApplication.space_type}</div>
                      <div><strong>Team Size:</strong> {selectedApplication.team_size} members</div>
                      <div><strong>Budget:</strong> {selectedApplication.budget}</div>
                      <div><strong>Lead Score:</strong> {selectedApplication.lead_score}/100</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Requirements Details</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedApplication.requirements}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <Badge className={getStatusColor(selectedApplication.status)}>
                    {selectedApplication.status}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    CRM Approved: {new Date(selectedApplication.crm_approved_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Application</DialogTitle>
              <DialogDescription>
                Assign space and create tenant record for {selectedApplication?.company_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Space *</label>
                <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select available space" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockSpaces.map((space) => (
                      <SelectItem key={space} value={space}>
                        {space}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsApprovalDialogOpen(false);
                    setSelectedSpace('');
                  }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => selectedApplication && handleApproveApplication(selectedApplication.id, selectedSpace)}
                  disabled={!selectedSpace}
                  className="flex-1"
                >
                  Approve & Create Tenant
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}