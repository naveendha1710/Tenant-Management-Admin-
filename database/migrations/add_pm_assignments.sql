-- Migration: Add PM Assignment and User Tracking
-- Description: Adds user assignment to preventive maintenance and links auditors to physical audits

-- 0. Add asset_auditor column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS asset_auditor boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_asset_auditor ON public.users(asset_auditor) WHERE asset_auditor = true;

-- 1. Add assignment fields to preventive_maintenance table
ALTER TABLE public.preventive_maintenance 
ADD COLUMN IF NOT EXISTS assigned_to uuid NULL,
ADD COLUMN IF NOT EXISTS assigned_at timestamp without time zone NULL,
ADD COLUMN IF NOT EXISTS assignment_notes text NULL;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'preventive_maintenance_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.preventive_maintenance
    ADD CONSTRAINT preventive_maintenance_assigned_to_fkey 
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for assigned_to
CREATE INDEX IF NOT EXISTS idx_pm_assigned_to ON public.preventive_maintenance(assigned_to);

-- 2. Add auditor_id to physical_audits table
ALTER TABLE public.physical_audits 
ADD COLUMN IF NOT EXISTS auditor_id uuid NULL;

-- Add foreign key constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'physical_audits_auditor_id_fkey'
  ) THEN
    ALTER TABLE public.physical_audits
    ADD CONSTRAINT physical_audits_auditor_id_fkey 
    FOREIGN KEY (auditor_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for auditor_id
CREATE INDEX IF NOT EXISTS idx_physical_audits_auditor_id ON public.physical_audits(auditor_id);

-- 3. Create RLS policies for preventive_maintenance
ALTER TABLE public.preventive_maintenance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users view own PM assignments" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Admins view all PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Admins manage PM" ON public.preventive_maintenance;
DROP POLICY IF EXISTS "Users update own PM" ON public.preventive_maintenance;

-- Users can view their assigned PM records
CREATE POLICY "Users view own PM assignments"
ON public.preventive_maintenance FOR SELECT
USING (
  assigned_to = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'Admin' OR role = 'Super Admin')
  )
);

-- Admins can manage all PM records
CREATE POLICY "Admins manage PM"
ON public.preventive_maintenance FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'Admin' OR role = 'Super Admin')
  )
);

-- Users can update their assigned PM records (for completion tracking)
CREATE POLICY "Users update own PM"
ON public.preventive_maintenance FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- 4. Create RLS policies for physical_audits
ALTER TABLE public.physical_audits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users view own audits" ON public.physical_audits;
DROP POLICY IF EXISTS "Admins view all audits" ON public.physical_audits;
DROP POLICY IF EXISTS "Users insert audits for assigned assets" ON public.physical_audits;

-- Users can view their own audits or audits for their assigned assets
CREATE POLICY "Users view own audits"
ON public.physical_audits FOR SELECT
USING (
  auditor_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'Admin' OR role = 'Super Admin')
  )
  OR
  asset_id IN (
    SELECT a.asset_id 
    FROM assets a
    JOIN preventive_maintenance pm ON a.id = pm.asset_id
    WHERE pm.assigned_to = auth.uid()
  )
);

-- Users can insert audits only for their assigned assets
CREATE POLICY "Users insert audits for assigned assets"
ON public.physical_audits FOR INSERT
WITH CHECK (
  auditor_id = auth.uid()
  AND
  asset_id IN (
    SELECT a.asset_id 
    FROM assets a
    JOIN preventive_maintenance pm ON a.id = pm.asset_id
    WHERE pm.assigned_to = auth.uid()
  )
);

-- Admins can manage all audits
CREATE POLICY "Admins manage audits"
ON public.physical_audits FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (role = 'Admin' OR role = 'Super Admin')
  )
);

-- 5. Create view for PM assignments with asset and user details
CREATE OR REPLACE VIEW pm_assignments_view AS
SELECT 
  pm.id,
  pm.asset_id,
  a.asset_id as asset_code,
  a.asset_name,
  a.asset_category,
  a.asset_sub_category,
  a.building,
  b.name as building_name,
  a.floor_id,
  f.floor_name,
  pm.assigned_to,
  u.name as assigned_user_name,
  u.email as assigned_user_email,
  pm.pm_enabled,
  pm.pm_start_date,
  pm.pm_end_date,
  pm.pm_frequency_days,
  pm.pm_next_date,
  pm.pm_last_completed_date,
  pm.assigned_at,
  pm.assignment_notes,
  pm.created_at,
  pm.updated_at,
  CASE 
    WHEN pm.pm_next_date < CURRENT_DATE THEN 'Overdue'
    WHEN pm.pm_next_date = CURRENT_DATE THEN 'Due Today'
    WHEN pm.pm_next_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'Due Soon'
    ELSE 'Scheduled'
  END as pm_status
FROM preventive_maintenance pm
JOIN assets a ON pm.asset_id = a.id
LEFT JOIN users u ON pm.assigned_to = u.id
LEFT JOIN buildings b ON a.building::uuid = b.id
LEFT JOIN floors f ON a.floor_id = f.id
WHERE pm.pm_enabled = true;

COMMENT ON VIEW pm_assignments_view IS 'Consolidated view of PM assignments with asset and user details';
