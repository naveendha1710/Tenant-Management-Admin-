// Mock data for demo mode
export const mockTenants = [
  {
    id: '1',
    tenant_id: 'TNT0001',
    company_name: 'TechStart Solutions',
    sector: 'Software Development',
    pan_number: 'ABCDE1234F',
    gst_number: '33ABCDE1234F1Z5',
    address: '123 Tech Street, Coimbatore, Tamil Nadu 641001',
    contact_email: 'contact@techstart.com',
    contact_phone: '+91 9876543210',
    representative_name: 'John Doe',
    representative_email: 'john@techstart.com',
    representative_phone: '+91 9876543210',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    tenant_id: 'TNT0002',
    company_name: 'Innovate Labs',
    sector: 'AI/ML',
    pan_number: 'FGHIJ5678K',
    gst_number: '33FGHIJ5678K1Z5',
    address: '456 Innovation Ave, Coimbatore, Tamil Nadu 641002',
    contact_email: 'hello@innovatelabs.com',
    contact_phone: '+91 9876543211',
    representative_name: 'Jane Smith',
    representative_email: 'jane@innovatelabs.com',
    representative_phone: '+91 9876543211',
    status: 'Active',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '3',
    tenant_id: 'TNT0003',
    company_name: 'Digital Dynamics',
    sector: 'Digital Marketing',
    pan_number: 'KLMNO9012P',
    gst_number: '33KLMNO9012P1Z5',
    address: '789 Digital Plaza, Coimbatore, Tamil Nadu 641003',
    contact_email: 'info@digitaldynamics.com',
    contact_phone: '+91 9876543212',
    representative_name: 'Mike Johnson',
    representative_email: 'mike@digitaldynamics.com',
    representative_phone: '+91 9876543212',
    status: 'Active',
    created_at: '2024-02-01T00:00:00Z'
  }
];

export const mockInvoices = [
  {
    id: '1',
    invoice_number: 'INV20240001',
    tenant_id: '1',
    billing_period_start: '2024-01-01',
    billing_period_end: '2024-01-31',
    base_rent: 50000,
    maintenance_charges: 5000,
    gst_amount: 9900,
    other_charges: 0,
    total_amount: 64900,
    due_date: '2024-02-10',
    status: 'Paid',
    payment_date: '2024-02-08',
    payment_method: 'Bank Transfer',
    created_at: '2024-01-31T00:00:00Z',
    tenant: { company_name: 'TechStart Solutions', tenant_id: 'TNT0001' }
  },
  {
    id: '2',
    invoice_number: 'INV20240002',
    tenant_id: '2',
    billing_period_start: '2024-01-01',
    billing_period_end: '2024-01-31',
    base_rent: 60000,
    maintenance_charges: 6000,
    gst_amount: 11880,
    other_charges: 0,
    total_amount: 77880,
    due_date: '2024-02-10',
    status: 'Sent',
    payment_date: null,
    payment_method: null,
    created_at: '2024-01-31T00:00:00Z',
    tenant: { company_name: 'Innovate Labs', tenant_id: 'TNT0002' }
  },
  {
    id: '3',
    invoice_number: 'INV20240003',
    tenant_id: '3',
    billing_period_start: '2024-02-01',
    billing_period_end: '2024-02-29',
    base_rent: 45000,
    maintenance_charges: 4500,
    gst_amount: 8910,
    other_charges: 0,
    total_amount: 58410,
    due_date: '2024-03-10',
    status: 'Overdue',
    payment_date: null,
    payment_method: null,
    created_at: '2024-02-29T00:00:00Z',
    tenant: { company_name: 'Digital Dynamics', tenant_id: 'TNT0003' }
  }
];

export const mockLeads = [
  {
    id: '1',
    lead_number: 'LD20240001',
    company_name: 'Future Tech Corp',
    contact_name: 'Alex Brown',
    email: 'alex@futuretech.com',
    phone: '+91 9876543214',
    source: 'Website',
    status: 'New',
    requirements: 'Looking for 2000 sqft office space for 25 employees',
    budget_range: '₹50,000 - ₹75,000',
    expected_move_date: '2024-03-01',
    lead_score: 75,
    notes: 'Interested in premium office space with modern amenities',
    created_at: '2024-01-20T00:00:00Z'
  },
  {
    id: '2',
    lead_number: 'LD20240002',
    company_name: 'CloudTech Innovations',
    contact_name: 'Emma Davis',
    email: 'emma@cloudtech.com',
    phone: '+91 9876543215',
    source: 'Referral',
    status: 'Qualified',
    requirements: 'Need flexible workspace for 10 developers',
    budget_range: '₹30,000 - ₹50,000',
    expected_move_date: '2024-02-15',
    lead_score: 85,
    notes: 'Referred by existing tenant, high conversion probability',
    created_at: '2024-01-25T00:00:00Z'
  }
];

