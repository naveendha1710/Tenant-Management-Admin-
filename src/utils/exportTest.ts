// Test file to verify export functionality works
import { exportInvoicesToExcel, exportInvoicesToPDF } from './exportFinance';
import { exportLeadsToExcel, exportLeadsToPDF } from './exportCRM';
import { exportTicketsToExcel, exportTicketsToPDF } from './exportMaintenance';
import { exportTenantsToExcel, exportTenantsToPDF } from './exportAdmin';

// Test data
const testInvoice = {
  id: 'INV-001',
  tenantName: 'Test Company',
  amount: 50000,
  dueDate: '2024-03-15',
  status: 'pending',
  createdDate: '2024-02-15',
  taxAmount: 9000,
  spaceDetails: 'Building A - Floor 2 (10 seats)'
};

const testLead = {
  id: 'LEAD-001',
  company_name: 'Test Lead Company',
  contact_person: 'John Doe',
  email: 'john@test.com',
  phone: '+91 9876543210',
  status: 'inquiry',
  lead_score: 85,
  space_requirement: '10 seats',
  budget_range: '₹40,000 - ₹60,000',
  source: 'website',
  created_at: '2024-01-15',
  follow_up_date: '2024-01-20'
};

const testTicket = {
  id: '1',
  ticket_number: 'TKT-001',
  title: 'Test Maintenance Issue',
  description: 'Test description',
  category: 'HVAC',
  priority: 'high',
  status: 'pending',
  created_at: '2024-01-20',
  updated_at: '2024-01-21',
  cost: 5000,
  assigned_to: 'Test Technician',
  tenant: {
    company_name: 'Test Company',
    contact_person: 'Jane Doe'
  },
  space: {
    name: 'Office 201',
    building: 'Building A'
  }
};

const testTenant = {
  id: 'TENANT-001',
  company_name: 'Test Tenant Company',
  contact_person: 'Bob Smith',
  email: 'bob@testcompany.com',
  phone: '+91 9876543210',
  status: 'active',
  space_type: 'office',
  monthly_rent: 45000,
  lease_start: '2024-01-01',
  lease_end: '2024-12-31'
};

// Export test functions
export const testFinanceExports = () => {
  console.log('Testing Finance exports...');
  exportInvoicesToExcel([testInvoice]);
  exportInvoicesToPDF([testInvoice]);
};

export const testCRMExports = () => {
  console.log('Testing CRM exports...');
  exportLeadsToExcel([testLead]);
  exportLeadsToPDF([testLead]);
};

export const testMaintenanceExports = () => {
  console.log('Testing Maintenance exports...');
  exportTicketsToExcel([testTicket]);
  exportTicketsToPDF([testTicket]);
};

export const testAdminExports = () => {
  console.log('Testing Admin exports...');
  exportTenantsToExcel([testTenant]);
  exportTenantsToPDF([testTenant]);
};

// Run all tests
export const runAllExportTests = () => {
  console.log('Running all export tests...');
  testFinanceExports();
  testCRMExports();
  testMaintenanceExports();
  testAdminExports();
  console.log('All export tests completed!');
};