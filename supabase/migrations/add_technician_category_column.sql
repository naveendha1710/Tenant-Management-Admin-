-- Add technician_category column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS technician_category text DEFAULT '';

-- Add comment to describe the column
COMMENT ON COLUMN users.technician_category IS 'Category/specialization for technician users (Plumber, Electrician, etc.)';
