import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface FinanceInvoiceData {
  id: string;
  tenantName: string;
  amount: number;
  dueDate: string;
  status: string;
  createdDate: string;
  taxAmount: number;
  spaceDetails: string;
}

export const exportInvoicesToExcel = (data: FinanceInvoiceData[]) => {
  const exportData = data.map(item => ({
    'Invoice ID': item.id,
    'Tenant Name': item.tenantName,
    'Amount': `₹${item.amount.toLocaleString()}`,
    'Tax Amount': `₹${item.taxAmount.toLocaleString()}`,
    'Total Amount': `₹${(item.amount + item.taxAmount).toLocaleString()}`,
    'Due Date': new Date(item.dueDate).toLocaleDateString(),
    'Created Date': new Date(item.createdDate).toLocaleDateString(),
    'Status': item.status.toUpperCase(),
    'Space Details': item.spaceDetails
  }));

  const fileName = generateFileName('finance_invoices', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportInvoicesToPDF = (data: FinanceInvoiceData[]) => {
  const headers = ['Invoice ID', 'Tenant Name', 'Amount', 'Tax', 'Total', 'Due Date', 'Status'];
  
  const tableData = data.map(item => [
    item.id,
    item.tenantName,
    `₹${item.amount.toLocaleString()}`,
    `₹${item.taxAmount.toLocaleString()}`,
    `₹${(item.amount + item.taxAmount).toLocaleString()}`,
    new Date(item.dueDate).toLocaleDateString(),
    item.status.toUpperCase()
  ]);

  const fileName = generateFileName('finance_invoices', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Finance Invoices Report');
};

export const exportTaxReportToExcel = (data: any) => {
  const exportData = [
    { 'Tax Type': 'GST (18%)', 'Amount': `₹${data.gstAmount.toLocaleString()}` },
    { 'Tax Type': 'Service Tax', 'Amount': `₹${data.serviceTax.toLocaleString()}` },
    { 'Tax Type': 'Total Tax Liability', 'Amount': `₹${data.totalTax.toLocaleString()}` }
  ];

  const fileName = generateFileName('tax_report', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportTaxReportToPDF = (data: any) => {
  const headers = ['Tax Type', 'Amount'];
  const tableData = [
    ['GST (18%)', `₹${data.gstAmount.toLocaleString()}`],
    ['Service Tax', `₹${data.serviceTax.toLocaleString()}`],
    ['Total Tax Liability', `₹${data.totalTax.toLocaleString()}`]
  ];

  const fileName = generateFileName('tax_report', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Tax Compliance Report');
};