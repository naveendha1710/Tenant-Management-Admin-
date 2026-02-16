import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface CRMLeadData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: string;
  lead_score: number;
  space_requirement: string;
  budget_range: string;
  source: string;
  created_at: string;
  follow_up_date?: string;
}

export const exportLeadsToExcel = (data: CRMLeadData[]) => {
  const exportData = data.map(item => ({
    'Lead ID': item.id,
    'Company Name': item.company_name,
    'Contact Person': item.contact_person,
    'Email': item.email,
    'Phone': item.phone,
    'Status': item.status.toUpperCase(),
    'Lead Score': item.lead_score,
    'Space Requirement': item.space_requirement,
    'Budget Range': item.budget_range,
    'Source': item.source,
    'Created Date': new Date(item.created_at).toLocaleDateString(),
    'Follow Up Date': item.follow_up_date ? new Date(item.follow_up_date).toLocaleDateString() : 'Not Set'
  }));

  const fileName = generateFileName('crm_leads', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportLeadsToPDF = (data: CRMLeadData[]) => {
  const headers = ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Score', 'Space Req.'];
  
  const tableData = data.map(item => [
    item.company_name,
    item.contact_person,
    item.email,
    item.phone,
    item.status.toUpperCase(),
    item.lead_score.toString(),
    item.space_requirement
  ]);

  const fileName = generateFileName('crm_leads', 'pdf');
  createPDFFile(tableData, headers, fileName, 'CRM Leads Report');
};

export const exportPipelineToExcel = (data: any) => {
  const exportData = [
    { 'Stage': 'Inquiry', 'Count': data.inquiry, 'Percentage': `${((data.inquiry / data.total) * 100).toFixed(1)}%` },
    { 'Stage': 'Negotiation', 'Count': data.negotiation, 'Percentage': `${((data.negotiation / data.total) * 100).toFixed(1)}%` },
    { 'Stage': 'Quotation', 'Count': data.quotation, 'Percentage': `${((data.quotation / data.total) * 100).toFixed(1)}%` },
    { 'Stage': 'Converted', 'Count': data.tenant, 'Percentage': `${((data.tenant / data.total) * 100).toFixed(1)}%` }
  ];

  const fileName = generateFileName('sales_pipeline', 'xlsx');
  createExcelFile(exportData, [], fileName);
};