-- ============================================
-- Migration: Create ticket_estimations table and update maintenance_tickets
-- Created: 2026-05-01
-- Description: Split estimation data into separate table with version tracking
-- ============================================

-- ============================================
-- STEP 1: Update maintenance_tickets table
-- ============================================

-- Add RCA columns
ALTER TABLE maintenance_tickets 
ADD COLUMN IF NOT EXISTS root_cause TEXT,
ADD COLUMN IF NOT EXISTS findings TEXT;

-- Drop old status constraint
ALTER TABLE maintenance_tickets 
DROP CONSTRAINT IF EXISTS maintenance_tickets_status_check;

-- Add updated status constraint (removed 'completed')
ALTER TABLE maintenance_tickets 
ADD CONSTRAINT maintenance_tickets_status_check CHECK (
  status = ANY (ARRAY[
    'pending'::text,
    'assigned'::text,
    'rca_added'::text,
    'pending_approval'::text,
    'rejected'::text,
    'pending_tenant_approval'::text,
    'tenant_rejected'::text,
    'approved'::text,
    'work_started'::text,
    'in_progress'::text,
    'work_completed'::text,
    'resolved'::text,
    'reopened'::text,
    'closed'::text
  ])
);

-- Add indexes for RCA columns
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_root_cause 
  ON maintenance_tickets USING gin(to_tsvector('english', root_cause));

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_findings 
  ON maintenance_tickets USING gin(to_tsvector('english', findings));

-- ============================================
-- STEP 2: Create ticket_estimations table
-- ============================================

CREATE TABLE IF NOT EXISTS public.ticket_estimations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  
  -- Assigned Technicians (snapshot)
  assigned_technicians JSONB DEFAULT '[]'::jsonb,
  
  -- RCA (snapshot)
  root_cause TEXT,
  findings TEXT,
  
  -- Materials
  materials JSONB DEFAULT '[]'::jsonb,
  material_cost_without_gst NUMERIC(10,2) DEFAULT 0,
  total_gst NUMERIC(10,2) DEFAULT 0,
  material_cost_with_gst NUMERIC(10,2) DEFAULT 0,
  
  -- Labor
  labor_hours NUMERIC(10,2) DEFAULT 0,
  labor_cost NUMERIC(10,2) DEFAULT 0,
  num_labourers INTEGER DEFAULT 0,
  work_hours NUMERIC(10,2) DEFAULT 0,
  labor_cost_per_hour NUMERIC(10,2) DEFAULT 0,
  
  -- Total
  total_cost NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  opex_code VARCHAR(50),
  
  -- Resolution Notes (complete snapshot)
  resolution_notes TEXT,
  
  -- Version & Status
  version INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'submitted',
  
  -- Rejection Info
  rejected_by VARCHAR(50),
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign Keys
  CONSTRAINT fk_ticket_estimations_ticket 
    FOREIGN KEY (ticket_id) REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_estimations_created_by 
    FOREIGN KEY (created_by) REFERENCES users(id),
    
  -- Constraints
  CONSTRAINT ticket_estimations_status_check CHECK (
    status IN ('submitted', 'manager_rejected', 'tenant_rejected', 'approved', 'change_requested')
  ),
  CONSTRAINT ticket_estimations_rejected_by_check CHECK (
    rejected_by IN ('Manager', 'Tenant')
  )
) TABLESPACE pg_default;

-- ============================================
-- STEP 3: Create indexes for ticket_estimations
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ticket_estimations_ticket_id 
  ON ticket_estimations(ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_estimations_status 
  ON ticket_estimations(status);

CREATE INDEX IF NOT EXISTS idx_ticket_estimations_version 
  ON ticket_estimations(ticket_id, version);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_estimations_active_unique 
  ON ticket_estimations(ticket_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_ticket_estimations_root_cause 
  ON ticket_estimations USING gin(to_tsvector('english', root_cause));

CREATE INDEX IF NOT EXISTS idx_ticket_estimations_findings 
  ON ticket_estimations USING gin(to_tsvector('english', findings));

-- ============================================
-- STEP 4: Enable RLS on ticket_estimations
-- ============================================

ALTER TABLE ticket_estimations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: Create RLS Policies
-- ============================================

-- POLICY 1: Admins have full access
CREATE POLICY "Admins have full access to ticket_estimations"
ON ticket_estimations
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Admin'
    AND users.is_active = true
  )
);

-- POLICY 2: Helpdesk can view and manage all estimations
CREATE POLICY "Helpdesk can view all ticket_estimations"
ON ticket_estimations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Helpdesk'
    AND users.is_active = true
  )
);

CREATE POLICY "Helpdesk can insert ticket_estimations"
ON ticket_estimations
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Helpdesk'
    AND users.is_active = true
  )
);

CREATE POLICY "Helpdesk can update ticket_estimations"
ON ticket_estimations
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Helpdesk'
    AND users.is_active = true
  )
);

