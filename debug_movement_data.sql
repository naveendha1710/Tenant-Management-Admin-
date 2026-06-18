-- Check the actual movement record to see what's stored
SELECT 
    request_number,
    handover_to,
    handover_name,
    to_tenant,
    from_tenant,
    movement_status,
    approval_status,
    assets
FROM asset_movements
WHERE request_number = 'MV-1775887277479396';

-- Check the asset's current handover_to value
SELECT 
    asset_id,
    asset_name,
    handover_to,
    building,
    floor_id,
    room_id
FROM assets
WHERE asset_id = 'EXTRA/ETR/0214';

-- Get tenant details to see UUIDs vs names
SELECT id, name, company FROM tenants WHERE company IN ('test_tenant', 'Tartlabs');

-- Check if there's a UUID stored in handover_name or if it's a text name
SELECT 
    am.request_number,
    am.handover_to as handover_type,
    am.handover_name,
    am.to_tenant,
    t.id as tenant_uuid,
    t.company as tenant_company
FROM asset_movements am
LEFT JOIN tenants t ON t.company = am.to_tenant OR t.id::text = am.handover_name
WHERE am.request_number = 'MV-1775887277479396';
