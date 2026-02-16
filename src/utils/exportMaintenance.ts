import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface MaintenanceTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  cost: number;
  assigned_to: string;
  tenant?: {
    company_name: string;
    contact_person: string;
  };
  space?: {
    name: string;
    building: string;
  };
}

export const exportTicketsToExcel = (data: MaintenanceTicket[]) => {
  const exportData = data.map(item => ({
    'Ticket ID': item.ticket_number,
    'Title': item.title,
    'Description': item.description,
    'Category': item.category,
    'Priority': item.priority,
    'Status': item.status.toUpperCase(),
    'Tenant': item.tenant?.company_name || 'N/A',
    'Contact': item.tenant?.contact_person || 'N/A',
    'Space': item.space?.name || 'N/A',
    'Building': item.space?.building || 'N/A',
    'Assigned To': item.assigned_to,
    'Cost': `₹${item.cost.toLocaleString()}`,
    'Created Date': new Date(item.created_at).toLocaleDateString(),
    'Updated Date': new Date(item.updated_at).toLocaleDateString()
  }));

  const fileName = generateFileName('maintenance_tickets', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportTicketsToPDF = (data: MaintenanceTicket[]) => {
  const headers = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Tenant', 'Assigned To', 'Cost'];
  
  const tableData = data.map(item => [
    item.ticket_number,
    item.title,
    item.category,
    item.priority,
    item.status.toUpperCase(),
    item.tenant?.company_name || 'N/A',
    item.assigned_to,
    `₹${item.cost.toLocaleString()}`
  ]);

  const fileName = generateFileName('maintenance_tickets', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Maintenance Tickets Report');
};

export const exportCostAnalysisToExcel = (data: any[]) => {
  const exportData = data.map(item => ({
    'Tenant': item.tenant,
    'Area (sq ft)': item.area,
    'Share Percentage': `${item.share_percentage}%`,
    'Monthly Cost': `₹${item.monthly_cost.toLocaleString()}`,
    'YTD Cost': `₹${item.ytd_cost.toLocaleString()}`
  }));

  const fileName = generateFileName('maintenance_cost_analysis', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportCostAnalysisToPDF = (data: any[]) => {
  const headers = ['Tenant', 'Area (sq ft)', 'Share %', 'Monthly Cost', 'YTD Cost'];
  
  const tableData = data.map(item => [
    item.tenant,
    item.area.toString(),
    `${item.share_percentage}%`,
    `₹${item.monthly_cost.toLocaleString()}`,
    `₹${item.ytd_cost.toLocaleString()}`
  ]);

  const fileName = generateFileName('maintenance_cost_analysis', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Maintenance Cost Analysis Report');
};