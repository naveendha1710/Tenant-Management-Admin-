DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rooms_floor_id_room_number_key'
  ) THEN
    ALTER TABLE rooms
      ADD CONSTRAINT rooms_floor_id_room_number_key UNIQUE (floor_id, room_number);
  END IF;
END $$;
