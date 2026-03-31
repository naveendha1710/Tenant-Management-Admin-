-- Create PM Task Instances table for date-specific assignments
CREATE TABLE IF NOT EXISTS pm_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  pm_schedule_id UUID NOT NULL REFERENCES preventive_maintenance(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE,
  assignment_notes TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  audit_id UUID REFERENCES physical_audits(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  
  -- Unique constraint: one task per asset per date
  UNIQUE(asset_id, task_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_pm_task_instances_asset_id ON pm_task_instances(asset_id);
CREATE INDEX idx_pm_task_instances_task_date ON pm_task_instances(task_date);
CREATE INDEX idx_pm_task_instances_assigned_to ON pm_task_instances(assigned_to);
CREATE INDEX idx_pm_task_instances_status ON pm_task_instances(status);
CREATE INDEX idx_pm_task_instances_pm_schedule_id ON pm_task_instances(pm_schedule_id);

-- Add RLS policies
ALTER TABLE pm_task_instances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON pm_task_instances;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON pm_task_instances;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON pm_task_instances;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON pm_task_instances;

-- Create permissive policies
CREATE POLICY "Allow all for authenticated users" ON pm_task_instances
  FOR ALL USING (true) WITH CHECK (true);

-- Function to auto-generate PM task instances
CREATE OR REPLACE FUNCTION generate_pm_task_instances(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_pm RECORD;
  v_current_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Loop through all active PM schedules
  FOR v_pm IN 
    SELECT 
      pm.id as pm_schedule_id,
      pm.asset_id,
      pm.pm_next_date,
      pm.pm_frequency_days,
      pm.pm_end_date
    FROM preventive_maintenance pm
    WHERE pm.pm_enabled = true
      AND pm.pm_next_date IS NOT NULL
      AND pm.pm_next_date <= p_end_date
      AND (pm.pm_end_date IS NULL OR pm.pm_end_date >= p_start_date)
  LOOP
    -- Start from pm_next_date (which should be today or future)
    v_current_date := v_pm.pm_next_date;
    
    -- Only generate instances from today onwards, ignore past dates
    IF v_current_date < v_today THEN
      v_current_date := v_today;
    END IF;
    
    -- Generate instances for each PM date within the range
    WHILE v_current_date <= p_end_date AND 
          (v_pm.pm_end_date IS NULL OR v_current_date <= v_pm.pm_end_date)
    LOOP
      IF v_current_date >= p_start_date THEN
        -- Insert task instance if it doesn't exist
        INSERT INTO pm_task_instances (
          asset_id,
          pm_schedule_id,
          task_date,
          status
        )
        VALUES (
          v_pm.asset_id,
          v_pm.pm_schedule_id,
          v_current_date,
          CASE 
            WHEN v_current_date < v_today THEN 'OVERDUE'
            WHEN v_current_date = v_today THEN 'PENDING'
            ELSE 'UPCOMING'
          END
        )
        ON CONFLICT (asset_id, task_date) DO NOTHING;
        
        v_count := v_count + 1;
      END IF;
      
      -- Move to next PM date
      v_current_date := v_current_date + v_pm.pm_frequency_days;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate instances for the next 90 days
SELECT generate_pm_task_instances(CURRENT_DATE, (CURRENT_DATE + INTERVAL '90 days')::DATE);
