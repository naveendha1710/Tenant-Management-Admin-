-- =====================================================
-- DEACTIVATE OLD SYSTEM WORKFLOW
-- =====================================================
-- Keep only the new workflow with Manimaran as approver
-- =====================================================

-- Deactivate old workflow
UPDATE workflows
SET is_active = false
WHERE id = 'ef9d5f03-8853-4281-8c72-f432a0d79744';

-- Verify only one active system workflow remains
SELECT 
    w.id,
    w.name,
    w.is_active,
    wn.approver_user_ids,
    u.name as approver_name,
    wu.user_id as assigned_to_user
FROM workflows w
LEFT JOIN workflow_nodes wn ON w.id = wn.workflow_id AND wn.node_type = 'APPROVAL'
LEFT JOIN users u ON u.id = ANY(wn.approver_user_ids)
LEFT JOIN workflow_users wu ON w.id = wu.workflow_id
WHERE w.tenant_id IS NULL
  AND w.is_active = true
ORDER BY w.created_at DESC;
