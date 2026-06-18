-- =====================================================
-- FIX WORKFLOW APPROVER
-- =====================================================
-- Change approver from System Administrator to Manimaran
-- =====================================================

-- Update the APPROVAL node to use Manimaran as approver
UPDATE workflow_nodes
SET approver_user_ids = ARRAY['39054f91-ab78-4448-8c5c-d499792c59af']
WHERE workflow_id = 'ef9d5f03-8853-4281-8c72-f432a0d79744'
  AND node_type = 'APPROVAL';

-- Verify the change
SELECT 
    w.name as workflow_name,
    wn.node_type,
    wn.label,
    wn.approver_user_ids,
    u.name as approver_name,
    u.email as approver_email
FROM workflows w
JOIN workflow_nodes wn ON w.id = wn.workflow_id
LEFT JOIN users u ON u.id = ANY(wn.approver_user_ids)
WHERE w.id = 'ef9d5f03-8853-4281-8c72-f432a0d79744'
  AND wn.node_type = 'APPROVAL';
