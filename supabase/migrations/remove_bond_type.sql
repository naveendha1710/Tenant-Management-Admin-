-- Remove bond_type column from assets table
ALTER TABLE assets DROP COLUMN IF EXISTS bond_type;
