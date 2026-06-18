-- Migration script to move estimation data from maintenance_tickets to ticket_estimations table
-- This script will:
-- 1. Parse resolution_notes to extract materials, costs, RCA
-- 2. Handle previous_submissions to create version history
-- 3. Migrate all tickets that have estimation data

-- Create a temporary function to parse materials from resolution_notes
CREATE OR REPLACE FUNCTION parse_materials_from_notes(resolution_notes TEXT)
RETURNS JSONB AS $$
DECLARE
    materials_section TEXT;
    material_lines TEXT[];
    material_line TEXT;
    materials JSONB := '[]'::JSONB;
    material_obj JSONB;
    parts TEXT[];
BEGIN
    -- Extract materials section between dashes
    materials_section := substring(resolution_notes from '------------------------------------------------------------\n(.*?)\n------------------------------------------------------------');
    
    IF materials_section IS NULL OR materials_section = '' THEN
        RETURN '[]'::JSONB;
    END IF;
    
    -- Split by newlines
    material_lines := string_to_array(materials_section, E'\n');
    
    -- Parse each line
    FOREACH material_line IN ARRAY material_lines
    LOOP
        IF material_line IS NOT NULL AND material_line != '' THEN
            -- Split by ' | '
            parts := string_to_array(material_line, ' | ');
            
            IF array_length(parts, 1) >= 6 THEN
                material_obj := jsonb_build_object(
                    'item', parts[1],
                    'quantity', COALESCE(NULLIF(regexp_replace(split_part(parts[2], ' ', 1), '[^0-9.]', '', 'g'), ''), '0')::NUMERIC,
                    'unit', COALESCE(split_part(parts[2], ' ', 2), 'Nos'),
                    'rate', COALESCE(NULLIF(regexp_replace(parts[3], '[^0-9.]', '', 'g'), ''), '0')::NUMERIC,
                    'gst_percentage', COALESCE(NULLIF(regexp_replace(parts[4], '[^0-9.]', '', 'g'), ''), '0')::NUMERIC
                );
                materials := materials || material_obj;
            END IF;
        END IF;
    END LOOP;
    
    RETURN materials;
END;
$$ LANGUAGE plpgsql;

-- Create a temporary function to extract cost values
CREATE OR REPLACE FUNCTION extract_cost_value(resolution_notes TEXT, pattern TEXT)
RETURNS NUMERIC AS $$
DECLARE
    match_text TEXT;
BEGIN
    match_text := substring(resolution_notes from pattern);
    IF match_text IS NULL THEN
        RETURN 0;
    END IF;
    RETURN COALESCE(NULLIF(regexp_replace(match_text, '[^0-9.]', '', 'g'), ''), '0')::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- Create a temporary function to extract RCA
CREATE OR REPLACE FUNCTION extract_rca(resolution_notes TEXT, field TEXT)
RETURNS TEXT AS $$
DECLARE
    rca_section TEXT;
    result TEXT;
BEGIN
    rca_section := substring(resolution_notes from '=== RCA ===(.*?)(?:===|$)');
    IF rca_section IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF field = 'root_cause' THEN
        result := substring(rca_section from 'Root Cause:\s*([^\n]+)');
    ELSIF field = 'findings' THEN
        result := substring(rca_section from 'Findings:\s*([^\n]+)');
    END IF;
    
    RETURN NULLIF(trim(result), '');
END;
$$ LANGUAGE plpgsql;

-- Create a temporary function to extract notes
CREATE OR REPLACE FUNCTION extract_notes(resolution_notes TEXT)
RETURNS TEXT AS $$
DECLARE
    notes_text TEXT;
BEGIN
    notes_text := substring(resolution_notes from 'Notes:\s*(.+)$');
    RETURN NULLIF(trim(notes_text), '');
END;
$$ LANGUAGE plpgsql;

