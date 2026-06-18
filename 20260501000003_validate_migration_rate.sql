-- ============================================
-- Validation: Test Migration Rate for ticket_estimations
-- Created: 2026-05-01
-- Description: Analyze migration success rate and identify failures
-- ============================================

-- ============================================
-- STEP 1: Overall Migration Statistics
-- ============================================

DO $$
DECLARE
  v_total_tickets INTEGER;
  v_tickets_with_estimation_text INTEGER;
  v_tickets_with_rca_text INTEGER;
  v_tickets_migrated INTEGER;
  v_tickets_with_history INTEGER;
  v_total_estimations INTEGER;
  v_active_estimations INTEGER;
  v_historical_estimations INTEGER;
  v_migration_rate NUMERIC;
BEGIN
  -- Total tickets
  SELECT COUNT(*) INTO v_total_tickets FROM maintenance_tickets;
  
  -- Tickets with estimation in resolution_notes
  SELECT COUNT(*) INTO v_tickets_with_estimation_text
  FROM maintenance_tickets
  WHERE resolution_notes LIKE '%=== ESTIMATION ===%';
  
  -- Tickets with RCA in resolution_notes
  SELECT COUNT(*) INTO v_tickets_with_rca_text
  FROM maintenance_tickets
  WHERE resolution_notes LIKE '%=== RCA ===%';
  
  -- Tickets that got migrated (have estimation records)
  SELECT COUNT(DISTINCT ticket_id) INTO v_tickets_migrated
  FROM ticket_estimations;
  
  -- Tickets with previous submissions
  SELECT COUNT(*) INTO v_tickets_with_history
  FROM maintenance_tickets
  WHERE previous_submissions IS NOT NULL 
    AND previous_submissions != ''
    AND previous_submissions != 'null';
  
  -- Total estimations created
  SELECT COUNT(*) INTO v_total_estimations FROM ticket_estimations;
  
  -- Active estimations
  SELECT COUNT(*) INTO v_active_estimations FROM ticket_estimations WHERE is_active = true;
  
  -- Historical estimations
  SELECT COUNT(*) INTO v_historical_estimations FROM ticket_estimations WHERE is_active = false;
  
  -- Calculate migration rate
  IF v_tickets_with_estimation_text > 0 THEN
    v_migration_rate := (v_tickets_migrated::NUMERIC / v_tickets_with_estimation_text::NUMERIC) * 100;
  ELSE
    v_migration_rate := 0;
  END IF;
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE '           MIGRATION STATISTICS REPORT                      ';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Total Tickets:                              %', v_total_tickets;
  RAISE NOTICE 'Tickets with Estimation Text:               %', v_tickets_with_estimation_text;
  RAISE NOTICE 'Tickets with RCA Text:                      %', v_tickets_with_rca_text;
  RAISE NOTICE 'Tickets with History (previous_submissions):%', v_tickets_with_history;
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'Tickets Successfully Migrated:              %', v_tickets_migrated;
  RAISE NOTICE 'Total Estimations Created:                  %', v_total_estimations;
  RAISE NOTICE 'Active Estimations:                         %', v_active_estimations;
  RAISE NOTICE 'Historical Estimations:                     %', v_historical_estimations;
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'MIGRATION RATE:                             %', ROUND(v_migration_rate, 2);
  RAISE NOTICE '============================================================';
END $$;

-- ============================================
-- STEP 2: Failed Migrations - Tickets NOT Migrated
-- ============================================

SELECT 
  '=== TICKETS WITH ESTIMATION TEXT BUT NOT MIGRATED ===' AS report_section;

SELECT 
  mt.id,
  mt.ticket_number,
  mt.title,
  mt.status,
  mt.cost,
  CASE 
    WHEN mt.resolution_notes IS NULL THEN 'No resolution_notes'
    WHEN mt.resolution_notes NOT LIKE '%=== ESTIMATION ===%' THEN 'No estimation section'
    WHEN mt.resolution_notes NOT LIKE '%Root Cause:%' THEN 'No RCA'
    ELSE 'Unknown reason'
  END AS failure_reason,
  LENGTH(mt.resolution_notes) AS notes_length
