import notificationService, { NotificationEvent, NotificationPayload } from './notificationService';

/**
 * Ticket Notification Helper
 * Triggers notifications for ticket events
 */

export const ticketNotifications = {
  /**
   * Trigger when new ticket is created
   */
  async onTicketCreated(ticketId: string, ticketNumber: string, tenantId: string) {
    await notificationService.trigger('TICKET_CREATED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    });
  },

  /**
   * Trigger when ticket is assigned to helpdesk
   */
  async onTicketAssigned(ticketId: string, ticketNumber: string, helpdeskId: string) {
    await notificationService.trigger('NEW_TICKET_ASSIGNED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });
  },

  /**
   * Trigger when estimation is ready
   */
  async onEstimationReady(
    ticketId: string,
    ticketNumber: string,
    tenantId: string,
    cost: number,
    materials: string[]
  ) {
    await notificationService.trigger('ESTIMATION_READY', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
      cost,
      materials,
    });
  },

  /**
   * Trigger when tenant approves estimation
   */
  async onEstimationApproved(ticketId: string, ticketNumber: string, helpdeskId: string) {
    await notificationService.trigger('TENANT_APPROVED_ESTIMATION', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });
  },

  /**
   * Trigger when tenant rejects estimation
   */
  async onEstimationRejected(ticketId: string, ticketNumber: string, helpdeskId: string) {
    await notificationService.trigger('TENANT_REJECTED_ESTIMATION', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });
  },

  /**
   * Trigger when work starts
   */
  async onWorkStarted(ticketId: string, ticketNumber: string, tenantId: string, technician: string) {
    await notificationService.trigger('WORK_STARTED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
      technician,
    });
  },

  /**
   * Trigger when work is completed
   */
  async onWorkCompleted(ticketId: string, ticketNumber: string, tenantId: string) {
    await notificationService.trigger('WORK_COMPLETED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    });
  },

  /**
   * Trigger when ticket is resolved
   */
  async onTicketResolved(ticketId: string, ticketNumber: string, tenantId: string) {
    await notificationService.trigger('TICKET_RESOLVED', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    });
  },

  /**
   * Trigger when ticket is reopened
   */
  async onTicketReopened(ticketId: string, ticketNumber: string, helpdeskId: string) {
    await notificationService.trigger('TICKET_REOPENED_BY_TENANT', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      helpdesk_id: helpdeskId,
    });
  },

  /**
   * Trigger high priority alert
   */
  async onHighPriorityTicket(ticketId: string, ticketNumber: string, adminId: string) {
    await notificationService.trigger('HIGH_PRIORITY_ALERT', {
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      admin_id: adminId,
    });
  },
};
