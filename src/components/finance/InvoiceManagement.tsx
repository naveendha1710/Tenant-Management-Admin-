import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { FileText, Plus, Download, Send, Eye, Edit, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const invoiceSchema = z.object({
  tenant_id: z.string().min(1, 'Please select a tenant'),
  billing_period_start: z.string().min(1, 'Start date is required'),
  billing_period_end: z.string().min(1, 'End date is required'),
  base_rent: z.number().min(0, 'Base rent must be non-negative'),
  maintenance_charges: z.number().min(0, 'Maintenance charges must be non-negative'),
  other_charges: z.number().min(0, 'Other charges must be non-negative'),
  due_date: z.string().min(1, 'Due date is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface Invoice {
  id: string;
  invoice_number: string;
  tenant_id: string;
  billing_period_start: string;
  billing_period_end: string;
  base_rent: number;
  maintenance_charges: number;
  gst_amount: number;
  other_charges: number;
  total_amount: number;
  due_date: string;
  status: string;
  payment_date: string | null;
  payment_method: string | null;
  created_at: string;
  tenant: {
    company_name: string;
    tenant_id: string;
  };
}

interface Tenant {
  id: string;
  tenant_id: string;
  company_name: string;
  status: string;
}

const invoiceStatuses = ['Draft', 'Approved', 'Sent', 'Paid', 'Overdue', 'Cancelled'];
const paymentMethods = ['Bank Transfer', 'Cheque', 'Online Payment', 'Cash', 'UPI'];

export function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      tenant_id: '',
      billing_period_start: '',
      billing_period_end: '',
      base_rent: 0,
      maintenance_charges: 0,
      other_charges: 0,
      due_date: '',
    },
  });

  useEffect(() => {
    fetchTenants();
    fetchInvoices();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, tenant_id, company_name, status')
        .eq('status', 'Active')
        .order('company_name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to fetch tenants');
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('invoice_overview')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback to regular invoices table if view doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('invoices')
          .select(`
            *,
            tenant:tenants(company_name, tenant_id)
          `)
          .order('created_at', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        setInvoices(fallbackData || []);
      } else {
        // Transform data to match expected format
        const transformedData = data?.map(invoice => ({
          ...invoice,
          tenant: {
            company_name: invoice.company_name,
            tenant_id: invoice.tenant_id
          }
        })) || [];
        setInvoices(transformedData);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const calculateGST = (baseAmount: number, maintenanceCharges: number, otherCharges: number) => {
    const taxableAmount = baseAmount + maintenanceCharges + otherCharges;
    return taxableAmount * 0.18; // 18% GST
  };

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      const gstAmount = calculateGST(data.base_rent, data.maintenance_charges, data.other_charges);
      const totalAmount = data.base_rent + data.maintenance_charges + data.other_charges + gstAmount;

      const invoiceData = {
        ...data,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        status: 'Draft',
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) throw error;
        toast.success('Invoice updated successfully');
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert(invoiceData);

        if (error) throw error;
        toast.success('Invoice created successfully');
      }

      setIsDialogOpen(false);
      setEditingInvoice(null);
      form.reset();
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.reset({
      tenant_id: invoice.tenant_id,
      billing_period_start: invoice.billing_period_start,
      billing_period_end: invoice.billing_period_end,
      base_rent: invoice.base_rent,
      maintenance_charges: invoice.maintenance_charges,
      other_charges: invoice.other_charges,
      due_date: invoice.due_date,
    });
    setIsDialogOpen(true);
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'Paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
        updateData.payment_method = 'Bank Transfer'; // Default, can be made configurable
      }

      const { error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success(`Invoice ${status.toLowerCase()} successfully`);
      fetchInvoices();
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Approved': return 'bg-blue-100 text-blue-800';
      case 'Sent': return 'bg-yellow-100 text-yellow-800';
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStats = () => {
    const total = invoices.length;
    const draft = invoices.filter(i => i.status === 'Draft').length;
    const sent = invoices.filter(i => i.status === 'Sent').length;
    const paid = invoices.filter(i => i.status === 'Paid').length;
    const overdue = invoices.filter(i => i.status === 'Overdue').length;
    const totalAmount = invoices.reduce((sum, i) => sum + i.total_amount, 0);
    const paidAmount = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.total_amount, 0);
    const pendingAmount = invoices.filter(i => ['Sent', 'Overdue'].includes(i.status)).reduce((sum, i) => sum + i.total_amount, 0);

    return {
      total,
      draft,
      sent,
      paid,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount
    };
  };

  const filteredInvoices = selectedStatus === 'all' 
    ? invoices 
    : invoices.filter(invoice => invoice.status === selectedStatus);

  const stats = getInvoiceStats();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{stats.totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Paid Amount</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">₹{stats.paidAmount.toLocaleString()}</p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-yellow-600">₹{stats.pendingAmount.toLocaleString()}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Invoice Management</CardTitle>
              <CardDescription>
                Create, manage, and track invoices for all tenants
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingInvoice(null);
                  form.reset();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingInvoice ? 'Update invoice details' : 'Generate a new invoice for a tenant'}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="tenant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.company_name} ({tenant.tenant_id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="billing_period_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Period Start</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="billing_period_end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Period End</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="base_rent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Rent (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maintenance_charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maintenance Charges (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="other_charges"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other Charges (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Invoice Summary</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Base Rent:</span>
                          <span>₹{form.watch('base_rent')?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Maintenance:</span>
                          <span>₹{form.watch('maintenance_charges')?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Other Charges:</span>
                          <span>₹{form.watch('other_charges')?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>GST (18%):</span>
                          <span>₹{calculateGST(
                            form.watch('base_rent') || 0,
                            form.watch('maintenance_charges') || 0,
                            form.watch('other_charges') || 0
                          ).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-1">
                          <span>Total Amount:</span>
                          <span>₹{(
                            (form.watch('base_rent') || 0) +
                            (form.watch('maintenance_charges') || 0) +
                            (form.watch('other_charges') || 0) +
                            calculateGST(
                              form.watch('base_rent') || 0,
                              form.watch('maintenance_charges') || 0,
                              form.watch('other_charges') || 0
                            )
                          ).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Invoices</SelectItem>
                {invoiceStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Period</TableHead>
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
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.tenant.company_name}</p>
                      <p className="text-sm text-muted-foreground">{invoice.tenant.tenant_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(invoice.billing_period_start), 'MMM dd')} - {format(new Date(invoice.billing_period_end), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>₹{invoice.total_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className={`${new Date(invoice.due_date) < new Date() && invoice.status !== 'Paid' ? 'text-red-600' : ''}`}>
                      {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {invoice.status === 'Draft' && (
                        <Button
                          size="sm"
                          onClick={() => updateInvoiceStatus(invoice.id, 'Approved')}
                        >
                          Approve
                        </Button>
                      )}
                      {invoice.status === 'Approved' && (
                        <Button
                          size="sm"
                          onClick={() => updateInvoiceStatus(invoice.id, 'Sent')}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      {['Sent', 'Overdue'].includes(invoice.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateInvoiceStatus(invoice.id, 'Paid')}
                        >
                          Mark Paid
                        </Button>
                      )}
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