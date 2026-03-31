-- One-time script to sync all building and floor names in existing agreements
-- Run this after creating the triggers to fix existing data

DO $$
DECLARE
  agreement_record RECORD;
  updated_assignments JSONB;
  assignment JSONB;
  building_name TEXT;
  floor_name TEXT;
BEGIN
  -- Loop through all agreements
  FOR agreement_record IN 
    SELECT id, space_assignments 
    FROM agreements 
    WHERE space_assignments IS NOT NULL AND jsonb_array_length(space_assignments) > 0
  LOOP
    updated_assignments := '[]'::jsonb;
    
    -- Loop through each space assignment
    FOR assignment IN 
      SELECT * FROM jsonb_array_elements(agreement_record.space_assignments)
    LOOP
      -- Get current building name
      SELECT name INTO building_name
      FROM buildings
      WHERE id = (assignment->>'building')::uuid;
      
      -- Get current floor name
      SELECT COALESCE(floor_name, 'Floor ' || floor_number) INTO floor_name
      FROM floors
      WHERE id = (assignment->>'floorId')::uuid;
      
      -- Update the assignment with current names
      IF building_name IS NOT NULL THEN
        assignment := jsonb_set(assignment, '{buildingName}', to_jsonb(building_name));
      END IF;
      
      IF floor_name IS NOT NULL THEN
        assignment := jsonb_set(assignment, '{floorName}', to_jsonb(floor_name));
      END IF;
      
      -- Add to updated assignments array
      updated_assignments := updated_assignments || jsonb_build_array(assignment);
    END LOOP;
    
    -- Update the agreement with corrected space assignments
    UPDATE agreements
    SET space_assignments = updated_assignments,
        updated_at = NOW()
    WHERE id = agreement_record.id;
    
    RAISE NOTICE 'Updated agreement: %', agreement_record.id;
  END LOOP;
  
  RAISE NOTICE 'Completed syncing building and floor names in all agreements';
END $$;

-- Verify the updates
SELECT 
  id,
  agreement_id,
  jsonb_pretty(space_assignments) as space_assignments
FROM agreements
WHERE space_assignments IS NOT NULL
LIMIT 5;
