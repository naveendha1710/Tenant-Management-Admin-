-- Preventive Maintenance Schedule Table
CREATE TABLE preventive_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  pm_enabled BOOLEAN DEFAULT true,
  pm_start_date DATE NOT NULL,
  pm_end_date DATE,
  pm_frequency_days INTEGER NOT NULL,
  pm_next_date DATE NOT NULL,
  pm_last_completed_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT
);

-- Index for faster queries
CREATE INDEX idx_pm_asset_id ON preventive_maintenance(asset_id);
CREATE INDEX idx_pm_next_date ON preventive_maintenance(pm_next_date);
CREATE INDEX idx_pm_enabled ON preventive_maintenance(pm_enabled);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pm_timestamp
BEFORE UPDATE ON preventive_maintenance
FOR EACH ROW
EXECUTE FUNCTION update_pm_updated_at();

-- Migration: Copy existing PM data from assets table to new table
INSERT INTO preventive_maintenance (
  asset_id,
  pm_enabled,
  pm_start_date,
  pm_end_date,
  pm_frequency_days,
  pm_next_date,
  created_at
)
SELECT 
  id,
  pm_enabled,
  pm_start_date,
  pm_end_date,
  pm_frequency_days,
  pm_next_date,
  created_at
FROM assets
WHERE pm_enabled = true 
  AND pm_start_date IS NOT NULL 
  AND pm_next_date IS NOT NULL;
