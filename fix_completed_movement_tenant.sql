-- Fix tenant for asset EXTRA/ETR/0214 based on completed movement MV-1775887277479396
-- This script updates the asset's handover_to field to match the completed movement's to_tenant

-- First, let's see the current state
SELECT 
    a.asset_id,
    a.handover_to as current_tenant_id,
    t1.company as current_tenant_name,
    am.request_number,
    am.to_tenant,
    am.movement_status,
    am.approval_status
FROM assets a
LEFT JOIN tenants t1 ON a.handover_to = t1.id
LEFT JOIN asset_movements am ON am.request_number = 'MV-1775887277479396'
WHERE a.asset_id = 'EXTRA/ETR/0214';

-- Get the Tartlabs tenant ID
SELECT id, company, name FROM tenants WHERE company = 'Tartlabs' OR name = 'Tartlabs';

-- Update the asset to point to Tartlabs tenant
-- Replace 'TARTLABS_TENANT_ID_HERE' with the actual UUID from the query above
UPDATE assets
SET 
    handover_to = (SELECT id FROM tenants WHERE company = 'Tartlabs' LIMIT 1),
    updated_at = NOW()
WHERE asset_id = 'EXTRA/ETR/0214';

-- Verify the update
SELECT 
    a.asset_id,
    a.handover_to as new_tenant_id,
    t.company as new_tenant_name,
    a.building,
    b.name as building_name
FROM assets a
LEFT JOIN tenants t ON a.handover_to = t.id
LEFT JOIN buildings b ON a.building = b.id
WHERE a.asset_id = 'EXTRA/ETR/0214';

-- Also insert a history record for this change
INSERT INTO asset_history (
    asset_id,
    change_type,
    field_name,
    old_value,
    new_value,
    changed_by,
    movement_request_id
)
SELECT 
    a.id,
    'handover',
    'handover_to',
    'test_tenant',
    'Tartlabs',
    'System Fix',
    am.id
FROM assets a
CROSS JOIN asset_movements am
WHERE a.asset_id = 'EXTRA/ETR/0214'
AND am.request_number = 'MV-1775887277479396';
