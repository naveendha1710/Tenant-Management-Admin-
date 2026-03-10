-- Remove PM columns from assets table after migration
-- Run this AFTER migrating data to preventive_maintenance table

ALTER TABLE assets DROP COLUMN IF EXISTS pm_enabled;
ALTER TABLE assets DROP COLUMN IF EXISTS pm_start_date;
ALTER TABLE assets DROP COLUMN IF EXISTS pm_end_date;
ALTER TABLE assets DROP COLUMN IF EXISTS pm_frequency_days;
ALTER TABLE assets DROP COLUMN IF EXISTS pm_next_date;
