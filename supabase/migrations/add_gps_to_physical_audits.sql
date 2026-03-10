-- Add GPS location columns to physical_audits table
ALTER TABLE public.physical_audits
ADD COLUMN IF NOT EXISTS gps_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION;

-- Add comment to columns
COMMENT ON COLUMN public.physical_audits.gps_latitude IS 'GPS latitude coordinate captured during physical audit';
COMMENT ON COLUMN public.physical_audits.gps_longitude IS 'GPS longitude coordinate captured during physical audit';
COMMENT ON COLUMN public.physical_audits.gps_accuracy IS 'GPS accuracy in meters';

-- Create index for GPS queries (optional, for future geospatial queries)
CREATE INDEX IF NOT EXISTS idx_physical_audits_gps ON public.physical_audits (gps_latitude, gps_longitude);
