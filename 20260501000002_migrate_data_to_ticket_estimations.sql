-- ============================================
-- Migration: Transfer estimation data from maintenance_tickets to ticket_estimations
-- Created: 2026-05-01
-- Description: Parse resolution_notes and create estimation records with version tracking
-- ============================================

-- ============================================
-- STEP 1: Create temporary function to parse resolution_notes
-- ============================================

CREATE OR REPLACE FUNCTION parse_estimation_from_notes(
  p_ticket_id UUID,
  p_resolution_notes TEXT,
  p_assigned_technicians JSONB,
  p_cost NUMERIC,
  p_opex_code VARCHAR,
  p_created_by UUID,
  p_version INTEGER,
  p_status VARCHAR,
  p_rejected_by VARCHAR DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL,
  p_rejected_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_estimation_id UUID;
  v_root_cause TEXT;
  v_findings TEXT;
  v_materials_text TEXT;
  v_materials_jsonb JSONB := '[]'::jsonb;
  v_material_line TEXT;
  v_material_parts TEXT[];
  v_labor_hours NUMERIC := 0;
  v_labor_cost NUMERIC := 0;
  v_material_cost_without_gst NUMERIC := 0;
  v_total_gst NUMERIC := 0;
  v_material_cost_with_gst NUMERIC := 0;
  v_notes TEXT;
BEGIN
  -- Extract RCA
  v_root_cause := (regexp_match(p_resolution_notes, 'Root Cause: ([^\n]+)'))[1];
  v_findings := (regexp_match(p_resolution_notes, 'Findings: ([^\n]*)'))[1];
  
  -- Extract Materials Table
  IF p_resolution_notes LIKE '%Materials:%' AND p_resolution_notes NOT LIKE '%Materials: None%' THEN
    v_materials_text := substring(p_resolution_notes from 'Materials:[\n\r]+(.*?)[\n\r]+-{50,}');
    
    IF v_materials_text IS NOT NULL THEN
      FOR v_material_line IN 
        SELECT unnest(string_to_array(v_materials_text, E'\n'))
      LOOP
        v_material_line := trim(v_material_line);
        
        -- Skip header, separator lines, and empty lines
        IF v_material_line ~ '^[^|]+\|' 
           AND v_material_line NOT LIKE 'Item |%' 
           AND v_material_line NOT LIKE '-%' 
           AND length(v_material_line) > 0 THEN
          
          v_material_parts := string_to_array(v_material_line, '|');
          
          IF array_length(v_material_parts, 1) >= 6 THEN
            v_materials_jsonb := v_materials_jsonb || jsonb_build_object(
              'item', trim(v_material_parts[1]),
              'quantity', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[2]), '[^0-9.]', '', 'g'), '^\.$', '0', 'g')::NUMERIC, 0),
              'unit', CASE WHEN upper(trim(v_material_parts[2])) ~ 'NOS' THEN 'NOS' ELSE 'UNIT' END,
              'rate', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[3]), '[^0-9.]', '', 'g'), '^\.$', '0', 'g')::NUMERIC, 0),
              'gst_percentage', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[4]), '[^0-9.]', '', 'g'), '^\.$', '0', 'g')::NUMERIC, 0),
              'gst_amount', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[5]), '[^0-9.]', '', 'g'), '^\.$', '0', 'g')::NUMERIC, 0),
              'total', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[6]), '[^0-9.]', '', 'g'), '^\.$', '0', 'g')::NUMERIC, 0)
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
  END IF;
  
  -- Extract Labor
  v_labor_hours := COALESCE((regexp_match(p_resolution_notes, 'Labor Hours: ([0-9.]+)'))[1]::NUMERIC, 0);
  v_labor_cost := COALESCE((regexp_match(p_resolution_notes, 'Labor Cost: ₹([0-9,.]+)'))[1]::NUMERIC, 0);
  
  -- Extract Material Costs
  v_material_cost_without_gst := COALESCE((regexp_match(p_resolution_notes, 'Material Cost \(without GST\): ₹([0-9,.]+)'))[1]::NUMERIC, 0);
  v_total_gst := COALESCE((regexp_match(p_resolution_notes, 'Total GST: ₹([0-9,.]+)'))[1]::NUMERIC, 0);
  v_material_cost_with_gst := COALESCE((regexp_match(p_resolution_notes, 'Material Cost \(with GST\): ₹([0-9,.]+)'))[1]::NUMERIC, 0);
  
  -- Extract Notes
  v_notes := (regexp_match(p_resolution_notes, 'Notes: ([^\n]*)'))[1];
  
  -- Insert estimation
  INSERT INTO ticket_estimations (
    ticket_id,
    assigned_technicians,
    root_cause,
    findings,
    materials,
    material_cost_without_gst,
    total_gst,
    material_cost_with_gst,
    labor_hours,
    labor_cost,
    total_cost,
    notes,
    opex_code,
    resolution_notes,
    version,
    is_active,
    status,
    rejected_by,
    rejection_reason,
    rejected_at,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_ticket_id,
    p_assigned_technicians,
    v_root_cause,
    v_findings,
    v_materials_jsonb,
    v_material_cost_without_gst,
    v_total_gst,
    v_material_cost_with_gst,
    v_labor_hours,
    v_labor_cost,
    p_cost,
    v_notes,
    p_opex_code,
    p_resolution_notes,
    p_version,
    CASE WHEN p_version = 1 AND p_status != 'manager_rejected' AND p_status != 'tenant_rejected' THEN true ELSE false END,
    p_status,
    p_rejected_by,
    p_rejection_reason,
    p_rejected_at,
    p_created_by,
    NOW(),
    NOW()
  ) RETURNING id INTO v_estimation_id;
  
  RETURN v_estimation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Migrate current active estimations
