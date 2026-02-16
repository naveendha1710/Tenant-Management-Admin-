import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface LeadData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  date_created: string;
  space_interest: string;
  budget_range: string;
}

export const exportLeadsToExcel = (data: LeadData[]) => {
  const exportData = data.map(item => ({
    'Lead ID': item.id,
    'Company Name': item.company_name,
    'Contact Person': item.contact_person,
    'Email': item.email,
    'Phone': item.phone,
    'Source': item.source.toUpperCase(),
    'Status': item.status.toUpperCase(),
    'Date Created': new Date(item.date_created).toLocaleDateString(),
    'Space Interest': item.space_interest,
    'Budget Range': item.budget_range
  }));

  const fileName = generateFileName('leads_export', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportLeadsToPDF = (data: LeadData[]) => {
  const headers = ['Lead ID', 'Company Name', 'Contact Person', 'Email', 'Phone', 'Source', 'Status', 'Date Created'];
  
  const tableData = data.map(item => [
    item.id,
    item.company_name,
    item.contact_person,
    item.email,
    item.phone,
    item.source.toUpperCase(),
    item.status.toUpperCase(),
    new Date(item.date_created).toLocaleDateString()
  ]);

  const fileName = generateFileName('leads_export', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Leads Export Report');
};