// Mock CRM service - no database connection needed

export interface Lead {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  source: string;
  space_type: string;
  space_requirement: string;
  budget_range: string;
  status: 'inquiry' | 'negotiation' | 'quotation' | 'tenant';
  lead_score: number;
  created_at: string;
  follow_up_date?: string;
  notes?: string;
  industry?: string;
  company_size?: string;
  urgency?: string;
}

export interface Communication {
  id: string;
  lead_id: string;
  type: 'email' | 'call' | 'meeting' | 'sms';
  date: string;
  time?: string;
  subject: string;
  notes: string;
  attachments?: string[];
}

// Mock data fallback functions
const getMockLeads = (): Lead[] => [
  {
    id: '1',
    company_name: 'TechStart Solutions',
    contact_person: 'John Doe',
    email: 'john@techstart.com',
    phone: '+91 9876543210',
    source: 'website',
    space_type: 'office',
    space_requirement: '10 seats',
    budget_range: '₹15,000 - ₹25,000',
    status: 'inquiry',
    lead_score: 85,
    created_at: '2024-01-15',
    follow_up_date: '2024-01-20',
    notes: 'Interested in private office space',
    industry: 'Technology',
    company_size: '10-50',
    urgency: 'high'
  },
  {
    id: '2',
    company_name: 'Creative Agency',
    contact_person: 'Sarah Smith',
    email: 'sarah@creative.com',
    phone: '+91 9876543211',
    source: 'referral',
    space_type: 'coworking',
    space_requirement: '5 seats',
    budget_range: '₹8,000 - ₹12,000',
    status: 'negotiation',
    lead_score: 72,
    created_at: '2024-01-10',
    follow_up_date: '2024-01-18',
    notes: 'Looking for flexible seating',
    industry: 'Marketing',
    company_size: '5-10',
    urgency: 'medium'
  },
  {
    id: '3',
    company_name: 'Innovate Labs',
    contact_person: 'Mike Johnson',
    email: 'mike@innovate.com',
    phone: '+91 9876543212',
    source: 'call',
    space_type: 'incubator',
    space_requirement: '3 seats',
    budget_range: '₹5,000 - ₹8,000',
    status: 'quotation',
    lead_score: 90,
    created_at: '2024-01-05',
    follow_up_date: '2024-01-16',
    notes: 'Startup looking for incubator space',
    industry: 'Technology',
    company_size: '1-5',
    urgency: 'high'
  }
];

const getMockCommunications = (): Communication[] => [
  {
    id: '1',
    lead_id: '1',
    type: 'email',
    date: '2024-01-15',
    time: '10:30 AM',
    subject: 'Initial inquiry about office space',
    notes: 'Sent welcome email with brochure',
    attachments: ['brochure.pdf']
  },
  {
    id: '2',
    lead_id: '1',
    type: 'call',
    date: '2024-01-16',
    time: '2:15 PM',
    subject: 'Follow-up call',
    notes: 'Discussed requirements and pricing',
    attachments: []
  }
];

export const fetchLeads = async (): Promise<Lead[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return getMockLeads();
};

export const createLead = async (leadData: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    id: Date.now().toString(),
    ...leadData,
    created_at: new Date().toISOString()
  };
};

export const updateLead = async (leadId: string, updates: Partial<Lead>): Promise<Lead> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  const mockLeads = getMockLeads();
  const lead = mockLeads.find(l => l.id === leadId);
  if (!lead) throw new Error('Lead not found');
  return { ...lead, ...updates };
};

export const fetchCommunications = async (): Promise<Communication[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return getMockCommunications();
};

export const createCommunication = async (commData: Omit<Communication, 'id'>): Promise<Communication> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return {
    id: Date.now().toString(),
    ...commData
  };
};