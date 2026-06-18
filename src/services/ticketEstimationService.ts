import { supabase } from '@/lib/supabase';

// Helper to append status_history entry
function appendStatusHistory(currentHistory: string | null, event: string, details?: string): string {
  const timestamp = new Date().toLocaleString('en-IN', { 
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
  }).replace(/\//g, '-');
  const entry = details ? `[${timestamp}] ${event}: ${details}` : `[${timestamp}] ${event}`;
  return currentHistory ? `${currentHistory}\n${entry}` : entry;
}

export interface TicketEstimation {
  id: string;
  ticket_id: string;
  version: number;
  status: string | null;
  root_cause: string | null;
  findings: string | null;
  materials: any[];
  material_cost_without_gst: number;
  total_gst: number;
  material_cost_with_gst: number;
  labor_hours: number;
  labor_cost: number;
  total_cost: number;
  notes: string | null;
  assigned_technicians: any[];
  opex_code: string | null;
  is_active: boolean;
  reopened_by: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TicketEstimationService = {
  async getActiveEstimation(ticketId: string): Promise<TicketEstimation | null> {
    const { data, error } = await supabase
      .from('ticket_estimations')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async getAllEstimations(ticketId: string): Promise<TicketEstimation[]> {
    const { data, error } = await supabase
      .from('ticket_estimations')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('version', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createEstimation(estimation: Partial<TicketEstimation>): Promise<TicketEstimation> {
    // Get next version number
    const { data: existing } = await supabase
      .from('ticket_estimations')
      .select('version')
      .eq('ticket_id', estimation.ticket_id)
      .order('version', { ascending: false })
      .limit(1);
    
    const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;
    
    // Deactivate previous estimations
    await supabase
      .from('ticket_estimations')
      .update({ is_active: false })
      .eq('ticket_id', estimation.ticket_id);
    
    // Only set status to 'submitted' if materials exist, otherwise leave it null for partial estimations
    const status = estimation.materials && estimation.materials.length > 0 ? 'submitted' : null;
    
    const { data, error } = await supabase
      .from('ticket_estimations')
      .insert({
        ...estimation,
        version: nextVersion,
        is_active: true,
        status: status
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateEstimationStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('ticket_estimations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },

  async updateEstimation(id: string, updates: Partial<TicketEstimation>): Promise<TicketEstimation> {
    const { data, error } = await supabase
      .from('ticket_estimations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async reopenEstimation(ticketId: string, reopenedBy: string): Promise<TicketEstimation> {
    const { data: current } = await supabase
      .from('ticket_estimations')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_active', true)
      .single();

    if (!current) throw new Error('No active estimation found');

    // Update current estimation with reopen metadata
    await supabase
      .from('ticket_estimations')
      .update({
        reopened_by: reopenedBy,
        reopened_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', current.id);

    const nextVersion = current.version + 1;

    // Create new EMPTY version with reopened status
    const { data, error } = await supabase
      .from('ticket_estimations')
      .insert({
        ticket_id: current.ticket_id,
        version: nextVersion,
        status: 'reopened',
        is_active: true,
        created_by: current.created_by
      })
      .select()
      .single();

    if (error) throw error;

    // Update ticket status_history
    const { data: ticket } = await supabase
      .from('maintenance_tickets')
      .select('status_history, ticket_number')
      .eq('id', current.ticket_id)
      .single();

    if (ticket) {
      const newHistory = appendStatusHistory(ticket.status_history, 'REOPENED', `Ticket #${ticket.ticket_number} reopened by tenant`);
      await supabase
        .from('maintenance_tickets')
        .update({ status: 'reopened', status_history: newHistory })
        .eq('id', current.ticket_id);
    }

    return data;
  }
};
