-- =====================================================
-- FIX WORKFLOW CONSTRAINTS FOR SYSTEM WORKFLOWS
-- =====================================================
-- Purpose: Allow multiple system workflows (tenant_id = NULL)
-- Issue: UNIQUE(tenant_id, entity_type, version) fails for NULL tenant_id
-- =====================================================

-- 1. Drop existing unique constraint
ALTER TABLE workflows DROP CONSTRAINT IF EXISTS unique_workflow_version;

-- 2. Drop existing indexes if they exist
DROP INDEX IF EXISTS unique_tenant_workflow_version;
DROP INDEX IF EXISTS unique_system_workflow_name;

-- 3. Create partial unique index that excludes NULL tenant_id
-- This allows multiple system workflows while maintaining uniqueness for tenant workflows
CREATE UNIQUE INDEX unique_tenant_workflow_version 
ON workflows(tenant_id, entity_type, version) 
WHERE tenant_id IS NOT NULL;

-- 4. For system workflows, ensure unique name per entity type
CREATE UNIQUE INDEX unique_system_workflow_name 
ON workflows(name, entity_type) 
WHERE tenant_id IS NULL;

COMMENT ON INDEX unique_tenant_workflow_version IS 'Ensures unique version per tenant and entity type';
COMMENT ON INDEX unique_system_workflow_name IS 'Ensures unique workflow name for system workflows';