FROM maintenance_tickets mt
WHERE mt.resolution_notes LIKE '%=== ESTIMATION ===%'
  AND NOT EXISTS (
    SELECT 1 FROM ticket_estimations te WHERE te.ticket_id = mt.id
  )
ORDER BY mt.created_at DESC
LIMIT 20;

-- ============================================
-- STEP 3: Partial Migrations - Missing Data
-- ============================================

SELECT 
  '=== ESTIMATIONS WITH MISSING DATA ===' AS report_section;

SELECT 
  te.id AS estimation_id,
  mt.ticket_number,
  te.version,
  te.status,
  CASE WHEN te.root_cause IS NULL THEN 'Missing RCA' ELSE 'Has RCA' END AS rca_status,
  CASE WHEN te.total_cost = 0 THEN 'Zero Cost' ELSE 'Has Cost' END AS cost_status,
  CASE WHEN te.assigned_technicians = '[]'::jsonb THEN 'No Technicians' ELSE 'Has Technicians' END AS tech_status,
  te.total_cost,
  te.labor_hours,
  te.material_cost_with_gst
FROM ticket_estimations te
JOIN maintenance_tickets mt ON mt.id = te.ticket_id
WHERE te.root_cause IS NULL 
   OR te.total_cost = 0
   OR te.assigned_technicians = '[]'::jsonb
ORDER BY te.created_at DESC
LIMIT 20;

-- ============================================
-- STEP 4: Version Tracking Validation
-- ============================================

SELECT 
  '=== VERSION TRACKING VALIDATION ===' AS report_section;

SELECT 
  mt.ticket_number,
  mt.status AS ticket_status,
  COUNT(te.id) AS total_versions,
  COUNT(CASE WHEN te.is_active = true THEN 1 END) AS active_versions,
  COUNT(CASE WHEN te.status = 'manager_rejected' THEN 1 END) AS manager_rejections,
  COUNT(CASE WHEN te.status = 'tenant_rejected' THEN 1 END) AS tenant_rejections,
  COUNT(CASE WHEN te.status = 'change_requested' THEN 1 END) AS change_requests,
  STRING_AGG(te.version::TEXT || ':' || te.status, ', ' ORDER BY te.version) AS version_flow
FROM maintenance_tickets mt
JOIN ticket_estimations te ON te.ticket_id = mt.id
GROUP BY mt.id, mt.ticket_number, mt.status
HAVING COUNT(te.id) > 1
ORDER BY COUNT(te.id) DESC
LIMIT 20;

-- ============================================
-- STEP 5: Data Quality Issues
-- ============================================

SELECT 
  '=== DATA QUALITY ISSUES ===' AS report_section;

SELECT 
  'Estimations with NULL root_cause' AS issue,
  COUNT(*) AS count
FROM ticket_estimations
WHERE root_cause IS NULL

UNION ALL

SELECT 
  'Estimations with zero cost' AS issue,
  COUNT(*) AS count
FROM ticket_estimations
WHERE total_cost = 0

UNION ALL

SELECT 
  'Estimations with no technicians' AS issue,
  COUNT(*) AS count
FROM ticket_estimations
WHERE assigned_technicians = '[]'::jsonb

UNION ALL

SELECT 
  'Tickets with multiple active estimations' AS issue,
  COUNT(*) AS count
FROM (
  SELECT ticket_id
  FROM ticket_estimations
  WHERE is_active = true
  GROUP BY ticket_id
  HAVING COUNT(*) > 1
) AS multi_active

UNION ALL

SELECT 
  'Tickets with no active estimation' AS issue,
  COUNT(DISTINCT mt.id) AS count
FROM maintenance_tickets mt
JOIN ticket_estimations te ON te.ticket_id = mt.id
WHERE mt.status IN ('approved', 'work_started', 'work_completed', 'resolved')
  AND NOT EXISTS (
    SELECT 1 FROM ticket_estimations te2 
    WHERE te2.ticket_id = mt.id AND te2.is_active = true
  );

