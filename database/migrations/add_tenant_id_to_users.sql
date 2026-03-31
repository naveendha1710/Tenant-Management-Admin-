-- Add tenant_id column to users table to link tenant users to their tenant
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS tenant_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE public.users
ADD CONSTRAINT users_tenant_id_fkey 
FOREIGN KEY (tenant_id) 
REFERENCES public.tenants(id) 
ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id 
ON public.users USING btree (tenant_id);

-- Add comment
COMMENT ON COLUMN public.users.tenant_id IS 'Links tenant users to their parent tenant record';
