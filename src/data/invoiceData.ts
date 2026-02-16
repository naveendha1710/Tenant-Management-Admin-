export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCompany: string;
  invoiceNumber: string;
  type: 'auto' | 'manual';
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  dueDate: string;
  generatedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  description: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Mock invoice data
let invoices: Invoice[] = [
  {
    id: '1',
    tenantId: '1',
    tenantName: 'John Smith',
    tenantCompany: 'TechStart Solutions',
    invoiceNumber: 'INV-2024-001',
    type: 'auto',
    status: 'pending',
    amount: 87500,
    dueDate: '2024-02-15',
    generatedDate: '2024-01-15',
    description: 'Monthly Rent - February 2024',
    items: [
      {
        description: 'Block A Floor 1 - 1000 sqft @ ₹50/sqft',
        quantity: 1,
        rate: 50000,
        amount: 50000
      },
      {
        description: 'Block A Floor 1 - 500 sqft @ ₹75/sqft',
        quantity: 1,
        rate: 37500,
        amount: 37500
      }
    ]
  },
  {
    id: '2',
    tenantId: '2',
    tenantName: 'Sarah Johnson',
    tenantCompany: 'Digital Marketing Hub',
    invoiceNumber: 'INV-2024-002',
    type: 'auto',
    status: 'pending',
    amount: 120000,
    dueDate: '2024-02-20',
    generatedDate: '2024-01-20',
    description: 'Monthly Rent - February 2024',
    items: [
      {
        description: 'Block B Floor 2 - 2000 sqft @ ₹60/sqft',
        quantity: 1,
        rate: 120000,
        amount: 120000
      }
    ]
  },
  {
    id: '3',
    tenantId: '1',
    tenantName: 'John Smith',
    tenantCompany: 'TechStart Solutions',
    invoiceNumber: 'INV-2024-003',
    type: 'manual',
    status: 'pending',
    amount: 5000,
    dueDate: '2024-02-10',
    generatedDate: '2024-01-25',
    description: 'Additional Services',
    items: [
      {
        description: 'Parking Space',
        quantity: 1,
        rate: 3000,
        amount: 3000
      },
      {
        description: 'Conference Room Usage',
        quantity: 2,
        rate: 1000,
        amount: 2000
      }
    ]
  }
];

type InvoiceChangeListener = (invoices: Invoice[]) => void;
const listeners: InvoiceChangeListener[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener([...invoices]));
};

export const invoiceDataService = {
  getAllInvoices: (): Invoice[] => [...invoices],
  
  getInvoicesByType: (type: 'auto' | 'manual'): Invoice[] => 
    invoices.filter(invoice => invoice.type === type),
  
  getPendingInvoices: (): Invoice[] => 
    invoices.filter(invoice => invoice.status === 'pending'),
  
  getInvoiceById: (id: string): Invoice | undefined => 
    invoices.find(invoice => invoice.id === id),
  
  addInvoice: (invoice: Omit<Invoice, 'id'>): Invoice => {
    const newInvoice: Invoice = {
      ...invoice,
      id: Date.now().toString()
    };
    invoices.push(newInvoice);
    notifyListeners();
    return newInvoice;
  },
  
  updateInvoice: (id: string, updates: Partial<Invoice>): Invoice | null => {
    const index = invoices.findIndex(invoice => invoice.id === id);
    if (index === -1) return null;
    
    invoices[index] = { ...invoices[index], ...updates };
    notifyListeners();
    return invoices[index];
  },
  
  approveInvoice: (id: string, approvedBy: string): boolean => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return false;
    
    invoice.status = 'approved';
    invoice.approvedBy = approvedBy;
    invoice.approvedDate = new Date().toISOString();
    notifyListeners();
    return true;
  },
  
  rejectInvoice: (id: string, rejectedBy: string, reason: string): boolean => {
    const invoice = invoices.find(inv => inv.id === id);
    if (!invoice) return false;
    
    invoice.status = 'rejected';
    invoice.rejectedBy = rejectedBy;
    invoice.rejectedDate = new Date().toISOString();
    invoice.rejectionReason = reason;
    notifyListeners();
    return true;
  },
  
  bulkApprove: (ids: string[], approvedBy: string): number => {
    let approvedCount = 0;
    ids.forEach(id => {
      if (this.approveInvoice(id, approvedBy)) {
        approvedCount++;
      }
    });
    return approvedCount;
  },
  
  subscribe: (listener: InvoiceChangeListener): (() => void) => {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
};