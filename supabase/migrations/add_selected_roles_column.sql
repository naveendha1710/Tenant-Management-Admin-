-- Add selected_roles column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_roles jsonb DEFAULT '[]'::jsonb;

-- Add comment to describe the column
COMMENT ON COLUMN users.selected_roles IS 'Array of selected role names for multi-role support';
