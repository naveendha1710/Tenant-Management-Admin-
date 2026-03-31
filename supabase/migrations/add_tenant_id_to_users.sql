-- Add tenantId column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES public.tenants(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users("tenantId");
