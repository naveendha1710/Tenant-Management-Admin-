-- =====================================================
-- UPDATE GET_ACTIVE_WORKFLOW FUNCTION
-- =====================================================
-- Purpose: Support system-level workflows with user filtering
-- Changes: Add user_id parameter and check workflow_users table
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_active_workflow(UUID, VARCHAR);

-- Create updated function with user_id parameter
CREATE OR REPLACE FUNCTION get_active_workflow(
    p_tenant_id UUID,
    p_entity_type VARCHAR,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE(workflow_id UUID, version INTEGER) AS $$
BEGIN
    -- First, try tenant-specific workflow
    IF p_tenant_id IS NOT NULL THEN
        RETURN QUERY
        SELECT w.id, w.version
        FROM workflows w
        WHERE w.tenant_id = p_tenant_id
          AND w.entity_type = p_entity_type
          AND w.is_active = true
        ORDER BY w.version DESC
        LIMIT 1;
        
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- If no tenant workflow and user_id provided, check system workflows
    IF p_user_id IS NOT NULL THEN
        RETURN QUERY
        SELECT w.id, w.version
        FROM workflows w
        INNER JOIN workflow_users wu ON w.id = wu.workflow_id
        WHERE w.tenant_id IS NULL
          AND w.entity_type = p_entity_type
          AND w.is_active = true
          AND wu.user_id = p_user_id
        ORDER BY w.version DESC
        LIMIT 1;
        
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Finally, return default workflow as fallback
    RETURN QUERY
    SELECT w.id, w.version
    FROM workflows w
    WHERE w.is_default = true
      AND w.entity_type = p_entity_type
      AND w.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_workflow IS 'Gets active workflow for tenant or system user, with default fallback';
