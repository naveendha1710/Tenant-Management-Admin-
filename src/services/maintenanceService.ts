import { supabase } from '@/lib/supabaseClient';
import { generateTicketId } from '@/utils/ticketIdGenerator';

// Mock data for demo mode with localStorage persistence
const getStoredTickets = (): MaintenanceTicket[] => {
  // FORCE RESET - Clear old data completely
  if (typeof window !== 'undefined') {
    localStorage.removeItem('demo_maintenance_tickets');
  }
  
  // Always return fresh default tickets for now
  return [
    {
      id: '1',
      tenant_id: '6',
      title: 'AC not working in office',
      description: 'The air conditioning unit is not cooling properly in Office Suite 201',
      category: 'AC',
      priority: 'High',
      status: 'in_progress',
      created_at: '2024-01-20T10:30:00Z',
      updated_at: '2024-01-21T14:30:00Z',
      cost: 0,
      image_url: null,
      assigned_to: null,
      resolution_notes: null,
      resolved_at: null,
      tenant: {
        company_name: 'TechStart Solutions',
        contact_person: 'John Doe',
        email: 'john@techstart.com',
        phone: '+91 9876543210'
      }
    },
    {
      id: '2',
      tenant_id: '6',
      title: 'Internet connectivity issues',
      description: 'Slow internet speed affecting work productivity',
      category: 'IT Support',
      priority: 'Medium',
      status: 'resolved',
      created_at: '2024-01-18T09:00:00Z',
      updated_at: '2024-01-19T16:45:00Z',
      resolved_at: '2024-01-19T16:45:00Z',
      cost: 0,
      image_url: null,
      assigned_to: null,
      resolution_notes: 'Network issue resolved by ISP',
      tenant: {
        company_name: 'TechStart Solutions',
        contact_person: 'John Doe',
        email: 'john@techstart.com',
        phone: '+91 9876543210'
      }
    }
  ];
};

const saveTickets = (tickets: MaintenanceTicket[]) => {
  try {
    localStorage.setItem('demo_maintenance_tickets', JSON.stringify(tickets));
  } catch (error) {
    console.warn('Failed to save tickets:', error);
  }
};

// Force fresh tickets on every load
let mockMaintenanceTickets: MaintenanceTicket[] = [];

const mockMaintenanceStaff = [
  { id: '5', full_name: 'Maintenance Manager', email: 'maintenance@rathinam.edu' },
  { id: 'staff1', full_name: 'Raj Kumar', email: 'raj@rathinam.edu' },
  { id: 'staff2', full_name: 'Priya Singh', email: 'priya@rathinam.edu' }
];

export interface MaintenanceTicket {
  id: string;
  ticket_number?: string;
  tenant_id: string;
  title: string;
  description: string;
  category: 'AC' | 'Electrical' | 'Plumbing' | 'Cleaning' | 'IT Support' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'pending' | 'assigned' | 'rca_added' | 'pending_approval' | 'rejected' | 'pending_tenant_approval' | 'tenant_rejected' | 'approved' | 'work_started' | 'in_progress' | 'work_completed' | 'completed' | 'resolved' | 'reopened' | 'closed';
  assigned_to?: string;
  image_url?: string;
  resolution_notes?: string;
  cost: number;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  forwarded_to?: string | null;
  status_history?: string;
  previous_submissions?: string;
  opex_code?: string;
  tenant_satisfaction?: string;
  tenant_feedback?: string;
  tenant?: {
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
  };
  assigned_user?: {
    full_name: string;
    email: string;
  };
  feedback_ratings?: Array<{
    id: string;
    rating: number;
    comments?: string;
    action_taken?: 'close' | 'reopen' | 'submit';
    created_at: string;
  }>;
}

export interface CreateTicketData {
  title: string;
  description: string;
  category: string;
  priority: string;
  image_url?: string;
}

export interface UpdateTicketData {
  status?: string;
  assigned_to?: string;
  assigned_technicians?: any[];
  resolution_notes?: string;
  cost?: number;
  resolved_at?: string;
  forwarded_to?: string | null;
  opex_code?: string;
  skip_tenant_approval?: boolean;
  draft_data?: any;
}

export class MaintenanceService {
  // Create new maintenance ticket (Tenant)
  static async createTicket(ticketData: any): Promise<MaintenanceTicket> {
    const ticketNumber = await generateTicketId();
    
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .insert({ ...ticketData, ticket_number: ticketNumber })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    // Fire ticket.created notification (non-blocking, fetch full ticket with tenant join)
    import('@/services/ticketNotifications').then(({ sendTicketNotification }) => {
      supabase
        .from('maintenance_tickets')
        .select('*, tenant:tenants!tenant_id(company, name, email, phone)')
        .eq('id', data.id)
        .single()
        .then(({ data: full }) => {
          const ticket = full ? {
            ...full,
            tenant: full.tenant ? {
              company_name: full.tenant.company,
              contact_person: full.tenant.name,
              email: full.tenant.email,
              phone: full.tenant.phone
            } : undefined
          } : data;
          sendTicketNotification('ticket.created', ticket).catch(console.error);
        });
    });

    return data;
  }

