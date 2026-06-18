-- ============================================
-- Migration: Parse and migrate materials from resolution_notes to ticket_estimations
-- Created: 2026-05-01
-- Description: Extract materials table from resolution_notes and update ticket_estimations
-- ============================================

DO $$
DECLARE
  v_estimation RECORD;
  v_materials_text TEXT;
  v_materials_jsonb JSONB := '[]'::jsonb;
  v_material_line TEXT;
  v_material_parts TEXT[];
  v_updated_count INTEGER := 0;
BEGIN
  FOR v_estimation IN 
    SELECT id, resolution_notes
    FROM ticket_estimations
    WHERE resolution_notes IS NOT NULL 
      AND resolution_notes LIKE '%Materials:%'
      AND (materials IS NULL OR materials = '[]'::jsonb)
  LOOP
    v_materials_jsonb := '[]'::jsonb;
    
    -- Extract Materials Table
    IF v_estimation.resolution_notes LIKE '%Materials:%' AND v_estimation.resolution_notes NOT LIKE '%Materials: None%' THEN
      v_materials_text := substring(v_estimation.resolution_notes from 'Materials:[\n\r]+(.*?)[\n\r]+-{50,}');
      
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
                'quantity', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[2]), '[^0-9.]', '', 'g'), '^\\.$', '0', 'g')::NUMERIC, 0),
                'unit', CASE WHEN upper(trim(v_material_parts[2])) ~ 'NOS' THEN 'NOS' ELSE 'UNIT' END,
                'rate', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[3]), '[^0-9.]', '', 'g'), '^\\.$', '0', 'g')::NUMERIC, 0),
                'gst_percentage', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[4]), '[^0-9.]', '', 'g'), '^\\.$', '0', 'g')::NUMERIC, 0),
                'gst_amount', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[5]), '[^0-9.]', '', 'g'), '^\\.$', '0', 'g')::NUMERIC, 0),
                'total', COALESCE(regexp_replace(regexp_replace(trim(v_material_parts[6]), '[^0-9.]', '', 'g'), '^\\.$', '0', 'g')::NUMERIC, 0)
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
    
    -- Update estimation with parsed materials
    IF jsonb_array_length(v_materials_jsonb) > 0 THEN
      UPDATE ticket_estimations
      SET materials = v_materials_jsonb,
          updated_at = NOW()
      WHERE id = v_estimation.id;
      
      v_updated_count := v_updated_count + 1;
      RAISE NOTICE 'Updated estimation % with % materials', v_estimation.id, jsonb_array_length(v_materials_jsonb);
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== MATERIALS MIGRATION COMPLETE ===';
  RAISE NOTICE 'Total estimations updated: %', v_updated_count;
END $$;
