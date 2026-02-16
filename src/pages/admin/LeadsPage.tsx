import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Filter, Download, Eye, UserCheck, Users, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportLeadsToExcel, exportLeadsToPDF } from '@/utils/exportLeads';

const mockLeads = [
  {
    id: 'LEAD001',
    company_name: 'TechStart Solutions',
    contact_person: 'John Doe',
    email: 'john@techstart.com',
    phone: '+91 9876543210',
    source: 'website',
    status: 'new',
    date_created: '2024-01-15',
    space_interest: 'Private Office',
    budget_range: '₹20,000 - ₹30,000',
    notes: 'Interested in 10-seat private office space',
    assigned_to: null
  },
  {
    id: 'LEAD002',
    company_name: 'Creative Agency',
    contact_person: 'Sarah Smith',
    email: 'sarah@creative.com',
    phone: '+91 9876543211',
    source: 'referral',
    status: 'contacted',
    date_created: '2024-01-10',
    space_interest: 'Co-working',
    budget_range: '₹10,000 - ₹15,000',
    notes: 'Looking for flexible co-working space',
    assigned_to: 'CRM Team'
  },
  {
    id: 'LEAD003',
    company_name: 'Innovate Labs',
    contact_person: 'Mike Johnson',
    email: 'mike@innovate.com',
    phone: '+91 9876543212',
    source: 'call',
    status: 'converted',
    date_created: '2024-01-05',
    space_interest: 'Incubator',
    budget_range: '₹5,000 - ₹10,000',
    notes: 'Startup converted to tenant application',
    assigned_to: 'CRM Team'
  }
];

export default function LeadsPage() {
  const [leads, setLeads] = useState(mockLeads);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSourceColor = (source: string) => {
    const colors = {
      website: 'bg-purple-100 text-purple-800',
      call: 'bg-green-100 text-green-800',
      email: 'bg-blue-100 text-blue-800',
      referral: 'bg-orange-100 text-orange-800'
    };
    return colors[source as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const assignToCRM = (leadId: string) => {
    setLeads(leads.map(lead => 
      lead.id === leadId ? { ...lead, assigned_to: 'CRM Team', status: 'contacted' } : lead
    ));
    toast({
      title: "Success",
      description: "Lead assigned to CRM team successfully",
    });
  };

  const convertToApplication = (leadId: string) => {
    setLeads(leads.map(lead => 
      lead.id === leadId ? { ...lead, status: 'converted' } : lead
    ));
    toast({
      title: "Success",
      description: "Lead converted to tenant application",
    });
  };

  const handleExportExcel = () => {
    try {
      exportLeadsToExcel(filteredLeads);
      toast({
        title: "Export Successful",
        description: "Leads data exported to Excel file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export Excel file",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    try {
      exportLeadsToPDF(filteredLeads);
      toast({
        title: "Export Successful",
        description: "Leads data exported to PDF file",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export PDF file",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_person.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(lead => lead.status === 'new').length,
    contacted: leads.filter(lead => lead.status === 'contacted').length,
    converted: leads.filter(lead => lead.status === 'converted').length
  };

  return (
    <DashboardLayout title="Leads Management" subtitle="Manage sales leads">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.new}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{stats.contacted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.converted}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Sales Leads</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleExportExcel} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200">
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={handleExportPDF} className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200">
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
                  placeholder="Search leads..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Lead Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead: any) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.company_name}</div>
                          <div className="text-sm text-muted-foreground">{lead.contact_person}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{lead.email}</div>
                          <div>{lead.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSourceColor(lead.source)} variant="outline">
                          {lead.source.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(lead.date_created).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {lead.status === 'new' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => assignToCRM(lead.id)}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
                          {lead.status === 'contacted' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => convertToApplication(lead.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
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

        {/* Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lead Details - {selectedLead?.id}</DialogTitle>
              <DialogDescription>Complete lead information</DialogDescription>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">Contact Information</h4>
                    <div className="text-sm space-y-1 mt-2">
                      <div>Company: {selectedLead.company_name}</div>
                      <div>Contact: {selectedLead.contact_person}</div>
                      <div>Email: {selectedLead.email}</div>
                      <div>Phone: {selectedLead.phone}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">Lead Information</h4>
                    <div className="text-sm space-y-1 mt-2">
                      <div>Source: <Badge className={getSourceColor(selectedLead.source)}>{selectedLead.source}</Badge></div>
                      <div>Status: <Badge className={getStatusColor(selectedLead.status)}>{selectedLead.status}</Badge></div>
                      <div>Created: {new Date(selectedLead.date_created).toLocaleDateString()}</div>
                      <div>Assigned: {selectedLead.assigned_to || 'Unassigned'}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Requirements</h4>
                  <div className="text-sm space-y-1 mt-2">
                    <div>Space Interest: {selectedLead.space_interest}</div>
                    <div>Budget Range: {selectedLead.budget_range}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm mt-2">{selectedLead.notes}</p>
                </div>
                <div className="flex gap-2 pt-4">
                  {selectedLead.status === 'new' && (
                    <Button 
                      onClick={() => {
                        assignToCRM(selectedLead.id);
                        setIsDetailDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      Assign to CRM Team
                    </Button>
                  )}
                  {selectedLead.status === 'contacted' && (
                    <Button 
                      onClick={() => {
                        convertToApplication(selectedLead.id);
                        setIsDetailDialogOpen(false);
                      }}
                      className="flex-1"
                    >
                      Convert to Application
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}