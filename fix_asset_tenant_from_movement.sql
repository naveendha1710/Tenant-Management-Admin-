-- Manual fix for completed movement MV-1775887277479396
-- This updates the asset's handover_to field based on the movement's handover_name

-- Step 1: Check current state
SELECT 
    a.asset_id,
    a.handover_to as current_tenant_uuid,
    t1.company as current_tenant_name,
    am.handover_to as movement_handover_type,
    am.handover_name as movement_handover_value,
    am.to_tenant as movement_to_tenant_name,
    t2.id as target_tenant_uuid,
    t2.company as target_tenant_name
FROM assets a
LEFT JOIN tenants t1 ON a.handover_to = t1.id
CROSS JOIN asset_movements am
LEFT JOIN tenants t2 ON (
    CASE 
        WHEN am.handover_to = 'Tenant' THEN t2.id::text = am.handover_name
        ELSE t2.company = am.to_tenant
    END
)
WHERE a.asset_id = 'EXTRA/ETR/0214'
AND am.request_number = 'MV-1775887277479396';

-- Step 2: Update the asset with the correct tenant UUID
-- This assumes handover_name contains the UUID when handover_to = 'Tenant'
UPDATE assets
SET 
    handover_to = (
        SELECT 
            CASE 
                WHEN am.handover_to = 'Tenant' THEN am.handover_name::uuid
                ELSE (SELECT id FROM tenants WHERE company = am.to_tenant LIMIT 1)
            END
        FROM asset_movements am
        WHERE am.request_number = 'MV-1775887277479396'
    ),
    updated_at = NOW()
WHERE asset_id = 'EXTRA/ETR/0214';

-- Step 3: Verify the update
SELECT 
    a.asset_id,
    a.handover_to as new_tenant_uuid,
    t.company as new_tenant_name,
    t.name as tenant_contact_name
FROM assets a
LEFT JOIN tenants t ON a.handover_to = t.id
WHERE a.asset_id = 'EXTRA/ETR/0214';

-- Step 4: Add history record
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
    a.id as asset_id,
    'handover' as change_type,
    'handover_to' as field_name,
    'test_tenant' as old_value,
    'Tartlabs' as new_value,
    'Manual Fix - Completed Movement' as changed_by,
    am.id as movement_request_id
FROM assets a
CROSS JOIN asset_movements am
WHERE a.asset_id = 'EXTRA/ETR/0214'
AND am.request_number = 'MV-1775887277479396'
AND NOT EXISTS (
    SELECT 1 FROM asset_history ah
    WHERE ah.asset_id = a.id
    AND ah.movement_request_id = am.id
    AND ah.field_name = 'handover_to'
);
