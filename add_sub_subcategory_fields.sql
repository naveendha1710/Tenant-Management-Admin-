-- Create table for sub-subcategory attribute combinations (matrix)
-- This stores each unique combination of color, material, and size as a single record

CREATE TABLE sub_subcategory_combinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_subcategory_id UUID NOT NULL REFERENCES form_sub_subcategories(id) ON DELETE CASCADE,
    color VARCHAR(100),
    material VARCHAR(100),
    size VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for filtering
CREATE INDEX idx_sub_subcategory_combinations_sub_subcategory_id ON sub_subcategory_combinations(sub_subcategory_id);
CREATE INDEX idx_sub_subcategory_combinations_color ON sub_subcategory_combinations(color);
CREATE INDEX idx_sub_subcategory_combinations_material ON sub_subcategory_combinations(material);
CREATE INDEX idx_sub_subcategory_combinations_size ON sub_subcategory_combinations(size);

-- Add unique constraint to prevent duplicate combinations
ALTER TABLE sub_subcategory_combinations ADD CONSTRAINT unique_combination 
    UNIQUE (sub_subcategory_id, color, material, size);

-- Example data structure:
-- sub_subcategory_id | color  | material | size | id (UUID)
-- uuid123           | Blue   | Copper   | 4m   | uuid-1
-- uuid123           | Green  | Copper   | 4m   | uuid-2
-- uuid123           | Blue   | Copper   | 10m  | uuid-3
-- uuid123           | Green  | Copper   | 10m  | uuid-4