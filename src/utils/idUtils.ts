// Utility functions for handling ID format compatibility

export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const generateMockUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Convert legacy string ID to a consistent format for mock data
export const normalizeId = (id: string): string => {
  if (isValidUUID(id)) {
    return id;
  }
  // For non-UUID IDs, create a deterministic UUID-like string
  const hash = id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0,8)}-${hex.slice(0,4)}-4${hex.slice(1,4)}-8${hex.slice(0,3)}-${hex.padEnd(12, '0')}`;
};

export const createMockTenant = (id: string) => ({
  id: normalizeId(id),
  company_name: 'TechStart Solutions',
  contact_person: 'John Doe',
  email: 'john@techstart.com',
  phone: '+91 9876543210',
  status: 'active'
});

export const createMockInvoices = (tenantId: string) => [
  {
    id: generateMockUUID(),
    tenant_id: normalizeId(tenantId),
    invoice_number: 'INV-2025-001',
    amount: 25000,
    tax_amount: 4500,
    total_amount: 29500,
    due_date: '2025-02-15',
    status: 'pending',
    created_at: '2025-01-15T00:00:00Z'
  }
];

export const createMockPayments = (tenantId: string) => [
  {
    id: generateMockUUID(),
    tenant_id: normalizeId(tenantId),
    amount: 29500,
    payment_method: 'bank_transfer',
    payment_date: '2025-01-10T00:00:00Z',
    reference_number: 'PAY-2025-001',
    status: 'completed'
  }
];