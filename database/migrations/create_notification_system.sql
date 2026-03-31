-- ============================================================
-- Ticket Email Notification System
-- Run once against Supabase project
-- ============================================================

-- 1. Notification Settings (per event)
CREATE TABLE IF NOT EXISTS notification_settings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event       TEXT NOT NULL UNIQUE,
  enabled     BOOLEAN DEFAULT true,
  notify_creator  BOOLEAN DEFAULT true,
  notify_manager  BOOLEAN DEFAULT true,
  notify_helpdesk BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Email Templates (per event × role)
CREATE TABLE IF NOT EXISTS email_templates (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event     TEXT NOT NULL,
  role      TEXT NOT NULL,  -- 'creator' | 'manager' | 'helpdesk'
  subject   TEXT NOT NULL,
  html_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event, role)
);

-- 3. Email Branding (single row)
CREATE TABLE IF NOT EXISTS email_branding (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url     TEXT,
  company_name TEXT DEFAULT 'Rathinam Nexus Suite',
  footer_text  TEXT DEFAULT 'This is an automated notification. Please do not reply.',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event         TEXT NOT NULL,
  ticket_id     TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  subject       TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_ticket ON notification_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON notification_logs(created_at DESC);

-- ============================================================
-- Seed: Default Branding
-- ============================================================
INSERT INTO email_branding (company_name, footer_text)
VALUES ('Rathinam Nexus Suite', 'This is an automated notification. Please do not reply to this email.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: Notification Settings
-- ============================================================
INSERT INTO notification_settings (event, enabled, notify_creator, notify_manager, notify_helpdesk) VALUES
  ('ticket.created',                        true,  false, true,  false),
  ('ticket.assigned',                       true,  true,  false, false),
  ('ticket.estimation_submitted',           true,  false, true,  false),
  ('ticket.estimation_approved_by_manager', true,  true,  false, true),
  ('ticket.estimation_rejected_by_manager', true,  false, false, true),
  ('ticket.estimation_approved_by_tenant',  true,  false, true,  true),
  ('ticket.estimation_rejected_by_tenant',  true,  false, true,  true),
  ('ticket.work_started',                   true,  true,  false, false),
  ('ticket.work_completed',                 true,  true,  true,  false),
  ('ticket.reopened',                       true,  false, true,  true),
  ('ticket.resolved',                       true,  true,  false, false),
  ('ticket.request_changes',                true,  false, false, true)
ON CONFLICT (event) DO NOTHING;

-- ============================================================
-- Seed: Email Templates
-- ============================================================

-- Helper HTML wrapper (used inline in each template below)
-- Variables: {{ticketNumber}} {{title}} {{status}} {{priority}}
--            {{category}} {{cost}} {{tenantName}} {{assignedTo}}
--            {{companyName}} {{footerText}}

-- ticket.assigned → creator (tenant)
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.assigned', 'creator',
 '[{{companyName}}] Your ticket #{{ticketNumber}} has been assigned',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#1d4ed8">Ticket Assigned</h2>
  <p>Hi {{tenantName}},</p>
  <p>Your maintenance ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been assigned to <strong>{{assignedTo}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f1f5f9;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
    <tr><td style="padding:6px;background:#f1f5f9;font-weight:bold">Category</td><td style="padding:6px">{{category}}</td></tr>
    <tr><td style="padding:6px;background:#f1f5f9;font-weight:bold">Assigned To</td><td style="padding:6px">{{assignedTo}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_submitted → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_submitted', 'manager',
 '[{{companyName}}] Estimation pending approval — Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#d97706">Estimation Awaiting Approval</h2>
  <p>A cost estimation has been submitted for ticket <strong>#{{ticketNumber}}</strong> and requires your approval.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#fef9c3;font-weight:bold">Title</td><td style="padding:6px">{{title}}</td></tr>
    <tr><td style="padding:6px;background:#fef9c3;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#fef9c3;font-weight:bold">Estimated Cost</td><td style="padding:6px">{{cost}}</td></tr>
    <tr><td style="padding:6px;background:#fef9c3;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
  </table>
  <p>Please log in to review and approve or reject the estimation.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_approved_by_manager → creator (tenant)
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_approved_by_manager', 'creator',
 '[{{companyName}}] Estimation approved — Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Estimation Approved by Manager</h2>
  <p>Hi {{tenantName}},</p>
  <p>The cost estimation for ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been approved by the manager.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Approved Cost</td><td style="padding:6px">{{cost}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Status</td><td style="padding:6px">{{status}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_approved_by_manager → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_approved_by_manager', 'helpdesk',
 '[{{companyName}}] Estimation approved — proceed with Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Estimation Approved — Action Required</h2>
  <p>The manager has approved the estimation for ticket <strong>#{{ticketNumber}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Title</td><td style="padding:6px">{{title}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Status</td><td style="padding:6px">{{status}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p>Please proceed with scheduling the work.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_rejected_by_manager → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_rejected_by_manager', 'helpdesk',
 '[{{companyName}}] Estimation rejected — re-submit required for Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#dc2626">Estimation Rejected by Manager</h2>
  <p>The manager has rejected the estimation for ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <p>Please review the rejection reason in the system and resubmit a revised estimation.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#fef2f2;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#fef2f2;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_approved_by_tenant → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_approved_by_tenant', 'manager',
 '[{{companyName}}] Tenant approved estimation — Ticket #{{ticketNumber}} ready for work',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Tenant Approved — Work Can Start</h2>
  <p>The tenant has approved the estimation for ticket <strong>#{{ticketNumber}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Title</td><td style="padding:6px">{{title}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Approved Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_approved_by_tenant → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_approved_by_tenant', 'helpdesk',
 '[{{companyName}}] Tenant approved — start work on Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Tenant Approved — Start Work</h2>
  <p>The tenant has approved the cost estimation for ticket <strong>#{{ticketNumber}}</strong>. Work can now begin.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Assigned To</td><td style="padding:6px">{{assignedTo}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_rejected_by_tenant → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_rejected_by_tenant', 'manager',
 '[{{companyName}}] Tenant rejected estimation — Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#dc2626">Estimation Rejected by Tenant</h2>
  <p>The tenant has rejected the cost estimation for ticket <strong>#{{ticketNumber}}</strong>.</p>
  <p>The ticket has been sent back for re-estimation.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#fef2f2;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#fef2f2;font-weight:bold">Rejected Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.estimation_rejected_by_tenant → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.estimation_rejected_by_tenant', 'helpdesk',
 '[{{companyName}}] Re-estimation required — Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#dc2626">Re-Estimation Required</h2>
  <p>The tenant has rejected your estimation for ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <p>Please review the rejection notes and resubmit a revised estimation.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.work_started → creator (tenant)
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.work_started', 'creator',
 '[{{companyName}}] Work has started on Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#2563eb">Work In Progress</h2>
  <p>Hi {{tenantName}},</p>
  <p>Work has started on your ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Assigned To</td><td style="padding:6px">{{assignedTo}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Category</td><td style="padding:6px">{{category}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.work_completed → creator (tenant)
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.work_completed', 'creator',
 '[{{companyName}}] Work completed on Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Work Completed</h2>
  <p>Hi {{tenantName}},</p>
  <p>The maintenance work for ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been completed.</p>
  <p>Please log in to review the work and provide your feedback.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.work_completed → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.work_completed', 'manager',
 '[{{companyName}}] Work completed — Ticket #{{ticketNumber}} awaiting feedback',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Work Completed</h2>
  <p>Work on ticket <strong>#{{ticketNumber}}</strong> has been marked as completed by the helpdesk team.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Final Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.reopened → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.reopened', 'manager',
 '[{{companyName}}] Ticket #{{ticketNumber}} has been reopened by tenant',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#d97706">Ticket Reopened</h2>
  <p>Tenant <strong>{{tenantName}}</strong> has reopened ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <p>Please review the ticket and assign it for re-work.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.reopened → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.reopened', 'helpdesk',
 '[{{companyName}}] Ticket #{{ticketNumber}} reopened — action required',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#d97706">Ticket Reopened</h2>
  <p>Ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been reopened by the tenant.</p>
  <p>Please review and take necessary action.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.resolved → creator (tenant)
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.resolved', 'creator',
 '[{{companyName}}] Ticket #{{ticketNumber}} has been resolved',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Ticket Resolved</h2>
  <p>Hi {{tenantName}},</p>
  <p>Your ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been resolved and closed.</p>
  <p>Thank you for your feedback. Please raise a new ticket if you have further issues.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;
