-- Fix cascade delete for workflow_instances when tenant is deleted

-- Drop the existing foreign key constraint
ALTER TABLE public.workflow_instances 
DROP CONSTRAINT IF EXISTS workflow_instances_tenant_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE public.workflow_instances 
ADD CONSTRAINT workflow_instances_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

-- Also check and fix other tables that might reference tenants
-- Fix users table
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

-- Fix agreements table if it exists
ALTER TABLE public.agreements 
DROP CONSTRAINT IF EXISTS agreements_tenant_id_fkey;

ALTER TABLE public.agreements 
ADD CONSTRAINT agreements_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

-- Fix asset_movements table if it exists
ALTER TABLE public.asset_movements 
DROP CONSTRAINT IF EXISTS asset_movements_tenant_id_fkey;

ALTER TABLE public.asset_movements 
ADD CONSTRAINT asset_movements_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE SET NULL;

COMMENT ON CONSTRAINT workflow_instances_tenant_id_fkey ON public.workflow_instances IS 'Cascade delete workflow instances when tenant is deleted';