-- ============================================
-- STEP 6: Sample Successful Migrations
-- ============================================

SELECT 
  '=== SAMPLE SUCCESSFUL MIGRATIONS ===' AS report_section;

SELECT 
  mt.ticket_number,
  mt.title,
  mt.status AS ticket_status,
  te.version,
  te.status AS estimation_status,
  te.is_active,
  te.total_cost,
  te.labor_hours,
  te.material_cost_with_gst,
  CASE WHEN te.root_cause IS NOT NULL THEN 'Yes' ELSE 'No' END AS has_rca,
  jsonb_array_length(te.assigned_technicians) AS tech_count
FROM maintenance_tickets mt
JOIN ticket_estimations te ON te.ticket_id = mt.id
WHERE te.root_cause IS NOT NULL
  AND te.total_cost > 0
  AND te.assigned_technicians != '[]'::jsonb
ORDER BY te.created_at DESC
LIMIT 10;

-- ============================================
-- STEP 7: Previous Submissions Migration Rate
-- ============================================

SELECT 
  '=== PREVIOUS SUBMISSIONS MIGRATION ===' AS report_section;

WITH history_tickets AS (
  SELECT 
    id,
    ticket_number,
    previous_submissions,
    CASE 
      WHEN previous_submissions IS NULL OR previous_submissions = '' OR previous_submissions = 'null' THEN 0
      WHEN previous_submissions::text LIKE '[%' THEN jsonb_array_length(previous_submissions::jsonb)
      ELSE 1
    END AS expected_versions
  FROM maintenance_tickets
  WHERE previous_submissions IS NOT NULL 
    AND previous_submissions != ''
    AND previous_submissions != 'null'
),
actual_versions AS (
  SELECT 
    ticket_id,
    COUNT(*) AS actual_count
  FROM ticket_estimations
  WHERE is_active = false
  GROUP BY ticket_id
)
SELECT 
  ht.ticket_number,
  ht.expected_versions,
  COALESCE(av.actual_count, 0) AS actual_versions,
  CASE 
    WHEN COALESCE(av.actual_count, 0) = ht.expected_versions THEN '✓ Match'
    WHEN COALESCE(av.actual_count, 0) < ht.expected_versions THEN '✗ Missing'
    ELSE '? Extra'
  END AS status
FROM history_tickets ht
LEFT JOIN actual_versions av ON av.ticket_id = ht.id
ORDER BY ht.expected_versions DESC
LIMIT 20;

-- ============================================
-- STEP 8: Export Failed Tickets for Manual Review
-- ============================================

SELECT 
  '=== FAILED TICKETS FOR MANUAL REVIEW ===' AS report_section;

SELECT 
  mt.id,
  mt.ticket_number,
  mt.title,
  mt.status,
  mt.cost,
  mt.created_at,
  SUBSTRING(mt.resolution_notes, 1, 100) AS notes_preview,
  CASE 
    WHEN mt.resolution_notes IS NULL THEN 'NULL resolution_notes'
    WHEN mt.resolution_notes NOT LIKE '%=== ESTIMATION ===%' THEN 'No ESTIMATION section'
    WHEN mt.resolution_notes NOT LIKE '%Root Cause:%' THEN 'No Root Cause'
    WHEN mt.resolution_notes NOT LIKE '%Labor Hours:%' THEN 'No Labor Hours'
    WHEN mt.resolution_notes NOT LIKE '%Total:%' THEN 'No Total'
    ELSE 'Parse error'
  END AS failure_reason
FROM maintenance_tickets mt
WHERE mt.resolution_notes LIKE '%=== ESTIMATION ===%'
  AND NOT EXISTS (
    SELECT 1 FROM ticket_estimations te WHERE te.ticket_id = mt.id
  )
ORDER BY mt.created_at DESC;

-- ============================================
-- VALIDATION COMPLETE
-- ============================================
