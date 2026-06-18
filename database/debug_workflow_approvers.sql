-- =====================================================
-- DEBUG: CHECK WORKFLOW APPROVERS
-- =====================================================
-- Check if approvers are correctly set in workflow nodes
-- =====================================================

-- 1. Check workflow nodes and their approvers
SELECT 
    w.id as workflow_id,
    w.name as workflow_name,
    w.tenant_id,
    wn.node_id,
    wn.node_type,
    wn.label,
    wn.approval_type,
    wn.approver_user_ids,
    wn.sla_hours
FROM workflows w
JOIN workflow_nodes wn ON w.id = wn.workflow_id
WHERE w.tenant_id IS NULL
ORDER BY w.id, wn.node_type;

-- 2. Check workflow_users (who can CREATE movements with this workflow)
SELECT 
    wu.workflow_id,
    w.name as workflow_name,
    wu.user_id,
    u.name as user_name,
    u.email as user_email,
    u.role
FROM workflow_users wu
JOIN workflows w ON wu.workflow_id = w.id
JOIN users u ON wu.user_id = u.id
ORDER BY wu.workflow_id;

-- 3. Check actual workflow instance steps and assigned approvers
SELECT 
    wi.id as instance_id,
    wi.entity_id as movement_id,
    wi.status as workflow_status,
    wi.started_at,
    wis.id as step_id,
    wis.step_number,
    wis.node_type,
    wis.status as step_status,
    wis.assigned_user_ids,
    wis.approval_type,
    wis.required_approvals,
    wis.received_approvals
FROM workflow_instances wi
JOIN workflow_instance_steps wis ON wi.id = wis.instance_id
WHERE wi.entity_type = 'asset_movement'
ORDER BY wi.started_at DESC, wis.step_number
LIMIT 10;

-- 4. Get user names for assigned approvers
SELECT 
    wis.id as step_id,
    wis.step_number,
    unnest(wis.assigned_user_ids) as approver_id,
    u.name as approver_name,
    u.email as approver_email,
    u.role as approver_role
FROM workflow_instance_steps wis
JOIN workflow_instances wi ON wis.instance_id = wi.id
LEFT JOIN users u ON u.id = ANY(wis.assigned_user_ids)
WHERE wi.entity_type = 'asset_movement'
  AND wis.status = 'pending'
ORDER BY wi.started_at DESC, wis.step_number;
