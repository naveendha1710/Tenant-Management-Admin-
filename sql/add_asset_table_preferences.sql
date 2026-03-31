-- Add asset table column preferences to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS asset_table_preferences JSONB NULL;
