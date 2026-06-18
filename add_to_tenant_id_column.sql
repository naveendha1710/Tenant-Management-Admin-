-- Add to_tenant_id column to asset_movements table to store tenant UUID
-- This allows us to store tenant NAME in handover_name/to_tenant for history
-- while storing tenant UUID in to_tenant_id for asset updates

-- Add the column
ALTER TABLE asset_movements 
ADD COLUMN IF NOT EXISTS to_tenant_id uuid;

-- Add foreign key constraint (optional - can be removed if you want to keep history even after tenant deletion)
-- ALTER TABLE asset_movements 
-- ADD CONSTRAINT asset_movements_to_tenant_id_fkey 
-- FOREIGN KEY (to_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_movements_to_tenant_id 
ON asset_movements(to_tenant_id);

-- Add comment
COMMENT ON COLUMN asset_movements.to_tenant_id IS 'UUID of the tenant for asset handover (used to update asset.handover_to field)';

-- Migrate existing data: Update to_tenant_id based on existing handover_name (if it contains UUID)
-- This is for movements where handover_to = 'Tenant' and handover_name might contain UUID
UPDATE asset_movements
SET to_tenant_id = (
    SELECT t.id 
    FROM tenants t 
    WHERE t.company = asset_movements.to_tenant 
    OR t.name = asset_movements.to_tenant
    LIMIT 1
)
WHERE handover_to = 'Tenant' 
AND to_tenant_id IS NULL
AND to_tenant IS NOT NULL;

-- Verify the migration
SELECT 
    request_number,
    handover_to,
    handover_name,
    to_tenant,
    to_tenant_id,
    movement_status
FROM asset_movements
WHERE handover_to = 'Tenant'
ORDER BY created_at DESC
LIMIT 10;
