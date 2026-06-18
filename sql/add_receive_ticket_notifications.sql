-- Add receiveTicketNotifications column to users table
-- This column controls whether users receive email notifications for ticket events

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS receive_ticket_notifications BOOLEAN DEFAULT true;

-- Add comment to document the column
COMMENT ON COLUMN users.receive_ticket_notifications IS 'Controls whether user receives email notifications for ticket lifecycle events (for Manage Tickets, Helpdesk, and Tenant roles)';

-- Update existing users to have ticket notifications enabled by default
UPDATE users 
SET receive_ticket_notifications = true 
WHERE receive_ticket_notifications IS NULL;
