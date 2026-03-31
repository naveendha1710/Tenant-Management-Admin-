-- Migration: Add assignment columns to preventive_maintenance table
-- Run this ONLY if columns don't exist

-- Check if columns exist first
DO $$ 
BEGIN
    -- Add assigned_to column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'preventive_maintenance' 
        AND column_name = 'assigned_to'
    ) THEN
        ALTER TABLE preventive_maintenance 
        ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Column assigned_to added successfully';
    ELSE
        RAISE NOTICE 'Column assigned_to already exists';
    END IF;

    -- Add assigned_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'preventive_maintenance' 
        AND column_name = 'assigned_at'
    ) THEN
        ALTER TABLE preventive_maintenance 
        ADD COLUMN assigned_at TIMESTAMP;
        
        RAISE NOTICE 'Column assigned_at added successfully';
    ELSE
        RAISE NOTICE 'Column assigned_at already exists';
    END IF;

    -- Add assignment_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'preventive_maintenance' 
        AND column_name = 'assignment_notes'
    ) THEN
        ALTER TABLE preventive_maintenance 
        ADD COLUMN assignment_notes TEXT;
        
        RAISE NOTICE 'Column assignment_notes added successfully';
    ELSE
        RAISE NOTICE 'Column assignment_notes already exists';
    END IF;
END $$;

-- Create index on assigned_to for better query performance
CREATE INDEX IF NOT EXISTS idx_pm_assigned_to 
ON preventive_maintenance(assigned_to);

-- Verify columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'preventive_maintenance'
AND column_name IN ('assigned_to', 'assigned_at', 'assignment_notes')
ORDER BY column_name;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'PM Task Board is now ready to use.';
END $$;
