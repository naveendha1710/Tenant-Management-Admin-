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

  if (setting.notify_creator) {
    const email = ticket.tenant?.email || ticket.creator_email || null;
    if (email) out.push({ role: 'creator', email });
  }

  if (setting.notify_manager) {
    const { data } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'Maintenance Manager')
      .eq('is_active', true);
    data?.forEach(u => out.push({ role: 'manager', email: u.email }));
  }

  if (setting.notify_helpdesk) {
    const { data } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'Helpdesk')
      .eq('is_active', true);
    data?.forEach(u => out.push({ role: 'helpdesk', email: u.email }));
  }

  return out;
}

// ─── MAIN SERVICE ────────────────────────────────────────────────────────────

export async function sendTicketNotification(event: TicketEvent, ticket: any): Promise<void> {
  try {
    // 0. Check global kill-switch
    const { data: global } = await supabase
      .from('email_global_settings')
      .select('enabled')
      .limit(1)
      .single();
    if (!global?.enabled) return;

    // 1. Check notification settings
    const { data: setting } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('event', event)
      .eq('enabled', true)
      .maybeSingle();
    if (!setting) return;

    // 2. Resolve recipients + branding in parallel
    const [recipients, brandingRes] = await Promise.all([
      resolveRecipients(ticket, setting),
      supabase.from('email_branding').select('*').limit(1).single(),
    ]);
    if (!recipients.length) return;

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

    // 4. Send per recipient
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
      const ok = await smtpSend(email, subject, html);
      await logResult(event, ticket.id, email, subject, ok ? 'sent' : 'failed');
    }
  } catch (err) {
    // Non-blocking — ticket flow must not be interrupted
    console.error('[TicketNotification]', err);
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
