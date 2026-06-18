-- Add can_approve_tickets column to users table
ALTER TABLE users
ADD COLUMN can_approve_tickets BOOLEAN DEFAULT true;

-- Update existing users to have approval rights by default
UPDATE users SET can_approve_tickets = false WHERE can_approve_tickets IS NULL;
