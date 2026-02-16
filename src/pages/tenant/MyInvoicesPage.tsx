import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Download, CreditCard, Receipt, FileText } from 'lucide-react';
import { PaymentGateway } from '@/components/tenant/PaymentGateway';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

const mockInvoices = [
  {
    id: '1',
    invoice_number: 'INV-2024-001',
    amount: 29500,
    due_date: '2024-02-01',
    status: 'paid',
    created_at: '2024-01-01',
    description: 'Monthly rent + service charges',
    payment_date: '2024-01-28'
  },
  {
    id: '2',
    invoice_number: 'INV-2024-002',
    amount: 29500,
    due_date: '2024-03-01',
    status: 'pending',
    created_at: '2024-02-01',
    description: 'Monthly rent + service charges'
  },
  {
    id: '3',
    invoice_number: 'INV-2024-003',
    amount: 29500,
    due_date: '2024-01-15',
    status: 'overdue',
    created_at: '2024-01-15',
    description: 'Monthly rent + service charges'
  },
  {
    id: '4',
    invoice_number: 'INV-2023-012',
    amount: 25000,
    due_date: '2023-12-01',
    status: 'paid',
    created_at: '2023-11-01',
    description: 'Monthly rent',
    payment_date: '2023-11-28'
  }
];

const mockPaymentHistory = [
  {
    id: 'PAY-001',
    invoice_number: 'INV-2024-001',
    amount: 29500,
    payment_date: '2024-01-28',
    method: 'Credit Card',
    transaction_id: 'TXN123456789',
    status: 'completed'
  },
  {
    id: 'PAY-002',
    invoice_number: 'INV-2023-012',
    amount: 25000,
    payment_date: '2023-11-28',
    method: 'UPI',
    transaction_id: 'TXN987654321',
    status: 'completed'
  }
];

export default function MyInvoicesPage() {
  const [invoices, setInvoices] = useState(mockInvoices);
  const [paymentHistory] = useState(mockPaymentHistory);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();

  const handlePayInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSuccess = (paymentId: string) => {
    if (selectedInvoice) {
      setInvoices(invoices.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'paid', payment_date: new Date().toISOString().split('T')[0] }
          : inv
      ));
      setSelectedInvoice(null);
      toast({ title: "Payment Successful", description: "Your payment has been processed" });
    }
  };

  const handleExportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');
    worksheet.columns = [
      { header: 'Invoice Number', key: 'invoice_number', width: 20 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Due Date', key: 'due_date', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Payment Date', key: 'payment_date', width: 15 }
    ];
    filteredInvoices.forEach(invoice => {
      worksheet.addRow({
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        due_date: new Date(invoice.due_date).toLocaleDateString(),
        status: invoice.status.toUpperCase(),
        description: invoice.description,
        payment_date: invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : 'N/A'
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Invoices_Export.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: "Excel file downloaded successfully" });
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Invoice Export', 20, 20);
    
    const tableData = filteredInvoices.map(invoice => [
      invoice.invoice_number,
      `₹${invoice.amount.toLocaleString()}`,
      new Date(invoice.due_date).toLocaleDateString(),
      invoice.status.toUpperCase(),
      invoice.description
    ]);
    
    autoTable(doc, {
      head: [['Invoice Number', 'Amount', 'Due Date', 'Status', 'Description']],
      body: tableData,
      startY: 30
    });
    
    doc.save('Invoices_Export.pdf');
    toast({ title: "Export Complete", description: "PDF file downloaded successfully" });
  };

  const handleDownloadSingleInvoice = (invoice: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('INVOICE', 20, 30);
    
    // Invoice details
    doc.setFontSize(12);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, 50);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 60);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 70);
    
    // Bill To
    doc.text('Bill To:', 20, 90);
    doc.text('TechStart Solutions', 20, 100);
    doc.text('Office Suite 201, Building A', 20, 110);
    
    // Invoice items
    autoTable(doc, {
      head: [['Description', 'Amount']],
      body: [[invoice.description, `₹${invoice.amount.toLocaleString()}`]],
      startY: 130
    });
    
    // Total
    doc.setFontSize(14);
    doc.text(`Total Amount: ₹${invoice.amount.toLocaleString()}`, 20, doc.lastAutoTable.finalY + 20);
    
    doc.save(`${invoice.invoice_number}.pdf`);
    toast({ title: "Download Complete", description: `Invoice ${invoice.invoice_number} downloaded` });
  };

  const handleDownloadReceipt = (payment: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('PAYMENT RECEIPT', 20, 30);
    
    // Receipt details
    doc.setFontSize(12);
    doc.text(`Payment ID: ${payment.id}`, 20, 50);
    doc.text(`Invoice Number: ${payment.invoice_number}`, 20, 60);
    doc.text(`Amount: ₹${payment.amount.toLocaleString()}`, 20, 70);
    doc.text(`Payment Date: ${new Date(payment.payment_date).toLocaleDateString()}`, 20, 80);
    doc.text(`Payment Method: ${payment.method}`, 20, 90);
    doc.text(`Transaction ID: ${payment.transaction_id}`, 20, 100);
    doc.text(`Status: ${payment.status.toUpperCase()}`, 20, 110);
    
    doc.save(`Receipt_${payment.id}.pdf`);
    toast({ title: "Download Complete", description: `Receipt for ${payment.invoice_number} downloaded` });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <DashboardLayout title="My Invoices" subtitle="View and manage your invoices and payments">
      <div className="space-y-4 sm:space-y-6">
        {/* Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Amount</p>
                  <p className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">₹{pendingAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>View and manage your invoices</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={handleExportToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportToPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
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
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>₹{invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{invoice.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDownloadSingleInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                            <Button 
                              size="sm"
                              onClick={() => handlePayInvoice(invoice)}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pay
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

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Your payment transactions and receipts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{payment.invoice_number}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell className="font-mono text-sm">{payment.transaction_id}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment)}
                        >
                          <Receipt className="mr-2 h-4 w-4" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment Gateway */}
        {selectedInvoice && (
          <PaymentGateway
            invoice={selectedInvoice}
            isOpen={isPaymentDialogOpen}
            onClose={() => {
              setIsPaymentDialogOpen(false);
              setSelectedInvoice(null);
            }}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}