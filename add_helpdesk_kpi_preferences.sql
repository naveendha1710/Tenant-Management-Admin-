-- Add helpdesk_kpi_preferences column to users table
-- This will store which KPI cards each user wants to see on the helpdesk dashboard

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS helpdesk_kpi_preferences JSONB DEFAULT '{"cards": ["total", "open", "approved", "work_started", "completed", "resolved", "on_hold", "pending_estimations", "pending_approvals", "rejected", "overdue", "critical", "high", "medium", "low", "safety_risk"]}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN users.helpdesk_kpi_preferences IS 'Stores user preferences for visible KPI cards on helpdesk dashboard. Structure: {"cards": ["card_key1", "card_key2", ...]}';

-- Update existing users to have default preferences (show all cards)
UPDATE users 
SET helpdesk_kpi_preferences = '{"cards": ["total", "open", "approved", "work_started", "completed", "resolved", "on_hold", "pending_estimations", "pending_approvals", "rejected", "overdue", "critical", "high", "medium", "low", "safety_risk"]}'::jsonb
WHERE helpdesk_kpi_preferences IS NULL;
