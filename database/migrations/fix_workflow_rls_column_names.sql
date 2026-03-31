-- Fix column name in workflow RLS policies
-- Change isActive to is_active

-- Drop existing policies
DROP POLICY IF EXISTS workflows_super_admin_all ON workflows;
DROP POLICY IF EXISTS workflows_create ON workflows;
DROP POLICY IF EXISTS workflows_update ON workflows;
DROP POLICY IF EXISTS workflows_delete ON workflows;
DROP POLICY IF EXISTS workflow_nodes_create ON workflow_nodes;
DROP POLICY IF EXISTS workflow_nodes_update ON workflow_nodes;
DROP POLICY IF EXISTS workflow_nodes_delete ON workflow_nodes;
DROP POLICY IF EXISTS workflow_edges_create ON workflow_edges;
DROP POLICY IF EXISTS workflow_edges_update ON workflow_edges;
DROP POLICY IF EXISTS workflow_edges_delete ON workflow_edges;

-- Recreate with correct column name

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
    AND users.is_active = true
  )
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
    AND users.is_active = true
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
    AND users.is_active = true
  )
)
WITH CHECK (true);

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
    AND users.is_active = true
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
);
