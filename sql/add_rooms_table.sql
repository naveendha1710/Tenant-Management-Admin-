-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  floor_id UUID NULL,
  building_id UUID NULL,
  room_number VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id),
  CONSTRAINT fk_rooms_floor FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
  CONSTRAINT fk_rooms_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON public.rooms USING btree (floor_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms USING btree (building_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_rooms_category_id ON public.rooms USING btree (category_id) TABLESPACE pg_default;

-- Prevent duplicate room numbers on the same floor, ignoring case/spacing differences.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_floor_room_number_unique
  ON public.rooms USING btree (floor_id, lower(btrim(room_number)))
  WHERE floor_id IS NOT NULL AND room_number IS NOT NULL;

-- Add RLS policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON rooms
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON rooms
  FOR DELETE USING (true);
