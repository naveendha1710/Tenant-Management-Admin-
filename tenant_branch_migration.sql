-- Migration: Add Multi-Branch Tenant Support
-- Safe for production - all columns nullable, backward compatible

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_main_branch BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);

COMMENT ON COLUMN tenants.parent_tenant_id IS 'Links branch to main tenant';
COMMENT ON COLUMN tenants.branch_name IS 'Branch identifier (e.g., "Bangalore Branch")';
COMMENT ON COLUMN tenants.is_main_branch IS 'True for main location, false for branches';
