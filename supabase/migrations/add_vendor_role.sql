-- Add Vendor role - First check and fix any invalid roles
-- Step 1: Check what roles exist
DO $$
BEGIN
  -- Update any roles that don't match the expected list
  UPDATE public.users 
  SET role = 'Viewer'
  WHERE role NOT IN (
    'Super Admin',
    'Admin',
    'Accountant',
    'Maintenance Manager',
    'Helpdesk',
    'Technician',
    'Viewer',
    'Custom',
    'Manage Tickets',
    'Tenant'
  );
END $$;

-- Step 2: Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 3: Add new constraint with Vendor
ALTER TABLE public.users
ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'Super Admin',
    'Admin',
    'Accountant',
    'Maintenance Manager',
    'Helpdesk',
    'Technician',
    'Viewer',
    'Custom',
    'Manage Tickets',
    'Tenant',
    'Vendor'
  )
);
