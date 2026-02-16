export const mockTenantData = {
  profile: {
    tenant_id: 'TNT-001',
    company_name: 'TechStart Solutions',
    welcome_message: 'Welcome, TechStart Solutions',
    contact_person: 'John Doe',
    email: 'contact@techstart.com',
    phone: '+91 9876543210',
    address: '123 Tech Street, Coimbatore, Tamil Nadu 641001',
    lease_status: 'Active',
    move_in_date: '2024-01-01',
    spaces: {
      name: 'Office Suite 201',
      buildings: {
        name: 'Rathinam Tech Park - Block A'
      }
    }
  },
  lease: {
    space: 'Building A - Office 201',
    monthly_rent: 25000,
    lease_period: '1/1/2024 - 31/12/2024',
    agreement_history: [
      { id: '1', version: '1.2', signed_date: '1/1/2024', status: 'ACTIVE', title: 'Main Lease Agreement', is_current: true, start_date: '2024-01-01', end_date: '2024-12-31', monthly_rent: 25000 },
      { id: '2', version: '1.1', signed_date: '15/12/2023', status: 'SUPERSEDED', title: 'Initial Lease Agreement', is_current: false, start_date: '2023-12-15', end_date: '2024-01-01', monthly_rent: 25000 },
    ],
  },
  kpis: {
    pendingInvoices: 2,
    openTickets: 1,
    expiringDocuments: 1,
    notifications: 2,
  },
  actionCenter: {
    pendingInvoices: 2,
    openTickets: 1,
    expiringDocuments: 1,
    daysUntilExpiry: 28,
  },
  notifications: [
    {
      id: '1',
      type: 'invoice',
      title: 'New Invoice Generated',
      message: 'A new invoice (INV-2025-10) for ₹29,500 has been generated for your account.',
      priority: 'medium',
      created_at: '2024-01-25T10:00:00Z',
      read: false
    },
    {
      id: '2',
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: 'Your payment for invoice INV-2025-09 is due in 3 days.',
      priority: 'high',
      created_at: '2024-01-24T09:00:00Z',
      read: false
    },
    {
      id: '3',
      type: 'maintenance_update',
      title: 'Maintenance Ticket Update',
      message: 'Your ticket #TKT-123 (AC Not Cooling) has been updated to In Progress.',
      priority: 'medium',
      created_at: '2024-01-22T11:15:00Z',
      read: false
    },
    {
      id: '4',
      type: 'document_expiring',
      title: 'Document Expiring Soon',
      message: 'Your Business Insurance document is expiring in 15 days. Please upload a new one.',
      priority: 'urgent',
      created_at: '2024-01-20T08:00:00Z',
      read: false
    }
  ]
}