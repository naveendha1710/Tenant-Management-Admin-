-- =====================================================
-- ADD WORKFLOW PERMISSIONS TO USERS TABLE
-- =====================================================
-- Purpose: Add workflow management permission columns
-- =====================================================

-- Add workflow permission columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_create_workflows BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_workflows BOOLEAN DEFAULT false;

-- Grant permissions to Super Admin and Admin roles
UPDATE users
SET 
  can_create_workflows = true,
  can_manage_workflows = true
WHERE role IN ('Super Admin', 'Admin')
AND is_active = true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_workflow_permissions 
ON users(can_manage_workflows) 
WHERE can_manage_workflows = true;

-- Add comments
COMMENT ON COLUMN users.can_create_workflows IS 'Permission to create new workflows';
COMMENT ON COLUMN users.can_manage_workflows IS 'Permission to manage (create, edit, delete, publish) workflows';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
