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
    v_materials_text := substring(v_estimation.resolution_notes from 'Materials:\n(.*?)\n-{50,}');
    
    IF v_materials_text IS NOT NULL THEN
      FOR v_material_line IN 
        SELECT unnest(string_to_array(v_materials_text, E'\n'))
      LOOP
        -- Skip header row and empty lines
        IF v_material_line ~ '^[^|]+\|' AND v_material_line NOT LIKE 'Item |%' THEN
          v_material_parts := string_to_array(v_material_line, '|');
          
          IF array_length(v_material_parts, 1) >= 6 THEN
            v_materials_jsonb := v_materials_jsonb || jsonb_build_object(
              'item', trim(v_material_parts[1]),
              'quantity', regexp_replace(trim(v_material_parts[2]), '[^0-9.]', '', 'g')::NUMERIC,
              'unit', CASE WHEN trim(v_material_parts[2]) ~ 'NOS' THEN 'NOS' ELSE 'UNIT' END,
              'rate', regexp_replace(trim(v_material_parts[3]), '[^0-9.]', '', 'g')::NUMERIC,
              'gst_percentage', regexp_replace(trim(v_material_parts[4]), '[^0-9.]', '', 'g')::NUMERIC,
              'gst_amount', regexp_replace(trim(v_material_parts[5]), '[^0-9.]', '', 'g')::NUMERIC,
              'total', regexp_replace(trim(v_material_parts[6]), '[^0-9.]', '', 'g')::NUMERIC
            );
          END IF;
        END IF;
      END LOOP;
      
      -- Update estimation with parsed materials
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
