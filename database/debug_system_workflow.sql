-- =====================================================
-- DEBUG: CHECK SYSTEM WORKFLOW SETUP
-- =====================================================
-- Run this to verify system workflow was created correctly
-- =====================================================

-- 1. Check if workflow exists and is active
SELECT 
    id,
    name,
    tenant_id,
    entity_type,
    is_active,
    is_default,
    created_at
FROM workflows
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- 2. Check workflow_users table
SELECT 
    wu.id,
    wu.workflow_id,
    wu.user_id,
    w.name as workflow_name,
    u.name as user_name,
    u.email as user_email
FROM workflow_users wu
JOIN workflows w ON wu.workflow_id = w.id
JOIN users u ON wu.user_id = u.id
ORDER BY wu.created_at DESC;

-- 3. Check workflow nodes
SELECT 
    wn.workflow_id,
    w.name as workflow_name,
    wn.node_type,
    wn.label,
    wn.approver_user_ids
FROM workflow_nodes wn
JOIN workflows w ON wn.workflow_id = w.id
WHERE w.tenant_id IS NULL
ORDER BY wn.workflow_id, wn.node_type;

-- 4. Test get_active_workflow function
-- Replace 'YOUR_USER_ID' with actual user ID
SELECT * FROM get_active_workflow(
    NULL,  -- p_tenant_id (NULL for system workflow)
    'asset_movement',  -- p_entity_type
    'YOUR_USER_ID'  -- p_user_id (replace with actual user ID)
);
