-- Drop valid_from and valid_till columns from id_configs table
-- These date range fields are no longer needed for ID configuration

ALTER TABLE public.id_configs 
DROP COLUMN IF EXISTS valid_from;

ALTER TABLE public.id_configs 
DROP COLUMN IF EXISTS valid_till;
