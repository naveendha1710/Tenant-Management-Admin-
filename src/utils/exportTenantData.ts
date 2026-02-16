import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  description: string;
  created_at: string;
}

export interface Agreement {
  id: string;
  version: string;
  title: string;
  agreement_text: string;
  signed_date: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  is_current: boolean;
}

export const exportInvoicesAsExcel = async (invoices: Invoice[], tenantName: string) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Invoices');
  worksheet.columns = [
    { header: 'Invoice Number', key: 'invoice_number', width: 20 },
    { header: 'Amount (₹)', key: 'amount', width: 15 },
    { header: 'Due Date', key: 'due_date', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Created Date', key: 'created_at', width: 15 }
  ];
  invoices.forEach(invoice => {
    worksheet.addRow({
      invoice_number: invoice.invoice_number,
      amount: invoice.amount.toLocaleString(),
      due_date: new Date(invoice.due_date).toLocaleDateString(),
      status: invoice.status.toUpperCase(),
      description: invoice.description,
      created_at: new Date(invoice.created_at).toLocaleDateString()
    });
  });
  const fileName = `${tenantName.replace(/\s+/g, '_')}_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportInvoicesAsPDF = (invoices: Invoice[], tenantName: string) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Invoice Report', 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Tenant: ${tenantName}`, 14, 32);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 40);
  
  // Table data
  const tableData = invoices.map(invoice => [
    invoice.invoice_number,
    `₹${invoice.amount.toLocaleString()}`,
    new Date(invoice.due_date).toLocaleDateString(),
    invoice.status.toUpperCase(),
    invoice.description
  ]);

  autoTable(doc, {
    head: [['Invoice #', 'Amount', 'Due Date', 'Status', 'Description']],
    body: tableData,
    startY: 50,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  // Summary
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = totalAmount - paidAmount;

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text('Summary:', 14, finalY);
  doc.text(`Total Amount: ₹${totalAmount.toLocaleString()}`, 14, finalY + 10);
  doc.text(`Paid Amount: ₹${paidAmount.toLocaleString()}`, 14, finalY + 20);
  doc.text(`Pending Amount: ₹${pendingAmount.toLocaleString()}`, 14, finalY + 30);

  const fileName = `${tenantName.replace(/\s+/g, '_')}_Invoices_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const generateAgreementPDF = (agreement: Agreement, tenantName: string) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Lease Agreement', 14, 22);
  
  doc.setFontSize(12);
  doc.text(`Version: ${agreement.version || 'N/A'}`, 14, 35);
  doc.text(`Tenant: ${tenantName || 'N/A'}`, 14, 45);
  
  // Handle date formatting safely
  const startDate = agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'N/A';
  const endDate = agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'N/A';
  doc.text(`Agreement Period: ${startDate} - ${endDate}`, 14, 55);
  
  const monthlyRent = agreement.monthly_rent ? `₹${agreement.monthly_rent.toLocaleString()}` : 'N/A';
  doc.text(`Monthly Rent: ${monthlyRent}`, 14, 65);
  doc.text(`Status: ${(agreement.status || 'N/A').toUpperCase()}`, 14, 75);
  
  // Agreement text
  doc.setFontSize(10);
  const agreementText = agreement.agreement_text || 'This is a sample lease agreement between Rathinam College and the tenant. The agreement outlines the terms and conditions for the rental of office space including monthly rent, security deposit, lease duration, and other important clauses.';
  const splitText = doc.splitTextToSize(agreementText, 180);
  doc.text(splitText, 14, 90);
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, pageHeight - 20);
  doc.text('This is a system-generated document.', 14, pageHeight - 15);

  const fileName = `${(tenantName || 'Tenant').replace(/\s+/g, '_')}_Agreement_v${agreement.version || '1.0'}.pdf`;
  doc.save(fileName);
};