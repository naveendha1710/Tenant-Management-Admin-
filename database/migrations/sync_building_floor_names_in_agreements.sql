-- Function to update building names in space_assignments when building name changes
CREATE OR REPLACE FUNCTION update_building_names_in_agreements()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all agreements that reference this building
  UPDATE agreements
  SET space_assignments = (
    SELECT jsonb_agg(
      CASE 
        WHEN assignment->>'building' = NEW.id::text 
        THEN jsonb_set(assignment, '{buildingName}', to_jsonb(NEW.name))
        ELSE assignment
      END
    )
    FROM jsonb_array_elements(space_assignments) AS assignment
  ),
  updated_at = NOW()
  WHERE space_assignments::text LIKE '%' || NEW.id::text || '%';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on buildings table
DROP TRIGGER IF EXISTS trigger_update_building_names ON buildings;
CREATE TRIGGER trigger_update_building_names
AFTER UPDATE OF name ON buildings
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION update_building_names_in_agreements();

-- Function to update floor names in space_assignments when floor name changes
CREATE OR REPLACE FUNCTION update_floor_names_in_agreements()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all agreements that reference this floor
  UPDATE agreements
  SET space_assignments = (
    SELECT jsonb_agg(
      CASE 
        WHEN assignment->>'floorId' = NEW.id::text 
        THEN jsonb_set(assignment, '{floorName}', to_jsonb(COALESCE(NEW.floor_name, 'Floor ' || NEW.floor_number)))
        ELSE assignment
      END
    )
    FROM jsonb_array_elements(space_assignments) AS assignment
  ),
  updated_at = NOW()
  WHERE space_assignments::text LIKE '%' || NEW.id::text || '%';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on floors table
DROP TRIGGER IF EXISTS trigger_update_floor_names ON floors;
CREATE TRIGGER trigger_update_floor_names
AFTER UPDATE OF floor_name, floor_number ON floors
FOR EACH ROW
WHEN (OLD.floor_name IS DISTINCT FROM NEW.floor_name OR OLD.floor_number IS DISTINCT FROM NEW.floor_number)
EXECUTE FUNCTION update_floor_names_in_agreements();

-- Function to update room names in space_assignments when room name changes
CREATE OR REPLACE FUNCTION update_room_names_in_agreements()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all agreements that reference this room
  UPDATE agreements
  SET space_assignments = (
    SELECT jsonb_agg(
      CASE 
        WHEN assignment->>'roomId' = NEW.id::text 
        THEN jsonb_set(assignment, '{roomName}', to_jsonb(NEW.room_number))
        ELSE assignment
      END
    )
    FROM jsonb_array_elements(space_assignments) AS assignment
  ),
  updated_at = NOW()
  WHERE space_assignments::text LIKE '%' || NEW.id::text || '%';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on rooms table
DROP TRIGGER IF EXISTS trigger_update_room_names ON rooms;
CREATE TRIGGER trigger_update_room_names
AFTER UPDATE OF room_number ON rooms
FOR EACH ROW
WHEN (OLD.room_number IS DISTINCT FROM NEW.room_number)
EXECUTE FUNCTION update_room_names_in_agreements();

COMMENT ON FUNCTION update_building_names_in_agreements() IS 'Automatically updates building names in space_assignments JSONB when building name changes';
COMMENT ON FUNCTION update_floor_names_in_agreements() IS 'Automatically updates floor names in space_assignments JSONB when floor name changes';
COMMENT ON FUNCTION update_room_names_in_agreements() IS 'Automatically updates room names in space_assignments JSONB when room number changes';
