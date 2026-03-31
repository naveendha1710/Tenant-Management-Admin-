-- =====================================================
-- WORKFLOW ENGINE - ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Purpose: Secure multi-tenant access to workflow data
-- Features: Tenant isolation, role-based access, user-specific filtering
-- =====================================================

-- =====================================================
-- 1. WORKFLOWS TABLE - RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin can see all workflows
CREATE POLICY workflows_super_admin_all
ON workflows
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
    AND users.isActive = true
  )
);

-- Policy: Users can see workflows for their tenant
CREATE POLICY workflows_tenant_read
ON workflows
FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
  OR is_default = true
);

-- Policy: Users with workflow management permission can create workflows
CREATE POLICY workflows_create
ON workflows
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
    AND users.isActive = true
  )
  AND (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IS NULL
  )
);

-- Policy: Users with workflow management permission can update their tenant's workflows
CREATE POLICY workflows_update
ON workflows
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
    AND users.isActive = true
  )
  AND tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
)
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- Policy: Users with workflow management permission can delete their tenant's workflows
CREATE POLICY workflows_delete
ON workflows
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
    AND users.isActive = true
  )
  AND tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
);

-- =====================================================
-- 2. WORKFLOW NODES TABLE - RLS POLICIES
-- =====================================================

ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see nodes for workflows they can access
CREATE POLICY workflow_nodes_read
ON workflow_nodes
FOR SELECT
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR is_default = true
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
  )
);

-- Policy: Users with workflow management can create nodes
CREATE POLICY workflow_nodes_create
ON workflow_nodes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
  )
  AND workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- Policy: Users with workflow management can update nodes
CREATE POLICY workflow_nodes_update
ON workflow_nodes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
  )
  AND workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- Policy: Users with workflow management can delete nodes
CREATE POLICY workflow_nodes_delete
ON workflow_nodes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
  )
  AND workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- =====================================================
-- 3. WORKFLOW EDGES TABLE - RLS POLICIES
-- =====================================================

ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see edges for workflows they can access
CREATE POLICY workflow_edges_read
ON workflow_edges
FOR SELECT
TO authenticated
USING (
  workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR is_default = true
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
  )
);

-- Policy: Users with workflow management can create edges
CREATE POLICY workflow_edges_create
ON workflow_edges
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
  )
  AND workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- Policy: Users with workflow management can update edges
CREATE POLICY workflow_edges_update
ON workflow_edges
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
  )
  AND workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- Policy: Users with workflow management can delete edges
CREATE POLICY workflow_edges_delete
ON workflow_edges
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.can_manage_workflows = true
  )
  AND workflow_id IN (
    SELECT id FROM workflows
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  )
);

-- =====================================================
-- 4. WORKFLOW INSTANCES TABLE - RLS POLICIES
-- =====================================================

ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin can see all instances
CREATE POLICY workflow_instances_super_admin
ON workflow_instances
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
  )
);

-- Policy: Users can see instances for their tenant
CREATE POLICY workflow_instances_tenant_read
ON workflow_instances
FOR SELECT
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  OR tenant_id IS NULL
);

-- Policy: Users can create instances for their tenant
CREATE POLICY workflow_instances_create
ON workflow_instances
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  OR tenant_id IS NULL
);

-- Policy: System can update instances (for workflow engine)
CREATE POLICY workflow_instances_update
ON workflow_instances
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  OR tenant_id IS NULL
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('Super Admin', 'Admin')
  )
);

-- =====================================================
-- 5. WORKFLOW INSTANCE STEPS TABLE - RLS POLICIES
-- =====================================================

ALTER TABLE workflow_instance_steps ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see steps for instances they can access
CREATE POLICY workflow_instance_steps_read
ON workflow_instance_steps
FOR SELECT
TO authenticated
USING (
  instance_id IN (
    SELECT id FROM workflow_instances
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IS NULL
  )
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
  )
);

