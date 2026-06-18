-- =====================================================
-- CREATE WORKFLOW_USERS TABLE
-- =====================================================
-- Purpose: Link system workflows to specific users
-- For system-level workflows (tenant_id = null), this table
-- defines which users the workflow applies to
-- =====================================================

CREATE TABLE IF NOT EXISTS workflow_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique workflow-user combination
  UNIQUE(workflow_id, user_id)
);

-- Index for faster lookups
CREATE INDEX idx_workflow_users_workflow_id ON workflow_users(workflow_id);
CREATE INDEX idx_workflow_users_user_id ON workflow_users(user_id);

COMMENT ON TABLE workflow_users IS 'Links system workflows to specific users';
COMMENT ON COLUMN workflow_users.workflow_id IS 'Reference to workflow';
COMMENT ON COLUMN workflow_users.user_id IS 'Reference to user this workflow applies to';
