-- Populate tenant_id for existing tenant users by matching email addresses
-- This migration links existing tenant users in the users table to their corresponding tenant records

UPDATE public.users
SET tenant_id = tenants.id
FROM public.tenants
WHERE users.email = tenants.email
  AND users.role = 'Tenant'
  AND users.tenant_id IS NULL;

-- Log the number of records updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % tenant users with tenant_id', updated_count;
END $$;
