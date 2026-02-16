import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface BillingData {
  id: string;
  tenant_name: string;
  total_amount: number;
  due_date: string;
  status: string;
}

export const exportToExcel = (data: BillingData[]) => {
  const exportData = data.map(item => ({
    'Invoice ID': item.id,
    'Tenant Name': item.tenant_name,
    'Amount': `₹${item.total_amount.toLocaleString()}`,
    'Due Date': new Date(item.due_date).toLocaleDateString(),
    'Status': item.status.toUpperCase()
  }));

  const fileName = generateFileName('billing_export', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportToPDF = (data: BillingData[]) => {
  const headers = ['Invoice ID', 'Tenant Name', 'Amount', 'Due Date', 'Status'];
  
  const tableData = data.map(item => [
    item.id,
    item.tenant_name,
    `₹${item.total_amount.toLocaleString()}`,
    new Date(item.due_date).toLocaleDateString(),
    item.status.toUpperCase()
  ]);

  const fileName = generateFileName('billing_export', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Billing Export Report');
};