-- ============================================

DO $$
DECLARE
  v_ticket RECORD;
  v_estimation_id UUID;
  v_status VARCHAR(50);
BEGIN
  FOR v_ticket IN 
    SELECT 
      id,
      resolution_notes,
      assigned_technicians,
      cost,
      opex_code,
      created_by_user_id,
      status,
      previous_submissions
    FROM maintenance_tickets
    WHERE resolution_notes IS NOT NULL 
      AND resolution_notes LIKE '%=== ESTIMATION ===%'
      AND status NOT IN ('pending', 'assigned', 'rca_added')
  LOOP
    -- Determine estimation status based on ticket status
    v_status := CASE 
      WHEN v_ticket.status IN ('pending_approval', 'pending_tenant_approval') THEN 'submitted'
      WHEN v_ticket.status = 'rejected' THEN 'manager_rejected'
      WHEN v_ticket.status = 'tenant_rejected' THEN 'tenant_rejected'
      WHEN v_ticket.status IN ('approved', 'work_started', 'in_progress', 'work_completed', 'resolved', 'closed') THEN 'approved'
      ELSE 'submitted'
    END;
    
    -- Create current estimation (version 1)
    v_estimation_id := parse_estimation_from_notes(
      v_ticket.id,
      v_ticket.resolution_notes,
      v_ticket.assigned_technicians,
      v_ticket.cost,
      v_ticket.opex_code,
      v_ticket.created_by_user_id,
      1, -- version
      v_status,
      NULL,
      NULL,
      NULL
    );
    
    RAISE NOTICE 'Created estimation % for ticket %', v_estimation_id, v_ticket.id;
  END LOOP;
END $$;

-- ============================================
-- STEP 3: Migrate previous submissions (history)
-- ============================================

DO $$
DECLARE
  v_ticket RECORD;
  v_submission JSONB;
  v_submission_array JSONB;
  v_estimation_id UUID;
  v_version INTEGER;
  v_status VARCHAR(50);
  v_rejected_by VARCHAR(50);
  v_rejection_reason TEXT;
  v_rejected_at TIMESTAMPTZ;
