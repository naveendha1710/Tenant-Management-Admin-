import { generateFileName, createExcelFile, createPDFFile } from './exportUtils';

export interface AdminTenantData {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  status: string;
  space_type: string;
  monthly_rent: number;
  lease_start: string;
  lease_end: string;
  space_allocation?: {
    building: string;
    floor: number;
    seats: number;
  };
}

export const exportTenantsToExcel = (data: AdminTenantData[]) => {
  const exportData = data.map(item => ({
    'Tenant ID': item.id,
    'Company Name': item.company_name,
    'Contact Person': item.contact_person,
    'Email': item.email,
    'Phone': item.phone,
    'Status': item.status.toUpperCase(),
    'Space Type': item.space_type,
    'Monthly Rent': `₹${item.monthly_rent.toLocaleString()}`,
    'Lease Start': new Date(item.lease_start).toLocaleDateString(),
    'Lease End': new Date(item.lease_end).toLocaleDateString(),
    'Building': item.space_allocation?.building || 'N/A',
    'Floor': item.space_allocation?.floor || 'N/A',
    'Seats': item.space_allocation?.seats || 'N/A'
  }));

  const fileName = generateFileName('admin_tenants', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportTenantsToPDF = (data: AdminTenantData[]) => {
  const headers = ['Company', 'Contact', 'Email', 'Status', 'Space Type', 'Monthly Rent', 'Lease Period'];
  
  const tableData = data.map(item => [
    item.company_name,
    item.contact_person,
    item.email,
    item.status.toUpperCase(),
    item.space_type,
    `₹${item.monthly_rent.toLocaleString()}`,
    `${new Date(item.lease_start).toLocaleDateString()} - ${new Date(item.lease_end).toLocaleDateString()}`
  ]);

  const fileName = generateFileName('admin_tenants', 'pdf');
  createPDFFile(tableData, headers, fileName, 'Admin Tenants Report');
};

export const exportSpaceAllocationToExcel = (data: any[]) => {
  const exportData = data.map(item => ({
    'Building': item.building,
    'Floor': item.floor,
    'Total Seats': item.totalSeats,
    'Occupied Seats': item.occupiedSeats,
    'Available Seats': item.availableSeats,
    'Occupancy Rate': `${item.occupancyRate}%`,
    'Revenue': `₹${item.revenue.toLocaleString()}`
  }));

  const fileName = generateFileName('space_allocation', 'xlsx');
  createExcelFile(exportData, [], fileName);
};

export const exportBillingToExcel = (data: any[]) => {
  const exportData = data.map(item => ({
    'Invoice ID': item.id,
    'Tenant': item.tenant_name,
    'Amount': `₹${item.total_amount.toLocaleString()}`,
    'Due Date': new Date(item.due_date).toLocaleDateString(),
    'Status': item.status.toUpperCase(),
    'Payment Date': item.payment_date ? new Date(item.payment_date).toLocaleDateString() : 'Pending'
  }));

  const fileName = generateFileName('admin_billing', 'xlsx');
  createExcelFile(exportData, [], fileName);
};