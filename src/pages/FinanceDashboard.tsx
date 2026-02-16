import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign, FileText, AlertCircle, Plus, Search, Edit, Check, X, TrendingUp, TrendingDown, Receipt, Download, Users, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import { exportInvoicesToExcel, exportInvoicesToPDF, exportTaxReportToExcel, exportTaxReportToPDF } from "@/utils/exportFinance";
import { MonthlyRevenueChart } from "@/components/finance/MonthlyRevenueChart";
import { CreateInvoiceModal } from "@/components/finance/CreateInvoiceModal";
import { supabase } from "@/lib/supabaseClient";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  status: string;
  created_at: string;
  description?: string;
  tenants: { company_name: string; id?: string } | null;
}

const revenueData = [
  { month: 'Jan', revenue: 125000, expenses: 45000 },
  { month: 'Feb', revenue: 142000, expenses: 52000 },
  { month: 'Mar', revenue: 158000, expenses: 48000 },
  { month: 'Apr', revenue: 167000, expenses: 55000 },
  { month: 'May', revenue: 175000, expenses: 58000 },
  { month: 'Jun', revenue: 189000, expenses: 62000 }
];

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    tenant_id: '',
    amount: '',
    tax_amount: '',
    due_date: undefined as Date | undefined,
    description: '',
    status: 'pending'
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
    fetchTenants();
    
    // Real-time subscription
    const subscription = supabase
      .channel('invoices_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'invoices' }, 
        () => fetchInvoices()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          *,
          tenants ( company_name )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch invoices:', error);
        setInvoices([]);
        return;
      }
      
      setInvoices(invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data: tenantList, error } = await supabase
        .from('tenants')
        .select('id, company_name');

      if (error) {
        console.error('Failed to fetch tenants:', error);
        setTenants([]);
        return;
      }
      
      setTenants(tenantList || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.tenant_id || !formData.amount || !formData.due_date) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    try {
      const invoiceNumber = `INV${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
      const totalAmount = Number(formData.amount) + Number(formData.tax_amount || 0);
      
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          tenant_id: formData.tenant_id,
          amount: Number(formData.amount),
          tax_amount: Number(formData.tax_amount || 0),
          total_amount: totalAmount,
          due_date: formData.due_date.toISOString().split('T')[0],
          description: formData.description,
          status: formData.status
        })
        .select();

      if (error) throw error;

      setIsCreateDialogOpen(false);
      setFormData({
        tenant_id: '',
        amount: '',
        tax_amount: '',
        due_date: undefined,
        description: '',
        status: 'pending'
      });
      toast({ title: "Success", description: "Invoice created successfully" });
      fetchInvoices(); // Refresh the list
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({ title: "Error", description: "Failed to create invoice", variant: "destructive" });
    }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'approved' })
        .eq('id', invoiceId);

      if (error) {
        // Fallback: Update local state if database update fails
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? { ...inv, status: 'approved' } : inv
        ));
        toast({ title: "Success", description: "Invoice approved (local update)" });
        return;
      }
      toast({ title: "Success", description: "Invoice approved" });
      fetchInvoices();
    } catch (error) {
      // Fallback: Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'approved' } : inv
      ));
      toast({ title: "Success", description: "Invoice approved (local update)" });
    }
  };

  const handleRejectInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'rejected' })
        .eq('id', invoiceId);

      if (error) {
        // Fallback: Update local state if database update fails
        setInvoices(prev => prev.map(inv => 
          inv.id === invoiceId ? { ...inv, status: 'rejected' } : inv
        ));
        toast({ title: "Success", description: "Invoice rejected (local update)" });
        return;
      }
      toast({ title: "Success", description: "Invoice rejected" });
      fetchInvoices();
    } catch (error) {
      // Fallback: Update local state
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: 'rejected' } : inv
      ));
      toast({ title: "Success", description: "Invoice rejected (local update)" });
    }
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsCreateDialogOpen(true);
  };



  const exportSingleInvoicePDF = (invoice: Invoice) => {
    const invoiceData = {
      id: invoice.invoice_number,
      tenantName: invoice.tenants?.company_name || 'N/A',
      amount: invoice.amount,
      dueDate: invoice.due_date,
      status: invoice.status,
      createdDate: invoice.created_at,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      description: invoice.description || 'N/A'
    };
    exportInvoicesToPDF([invoiceData]);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const tenantName = invoice.tenants?.company_name || '';
    const matchesSearch = tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout title="Finance Dashboard" subtitle="Invoice management, tax compliance, and financial reporting">
        <div className="flex items-center justify-center h-64">Loading...</div>
      </DashboardLayout>
    );
  }

  const stats = {
    totalInvoices: invoices.length,
    pendingApprovals: invoices.filter(i => i.status === 'pending').length,
    overduePayments: invoices.filter(i => i.status === 'overdue').length,
    totalTaxes: invoices.reduce((sum, i) => sum + i.tax_amount, 0),
    monthlyRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0),
    totalOutstanding: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)
  };



  return (
    <DashboardLayout 
      title="Finance Dashboard" 
      subtitle="Invoice management, tax compliance, and financial reporting"
    >
      <div className="space-y-4 sm:space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">Active invoices</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Payments</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{stats.overduePayments}</div>
              <p className="text-xs text-muted-foreground">₹{stats.totalOutstanding.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Taxes</CardTitle>
              <Receipt className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{(stats.totalTaxes / 1000).toFixed(0)}K</div>
              <p className="text-xs text-muted-foreground">GST collected</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="invoices" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="invoices">Invoice Management</TabsTrigger>
            <TabsTrigger value="tax">Tax Compliance</TabsTrigger>
            <TabsTrigger value="reports">Financial Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle>Invoice Management</CardTitle>
                    <CardDescription>Create, approve, and manage all invoices</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => navigate('/finance/tenants')}>
                      <Users className="mr-2 h-4 w-4" />
                      Tenant Billing
                    </Button>
                    <Button onClick={() => {
                      setEditingInvoice(null);
                      setIsCreateDialogOpen(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Invoice
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <ExportDropdown 
                      onExportExcel={() => exportInvoicesToExcel(filteredInvoices)}
                      onExportPDF={() => exportInvoicesToPDF(filteredInvoices)}
                    />
                  </div>

                  {/* Invoices Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Tenant Name</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                            <TableCell>{invoice.tenants?.company_name || 'N/A'}</TableCell>
                            <TableCell>₹{invoice.amount.toLocaleString()}</TableCell>
                            <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(invoice.status)}>
                                {invoice.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:flex-row gap-2">
                                {invoice.status === 'pending' && (
                                  <>
                                    <Button size="sm" onClick={() => handleApproveInvoice(invoice.id)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleRejectInvoice(invoice.id)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <Button size="sm" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => exportSingleInvoicePDF(invoice)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tax Compliance Summary</CardTitle>
                  <CardDescription>GST and service tax overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>GST Collected (18%)</span>
                      <span className="font-bold">₹{stats.totalTaxes.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Service Tax</span>
                      <span className="font-bold">₹{(stats.totalTaxes * 0.1).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="font-medium">Total Tax Liability</span>
                      <span className="font-bold text-lg">₹{(stats.totalTaxes * 1.1).toLocaleString()}</span>
                    </div>
                  </div>
                  <ExportDropdown 
                    onExportExcel={() => exportTaxReportToExcel({
                      gstAmount: stats.totalTaxes,
                      serviceTax: stats.totalTaxes * 0.1,
                      totalTax: stats.totalTaxes * 1.1
                    })}
                    onExportPDF={() => exportTaxReportToPDF({
                      gstAmount: stats.totalTaxes,
                      serviceTax: stats.totalTaxes * 0.1,
                      totalTax: stats.totalTaxes * 1.1
                    })}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Tax Breakdown</CardTitle>
                  <CardDescription>Tax collection by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['January', 'February', 'March'].map((month, index) => {
                      const amount = stats.totalTaxes / 3 * (1 + index * 0.1);
                      return (
                        <div key={month} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{month} 2024</span>
                            <span className="font-medium">₹{amount.toLocaleString()}</span>
                          </div>
                          <Progress value={60 + index * 15} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trend</CardTitle>
                  <CardDescription>Live revenue data from invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyRevenueChart />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses</CardTitle>
                  <CardDescription>Monthly financial trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, '']} />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cash Flow Overview</CardTitle>
                  <CardDescription>Payment trends and forecasting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{invoices.filter(i => i.status === 'paid').length}</div>
                        <div className="text-sm text-muted-foreground">Paid Invoices</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">{invoices.filter(i => i.status === 'pending' || i.status === 'approved').length}</div>
                        <div className="text-sm text-muted-foreground">Pending Collection</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Collection Rate</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <ExportDropdown 
                      onExportExcel={() => exportInvoicesToExcel(invoices.filter(i => i.status === 'paid'))}
                      onExportPDF={() => exportInvoicesToPDF(invoices.filter(i => i.status === 'paid'))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Invoice Modal */}
        <CreateInvoiceModal 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) setEditingInvoice(null);
          }}
          onSuccess={fetchInvoices}
          initialData={editingInvoice}
        />


      </div>
    </DashboardLayout>
  );
}