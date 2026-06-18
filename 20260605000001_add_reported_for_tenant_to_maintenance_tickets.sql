-- Add column to track when a ticket is created "on behalf of" a tenant
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS on_behalf_tenant_id uuid NULL;

-- Foreign key to tenants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_tickets_on_behalf_tenant_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.maintenance_tickets ADD CONSTRAINT maintenance_tickets_on_behalf_tenant_id_fkey FOREIGN KEY (on_behalf_tenant_id) REFERENCES tenants (id) ON DELETE SET NULL';
  END IF;
END
$$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_on_behalf_tenant_id
  ON public.maintenance_tickets USING btree (on_behalf_tenant_id);

-- NOTE: This migration adds a nullable column so it is safe to run on production.
