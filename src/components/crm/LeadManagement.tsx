import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Plus, Users, TrendingUp, Phone, Mail, Edit, Eye, Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const leadSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  contact_name: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[+]?[0-9]{10,15}$/, 'Invalid phone number'),
  source: z.string().min(1, 'Please select a source'),
  requirements: z.string().min(10, 'Please describe requirements'),
  budget_range: z.string().min(1, 'Budget range is required'),
  expected_move_date: z.string().optional(),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface Lead {
  id: string;
  lead_number: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  requirements: string;
  budget_range: string;
  expected_move_date: string | null;
  lead_score: number;
  notes: string | null;
  created_at: string;
  assigned_to: string | null;
}

const leadSources = ['Website', 'Referral', 'Cold Call', 'Email', 'Social Media', 'Walk-in'];
const leadStatuses = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
const budgetRanges = [
  '₹10,000 - ₹25,000',
  '₹25,000 - ₹50,000',
  '₹50,000 - ₹75,000',
  '₹75,000 - ₹1,00,000',
  '₹1,00,000 - ₹2,00,000',
  '₹2,00,000+'
];

export function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      source: '',
      requirements: '',
      budget_range: '',
      expected_move_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LeadFormData) => {
    try {
      const leadData = {
        ...data,
        status: 'New',
        lead_score: calculateLeadScore(data),
        expected_move_date: data.expected_move_date || null,
      };

      if (editingLead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', editingLead.id);

        if (error) throw error;
        toast.success('Lead updated successfully');
      } else {
        const { error } = await supabase
          .from('leads')
          .insert(leadData);

        if (error) throw error;
        toast.success('Lead created successfully');
      }

      setIsDialogOpen(false);
      setEditingLead(null);
      form.reset();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead');
    }
  };

  const calculateLeadScore = (leadData: LeadFormData) => {
    let score = 0;
    
    // Source scoring
    const sourceScores: Record<string, number> = {
      'Referral': 30,
      'Website': 25,
      'Walk-in': 20,
      'Social Media': 15,
      'Email': 10,
      'Cold Call': 5
    };
    score += sourceScores[leadData.source] || 0;

    // Budget scoring
    const budgetScores: Record<string, number> = {
      '₹2,00,000+': 40,
      '₹1,00,000 - ₹2,00,000': 35,
      '₹75,000 - ₹1,00,000': 30,
      '₹50,000 - ₹75,000': 25,
      '₹25,000 - ₹50,000': 20,
      '₹10,000 - ₹25,000': 15
    };
    score += budgetScores[leadData.budget_range] || 0;

    // Requirements detail scoring
    if (leadData.requirements.length > 50) score += 15;
    else if (leadData.requirements.length > 20) score += 10;
    else score += 5;

    // Move date scoring
    if (leadData.expected_move_date) {
      const moveDate = new Date(leadData.expected_move_date);
      const today = new Date();
      const daysUntilMove = Math.ceil((moveDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      if (daysUntilMove <= 30) score += 15;
      else if (daysUntilMove <= 60) score += 10;
      else if (daysUntilMove <= 90) score += 5;
    }

    return Math.min(score, 100); // Cap at 100
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    form.reset({
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      requirements: lead.requirements,
      budget_range: lead.budget_range,
      expected_move_date: lead.expected_move_date || '',
      notes: lead.notes || '',
    });
    setIsDialogOpen(true);
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .eq('id', leadId);

      if (error) throw error;
      toast.success(`Lead status updated to ${status}`);
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to update lead status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Qualified': return 'bg-purple-100 text-purple-800';
      case 'Proposal Sent': return 'bg-orange-100 text-orange-800';
      case 'Negotiation': return 'bg-indigo-100 text-indigo-800';
      case 'Closed Won': return 'bg-green-100 text-green-800';
      case 'Closed Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLeadStats = () => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'New').length;
    const qualified = leads.filter(l => l.status === 'Qualified').length;
    const proposals = leads.filter(l => l.status === 'Proposal Sent').length;
    const won = leads.filter(l => l.status === 'Closed Won').length;
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : '0';

    return {
      total,
      newLeads,
      qualified,
      proposals,
      won,
      conversionRate
    };
  };

  const filteredLeads = leads.filter(lead => {
    const statusMatch = selectedStatus === 'all' || lead.status === selectedStatus;
    const sourceMatch = selectedSource === 'all' || lead.source === selectedSource;
    return statusMatch && sourceMatch;
  });

  const stats = getLeadStats();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">New Leads</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{stats.newLeads}</p>
              </div>
              <Plus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Qualified</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-purple-600">{stats.qualified}</p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Proposals</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{stats.proposals}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{stats.conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lead Management</CardTitle>
              <CardDescription>
                Track and manage leads through the sales pipeline
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingLead(null);
                  form.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingLead ? 'Edit Lead' : 'Add New Lead'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLead ? 'Update lead information' : 'Capture new lead details'}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter company name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contact_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Person</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter contact name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="+91 9876543210" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="source"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lead Source</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {leadSources.map((source) => (
                                  <SelectItem key={source} value={source}>
                                    {source}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="budget_range"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget Range</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget range" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {budgetRanges.map((range) => (
                                  <SelectItem key={range} value={range}>
                                    {range}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="expected_move_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Move Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requirements</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe space requirements, team size, specific needs..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional notes or comments..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingLead ? 'Update Lead' : 'Create Lead'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4 mb-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {leadStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {leadSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead #</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.lead_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{lead.company_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.contact_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="text-sm">{lead.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>{lead.budget_range}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getScoreColor(lead.lead_score)}`}>
                      {lead.lead_score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={lead.status}
                      onValueChange={(status) => updateLeadStatus(lead.id, status)}
                    >
                      <SelectTrigger className="w-32">
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {leadStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(lead)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}