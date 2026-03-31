-- Add from_tenant and to_tenant columns to asset_movements table
ALTER TABLE asset_movements
ADD COLUMN IF NOT EXISTS from_tenant TEXT,
ADD COLUMN IF NOT EXISTS to_tenant TEXT,
ADD COLUMN IF NOT EXISTS approved_date TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN asset_movements.from_tenant IS 'Name of the tenant from which assets are being moved';
COMMENT ON COLUMN asset_movements.to_tenant IS 'Name of the tenant to which assets are being moved';
COMMENT ON COLUMN asset_movements.approved_date IS 'Date when the movement was approved';