-- Policy: System can create steps
CREATE POLICY workflow_instance_steps_create
ON workflow_instance_steps
FOR INSERT
TO authenticated
WITH CHECK (
  instance_id IN (
    SELECT id FROM workflow_instances
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IS NULL
  )
);

-- Policy: Assigned approvers can update their steps
CREATE POLICY workflow_instance_steps_update
ON workflow_instance_steps
FOR UPDATE
TO authenticated
USING (
  auth.uid() = ANY(assigned_user_ids)
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('Super Admin', 'Admin')
  )
);

-- =====================================================
-- 6. WORKFLOW ACTIONS TABLE - RLS POLICIES
-- =====================================================

ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see actions for instances they can access
CREATE POLICY workflow_actions_read
ON workflow_actions
FOR SELECT
TO authenticated
USING (
  instance_id IN (
    SELECT id FROM workflow_instances
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IS NULL
  )
  OR action_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
  )
);

-- Policy: Users can create actions for their own approvals
CREATE POLICY workflow_actions_create
ON workflow_actions
FOR INSERT
TO authenticated
WITH CHECK (
  action_by = auth.uid()
  AND instance_id IN (
    SELECT id FROM workflow_instances
    WHERE tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR tenant_id IS NULL
  )
);

-- Policy: No updates to actions (immutable audit trail)
CREATE POLICY workflow_actions_no_update
ON workflow_actions
FOR UPDATE
TO authenticated
USING (false);

-- Policy: No deletes to actions (immutable audit trail)
CREATE POLICY workflow_actions_no_delete
ON workflow_actions
FOR DELETE
TO authenticated
USING (false);

-- =====================================================
-- 7. WORKFLOW NOTIFICATIONS TABLE - RLS POLICIES
-- =====================================================

ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own notifications
CREATE POLICY workflow_notifications_read_own
ON workflow_notifications
FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
);

-- Policy: Super Admin can see all notifications
CREATE POLICY workflow_notifications_super_admin
ON workflow_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'Super Admin'
  )
);

-- Policy: System can create notifications
CREATE POLICY workflow_notifications_create
ON workflow_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY workflow_notifications_update_own
ON workflow_notifications
FOR UPDATE
TO authenticated
USING (
  recipient_user_id = auth.uid()
)
WITH CHECK (
  recipient_user_id = auth.uid()
);

-- Policy: Users can delete their own notifications
CREATE POLICY workflow_notifications_delete_own
ON workflow_notifications
FOR DELETE
TO authenticated
USING (
  recipient_user_id = auth.uid()
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on all workflow tables to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON workflows TO authenticated;
GRANT ALL ON workflow_nodes TO authenticated;
GRANT ALL ON workflow_edges TO authenticated;
GRANT ALL ON workflow_instances TO authenticated;
GRANT ALL ON workflow_instance_steps TO authenticated;
GRANT ALL ON workflow_actions TO authenticated;
GRANT ALL ON workflow_notifications TO authenticated;

-- Grant access to views
GRANT SELECT ON v_pending_approvals TO authenticated;
GRANT SELECT ON v_workflow_metrics TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_active_workflow(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_approve_step(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sla_deadline(TIMESTAMP, INTEGER) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY workflows_super_admin_all ON workflows IS 'Super Admin has full access to all workflows';
COMMENT ON POLICY workflows_tenant_read ON workflows IS 'Users can view workflows for their tenant and default workflows';
COMMENT ON POLICY workflow_instances_tenant_read ON workflow_instances IS 'Users can view workflow instances for their tenant';
COMMENT ON POLICY workflow_instance_steps_update ON workflow_instance_steps IS 'Assigned approvers can update their steps';
COMMENT ON POLICY workflow_actions_no_update ON workflow_actions IS 'Actions are immutable for audit trail integrity';
COMMENT ON POLICY workflow_notifications_read_own ON workflow_notifications IS 'Users can only see their own notifications';

-- =====================================================
-- END OF RLS POLICIES
-- =====================================================
