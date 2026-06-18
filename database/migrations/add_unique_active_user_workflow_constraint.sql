-- =====================================================
-- ADD UNIQUE CONSTRAINT FOR ACTIVE WORKFLOW USERS
-- =====================================================
-- Purpose: Prevent same user from being in multiple active system workflows
-- Business Rule: One user can only be assigned to ONE active workflow at a time
-- =====================================================

-- Create function to check if user is already in an active workflow
CREATE OR REPLACE FUNCTION check_user_active_workflow()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for system workflows (tenant_id IS NULL)
  IF EXISTS (
    SELECT 1 
    FROM workflow_users wu
    JOIN workflows w ON wu.workflow_id = w.id
    WHERE wu.user_id = NEW.user_id
      AND w.is_active = true
      AND w.tenant_id IS NULL
      AND wu.workflow_id != NEW.workflow_id
  ) THEN
    RAISE EXCEPTION 'User is already assigned to another active system workflow';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on workflow_users INSERT
CREATE TRIGGER trigger_check_user_active_workflow
  BEFORE INSERT ON workflow_users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_active_workflow();

-- Create trigger on workflows UPDATE (when activating)
CREATE OR REPLACE FUNCTION check_workflow_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when activating a system workflow
  IF NEW.is_active = true AND OLD.is_active = false AND NEW.tenant_id IS NULL THEN
    -- Check if any users in this workflow are already in other active workflows
    IF EXISTS (
      SELECT 1
      FROM workflow_users wu1
      JOIN workflow_users wu2 ON wu1.user_id = wu2.user_id
      JOIN workflows w ON wu2.workflow_id = w.id
      WHERE wu1.workflow_id = NEW.id
        AND wu2.workflow_id != NEW.id
        AND w.is_active = true
        AND w.tenant_id IS NULL
    ) THEN
      RAISE EXCEPTION 'One or more users are already assigned to another active system workflow';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_workflow_activation
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION check_workflow_activation();

COMMENT ON FUNCTION check_user_active_workflow() IS 'Prevents user from being added to multiple active system workflows';
COMMENT ON FUNCTION check_workflow_activation() IS 'Prevents activating workflow if users are already in other active workflows';
