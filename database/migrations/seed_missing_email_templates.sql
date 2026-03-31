-- Seed missing email templates for all events × roles
-- Variables: {{ticketNumber}} {{title}} {{status}} {{priority}} {{category}} {{cost}} {{tenantName}} {{assignedTo}} {{companyName}} {{footerText}}

-- ticket.created → creator
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.created', 'creator',
 '[{{companyName}}] Your ticket #{{ticketNumber}} has been received',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#2563eb">Ticket Received</h2>
  <p>Hi {{tenantName}},</p>
  <p>Your maintenance request <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been received and is being reviewed.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Category</td><td style="padding:6px">{{category}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Status</td><td style="padding:6px">{{status}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.created → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.created', 'manager',
 '[{{companyName}}] New ticket #{{ticketNumber}} submitted',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#2563eb">New Ticket Submitted</h2>
  <p>A new maintenance ticket has been submitted and requires attention.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Ticket #</td><td style="padding:6px">{{ticketNumber}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Title</td><td style="padding:6px">{{title}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Category</td><td style="padding:6px">{{category}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.created → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.created', 'helpdesk',
 '[{{companyName}}] New ticket #{{ticketNumber}} needs assignment',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#2563eb">New Ticket — Action Required</h2>
  <p>A new maintenance ticket has been submitted and needs to be assigned to a technician.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Ticket #</td><td style="padding:6px">{{ticketNumber}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Title</td><td style="padding:6px">{{title}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
  </table>
  <p>Please log in and assign a technician to this ticket.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.assigned → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.assigned', 'manager',
 '[{{companyName}}] Ticket #{{ticketNumber}} assigned to {{assignedTo}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#1d4ed8">Ticket Assigned</h2>
  <p>Ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been assigned to <strong>{{assignedTo}}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f1f5f9;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#f1f5f9;font-weight:bold">Priority</td><td style="padding:6px">{{priority}}</td></tr>
    <tr><td style="padding:6px;background:#f1f5f9;font-weight:bold">Category</td><td style="padding:6px">{{category}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.assigned → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.assigned', 'helpdesk',
 '[{{companyName}}] You assigned ticket #{{ticketNumber}} to {{assignedTo}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#1d4ed8">Ticket Assigned — Confirmation</h2>
  <p>Ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been successfully assigned to <strong>{{assignedTo}}</strong>.</p>
  <p>Next step: Technician should add RCA and submit an estimation.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.work_started → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.work_started', 'manager',
 '[{{companyName}}] Work started on Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#2563eb">Work In Progress</h2>
  <p>Work has started on ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Assigned To</td><td style="padding:6px">{{assignedTo}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#eff6ff;font-weight:bold">Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.work_started → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.work_started', 'helpdesk',
 '[{{companyName}}] Work started — Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#2563eb">Work Started — Confirmation</h2>
  <p>Work has been started on ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> by <strong>{{assignedTo}}</strong>.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.resolved → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.resolved', 'manager',
 '[{{companyName}}] Ticket #{{ticketNumber}} resolved and closed',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Ticket Resolved</h2>
  <p>Ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been resolved and closed by the tenant.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Tenant</td><td style="padding:6px">{{tenantName}}</td></tr>
    <tr><td style="padding:6px;background:#f0fdf4;font-weight:bold">Final Cost</td><td style="padding:6px">{{cost}}</td></tr>
  </table>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.resolved → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.resolved', 'helpdesk',
 '[{{companyName}}] Ticket #{{ticketNumber}} closed by tenant',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#16a34a">Ticket Closed</h2>
  <p>Ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em> has been marked as resolved by the tenant.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.request_changes → creator
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.request_changes', 'creator',
 '[{{companyName}}] Changes requested on Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#d97706">Changes Requested</h2>
  <p>Hi {{tenantName}},</p>
  <p>Changes have been requested on ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>. A revised estimation will be submitted shortly.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.request_changes → manager
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.request_changes', 'manager',
 '[{{companyName}}] Estimation changes requested — Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#d97706">Estimation Changes Requested</h2>
  <p>The helpdesk has requested changes to the estimation for ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <p>A revised estimation will be submitted for your approval.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;

-- ticket.request_changes → helpdesk
INSERT INTO email_templates (event, role, subject, html_body) VALUES
('ticket.request_changes', 'helpdesk',
 '[{{companyName}}] You requested changes on Ticket #{{ticketNumber}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#d97706">Changes Requested — Confirmation</h2>
  <p>You have requested changes to the estimation for ticket <strong>#{{ticketNumber}}</strong> — <em>{{title}}</em>.</p>
  <p>Please update the estimation and resubmit for approval.</p>
  <p style="color:#6b7280;font-size:12px">{{footerText}}</p>
</div>')
ON CONFLICT (event, role) DO NOTHING;