  // Get tickets for a specific tenant
  static async getTenantTickets(tenantId: string): Promise<MaintenanceTicket[]> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get all tickets (Admin/Management)
  static async getAllTickets(): Promise<MaintenanceTicket[]> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select(`
        *,
        tenant:tenants!tenant_id(company, name, email, phone),
        created_by:users!created_by_user_id(name, role)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Map tenant data to match expected format
    return (data || []).map(ticket => ({
      ...ticket,
      tenant: ticket.tenant ? {
        company_name: ticket.tenant.company,
        contact_person: ticket.tenant.name,
        email: ticket.tenant.email,
        phone: ticket.tenant.phone
      } : undefined,
      created_by_name: ticket.created_by?.name,
      created_by_role: ticket.created_by?.role
    }));
  }

  // Get single ticket by ID
  static async getTicketById(ticketId: string): Promise<MaintenanceTicket> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select(`
        *,
        tenant:tenants!tenant_id(company, name, email, phone)
      `)
      .eq('id', ticketId)
      .single();

    if (error) throw error;
    
    // Map tenant data to match expected format
    return {
      ...data,
      tenant: data.tenant ? {
        company_name: data.tenant.company,
        contact_person: data.tenant.name,
        email: data.tenant.email,
        phone: data.tenant.phone
      } : undefined
    };
  }

  // Get tickets for maintenance staff (unassigned + their own tickets)
  static async getMaintenanceTickets(staffId?: string): Promise<MaintenanceTicket[]> {
    try {
      // This query fetches the unassigned ticket pool for the dashboard
      const { data: unassignedTickets, error: unassignedError } = await supabase
        .from('maintenance_tickets')
        .select(`
          *,
          tenant:tenants!tenant_id(company_name, contact_person, email, phone)
        `)
        .eq('status', 'pending')
        .is('assigned_to', null);

      if (unassignedError) {
        console.warn('Database query failed for unassigned tickets, using mock data:', unassignedError);
        // Return mock unassigned tickets
        mockMaintenanceTickets = getStoredTickets();
        return mockMaintenanceTickets.filter(t => t.status === 'pending' && !t.assigned_to);
      }

      let assignedTickets = [];
      if (staffId) {
        const { data: staffTickets, error: staffError } = await supabase
          .from('maintenance_tickets')
          .select(`
            *,
            tenant:tenants!tenant_id(company_name, contact_person, email, phone)
          `)
          .eq('assigned_to', staffId);

        if (!staffError && staffTickets) {
          assignedTickets = staffTickets;
        }
      }

      return [...(unassignedTickets || []), ...assignedTickets];
    } catch (error) {
      console.warn('Database connection failed, using mock data:', error);
      mockMaintenanceTickets = getStoredTickets();
      return mockMaintenanceTickets;
    }
  }

  // Update ticket (Admin/Maintenance)
  static async updateTicket(ticketId: string, updates: UpdateTicketData): Promise<MaintenanceTicket> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get maintenance staff users
  static async getMaintenanceStaff(): Promise<Array<{id: string, full_name: string, email: string}>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'maintenance');

      if (error) {
        console.warn('Database query failed, using mock staff data:', error);
        return mockMaintenanceStaff;
      }
      return data || mockMaintenanceStaff;
    } catch (error) {
      console.warn('Database connection failed, using mock staff data:', error);
      return mockMaintenanceStaff;
    }
  }

  // Get ticket statistics
  static async getTicketStats(): Promise<{
    total: number;
    pending: number;
    in_progress: number;
    resolved: number;
    total_cost: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .select('status, cost');

      if (error) {
        console.warn('Database query failed, using mock data for stats:', error);
        // Calculate stats from mock data
        const stats = {
          total: mockMaintenanceTickets.length,
          pending: mockMaintenanceTickets.filter(t => t.status === 'pending').length,
          in_progress: mockMaintenanceTickets.filter(t => t.status === 'in_progress').length,
          resolved: mockMaintenanceTickets.filter(t => t.status === 'resolved').length,
          total_cost: mockMaintenanceTickets.reduce((sum, t) => sum + (t.cost || 0), 0)
        };
        return stats;
      }

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(t => t.status === 'pending').length || 0,
        in_progress: data?.filter(t => t.status === 'in_progress').length || 0,
        resolved: data?.filter(t => t.status === 'resolved').length || 0,
        total_cost: data?.reduce((sum, t) => sum + (t.cost || 0), 0) || 0
      };

      return stats;
    } catch (error) {
      console.warn('Database connection failed, using mock data for stats:', error);
      // Calculate stats from mock data
      const stats = {
        total: mockMaintenanceTickets.length,
        pending: mockMaintenanceTickets.filter(t => t.status === 'pending').length,
        in_progress: mockMaintenanceTickets.filter(t => t.status === 'in_progress').length,
        resolved: mockMaintenanceTickets.filter(t => t.status === 'resolved').length,
        total_cost: mockMaintenanceTickets.reduce((sum, t) => sum + (t.cost || 0), 0)
      };
      return stats;
    }
  }

  // Subscribe to real-time updates
  static subscribeToTickets(callback: (payload: any) => void) {
    return supabase
      .channel('maintenance_tickets')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'maintenance_tickets' }, 
        callback
      )
      .subscribe();
  }

  // Get tenant by email (for current user)
  static async getTenantByEmail(email: string): Promise<{id: string, name: string, company: string} | null> {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, company')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching tenant by email:', error);
      return null;
    }
    
    // Return with company as the primary identifier
    return data ? {
      id: data.id,
      name: data.name,
      company: data.company || data.name // Fallback to name if company is empty
    } : null;
  }

  // Create notification
  static async createNotification(userId: string, tenantId: string, type: string, title: string, message: string) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        type,
        title,
        message
      });

    if (error) throw error;
  }

  // Get notifications for user
  static async getUserNotifications(userId: string): Promise<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
  }>> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Mark notification as read
  static async markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  // Get unassigned tickets (for maintenance staff)
  static async getUnassignedTickets(): Promise<MaintenanceTicket[]> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select(`
        *,
        tenant:tenants!tenant_id(company_name, contact_person, email, phone)
      `)
      .eq('status', 'pending')
      .is('assigned_to', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unassigned tickets:', error);
      throw error;
    }
    return data || [];
  }

  // Get tickets assigned to specific maintenance staff
  static async getStaffTickets(staffId: string): Promise<MaintenanceTicket[]> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .select(`
        *,
        tenant:tenants!tenant_id(company_name, contact_person, email, phone),
        assigned_user:users!assigned_to(full_name, email)
      `)
      .eq('assigned_to', staffId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching staff tickets:', error);
      throw error;
    }
    return data || [];
  }

  // Claim a ticket (assign to maintenance staff)
  static async claimTicket(ticketId: string, staffId: string): Promise<MaintenanceTicket> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({ 
        assigned_to: staffId, 
        status: 'in_progress' 
      })
      .eq('id', ticketId)
      .select(`
        *,
        tenant:tenants!tenant_id(company_name, contact_person, email, phone),
        assigned_user:users!assigned_to(full_name, email)
      `)
      .single();

    if (error) {
      console.error('Error claiming ticket:', error);
      throw error;
    }
    return data;
  }

  // Get maintenance staff user by email
  static async getMaintenanceStaffByEmail(email: string): Promise<{id: string, full_name: string} | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .eq('role', 'maintenance')
      .single();

    if (error) return null;
    return data;
  }

  // Start work on ticket
  static async startWork(ticketId: string, slaHours: number): Promise<MaintenanceTicket> {
    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({
        work_started_at: new Date().toISOString(),
        sla_hours: slaHours,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // End work on ticket
  static async endWork(ticketId: string): Promise<MaintenanceTicket> {
    const { data: ticket } = await supabase
      .from('maintenance_tickets')
      .select('work_started_at, ticket_number, tenant_id')
      .eq('id', ticketId)
      .single();

    const workStarted = ticket?.work_started_at ? new Date(ticket.work_started_at) : new Date();
    const workCompleted = new Date();
    const durationHours = (workCompleted.getTime() - workStarted.getTime()) / (1000 * 60 * 60);

    const { data, error } = await supabase
      .from('maintenance_tickets')
      .update({
        work_completed_at: workCompleted.toISOString(),
        work_duration_hours: durationHours,
        status: 'work_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Submit feedback rating
  static async submitFeedbackRating(ticketId: string, tenantId: string, rating: number, comments?: string, action?: 'close' | 'reopen' | 'submit'): Promise<void> {
    const { error } = await supabase
      .from('feedback_ratings')
      .insert({
        ticket_id: ticketId,
        tenant_id: tenantId,
        rating,
        comments: comments || null,
        action_taken: action || 'submit'
      });

    if (error) {
      console.error('Error submitting feedback:', error);
      throw error;
    }
  }
  static async checkDelayedTickets(): Promise<void> {
    const { data: tickets } = await supabase
      .from('maintenance_tickets')
      .select('id, work_started_at, sla_hours')
      .eq('status', 'in_progress')
      .not('work_started_at', 'is', null)
      .not('sla_hours', 'is', null);

    if (!tickets) return;

    const now = new Date();
    for (const ticket of tickets) {
      const startTime = new Date(ticket.work_started_at);
      const elapsedHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      
      if (elapsedHours > ticket.sla_hours) {
        await supabase
          .from('maintenance_tickets')
          .update({ status: 'delayed' })
          .eq('id', ticket.id);
      }
    }
  }
}