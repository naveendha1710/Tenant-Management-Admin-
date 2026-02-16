-- Add asset_value field to assets table
ALTER TABLE assets ADD COLUMN IF NOT EXISTS asset_value NUMERIC(15, 2);
