import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Phone, 
  Mail, 
  Plus, 
  FileText, 
  Calendar,
  Search,
  Filter,
  Edit,
  Eye,
  Star,
  Target,
  Send,
  Printer,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { fetchLeads, createLead, updateLead, fetchCommunications, Lead, Communication } from '@/services/crmService';
import { DatabaseTest } from '@/components/DatabaseTest';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { exportLeadsToExcel, exportLeadsToPDF, exportPipelineToExcel } from '@/utils/exportCRM';

// LeadRow Component
function LeadRow({ lead, communications, onGenerateQuotation }: { lead: any, communications: any[], onGenerateQuotation: (lead: any) => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getStatusColor = (status: string) => {
    const colors = {
      inquiry: 'bg-blue-100 text-blue-800',
      negotiation: 'bg-yellow-100 text-yellow-800',
      quotation: 'bg-purple-100 text-purple-800',
      tenant: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };
  
  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const lastContact = communications.length > 0 
    ? communications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-4 flex-1">
            <div className="flex-1">
              <div className="font-medium">{lead.contact_person}</div>
              <div className="text-sm text-muted-foreground">{lead.company_name}</div>
            </div>
            <div className="hidden sm:block">
              <Badge className={getStatusColor(lead.status)}>
                {lead.status.toUpperCase()}
              </Badge>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <Star className={`h-4 w-4 ${getLeadScoreColor(lead.lead_score)}`} />
              <span className={`font-medium ${getLeadScoreColor(lead.lead_score)}`}>
                {lead.lead_score}
              </span>
            </div>
            <div className="hidden md:block text-sm text-muted-foreground">
              {lastContact ? new Date(lastContact.date).toLocaleDateString() : 'No contact'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onGenerateQuotation(lead); }}>
              <FileText className="h-4 w-4" />
            </Button>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>
        
        {/* Mobile badges */}
        <div className="flex sm:hidden gap-2 mt-2">
          <Badge className={getStatusColor(lead.status)} variant="outline">
            {lead.status.toUpperCase()}
          </Badge>
          <Badge variant="outline" className={getLeadScoreColor(lead.lead_score)}>
            Score: {lead.lead_score}
          </Badge>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Contact Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {lead.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {lead.phone}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Requirements</h4>
                <div className="text-sm space-y-1">
                  <div>Space: {lead.space_requirement}</div>
                  <div>Budget: {lead.budget_range}</div>
                </div>
              </div>
            </div>
            
            {communications.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Communication History</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {communications.slice(0, 3).map((comm) => (
                    <div key={comm.id} className="border rounded p-2 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {comm.type === 'email' && <Mail className="h-3 w-3 text-blue-500" />}
                          {comm.type === 'call' && <Phone className="h-3 w-3 text-green-500" />}
                          <Badge variant="outline" className="text-xs capitalize">{comm.type}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{comm.date}</span>
                      </div>
                      <div className="font-medium text-xs">{comm.subject}</div>
                      <div className="text-xs text-muted-foreground">{comm.notes}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



export default function CrmDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leadsData, communicationsData] = await Promise.all([
        fetchLeads(),
        fetchCommunications()
      ]);
      setLeads(leadsData);
      setCommunications(communicationsData);
      console.log('CRM data loaded successfully:', { leads: leadsData.length, communications: communicationsData.length });
    } catch (error) {
      console.error('Error loading CRM data:', error);
      // Don't show error toast, just use fallback data
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalLeads: leads.length,
    activeLeads: leads.filter(lead => ['inquiry', 'negotiation', 'quotation'].includes(lead.status)).length,
    convertedLeads: leads.filter(lead => lead.status === 'tenant').length,
    conversionRate: leads.length > 0 ? (leads.filter(lead => lead.status === 'tenant').length / leads.length) * 100 : 0,
    avgLeadScore: leads.length > 0 ? leads.reduce((sum, lead) => sum + lead.lead_score, 0) / leads.length : 0
  };

  const handleCreateLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const newLead = await createLead({
        company_name: formData.get('companyName') as string,
        contact_person: formData.get('contactPerson') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        source: formData.get('source') as string,
        space_type: formData.get('spaceType') as string,
        space_requirement: formData.get('spaceRequirement') as string,
        budget_range: formData.get('budgetRange') as string,
        status: 'inquiry',
        lead_score: calculateLeadScore({
          industry: formData.get('industry') as string,
          company_size: formData.get('companySize') as string,
          urgency: formData.get('urgency') as string
        }),
        follow_up_date: formData.get('followUpDate') as string,
        notes: formData.get('notes') as string,
        industry: formData.get('industry') as string,
        company_size: formData.get('companySize') as string,
        urgency: formData.get('urgency') as string
      });

      setLeads([newLead, ...leads]);
      setIsLeadDialogOpen(false);
      toast({
        title: "Success",
        description: "Lead created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create lead",
        variant: "destructive"
      });
    }
  };

  const calculateLeadScore = (criteria: any) => {
    let score = 50; // Base score
    
    // Industry scoring
    if (criteria.industry === 'Technology') score += 20;
    else if (criteria.industry === 'Healthcare') score += 15;
    else if (criteria.industry === 'Finance') score += 15;
    else score += 10;
    
    // Company size scoring
    if (criteria.company_size === '50+') score += 20;
    else if (criteria.company_size === '10-50') score += 15;
    else if (criteria.company_size === '5-10') score += 10;
    else score += 5;
    
    // Urgency scoring
    if (criteria.urgency === 'high') score += 15;
    else if (criteria.urgency === 'medium') score += 10;
    else score += 5;
    
    return Math.min(score, 100);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await updateLead(leadId, { status: newStatus as any });
      setLeads(leads.map(lead => 
        lead.id === leadId 
          ? { ...lead, status: newStatus as any }
          : lead
      ));
      toast({
        title: "Success",
        description: "Lead status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive"
      });
    }
  };



  const generateQuotation = (lead: any) => {
    // Navigate to quotation generator page
    navigate(`/crm/quotation?leadId=${lead.id}`);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contact_person.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const leadsByStatus = {
    inquiry: leads.filter(lead => lead.status === 'inquiry'),
    negotiation: leads.filter(lead => lead.status === 'negotiation'),
    quotation: leads.filter(lead => lead.status === 'quotation'),
    tenant: leads.filter(lead => lead.status === 'tenant')
  };

  const getStatusColor = (status: string) => {
    const colors = {
      inquiry: 'bg-blue-100 text-blue-800',
      negotiation: 'bg-yellow-100 text-yellow-800',
      quotation: 'bg-purple-100 text-purple-800',
      agreement: 'bg-green-100 text-green-800',
      tenant: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <DashboardLayout title="CRM Dashboard" subtitle="Sales & Lead Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">Loading CRM data...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="CRM Dashboard" subtitle="Sales & Lead Management">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">All time leads</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.activeLeads}</div>
              <p className="text-xs text-muted-foreground">In pipeline</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.convertedLeads}</div>
              <p className="text-xs text-muted-foreground">Successful conversions</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Lead to tenant ratio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Lead Score</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.avgLeadScore.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">Quality indicator</p>
            </CardContent>
          </Card>
        </div>

        {/* Database Test - Remove this in production */}
        <div className="mb-6">
          <DatabaseTest />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-3">
            <TabsTrigger value="pipeline">Sales Pipeline</TabsTrigger>
            <TabsTrigger value="leads">Lead Management</TabsTrigger>
            <TabsTrigger value="quotations">Quotations</TabsTrigger>
          </TabsList>

          {/* Sales Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-semibold">Sales Pipeline - Kanban View</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <ExportDropdown 
                  onExportExcel={() => exportPipelineToExcel({
                    inquiry: leadsByStatus.inquiry.length,
                    negotiation: leadsByStatus.negotiation.length,
                    quotation: leadsByStatus.quotation.length,
                    tenant: leadsByStatus.tenant.length,
                    total: leads.length
                  })}
                  onExportPDF={() => exportLeadsToPDF(leads)}
                />
                <Button onClick={() => setIsLeadDialogOpen(true)} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <KanbanBoard />
            </div>
          </TabsContent>

          {/* Lead Management Tab */}
          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Lead Management</CardTitle>
                    <CardDescription>Manage leads with scores and communication history</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <ExportDropdown 
                      onExportExcel={() => exportLeadsToExcel(filteredLeads)}
                      onExportPDF={() => exportLeadsToPDF(filteredLeads)}
                    />
                    <Button onClick={() => setIsLeadDialogOpen(true)} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Lead
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
                      <SelectItem value="inquiry">Inquiry</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="quotation">Quotation</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  {filteredLeads.map((lead: any) => (
                    <LeadRow key={lead.id} lead={lead} communications={communications.filter(c => c.lead_id === lead.id)} onGenerateQuotation={generateQuotation} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quotations Tab */}
          <TabsContent value="quotations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Quotation Management</CardTitle>
                    <CardDescription>Generate and track branded quotations</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/crm/quotation')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Quotation
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leads.filter(lead => lead.status === 'quotation').map((lead) => (
                    <Card key={lead.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <h4 className="font-semibold">{lead.company_name}</h4>
                          <Badge className="bg-purple-100 text-purple-800">Quotation Sent</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>Contact: {lead.contact_person}</div>
                          <div>Space: {lead.space_requirement}</div>
                          <div>Budget: {lead.budget_range}</div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Edit className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Send className="mr-1 h-3 w-3" />
                            Send
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Printer className="mr-1 h-3 w-3" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {leads.filter(lead => lead.status === 'quotation').length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold">No quotations yet</h3>
                      <p className="text-muted-foreground">Generate quotations from active leads</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>

        {/* Lead Creation Dialog */}
        <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Capture lead information and add to sales pipeline
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input id="contactPerson" name="contactPerson" required />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Lead Source *</Label>
                  <Select name="source" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website Inquiry</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spaceType">Space Type *</Label>
                  <Select name="spaceType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select space type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="office">Private Office</SelectItem>
                      <SelectItem value="coworking">Co-working Seat</SelectItem>
                      <SelectItem value="incubator">Incubator Seat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spaceRequirement">Space Requirement</Label>
                  <Input id="spaceRequirement" name="spaceRequirement" placeholder="e.g., 10 seats, 500 sq ft" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetRange">Budget Range</Label>
                  <Input id="budgetRange" name="budgetRange" placeholder="e.g., ₹10,000 - ₹20,000" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select name="industry">
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Select name="companySize">
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-5">1-5 employees</SelectItem>
                      <SelectItem value="5-10">5-10 employees</SelectItem>
                      <SelectItem value="10-50">10-50 employees</SelectItem>
                      <SelectItem value="50+">50+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency Level</Label>
                  <Select name="urgency">
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input id="followUpDate" name="followUpDate" type="date" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Additional notes about the lead..." rows={3} />
              </div>
              
              <Button type="submit" className="w-full">Create Lead</Button>
            </form>
          </DialogContent>
        </Dialog>


      </div>
    </DashboardLayout>
  );
}