-- Main migration logic
DO $$
DECLARE
    ticket_record RECORD;
    prev_submissions JSONB;
    prev_submission JSONB;
    version_num INT;
    materials JSONB;
    material_cost_without_gst NUMERIC;
    total_gst NUMERIC;
    material_cost_with_gst NUMERIC;
    labor_hours NUMERIC;
    labor_cost NUMERIC;
    total_cost NUMERIC;
    root_cause_text TEXT;
    findings_text TEXT;
    notes_text TEXT;
    estimation_status TEXT;
    rejected_by TEXT;
    rejection_reason_text TEXT;
    rejected_at_time TIMESTAMPTZ;
    -- Migration statistics
    total_tickets_processed INT := 0;
    total_tickets_migrated INT := 0;
    total_empty_estimations INT := 0;
    total_failed INT := 0;
    total_versions_created INT := 0;
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Starting Estimation Migration';
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';
    
    -- Loop through all tickets that have estimation data
    FOR ticket_record IN 
        SELECT * FROM maintenance_tickets 
        WHERE resolution_notes IS NOT NULL 
        AND (resolution_notes LIKE '%=== ESTIMATION ===%' OR resolution_notes LIKE '%=== RCA ===%')
        ORDER BY created_at ASC
    LOOP
        total_tickets_processed := total_tickets_processed + 1;
        
        BEGIN
            RAISE NOTICE 'Processing ticket [%/%]: %', total_tickets_processed, (SELECT COUNT(*) FROM maintenance_tickets WHERE resolution_notes IS NOT NULL AND (resolution_notes LIKE '%=== ESTIMATION ===%' OR resolution_notes LIKE '%=== RCA ===%')), ticket_record.ticket_number;
            
            -- First, handle previous_submissions if they exist
            version_num := 1;
            
            IF ticket_record.previous_submissions IS NOT NULL AND ticket_record.previous_submissions::TEXT != 'null' THEN
                BEGIN
                    prev_submissions := ticket_record.previous_submissions::JSONB;
                    
                    -- Check if it's an array
                    IF jsonb_typeof(prev_submissions) = 'array' THEN
                        -- Loop through each previous submission
                        FOR prev_submission IN SELECT * FROM jsonb_array_elements(prev_submissions)
                        LOOP
                            -- Determine status for this version
                            estimation_status := 'manager_rejected'; -- Default for previous submissions
                            rejected_by := NULL;
                            rejection_reason_text := NULL;
                            rejected_at_time := NULL;
                            
                            IF prev_submission->>'reopened_by' IS NOT NULL THEN
                                estimation_status := 'reopened';
                            ELSIF prev_submission->>'rejected_by' = 'Manager' THEN
                                estimation_status := 'manager_rejected';
                                rejected_by := 'Manager';
                                rejected_at_time := (prev_submission->>'rejected_at')::TIMESTAMPTZ;
                            ELSIF prev_submission->>'rejected_by' = 'Tenant' THEN
                                estimation_status := 'tenant_rejected';
                                rejected_by := 'Tenant';
                                rejected_at_time := (prev_submission->>'rejected_at')::TIMESTAMPTZ;
                            END IF;
                            
                            -- Parse resolution_notes from previous submission if available
                            IF prev_submission->>'resolution_notes' IS NOT NULL THEN
                                materials := parse_materials_from_notes(prev_submission->>'resolution_notes');
                                material_cost_without_gst := extract_cost_value(prev_submission->>'resolution_notes', 'Material Cost \(without GST\):\s*₹([0-9,.]+)');
                                total_gst := extract_cost_value(prev_submission->>'resolution_notes', 'Total GST:\s*₹([0-9,.]+)');
                                material_cost_with_gst := extract_cost_value(prev_submission->>'resolution_notes', 'Material Cost \(with GST\):\s*₹([0-9,.]+)');
                                labor_hours := extract_cost_value(prev_submission->>'resolution_notes', 'Labor Hours:\s*([0-9.]+)');
                                labor_cost := extract_cost_value(prev_submission->>'resolution_notes', 'Labor Cost:\s*₹([0-9,.]+)');
                                total_cost := extract_cost_value(prev_submission->>'resolution_notes', 'Total:\s*₹([0-9,.]+)');
                                root_cause_text := extract_rca(prev_submission->>'resolution_notes', 'root_cause');
                                findings_text := extract_rca(prev_submission->>'resolution_notes', 'findings');
                                notes_text := extract_notes(prev_submission->>'resolution_notes');
                            ELSE
                                materials := '[]'::JSONB;
                                material_cost_without_gst := 0;
                                total_gst := 0;
                                material_cost_with_gst := 0;
                                labor_hours := 0;
                                labor_cost := 0;
                                total_cost := COALESCE((prev_submission->>'cost')::NUMERIC, 0);
                                root_cause_text := NULL;
                                findings_text := NULL;
                                notes_text := NULL;
                            END IF;
                            
                            -- Insert previous version
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
                                ticket_record.id,
                                COALESCE((prev_submission->>'technicians')::JSONB, '[]'::JSONB),
                                root_cause_text,
                                findings_text,
                                materials,
                                material_cost_without_gst,
                                total_gst,
                                material_cost_with_gst,
                                labor_hours,
                                labor_cost,
                                total_cost,
                                notes_text,
                                prev_submission->>'opex_code',
                                version_num,
                                false, -- Previous versions are not active
                                estimation_status,
                                rejected_by,
                                rejection_reason_text,
                                rejected_at_time,
                                ticket_record.created_by_user_id,
                                COALESCE((prev_submission->>'reopened_at')::TIMESTAMPTZ, (prev_submission->>'rejected_at')::TIMESTAMPTZ, ticket_record.created_at),
                                COALESCE((prev_submission->>'reopened_at')::TIMESTAMPTZ, (prev_submission->>'rejected_at')::TIMESTAMPTZ, ticket_record.updated_at)
                            );
                            
                            total_versions_created := total_versions_created + 1;
                            version_num := version_num + 1;
                        END LOOP;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE '  ⚠ Warning: Error parsing previous_submissions for ticket %: %', ticket_record.ticket_number, SQLERRM;
                END;
            END IF;
            
            -- Now insert the current/active estimation
            -- Parse current resolution_notes
            materials := parse_materials_from_notes(ticket_record.resolution_notes);
            material_cost_without_gst := extract_cost_value(ticket_record.resolution_notes, 'Material Cost \(without GST\):\s*₹([0-9,.]+)');
            total_gst := extract_cost_value(ticket_record.resolution_notes, 'Total GST:\s*₹([0-9,.]+)');
            material_cost_with_gst := extract_cost_value(ticket_record.resolution_notes, 'Material Cost \(with GST\):\s*₹([0-9,.]+)');
            labor_hours := extract_cost_value(ticket_record.resolution_notes, 'Labor Hours:\s*([0-9.]+)');
            labor_cost := extract_cost_value(ticket_record.resolution_notes, 'Labor Cost:\s*₹([0-9,.]+)');
            total_cost := extract_cost_value(ticket_record.resolution_notes, 'Total:\s*₹([0-9,.]+)');
            
            -- Use root_cause and findings from maintenance_tickets columns first, fallback to parsing
            root_cause_text := COALESCE(ticket_record.root_cause, extract_rca(ticket_record.resolution_notes, 'root_cause'));
            findings_text := COALESCE(ticket_record.findings, extract_rca(ticket_record.resolution_notes, 'findings'));
            notes_text := extract_notes(ticket_record.resolution_notes);
            
            -- Check if estimation is empty (no materials, no costs, no RCA)
            IF (materials = '[]'::JSONB OR materials IS NULL) 
               AND COALESCE(total_cost, 0) = 0 
               AND root_cause_text IS NULL 
               AND findings_text IS NULL THEN
                total_empty_estimations := total_empty_estimations + 1;
                RAISE NOTICE '  ℹ Empty estimation detected for ticket %', ticket_record.ticket_number;
            END IF;
            
            -- Determine status based on ticket status
            CASE ticket_record.status
                WHEN 'resolved', 'closed', 'approved', 'work_started', 'work_completed' THEN
                    estimation_status := 'approved';
                WHEN 'pending_approval' THEN
                    estimation_status := 'submitted';
                WHEN 'rejected' THEN
                    estimation_status := 'manager_rejected';
                    rejected_by := 'Manager';
                    rejection_reason_text := ticket_record.rejection_reason;
                WHEN 'tenant_rejected' THEN
                    estimation_status := 'tenant_rejected';
                    rejected_by := 'Tenant';
                    rejection_reason_text := ticket_record.rejection_reason;
                WHEN 'reopened' THEN
                    estimation_status := 'reopened';
                ELSE
                    estimation_status := 'submitted';
            END CASE;
            
            -- Insert current/active estimation
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
                ticket_record.id,
                COALESCE(ticket_record.assigned_technicians, '[]'::JSONB),
                root_cause_text,
                findings_text,
                materials,
                material_cost_without_gst,
                total_gst,
                material_cost_with_gst,
                labor_hours,
                labor_cost,
                COALESCE(total_cost, ticket_record.cost, 0),
                notes_text,
                ticket_record.opex_code,
                version_num,
                true, -- Current version is active
                estimation_status,
                CASE 
                    WHEN ticket_record.status IN ('rejected', 'tenant_rejected') THEN rejected_by
                    ELSE NULL
                END,
                CASE 
                    WHEN ticket_record.status IN ('rejected', 'tenant_rejected') THEN rejection_reason_text
                    ELSE NULL
                END,
                CASE 
                    WHEN ticket_record.status IN ('rejected', 'tenant_rejected') THEN ticket_record.updated_at
                    ELSE NULL
                END,
                ticket_record.created_by_user_id,
                ticket_record.created_at,
                ticket_record.updated_at
            );
            
            total_versions_created := total_versions_created + 1;
            total_tickets_migrated := total_tickets_migrated + 1;
            RAISE NOTICE '  ✓ Successfully migrated ticket % with % version(s)', ticket_record.ticket_number, version_num;
            
        EXCEPTION WHEN OTHERS THEN
            total_failed := total_failed + 1;
            RAISE NOTICE '  ✗ Failed to migrate ticket %: %', ticket_record.ticket_number, SQLERRM;
        END;
    END LOOP;
    
    -- Print migration summary
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Total Tickets Processed:      %', total_tickets_processed;
    RAISE NOTICE 'Total Tickets Migrated:       % (%.2f%%)', total_tickets_migrated, 
        CASE WHEN total_tickets_processed > 0 THEN (total_tickets_migrated::NUMERIC / total_tickets_processed * 100) ELSE 0 END;
    RAISE NOTICE 'Total Empty Estimations:      %', total_empty_estimations;
    RAISE NOTICE 'Total Failed:                 %', total_failed;
    RAISE NOTICE 'Total Versions Created:       %', total_versions_created;
    RAISE NOTICE 'Success Rate:                 %.2f%%', 
        CASE WHEN total_tickets_processed > 0 THEN ((total_tickets_processed - total_failed)::NUMERIC / total_tickets_processed * 100) ELSE 0 END;
    RAISE NOTICE '=========================================';
    RAISE NOTICE '';
    
    IF total_failed = 0 THEN
        RAISE NOTICE '✓ Migration completed successfully!';
    ELSE
        RAISE NOTICE '⚠ Migration completed with % error(s). Please review the logs above.', total_failed;
    END IF;
END $$;

-- Drop temporary functions
DROP FUNCTION IF EXISTS parse_materials_from_notes(TEXT);
DROP FUNCTION IF EXISTS extract_cost_value(TEXT, TEXT);
DROP FUNCTION IF EXISTS extract_rca(TEXT, TEXT);
DROP FUNCTION IF EXISTS extract_notes(TEXT);

-- Verification queries
SELECT 
    COUNT(*) as total_tickets_with_estimations,
    COUNT(DISTINCT ticket_id) as unique_tickets
FROM ticket_estimations;

SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM ticket_estimations
GROUP BY status
ORDER BY count DESC;

SELECT 
    ticket_id,
    COUNT(*) as version_count,
    MAX(version) as max_version
FROM ticket_estimations
GROUP BY ticket_id
HAVING COUNT(*) > 1
ORDER BY version_count DESC
LIMIT 10;
