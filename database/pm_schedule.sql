-- Add PM scheduling columns to assets table
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS pm_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pm_start_date DATE,
ADD COLUMN IF NOT EXISTS pm_end_date DATE,
ADD COLUMN IF NOT EXISTS pm_frequency_days INTEGER,
ADD COLUMN IF NOT EXISTS pm_next_date DATE;

-- Create indexes for PM queries
CREATE INDEX IF NOT EXISTS idx_assets_pm_enabled ON assets(pm_enabled);
CREATE INDEX IF NOT EXISTS idx_assets_pm_next_date ON assets(pm_next_date);

-- Update existing assets to have pm_enabled = false if null
UPDATE assets SET pm_enabled = FALSE WHERE pm_enabled IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN assets.pm_enabled IS 'Whether preventive maintenance is enabled for this asset';
COMMENT ON COLUMN assets.pm_start_date IS 'PM schedule start date';
COMMENT ON COLUMN assets.pm_end_date IS 'PM schedule end date (optional)';
COMMENT ON COLUMN assets.pm_frequency_days IS 'PM frequency in days (e.g., 30 for monthly)';
COMMENT ON COLUMN assets.pm_next_date IS 'Next scheduled PM date (auto-calculated)';
