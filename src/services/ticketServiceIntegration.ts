import NotificationService from './NotificationService';
import { supabase } from '@/lib/supabase';

export class TicketServiceWithNotifications {
  async createTicket(ticketData: any): Promise<any> {
    const { data: ticket, error } = await supabase
      .from('maintenance_tickets')
      .insert(ticketData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await NotificationService.trigger('TICKET_CREATED', {
      ticket_id: ticket.id,
      ticket_number: ticket.ticket_number,
      tenant_id: ticket.tenant_id,
      admin_id: ticketData.admin_id,
    });

    return ticket;
  }

  async assignTicket(ticketId: string, helpdeskId: string, ticketNumber: string): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ assigned_to: helpdeskId, status: 'assigned' })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('NEW_TICKET_ASSIGNED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });
  }

  async submitEstimation(
    ticketId: string,
    ticketNumber: string,
    tenantId: string,
    cost: number,
    materials: string[],
    technician: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({
        estimated_cost: cost,
        materials_required: materials,
        assigned_technician: technician,
        status: 'pending_tenant_approval',
      })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('ESTIMATION_READY', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
      cost,
      materials,
      technician,
    });
  }

  async approveEstimation(
    ticketId: string,
    ticketNumber: string,
    helpdeskId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'approved' })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('TENANT_APPROVED_ESTIMATION', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });

    await NotificationService.trigger('ESTIMATION_APPROVED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });
  }

  async rejectEstimation(
    ticketId: string,
    ticketNumber: string,
    helpdeskId: string,
    adminId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'tenant_rejected' })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('TENANT_REJECTED_ESTIMATION', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
      admin_id: adminId,
    });
  }

  async startWork(
    ticketId: string,
    ticketNumber: string,
    tenantId: string,
    technician: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'work_started', work_started_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('WORK_STARTED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
      technician,
    });
  }

  async updateWorkProgress(
    ticketId: string,
    ticketNumber: string,
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'in_progress' })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('WORK_IN_PROGRESS', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    });
  }

  async completeWork(
    ticketId: string,
    ticketNumber: string,
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'work_completed', work_completed_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('WORK_COMPLETED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    });
  }

  async resolveTicket(
    ticketId: string,
    ticketNumber: string,
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('TICKET_RESOLVED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    });
  }

  async reopenTicket(
    ticketId: string,
    ticketNumber: string,
    helpdeskId: string,
    adminId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('maintenance_tickets')
      .update({ status: 'reopened' })
      .eq('id', ticketId);

    if (error) {
      throw error;
    }

    await NotificationService.trigger('TICKET_REOPENED_BY_TENANT', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
      admin_id: adminId,
    });

    await NotificationService.trigger('TICKET_REOPENED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
      admin_id: adminId,
    });
  }

  async checkSLABreach(ticketId: string, ticketNumber: string, helpdeskId: string, adminId: string): Promise<void> {
    await NotificationService.trigger('SLA_BREACH_WARNING', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
      admin_id: adminId,
    });
  }

  async alertHighPriority(ticketId: string, ticketNumber: string, helpdeskId: string, adminId: string): Promise<void> {
    await NotificationService.trigger('HIGH_PRIORITY_ALERT', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
      admin_id: adminId,
    });
  }

  async sendDailyStats(adminId: string, openCount: number, resolvedCount: number): Promise<void> {
    await NotificationService.trigger('TICKET_STATS', {
      admin_id: adminId,
      open_count: openCount,
      resolved_count: resolvedCount,
    });
  }

  async alertRecurringIssue(ticketId: string, ticketNumber: string, adminId: string): Promise<void> {
    await NotificationService.trigger('RECURRING_ISSUE', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      admin_id: adminId,
    });
  }

  async alertBudgetThreshold(adminId: string, amount: number): Promise<void> {
    await NotificationService.trigger('BUDGET_ALERT', {
      admin_id: adminId,
      amount,
    });
  }
}

export default new TicketServiceWithNotifications();