export const mockSpaces = [
  {
    id: '1',
    space_number: '1A01',
    space_type: 'Office',
    area_sqft: 2000,
    max_seats: 25,
    rate_per_sqft: 25,
    rate_per_seat: 2000,
    status: 'Occupied',
    tenant_name: 'TechStart Solutions',
    amenities: ['WiFi', 'AC', 'Power Backup', 'Conference Room'],
    floor: {
      floor_number: 1,
      building: { name: 'Rathinam Tech Park - Block A' }
    }
  },
  {
    id: '2',
    space_number: '2A01',
    space_type: 'Office',
    area_sqft: 1500,
    max_seats: 15,
    rate_per_sqft: 30,
    rate_per_seat: 3000,
    status: 'Occupied',
    tenant_name: 'Innovate Labs',
    amenities: ['WiFi', 'AC', 'Power Backup', 'Lab Equipment'],
    floor: {
      floor_number: 2,
      building: { name: 'Rathinam Tech Park - Block A' }
    }
  },
  {
    id: '3',
    space_number: '1B01',
    space_type: 'Office',
    area_sqft: 1200,
    max_seats: 12,
    rate_per_sqft: 28,
    rate_per_seat: 2800,
    status: 'Occupied',
    tenant_name: 'Digital Dynamics',
    amenities: ['WiFi', 'AC', 'Power Backup', 'Creative Studio'],
    floor: {
      floor_number: 1,
      building: { name: 'Rathinam Tech Park - Block B' }
    }
  },
  {
    id: '4',
    space_number: '3A01',
    space_type: 'Office',
    area_sqft: 1800,
    max_seats: 20,
    rate_per_sqft: 25,
    rate_per_seat: 2250,
    status: 'Available',
    tenant_name: null,
    amenities: ['WiFi', 'AC', 'Power Backup'],
    floor: {
      floor_number: 3,
      building: { name: 'Rathinam Tech Park - Block A' }
    }
  }
];

export const mockTickets = [
  {
    id: '1',
    ticket_number: 'TKT20240001',
    title: 'AC Not Working in TechStart Solutions Office',
    description: 'The air conditioning unit is not cooling properly in TechStart Solutions office space',
    category: 'HVAC',
    priority: 'High',
    status: 'Open',
    tenant_id: '1',
    estimated_cost: 5000,
    actual_cost: null,
    created_at: '2024-01-20T00:00:00Z'
  },
  {
    id: '2',
    ticket_number: 'TKT20240002',
    title: 'WiFi Issues - Innovate Labs Floor',
    description: 'Intermittent WiFi connectivity reported by Innovate Labs team',
    category: 'IT',
    priority: 'Medium',
    status: 'In Progress',
    tenant_id: '2',
    estimated_cost: 2000,
    actual_cost: null,
    created_at: '2024-01-22T00:00:00Z'
  },
  {
    id: '3',
    ticket_number: 'TKT20240003',
    title: 'Printer Setup - Digital Dynamics',
    description: 'Digital Dynamics requested printer installation and setup',
    category: 'IT',
    priority: 'Low',
    status: 'Resolved',
    tenant_id: '3',
    estimated_cost: 1500,
    actual_cost: 1200,
    created_at: '2024-01-25T00:00:00Z'
  }
];

export const mockNotifications = [
  {
    id: '1',
    type: 'invoice',
    title: 'New Invoice Generated - TechStart Solutions',
    message: 'A new invoice (INV20240001) for ₹64,900 has been generated for TechStart Solutions.',
    created_at: '2024-01-25T10:00:00Z',
    read: false,
    tenant_id: '1'
  },
  {
    id: '2',
    type: 'payment_reminder',
    title: 'Payment Reminder - Innovate Labs',
    message: 'Payment for invoice INV20240002 (₹77,880) is due in 3 days for Innovate Labs.',
    created_at: '2024-01-24T09:00:00Z',
    read: false,
    tenant_id: '2'
  },
  {
    id: '3',
    type: 'payment_confirmation',
    title: 'Payment Received - TechStart Solutions',
    message: 'Thank you! Payment of ₹64,900 received from TechStart Solutions for invoice INV20240001.',
    created_at: '2024-01-23T14:30:00Z',
    read: true,
    tenant_id: '1'
  },
  {
    id: '4',
    type: 'maintenance_update',
    title: 'Maintenance Update - TechStart Solutions',
    message: 'Ticket TKT20240001 (AC Not Working) for TechStart Solutions has been updated to In Progress.',
    created_at: '2024-01-22T11:15:00Z',
    read: false,
    tenant_id: '1'
  },
  {
    id: '5',
    type: 'maintenance_resolved',
    title: 'Maintenance Resolved - Digital Dynamics',
    message: 'Ticket TKT20240003 (Printer Setup) for Digital Dynamics has been resolved.',
    created_at: '2024-01-21T16:45:00Z',
    read: true,
    tenant_id: '3'
  },
  {
    id: '6',
    type: 'document_expiring',
    title: 'Document Expiring - TechStart Solutions',
    message: 'TechStart Solutions: Business Insurance document is expiring in 15 days. Please upload renewal.',
    created_at: '2024-01-20T08:00:00Z',
    read: false,
    tenant_id: '1'
  },
  {
    id: '7',
    type: 'announcement',
    title: 'General Announcement',
    message: 'All tenants: Main lobby will be closed for maintenance this Saturday from 9 AM to 2 PM.',
    created_at: '2024-01-19T12:00:00Z',
    read: true,
    tenant_id: null
  }
];

export const mockUsers = [
  {
    id: '1',
    email: 'admin@rathinam.tec',
    full_name: 'Administrator',
    role: 'admin'
  },
  {
    id: '2',
    email: 'finance@rathinam.tec',
    full_name: 'Finance Manager',
    role: 'finance'
  },
  {
    id: '3',
    email: 'crm@rathinam.tec',
    full_name: 'CRM Manager',
    role: 'crm'
  },
  {
    id: '4',
    email: 'maintenance@rathinam.edu',
    full_name: 'Maintenance Manager',
    role: 'maintenance'
  },
  {
    id: '5',
    email: 'tenant@techstart.com',
    full_name: 'John Doe - TechStart Solutions',
    role: 'tenant'
  }
];