BEGIN
  FOR v_ticket IN 
    SELECT 
      id,
      previous_submissions,
      created_by_user_id
    FROM maintenance_tickets
    WHERE previous_submissions IS NOT NULL 
      AND previous_submissions != ''
      AND previous_submissions != 'null'
  LOOP
    BEGIN
      -- Parse previous_submissions JSON
      v_submission_array := v_ticket.previous_submissions::jsonb;
      
      -- Handle both array and single object
      IF jsonb_typeof(v_submission_array) != 'array' THEN
        v_submission_array := jsonb_build_array(v_submission_array);
      END IF;
      
      -- Process each submission
      v_version := 1;
      FOR v_submission IN SELECT * FROM jsonb_array_elements(v_submission_array)
      LOOP
        -- Determine status
        IF v_submission->>'rejected_by' = 'Manager' THEN
          v_status := 'manager_rejected';
          v_rejected_by := 'Manager';
          v_rejection_reason := v_submission->>'rejection_reason';
          v_rejected_at := (v_submission->>'rejected_at')::TIMESTAMPTZ;
        ELSIF v_submission->>'rejected_by' = 'Tenant' THEN
          v_status := 'tenant_rejected';
          v_rejected_by := 'Tenant';
          v_rejection_reason := v_submission->>'rejection_reason';
          v_rejected_at := (v_submission->>'rejected_at')::TIMESTAMPTZ;
        ELSIF v_submission->>'reopened_by' = 'Tenant' THEN
          v_status := 'approved';
          v_rejected_by := NULL;
          v_rejection_reason := NULL;
          v_rejected_at := NULL;
        ELSIF v_submission->>'change_requested_by' IS NOT NULL THEN
          v_status := 'change_requested';
          v_rejected_by := NULL;
          v_rejection_reason := NULL;
          v_rejected_at := NULL;
        ELSE
          v_status := 'approved';
          v_rejected_by := NULL;
          v_rejection_reason := NULL;
          v_rejected_at := NULL;
        END IF;
        
        -- Create estimation from previous submission
        IF v_submission->>'resolution_notes' IS NOT NULL AND v_submission->>'resolution_notes' LIKE '%=== ESTIMATION ===%' THEN
          v_estimation_id := parse_estimation_from_notes(
            v_ticket.id,
            v_submission->>'resolution_notes',
            COALESCE(v_submission->'technicians', '[]'::jsonb),
            COALESCE((v_submission->>'cost')::NUMERIC, (v_submission->>'estimation')::NUMERIC, 0),
            v_submission->>'opex_code',
            v_ticket.created_by_user_id,
            v_version,
            v_status,
            v_rejected_by,
            v_rejection_reason,
            v_rejected_at
          );
          
          RAISE NOTICE 'Created historical estimation % (version %) for ticket %', v_estimation_id, v_version, v_ticket.id;
          v_version := v_version + 1;
        END IF;
      END LOOP;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error processing ticket %: %', v_ticket.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
END $$;

-- ============================================
-- STEP 4: Update maintenance_tickets with root_cause and findings
-- ============================================

UPDATE maintenance_tickets
SET 
  root_cause = (regexp_match(resolution_notes, 'Root Cause: ([^\n]+)'))[1],
  findings = (regexp_match(resolution_notes, 'Findings: ([^\n]*)'))[1]
WHERE resolution_notes IS NOT NULL 
  AND resolution_notes LIKE '%=== RCA ===%';

-- ============================================
-- STEP 5: Drop temporary function
-- ============================================

DROP FUNCTION IF EXISTS parse_estimation_from_notes;

-- ============================================
-- STEP 6: Verification
-- ============================================

DO $$
DECLARE
  v_total_tickets INTEGER;
  v_total_estimations INTEGER;
  v_active_estimations INTEGER;
  v_historical_estimations INTEGER;
BEGIN
  -- Count tickets with estimations
  SELECT COUNT(*) INTO v_total_tickets
  FROM maintenance_tickets
  WHERE resolution_notes LIKE '%=== ESTIMATION ===%';
  
  -- Count total estimations created
  SELECT COUNT(*) INTO v_total_estimations
  FROM ticket_estimations;
  
  -- Count active estimations
  SELECT COUNT(*) INTO v_active_estimations
  FROM ticket_estimations
  WHERE is_active = true;
  
  -- Count historical estimations
  SELECT COUNT(*) INTO v_historical_estimations
  FROM ticket_estimations
  WHERE is_active = false;
  
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Tickets with estimations: %', v_total_tickets;
  RAISE NOTICE 'Total estimations created: %', v_total_estimations;
  RAISE NOTICE 'Active estimations: %', v_active_estimations;
  RAISE NOTICE 'Historical estimations: %', v_historical_estimations;
  
  IF v_total_estimations = 0 THEN
    RAISE WARNING 'No estimations were migrated!';
  END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
