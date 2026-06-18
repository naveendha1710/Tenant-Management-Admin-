import { supabase } from '@/lib/supabaseClient';
import { renderTemplate } from '@/utils/templateRenderer';

export type TicketEvent =
  | 'ticket.created'
  | 'ticket.assigned'
  | 'ticket.estimation_submitted'
  | 'ticket.estimation_approved_by_manager'
  | 'ticket.estimation_rejected_by_manager'
  | 'ticket.estimation_approved_by_tenant'
  | 'ticket.estimation_rejected_by_tenant'
  | 'ticket.work_started'
  | 'ticket.work_completed'
  | 'ticket.reopened'
  | 'ticket.resolved'
  | 'ticket.request_changes';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── SMTP ────────────────────────────────────────────────────────────────────

// Batch send with delay to avoid rate limits
async function smtpSend(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/smtp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Batch send multiple emails with server-side rate limiting
async function smtpSendBatch(emails: Array<{ to: string; subject: string; html: string }>): Promise<{ success: boolean; results: Array<{ to: string; success: boolean }> }> {
  try {
    const res = await fetch(`${API_BASE}/api/admin/smtp/send-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, results: [] };
  } catch {
    return { success: false, results: [] };
  }
}

// Add delay between emails to prevent rate limit errors
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ─── LOGGING ─────────────────────────────────────────────────────────────────

async function logResult(
  event: string,
  ticketId: string,
  recipient: string,
  subject: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
) {
  await supabase.from('notification_logs').insert({
    event,
    ticket_id: ticketId,
    recipient,
    subject,
    status,
    error_message: errorMessage ?? null,
  });
}

// ─── RECIPIENT RESOLUTION ────────────────────────────────────────────────────

async function resolveRecipients(
  ticket: any,
  setting: any,
): Promise<{ role: string; email: string }[]> {
  const out: { role: string; email: string }[] = [];
  const seen = new Set<string>(); // Deduplicate emails

  if (setting.notify_creator) {
    const email = ticket.tenant?.email || ticket.creator_email || null;
    if (email && !seen.has(email)) {
      // Check if tenant user has notifications enabled
      const { data: tenantUser } = await supabase
        .from('users')
        .select('receive_ticket_notifications')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();
      
      if (tenantUser?.receive_ticket_notifications !== false) {
        out.push({ role: 'creator', email });
        seen.add(email);
      }
    }
  }

  if (setting.notify_manager) {
    // Manager = users with "Manage Tickets" permission
    const { data } = await supabase
      .from('users')
      .select('email, permissions, receive_ticket_notifications')
      .eq('is_active', true)
      .eq('receive_ticket_notifications', true);
    
    data?.forEach(u => {
      if (u.permissions && !seen.has(u.email)) {
        const perms = Array.isArray(u.permissions) ? u.permissions : [];
        const hasManageTickets = perms.some((p: any) => 
          p.module === 'Manage Tickets' && p.view === true
        );
        if (hasManageTickets) {
          out.push({ role: 'manager', email: u.email });
          seen.add(u.email);
        }
      }
    });
  }

  if (setting.notify_helpdesk) {
    const { data } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'Helpdesk')
      .eq('is_active', true)
      .eq('receive_ticket_notifications', true);
    data?.forEach(u => {
      if (!seen.has(u.email)) {
        out.push({ role: 'helpdesk', email: u.email });
        seen.add(u.email);
      }
    });
  }

  return out;
}

// ─── MAIN SERVICE ────────────────────────────────────────────────────────────

export async function sendTicketNotification(event: TicketEvent, ticket: any): Promise<void> {
  console.log(`[TicketNotification] Event: ${event}, Ticket ID: ${ticket.id}, Status: ${ticket.status}`);
  try {
    // 0. Check global kill-switch
    const { data: global } = await supabase
      .from('email_global_settings')
      .select('enabled')
      .limit(1)
      .single();
    if (!global?.enabled) {
      console.log(`[TicketNotification] Global email disabled`);
      return;
    }

    // 1. Check notification settings
    const { data: setting } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('event', event)
      .eq('enabled', true)
      .maybeSingle();
    if (!setting) {
      console.log(`[TicketNotification] No settings found for event: ${event}`);
      return;
    }

    // 2. Resolve recipients + branding in parallel
    const [recipients, brandingRes] = await Promise.all([
      resolveRecipients(ticket, setting),
      supabase.from('email_branding').select('*').limit(1).single(),
    ]);
    if (!recipients.length) {
      console.log(`[TicketNotification] No recipients found`);
      return;
    }
    console.log(`[TicketNotification] Recipients: ${recipients.map(r => `${r.role}:${r.email}`).join(', ')}`);

    const branding = brandingRes.data ?? {
      company_name: 'Rathinam Nexus Suite',
      footer_text: 'This is an automated notification.',
      logo_url: null,
    };

    // 3. Build template variables
    const vars: Record<string, string> = {
      ticketNumber: ticket.ticket_number || ticket.id || '',
      title: ticket.title || '',
      status: ticket.status || '',
      priority: ticket.priority || '',
      category: ticket.category || '',
      cost: ticket.cost ? `₹${ticket.cost}` : 'N/A',
      tenantName: ticket.tenant?.company_name || ticket.tenant?.contact_person || '',
      assignedTo: ticket.assigned_to || 'N/A',
      companyName: branding.company_name,
      footerText: branding.footer_text,
    };

    // 4. Prepare all emails for batch sending
    const emailsToSend: Array<{ to: string; subject: string; html: string; role: string }> = [];
    
    for (const { role, email } of recipients) {
      const { data: tmpl } = await supabase
        .from('email_templates')
        .select('subject, html_body')
        .eq('event', event)
        .eq('role', role)
        .eq('is_active', true)
        .maybeSingle();
      if (!tmpl) continue;

      const subject = renderTemplate(tmpl.subject, vars);
      const html = renderTemplate(tmpl.html_body, vars);
      emailsToSend.push({ to: email, subject, html, role });
    }

    // 5. Send all emails in batch (backend handles rate limiting)
    if (emailsToSend.length > 0) {
      console.log(`[TicketNotification] Sending ${emailsToSend.length} emails via batch`);
      const batchResult = await smtpSendBatch(emailsToSend);
      console.log(`[TicketNotification] Batch result:`, batchResult);
      
      // Log results
      for (let i = 0; i < emailsToSend.length; i++) {
        const emailData = emailsToSend[i];
        const result = batchResult.results[i];
        console.log(`[TicketNotification] Email to ${emailData.to}: ${result?.success ? 'SUCCESS' : 'FAILED'}`);
        await logResult(
          event,
          ticket.id,
          emailData.to,
          emailData.subject,
          result?.success ? 'sent' : 'failed'
        );
      }
    }
  } catch (err) {
    // Non-blocking — ticket flow must not be interrupted
    console.error('[TicketNotification] Error:', err);
  }
}

// ─── FETCH + NOTIFY HELPER ───────────────────────────────────────────────────

async function fetchAndNotify(event: TicketEvent, ticketId: string, fallback: any): Promise<void> {
  const { data } = await supabase
    .from('maintenance_tickets')
    .select('*, tenant:tenants(company_name, contact_person, email)')
    .eq('id', ticketId)
    .maybeSingle();
  await sendTicketNotification(event, data ?? { id: ticketId, ...fallback });
}

// ─── COMPATIBILITY HELPERS (used by MaintenanceRequestsPage) ─────────────────

export const ticketNotifications = {
  onEstimationApproved: (ticketId: string, ticketNumber: string, assignedTo: string) =>
    fetchAndNotify('ticket.estimation_approved_by_tenant', ticketId, {
      ticket_number: ticketNumber,
      assigned_to: assignedTo,
    }),

  onEstimationRejected: (ticketId: string, ticketNumber: string, assignedTo: string) =>
    fetchAndNotify('ticket.estimation_rejected_by_tenant', ticketId, {
      ticket_number: ticketNumber,
      assigned_to: assignedTo,
    }),

  onTicketReopened: (ticketId: string, ticketNumber: string, tenantId: string) =>
    fetchAndNotify('ticket.reopened', ticketId, {
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    }),

  onTicketResolved: (ticketId: string, ticketNumber: string, tenantId: string) =>
    fetchAndNotify('ticket.resolved', ticketId, {
      ticket_number: ticketNumber,
      tenant_id: tenantId,
    }),
};