-- POLICY 3: Managers can view and approve/reject estimations
CREATE POLICY "Managers can view all ticket_estimations"
ON ticket_estimations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Manager'
    AND users.is_active = true
  )
);

CREATE POLICY "Managers can update ticket_estimations for approval/rejection"
ON ticket_estimations
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Manager'
    AND users.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Manager'
    AND users.is_active = true
  )
);

-- POLICY 4: Tenants can view estimations for their tickets only
CREATE POLICY "Tenants can view their ticket_estimations"
ON ticket_estimations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM maintenance_tickets mt
    INNER JOIN users u ON u.tenant_id = mt.tenant_id
    WHERE mt.id = ticket_estimations.ticket_id
    AND u.id = current_setting('app.current_user_id', true)::uuid
    AND u.role = 'Tenant'
    AND u.is_active = true
  )
);

CREATE POLICY "Tenants can update their ticket_estimations for approval/rejection"
ON ticket_estimations
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM maintenance_tickets mt
    INNER JOIN users u ON u.tenant_id = mt.tenant_id
    WHERE mt.id = ticket_estimations.ticket_id
    AND u.id = current_setting('app.current_user_id', true)::uuid
    AND u.role = 'Tenant'
    AND u.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM maintenance_tickets mt
    INNER JOIN users u ON u.tenant_id = mt.tenant_id
    WHERE mt.id = ticket_estimations.ticket_id
    AND u.id = current_setting('app.current_user_id', true)::uuid
    AND u.role = 'Tenant'
    AND u.is_active = true
  )
);

-- POLICY 5: Technicians can view estimations for tickets assigned to them
CREATE POLICY "Technicians can view their assigned ticket_estimations"
ON ticket_estimations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = current_setting('app.current_user_id', true)::uuid
    AND users.role = 'Technician'
    AND users.is_active = true
    AND (
      -- Check if technician is in maintenance_tickets.assigned_technicians
      EXISTS (
        SELECT 1 FROM maintenance_tickets mt
        WHERE mt.id = ticket_estimations.ticket_id
        AND mt.assigned_technicians::jsonb @> jsonb_build_array(
          jsonb_build_object('id', users.id::text)
        )
      )
      OR
      -- Check if technician is in ticket_estimations.assigned_technicians
      ticket_estimations.assigned_technicians::jsonb @> jsonb_build_array(
        jsonb_build_object('id', users.id::text)
      )
    )
  )
);

-- POLICY 6: Users who created tickets can view estimations
CREATE POLICY "Ticket creators can view their ticket_estimations"
ON ticket_estimations
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM maintenance_tickets mt
    WHERE mt.id = ticket_estimations.ticket_id
    AND mt.created_by_user_id = current_setting('app.current_user_id', true)::uuid
  )
);

-- ============================================
-- STEP 6: Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON ticket_estimations TO public;

-- ============================================
-- STEP 7: Create helper function to set current user
-- ============================================

CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Add comments for documentation
-- ============================================

COMMENT ON TABLE ticket_estimations IS 'Stores all estimation versions with complete snapshots including materials, labor, technicians, and rejection history';

COMMENT ON COLUMN ticket_estimations.version IS 'Version number for tracking resubmissions (1, 2, 3...)';

COMMENT ON COLUMN ticket_estimations.is_active IS 'Only one active estimation per ticket. False = history';

COMMENT ON COLUMN ticket_estimations.status IS 'Estimation status: submitted, manager_rejected, tenant_rejected, approved, change_requested';

COMMENT ON COLUMN ticket_estimations.assigned_technicians IS 'Snapshot of technicians assigned at submission time';

COMMENT ON COLUMN ticket_estimations.root_cause IS 'Snapshot of RCA root cause at submission time';

COMMENT ON COLUMN ticket_estimations.findings IS 'Snapshot of RCA findings at submission time';

COMMENT ON COLUMN ticket_estimations.materials IS 'JSONB array of materials with quantity, rate, GST, total';

COMMENT ON COLUMN maintenance_tickets.root_cause IS 'Current root cause analysis';

COMMENT ON COLUMN maintenance_tickets.findings IS 'Current RCA findings';

-- ============================================
-- STEP 9: Verification
-- ============================================

-- Verify maintenance_tickets columns added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'maintenance_tickets' 
    AND column_name IN ('root_cause', 'findings')
  ) THEN
    RAISE NOTICE 'SUCCESS: maintenance_tickets columns added';
  ELSE
    RAISE EXCEPTION 'FAILED: maintenance_tickets columns not added';
  END IF;
END $$;

-- Verify ticket_estimations table created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ticket_estimations'
  ) THEN
    RAISE NOTICE 'SUCCESS: ticket_estimations table created';
  ELSE
    RAISE EXCEPTION 'FAILED: ticket_estimations table not created';
  END IF;
END $$;

-- Verify RLS enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'ticket_estimations' 
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE 'SUCCESS: RLS enabled on ticket_estimations';
  ELSE
    RAISE EXCEPTION 'FAILED: RLS not enabled on ticket_estimations';
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
